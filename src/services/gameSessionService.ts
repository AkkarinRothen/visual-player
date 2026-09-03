import type {
  DisplayState,
  GameSession,
  DraftSaveState,
  DuplicateSessionOptions,
  GameSessionTemplate,
  GameSessionPackage,
  SessionCheckpoint,
  ExportPreflightReport,
  ImportDiffSummary,
  NextSessionOptions,
  NewGroupSessionOptions,
  SceneCompositionPreset,
  SavedConversation,
  HandoutState,
  PresetDependencyReport,
  SessionReadinessCheck,
  VersionConflictReport,
} from '../types';
import {
  createGameSession,
  getGameSession,
  getSessionsByCampaign,
  getAllSessions,
  getAllSessionTemplates,
  updateGameSessionDraft,
  updateGameSessionLiveState,
  updateGameSessionNotes,
  renameGameSession,
  archiveGameSession,
  completeGameSession,
  duplicateGameSession,
  deleteGameSession,
  trashGameSession,
  restoreGameSessionFromTrash,
  getTrashedSessions,
  emptyTrash,
  saveSessionAsTemplate,
  createSessionFromTemplate,
  packSessionForExport,
  importSessionPackage,
  importSessionPackageWithRemap,
  analyzeSessionPackageDiff,
  downloadExternalAssetsForSession,
  scanSessionAssetDependencies,
  createSessionCheckpoint,
  getSessionCheckpoints,
  restoreCheckpointAsNewSession,
  prepareNextGameSession,
  createSessionForNewGroup,
  saveSceneAsCompositionPreset,
  getSceneCompositionPresets,
  deleteSceneCompositionPreset,
  instantiateScenePresetIntoSession,
  scanPresetDependencies,
  checkSessionReadiness,
  detectImportVersionConflict,
  saveSessionInitialBaseline,
  updateSessionFromTemplate,
  getTemplateUpdateDiff,
  applyGranularTemplateUpdate,
  migrateLegacySession,
  calculateStorageAudit,
  purgeOrphanAssets,
  importSessionAsAuditCopy,
  type AssetDependencyItem,
} from '../db';
import type {
  TemplateUpdateDiffReport,
  GranularTemplateUpdateSelection,
  StorageAuditReport,
  AuditRestoreReport,
  CinematicMacro,
} from '../types';

type SaveStateListener = (state: DraftSaveState) => void;

export type BackupStatus = 'synced' | 'dirty' | 'never_exported';

/**
 * Singleton que gestiona el ciclo de vida de la sesión activa de una campaña.
 *
 * Garantías:
 *  - Cola FIFO de escrituras: ningún guardado antiguo puede sobrescribir uno reciente.
 *  - Debounce de 400ms en saveDraft para no saturar IndexedDB.
 *  - El estado de guardado (DraftSaveState) se notifica síncronamente a los suscriptores.
 *  - Abrir una sesión NUNCA publica datos a la Mesa (sin efectos de red).
 *  - No almacena tokens WebRTC, roomId ni claves de conexión.
 */
class GameSessionService {
  private currentSessionId: string | null = null;
  private currentSession: GameSession | null = null;

  // Cola FIFO: todas las escrituras se encadenan para serialización estricta
  private writeQueue: Promise<void> = Promise.resolve();

  // Debounce para guardado de borrador
  private draftDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingStagedState: DisplayState | null = null;
  private readonly DRAFT_DEBOUNCE_MS = 400;

  // Estado observable del guardado
  private draftSaveState: DraftSaveState = 'idle';
  private listeners: Set<SaveStateListener> = new Set();

