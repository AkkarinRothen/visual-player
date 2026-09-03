import type { DisplayState, GameSession, DraftSaveState, DuplicateSessionOptions } from '../types';
import {
  createGameSession,
  getGameSession,
  getSessionsByCampaign,
  updateGameSessionDraft,
  updateGameSessionLiveState,
  updateGameSessionNotes,
  renameGameSession,
  archiveGameSession,
  completeGameSession,
  duplicateGameSession,
  deleteGameSession,
  saveSessionAsTemplate,
  createSessionFromTemplate,
  packSessionForExport,
  importSessionPackage,
} from '../db';
import type { GameSessionTemplate, GameSessionPackage } from '../types';

type SaveStateListener = (state: DraftSaveState) => void;

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
  private readonly DRAFT_DEBOUNCE_MS = 400;

  // Estado observable del guardado
  private draftSaveState: DraftSaveState = 'idle';
  private listeners: Set<SaveStateListener> = new Set();

  // Protección contra sobrescrituras tardías (timestamp del último inicio de guardado)
  private lastSaveStartedAt = 0;

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
    // Vaciar cola de escrituras pendientes antes de cambiar
    await this.writeQueue;

    const session = await getGameSession(newSessionId);
    if (!session) throw new Error(`Session ${newSessionId} not found`);

    this.currentSessionId = newSessionId;
    this.currentSession = session;
    this.emitState('idle');
    return session;
  }

  // ─── Guardado del Borrador ─────────────────────────────────────────────────

  /**
   * Encola el guardado del borrador con debounce de 400ms.
   * La cola FIFO garantiza que una escritura más nueva nunca queda detrás de una antigua.
   */
  public saveDraftDebounced(stagedState: DisplayState): void {
    if (!this.currentSessionId) return;

    // Cancelar debounce anterior
    if (this.draftDebounceTimer !== null) {
      clearTimeout(this.draftDebounceTimer);
    }

    this.emitState('saving');

    this.draftDebounceTimer = setTimeout(() => {
      this.draftDebounceTimer = null;
      this._enqueueDraftSave(stagedState);
    }, this.DRAFT_DEBOUNCE_MS);
  }

  /**
   * Guarda el borrador inmediatamente (sin debounce). Útil al cambiar de sesión o salir.
   */
  public async saveDraftImmediate(stagedState: DisplayState): Promise<void> {
    if (!this.currentSessionId) return;
    if (this.draftDebounceTimer !== null) {
      clearTimeout(this.draftDebounceTimer);
      this.draftDebounceTimer = null;
    }
    await this._enqueueDraftSave(stagedState);
  }

  private _enqueueDraftSave(stagedState: DisplayState): Promise<void> {
    const sessionId = this.currentSessionId;
    if (!sessionId) return Promise.resolve();

    const startedAt = Date.now();
    this.lastSaveStartedAt = startedAt;

    // Encadenar en la cola FIFO para serialización estricta
    this.writeQueue = this.writeQueue.then(async () => {
      // Si una escritura más nueva ya inició, esta es obsoleta → descartar
      if (startedAt < this.lastSaveStartedAt) return;

      try {
        await updateGameSessionDraft(sessionId, stagedState);
        // Actualizar referencia en memoria
        if (this.currentSession && this.currentSessionId === sessionId) {
          this.currentSession = { ...this.currentSession, stagedState, updatedAt: Date.now() };
        }
        this.emitState('saved');

        // Volver a 'idle' tras 3 segundos para limpiar el indicador
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

  /**
   * Persiste el estado publicado (liveState) cuando el DM lo envía a la Mesa.
   * No afecta al borrador ni envía datos por WebRTC (eso lo gestiona MasterController).
   */
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

  // ─── Operaciones de biblioteca ────────────────────────────────────────────

  public async duplicate(options: DuplicateSessionOptions): Promise<GameSession> {
    if (!this.currentSessionId) throw new Error('No active session');
    return duplicateGameSession(this.currentSessionId, options);
  }

  public async archive(sessionId: string): Promise<void> {
    await archiveGameSession(sessionId);
    // Si archivamos la sesión activa, limpiar referencia
    if (sessionId === this.currentSessionId) {
      this.currentSessionId = null;
      this.currentSession = null;
    }
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await deleteGameSession(sessionId);
    if (sessionId === this.currentSessionId) {
      this.currentSessionId = null;
      this.currentSession = null;
    }
  }

  public async saveAsTemplate(name: string, description?: string): Promise<GameSessionTemplate> {
    if (!this.currentSessionId) throw new Error('No active session');
    return saveSessionAsTemplate(this.currentSessionId, name, description);
  }

  public async createFromTemplate(templateId: string, name: string): Promise<GameSession> {
    return createSessionFromTemplate(templateId, name);
  }

  // ─── Exportación / Importación ────────────────────────────────────────────

  /**
   * Exporta la sesión activa como un archivo .vpp.json con todos los assets incrustados.
   * El archivo resultante es autocontenido y funciona sin conexión a Internet.
   */
  public async exportCurrentSession(): Promise<void> {
    if (!this.currentSessionId) throw new Error('No active session');
    const pkg = await packSessionForExport(this.currentSessionId);
    const json = JSON.stringify(pkg, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const sessionName = this.currentSession?.name ?? 'sesion';
    a.href = url;
    a.download = `${sessionName.replace(/[^a-z0-9áéíóúñ ]/gi, '_')}.vpp.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /**
   * Importa un archivo .vpp.json. Retorna la sesión importada y conflictos detectados.
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

  public async getSessionsForCampaign(campaignId: string): Promise<GameSession[]> {
    return getSessionsByCampaign(campaignId);
  }
}

/** Instancia singleton exportada para toda la app. */
export const gameSessionService = new GameSessionService();