  // Protección contra sobrescrituras tardías (timestamp del último inicio de guardado)
  private lastSaveStartedAt = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        if (this.draftDebounceTimer !== null && this.pendingStagedState) {
          clearTimeout(this.draftDebounceTimer);
          this.draftDebounceTimer = null;
          this._enqueueDraftSave(this.pendingStagedState);
        }
      });
    }
  }

  // ─── Observabilidad ────────────────────────────────────────────────────────

  /**
   * Suscribe a cambios de DraftSaveState. Retorna función de desuscripción.
   */
  public subscribe(listener: SaveStateListener): () => void {
    this.listeners.add(listener);
    listener(this.draftSaveState); // Emitir estado actual inmediatamente
    return () => this.listeners.delete(listener);
  }

  private emitState(state: DraftSaveState): void {
    this.draftSaveState = state;
    this.listeners.forEach((l) => l(state));
  }

  public getDraftSaveState(): DraftSaveState {
    return this.draftSaveState;
  }

  public getCurrentSession(): GameSession | null {
    return this.currentSession;
  }

  public getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  public setCurrentSession(session: GameSession | null): void {
    this.currentSession = session;
    this.currentSessionId = session ? session.id : null;
  }

  // ─── Ciclo de vida ────────────────────────────────────────────────────────

  /**
   * Carga la sesión más reciente de la campaña (en preparación o activa),
   * o crea una nueva si no existe ninguna. No publica nada a la Mesa.
   */
  public async loadOrCreateSession(campaignId: string): Promise<GameSession> {
    const sessions = await getSessionsByCampaign(campaignId);
    const candidate = sessions.find(
      (s) => s.status === 'preparing' || s.status === 'active'
    );

    if (candidate) {
      this.currentSessionId = candidate.id;
      this.currentSession = candidate;
      this.emitState('idle');
      return candidate;
    }

    // Crear sesión nueva si no hay ninguna en curso
    const count = sessions.filter((s) => s.status !== 'archived').length;
    const newSession = await createGameSession(campaignId, `Sesión ${count + 1}`);
    this.currentSessionId = newSession.id;
    this.currentSession = newSession;
    this.emitState('idle');
    return newSession;
  }

  /**
   * Cambia a otra sesión guardando el borrador actual primero.
   * Espera a que el guardado pendiente termine antes de cambiar.
   */
  public async switchSession(newSessionId: string): Promise<GameSession> {
    await this.flushPendingSave();

    const session = await getGameSession(newSessionId);
    if (!session) throw new Error(`Sesión ${newSessionId} no encontrada`);

    this.currentSessionId = newSessionId;
    this.currentSession = session;
    this.emitState('idle');
    return session;
  }

  /**
   * Espera y fuerza cualquier escritura pendiente antes de operaciones críticas.
   */
  public async flushPendingSave(): Promise<void> {
    if (this.draftDebounceTimer !== null && this.pendingStagedState) {
      clearTimeout(this.draftDebounceTimer);
      this.draftDebounceTimer = null;
      const stateToSave = this.pendingStagedState;
      this.pendingStagedState = null;
      await this._enqueueDraftSave(stateToSave);
    }
    await this.writeQueue;
  }

  // ─── Guardado del Borrador ─────────────────────────────────────────────────

  /**
   * Encola el guardado del borrador con debounce de 400ms.
   */
  public saveDraftDebounced(stagedState: DisplayState): void {
    if (!this.currentSessionId) return;

    this.pendingStagedState = stagedState;

    if (this.draftDebounceTimer !== null) {
      clearTimeout(this.draftDebounceTimer);
    }

    this.emitState('saving');

    this.draftDebounceTimer = setTimeout(() => {
      this.draftDebounceTimer = null;
      const stateToSave = this.pendingStagedState || stagedState;
      this.pendingStagedState = null;
      this._enqueueDraftSave(stateToSave);
    }, this.DRAFT_DEBOUNCE_MS);
  }

  /**
   * Guarda el borrador inmediatamente (sin debounce).
   */
  public async saveDraftImmediate(stagedState: DisplayState): Promise<void> {
    if (!this.currentSessionId) return;
    this.pendingStagedState = null;
    if (this.draftDebounceTimer !== null) {
      clearTimeout(this.draftDebounceTimer);
      this.draftDebounceTimer = null;
    }
    await this._enqueueDraftSave(stagedState);
  }

  private _enqueueDraftSave(stagedState: DisplayState): Promise<void> {
    const sessionId = this.currentSessionId;
    if (!sessionId) return Promise.resolve();
    this.pendingStagedState = null;

    const startedAt = Date.now();
    this.lastSaveStartedAt = startedAt;

    this.writeQueue = this.writeQueue.then(async () => {
      if (startedAt < this.lastSaveStartedAt) return;

      try {
        await updateGameSessionDraft(sessionId, stagedState);
        if (this.currentSession && this.currentSessionId === sessionId) {
          this.currentSession = {
            ...this.currentSession,
            stagedState,
            revision: (this.currentSession.revision || 1) + 1,
            updatedAt: Date.now(),
          };
        }
        this.emitState('saved');

        setTimeout(() => {
          if (this.draftSaveState === 'saved') this.emitState('idle');
        }, 3000);
      } catch {
        this.emitState('error');
      }
    });

    return this.writeQueue;
  }

  // ─── Estado publicado a la Mesa ───────────────────────────────────────────

  public async saveLiveState(liveState: DisplayState): Promise<void> {
    if (!this.currentSessionId) return;
    const sessionId = this.currentSessionId;
    this.writeQueue = this.writeQueue.then(async () => {
      await updateGameSessionLiveState(sessionId, liveState);
      if (this.currentSession && this.currentSessionId === sessionId) {
        this.currentSession = {
          ...this.currentSession,
          liveState,
          status: 'active',
          updatedAt: Date.now(),
        };
      }
    });
    return this.writeQueue;
  }

  // ─── Metadatos de la sesión ───────────────────────────────────────────────

  public async renameSession(name: string): Promise<void> {
    if (!this.currentSessionId) return;
    await renameGameSession(this.currentSessionId, name);
    if (this.currentSession) {
      this.currentSession = { ...this.currentSession, name, updatedAt: Date.now() };
    }
  }

  public async saveNotes(planNotes: string): Promise<void> {
    if (!this.currentSessionId) return;
    await updateGameSessionNotes(this.currentSessionId, planNotes);
    if (this.currentSession) {
      this.currentSession = { ...this.currentSession, planNotes, updatedAt: Date.now() };
    }
  }

  public async markCompleted(): Promise<void> {
    if (!this.currentSessionId) return;
    await completeGameSession(this.currentSessionId);
    if (this.currentSession) {
      this.currentSession = { ...this.currentSession, status: 'completed', updatedAt: Date.now() };
    }
  }

  // ─── Operaciones de biblioteca y Papelera ──────────────────────────────────

  public async duplicate(options: DuplicateSessionOptions): Promise<GameSession> {
    if (!this.currentSessionId) throw new Error('No hay sesión activa');
    await this.flushPendingSave();
    return duplicateGameSession(this.currentSessionId, options);
  }

  public async archive(sessionId: string): Promise<void> {
    await archiveGameSession(sessionId);
    if (sessionId === this.currentSessionId) {
      this.currentSessionId = null;
      this.currentSession = null;
    }
  }

  public async trashSession(sessionId: string): Promise<void> {
    await trashGameSession(sessionId);
    if (sessionId === this.currentSessionId) {
      this.currentSessionId = null;
      this.currentSession = null;
    }
  }

  public async restoreSessionFromTrash(sessionId: string): Promise<void> {
    await restoreGameSessionFromTrash(sessionId);
  }

  public async getTrashed(campaignId: string): Promise<GameSession[]> {
    return getTrashedSessions(campaignId);
  }

  public async emptyTrash(campaignId: string): Promise<number> {
    return emptyTrash(campaignId);
  }

  public async deleteSessionPermanently(sessionId: string): Promise<void> {
    await deleteGameSession(sessionId);
    if (sessionId === this.currentSessionId) {
      this.currentSessionId = null;
      this.currentSession = null;
    }
  }

  public async saveAsTemplate(name: string, description?: string): Promise<GameSessionTemplate> {
    if (!this.currentSessionId) throw new Error('No hay sesión activa');
    await this.flushPendingSave();
    return saveSessionAsTemplate(this.currentSessionId, name, description);
  }

  public async createFromTemplate(templateId: string, name: string): Promise<GameSession> {
    return createSessionFromTemplate(templateId, name);
  }

  // ─── Checkpoints vinculados a Sesión ──────────────────────────────────────

  public async createCheckpoint(name: string, type: 'manual' | 'auto' = 'manual', trigger: string = 'manual_snapshot'): Promise<SessionCheckpoint> {
    if (!this.currentSessionId || !this.currentSession) throw new Error('No hay sesión activa');
    await this.flushPendingSave();
    const stateToSave = this.currentSession.stagedState || this.currentSession.liveState;
    if (!stateToSave) throw new Error('La sesión no tiene estado para guardar un checkpoint');
    return createSessionCheckpoint(this.currentSessionId, this.currentSession.campaignId, name, stateToSave, type, trigger);
  }

  public async getSessionCheckpoints(sessionId?: string): Promise<SessionCheckpoint[]> {
    const id = sessionId || this.currentSessionId;
    if (!id) return [];
    return getSessionCheckpoints(id);
  }

  public async restoreCheckpointAsCopy(checkpointId: string, customName?: string): Promise<GameSession> {
    return restoreCheckpointAsNewSession(checkpointId, customName);
  }

  // ─── Estado del Respaldo Externo ──────────────────────────────────────────

  /**
   * Distingue si la sesión está respaldada externamente o solo en almacenamiento local.
   */
  public getBackupStatus(session?: GameSession | null): BackupStatus {
    const s = session || this.currentSession;
    if (!s) return 'never_exported';
    if (!s.lastExportedAt) return 'never_exported';
    if (s.updatedAt > s.lastExportedAt) return 'dirty';
    return 'synced';
  }

  // ─── Exportación / Importación Robusta ─────────────────────────────────────

  /**
   * Ejecuta el escáner de diagnóstico y descarga opcional previa a la exportación.
   */
  public async preflightExport(
    sessionId: string,
    onProgress?: (current: number, total: number, item: AssetDependencyItem) => void
  ): Promise<ExportPreflightReport> {
    const session = await getGameSession(sessionId);
    if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);
    const deps = scanSessionAssetDependencies(session);
    return downloadExternalAssetsForSession(deps, onProgress);
  }

  /**
   * Exporta la sesión como archivo .vpp.json.
   */
  public async exportSessionPackage(sessionId: string, downloadExternal: boolean = false): Promise<GameSessionPackage> {
    await this.flushPendingSave();
    const pkg = await packSessionForExport(sessionId, downloadExternal);
    const json = JSON.stringify(pkg, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const sessionName = pkg.session.name ?? 'sesion';
    a.href = url;
    a.download = `${sessionName.replace(/[^a-z0-9áéíóúñ ]/gi, '_')}.vpp.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return pkg;
  }

  /**
   * Exporta la sesión activa.
   */
  public async exportCurrentSession(downloadExternal: boolean = false): Promise<GameSessionPackage> {
    if (!this.currentSessionId) throw new Error('No hay sesión activa');
    return this.exportSessionPackage(this.currentSessionId, downloadExternal);
  }

  /**
   * Analiza un archivo de paquete para la pantalla de revisión de diferencias (Diff Review).
   */
  public async analyzePackageDiff(file: File): Promise<{ pkg: GameSessionPackage; diff: ImportDiffSummary }> {
    const text = await file.text();
    let pkg: GameSessionPackage;
    try {
      pkg = JSON.parse(text) as GameSessionPackage;
    } catch {
      throw new Error('El archivo no es un JSON válido');
    }
    const diff = await analyzeSessionPackageDiff(pkg);
    return { pkg, diff };
  }

  /**
   * Importa el paquete analizado con la opción de copia independiente o vinculada.
   */
  public async importFromPackage(
    pkg: GameSessionPackage,
    asIndependentCopy: boolean = true
  ): Promise<{ session: GameSession; campaignId: string }> {
    return importSessionPackageWithRemap(pkg, asIndependentCopy);
  }

  /**
   * Importa directamente un archivo .vpp.json (compatibilidad).
   */
  public async importFromFile(
    file: File,
    conflictStrategy: 'keep_local' | 'overwrite' | 'duplicate' = 'duplicate'
  ): Promise<{ session: GameSession; conflicts: string[] }> {
    const text = await file.text();
    let pkg: GameSessionPackage;
    try {
      pkg = JSON.parse(text) as GameSessionPackage;
    } catch {
      throw new Error('El archivo no es un JSON válido');
    }
    return importSessionPackage(pkg, conflictStrategy);
  }

  // ─── Acceso a listas ──────────────────────────────────────────────────────

  public async getSessionsForCampaign(campaignId: string, includeDeleted: boolean = false): Promise<GameSession[]> {
    return getSessionsByCampaign(campaignId, includeDeleted);
  }

  public async getAllSessions(includeDeleted: boolean = false): Promise<GameSession[]> {
    return getAllSessions(includeDeleted);
  }

  public async getAllTemplates(): Promise<GameSessionTemplate[]> {
    return getAllSessionTemplates();
  }

  // ─── Continuidad de Partidas y Grupos ──────────────────────────────────────

  public async prepareNextSession(sourceSessionId: string, options?: NextSessionOptions): Promise<GameSession> {
    await this.flushPendingSave();
    return prepareNextGameSession(sourceSessionId, options);
  }

  public async createSessionForNewGroup(sourceSessionId: string, options: NewGroupSessionOptions): Promise<GameSession> {
    await this.flushPendingSave();
    return createSessionForNewGroup(sourceSessionId, options);
  }

  // ─── Presets de Escena Completa (Composiciones Reutilizables) ─────────────

  public async saveSceneAsPreset(
    campaignId: string,
    state: DisplayState,
    name: string,
    options?: { description?: string; tags?: string[]; linkedConversation?: SavedConversation }
  ): Promise<SceneCompositionPreset> {
    return saveSceneAsCompositionPreset(campaignId, state, name, options);
  }

  public async getScenePresets(campaignId?: string): Promise<SceneCompositionPreset[]> {
    return getSceneCompositionPresets(campaignId);
  }

  public async deleteScenePreset(id: string): Promise<void> {
    return deleteSceneCompositionPreset(id);
  }

  public async instantiateScenePreset(
    sessionId: string,
    presetId: string,
    mode: 'append_scene' | 'replace_staged' = 'replace_staged'
  ): Promise<GameSession> {
    await this.flushPendingSave();
    const updated = await instantiateScenePresetIntoSession(sessionId, presetId, mode);
    if (this.currentSessionId === sessionId) {
      this.currentSession = updated;
    }
    return updated;
  }

  // ─── Acceso Seguro a Recursos de la Sesión Activa ─────────────────────────

  public getActiveConversations(campaignConversations: SavedConversation[] = []): SavedConversation[] {
    if (this.currentSession?.frozenConversations && this.currentSession.frozenConversations.length > 0) {
      return this.currentSession.frozenConversations;
    }
    return campaignConversations;
  }

  public getActiveHandouts(campaignHandouts: HandoutState[] = []): HandoutState[] {
    if (this.currentSession?.frozenHandouts && this.currentSession.frozenHandouts.length > 0) {
      return this.currentSession.frozenHandouts;
    }
    return campaignHandouts;
  }

  public getActiveMacros(campaignMacros: CinematicMacro[] = []): CinematicMacro[] {
    if (this.currentSession?.frozenMacros && this.currentSession.frozenMacros.length > 0) {
      return this.currentSession.frozenMacros;
    }
    return campaignMacros;
  }

  // ─── Herramientas de Mantenimiento, Transporte y Chequeo Pre-Partida ───────

  public async scanPreset(preset: SceneCompositionPreset, targetCampaignId?: string): Promise<PresetDependencyReport> {
    return scanPresetDependencies(preset, targetCampaignId);
  }

  public async checkReadiness(sessionId?: string): Promise<SessionReadinessCheck> {
    const id = sessionId || this.currentSession?.id;
    if (!id) throw new Error('No hay sesión activa para evaluar');
    return checkSessionReadiness(id);
  }

  public detectVersionConflict(pkg: GameSessionPackage, existingSession?: GameSession): VersionConflictReport {
    return detectImportVersionConflict(pkg, existingSession);
  }

  public async updateFromTemplate(
    sessionId: string,
    templateId: string
  ): Promise<{ session: GameSession; checkpoint: SessionCheckpoint }> {
    await this.flushPendingSave();
    const result = await updateSessionFromTemplate(sessionId, templateId);
    if (this.currentSession?.id === sessionId) {
      this.currentSession = result.session;
    }
    return result;
  }

  public async saveInitialBaseline(
    sessionId?: string,
    state?: DisplayState,
    label?: string
  ): Promise<GameSession> {
    await this.flushPendingSave();
    const id = sessionId || this.currentSession?.id;
    if (!id) throw new Error('No hay sesión activa');
    const updated = await saveSessionInitialBaseline(id, state, label);
    if (this.currentSession?.id === id) {
      this.currentSession = updated;
    }
    return updated;
  }

  public async getTemplateDiff(sessionId: string, templateId: string): Promise<TemplateUpdateDiffReport> {
    return getTemplateUpdateDiff(sessionId, templateId);
  }

  public async applyGranularTemplateUpdate(
    sessionId: string,
    templateId: string,
    selection: GranularTemplateUpdateSelection
  ): Promise<{ session: GameSession; checkpoint: SessionCheckpoint }> {
    await this.flushPendingSave();
    const result = await applyGranularTemplateUpdate(sessionId, templateId, selection);
    if (this.currentSession?.id === sessionId) {
      this.currentSession = result.session;
    }
    return result;
  }

  public async migrateLegacySession(sessionId: string): Promise<GameSession> {
    await this.flushPendingSave();
    const result = await migrateLegacySession(sessionId);
    if (this.currentSession?.id === sessionId) {
      this.currentSession = result;
    }
    return result;
  }

  public async getStorageAudit(): Promise<StorageAuditReport> {
    return calculateStorageAudit();
  }

  public async purgeOrphans(): Promise<{ purgedCount: number; reclaimedBytes: number }> {
    return purgeOrphanAssets();
  }

  public async importAsAuditCopy(pkg: GameSessionPackage): Promise<AuditRestoreReport> {
    return importSessionAsAuditCopy(pkg);
  }
}

/** Instancia singleton exportada para toda la app. */
export const gameSessionService = new GameSessionService();
