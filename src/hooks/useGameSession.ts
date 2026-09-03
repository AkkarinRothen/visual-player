import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DisplayState,
  GameSession,
  DraftSaveState,
  DuplicateSessionOptions,
  SessionCheckpoint,
  NextSessionOptions,
  NewGroupSessionOptions,
} from '../types';
import type { GameSessionTemplate } from '../types';
import { gameSessionService, type BackupStatus } from '../services/gameSessionService';
import {
  db,
  getSessionsByCampaign,
  getSessionTemplatesByCampaign,
  getTrashedSessions,
  getAllSessions,
  getAllSessionTemplates,
  emptyTrash as dbEmptyTrash,
} from '../db';

interface UseGameSessionReturn {
  /** Sesión actualmente cargada. */
  currentSession: GameSession | null;
  /** Estado observable del guardado automático del borrador. */
  draftSaveState: DraftSaveState;
  /** Lista de sesiones de la campaña (actualizada automáticamente). */
  sessions: GameSession[];
  /** Sesiones en la papelera de la campaña. */
  trashedSessions: GameSession[];
  /** Plantillas disponibles para la campaña. */
  templates: GameSessionTemplate[];
  /** Indica si la carga inicial terminó. */
  isLoading: boolean;

  // ─── Acciones ──────────────────────────────────────────────────────────────
  /** Carga o crea la sesión activa para una campaña. */
  initSession: (campaignId: string) => Promise<void>;
  /** Guarda el borrador con debounce (llamar en cada cambio de Staging). */
  saveDraft: (state: DisplayState) => void;
  /** Guarda el estado publicado a la Mesa. */
  saveLiveState: (state: DisplayState) => Promise<void>;
  /** Cambia a otra sesión esperando el guardado pendiente. */
  switchSession: (sessionId: string) => Promise<void>;
  /** Crea una sesión nueva con el nombre dado. */
  createNewSession: (campaignId: string, name: string) => Promise<void>;
  /** Renombra la sesión activa. */
  renameCurrentSession: (name: string) => Promise<void>;
  /** Guarda las notas del plan del director. */
  saveNotes: (notes: string) => Promise<void>;
  /** Duplica la sesión activa con las opciones dadas. */
  duplicateCurrentSession: (opts: DuplicateSessionOptions) => Promise<GameSession>;
  /** Archiva una sesión por ID. */
  archiveSession: (id: string) => Promise<void>;
  /** Envía una sesión a la papelera (soft-delete). */
  trashSession: (id: string) => Promise<void>;
  /** Restaura una sesión de la papelera. */
  restoreFromTrash: (id: string) => Promise<void>;
  /** Vacía la papelera de la campaña. */
  emptyTrash: () => Promise<void>;
  /** Elimina una sesión permanentemente. */
  deleteSession: (id: string) => Promise<void>;
  /** Guarda la sesión activa como plantilla sanitizada. */
  saveAsTemplate: (name: string, description?: string) => Promise<GameSessionTemplate>;
  /** Crea un checkpoint vinculado a la sesión activa. */
  createCheckpoint: (name: string, type?: 'manual' | 'auto', trigger?: string) => Promise<SessionCheckpoint>;
  /** Restaura un checkpoint como nueva sesión (copia segura). */
  restoreCheckpointAsCopy: (checkpointId: string, customName?: string) => Promise<GameSession>;
  /** Evalúa el estado de respaldo externo de la sesión. */
  getBackupStatus: (session?: GameSession | null) => BackupStatus;
  /** Exporta la sesión activa como .vpp.json con assets incrustados. */
  exportCurrentSession: (downloadExternal?: boolean) => Promise<void>;
  /** Importa desde un archivo .vpp.json. */
  importFromFile: (file: File, strategy?: 'keep_local' | 'overwrite' | 'duplicate') => Promise<{ session: GameSession; conflicts: string[] }>;
  /** Recarga la lista de sesiones de la campaña desde la base de datos. */
  refreshSessions: (campaignId: string) => Promise<void>;
  /** Prepara la siguiente sesión para el mismo grupo conservando revelaciones y mundo. */
  prepareNextSession: (sourceSessionId: string, options?: NextSessionOptions) => Promise<GameSession>;
  /** Bifurca la preparación para jugar con otro grupo sin revelar misterios. */
  createSessionForNewGroup: (sourceSessionId: string, options: NewGroupSessionOptions) => Promise<GameSession>;
}

/**
 * Hook React que expone el GameSessionService con estado observable.
 * Garantiza que los componentes siempre ven el estado actualizado de guardado,
 * sin necesidad de polling.
 */
export function useGameSession(): UseGameSessionReturn {
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>('idle');
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [trashedSessions, setTrashedSessions] = useState<GameSession[]>([]);
  const [templates, setTemplates] = useState<GameSessionTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Guardar campaignId actual para poder refrescar la lista
  const activeCampaignId = useRef<string | null>(null);

  // Suscribir al estado de guardado del servicio singleton
  useEffect(() => {
    const unsubscribe = gameSessionService.subscribe((state) => {
      setDraftSaveState(state);
    });
    const existing = gameSessionService.getCurrentSession();
    if (existing) {
      setCurrentSession(existing);
    }
    return unsubscribe;
  }, []);

  const refreshSessions = useCallback(async (campaignId: string) => {
    if (campaignId === 'all') {
      const [allSess, allTpl, allDb] = await Promise.all([
        getAllSessions(false),
        getAllSessionTemplates(),
        db.sessions.toArray(),
      ]);
      setSessions(allSess);
      setTemplates(allTpl);
      setTrashedSessions(allDb.filter((s) => s.isDeleted));
    } else {
      const [sessionList, trashedList, templateList] = await Promise.all([
        getSessionsByCampaign(campaignId, false),
        getTrashedSessions(campaignId),
        getSessionTemplatesByCampaign(campaignId),
      ]);
      setSessions(sessionList);
      setTrashedSessions(trashedList);
      setTemplates(templateList);
    }
  }, []);

  const initSession = useCallback(async (campaignId: string) => {
    setIsLoading(true);
    activeCampaignId.current = campaignId;
    try {
      const session = await gameSessionService.loadOrCreateSession(campaignId);
      setCurrentSession(session);
      await refreshSessions(campaignId);
    } finally {
      setIsLoading(false);
    }
  }, [refreshSessions]);

  const saveDraft = useCallback((state: DisplayState) => {
    gameSessionService.saveDraftDebounced(state);
  }, []);

  const saveLiveState = useCallback(async (state: DisplayState) => {
    await gameSessionService.saveLiveState(state);
    setCurrentSession(gameSessionService.getCurrentSession());
  }, []);

  const switchSession = useCallback(async (sessionId: string) => {
    const session = await gameSessionService.switchSession(sessionId);
    setCurrentSession(session);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
  }, [refreshSessions]);

  const createNewSession = useCallback(async (campaignId: string, name: string) => {
    activeCampaignId.current = campaignId;
    const { createGameSession } = await import('../db');
    const newSession = await createGameSession(campaignId, name);
    await gameSessionService.switchSession(newSession.id);
    setCurrentSession(newSession);
    await refreshSessions(campaignId);
  }, [refreshSessions]);

  const renameCurrentSession = useCallback(async (name: string) => {
    await gameSessionService.renameSession(name);
    setCurrentSession(gameSessionService.getCurrentSession());
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
  }, [refreshSessions]);

  const saveNotes = useCallback(async (notes: string) => {
    await gameSessionService.saveNotes(notes);
    setCurrentSession(gameSessionService.getCurrentSession());
  }, []);

  const duplicateCurrentSession = useCallback(async (opts: DuplicateSessionOptions) => {
    const duplicate = await gameSessionService.duplicate(opts);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    return duplicate;
  }, [refreshSessions]);

  const archiveSession = useCallback(async (id: string) => {
    await gameSessionService.archive(id);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    if (id === currentSession?.id) {
      setCurrentSession(null);
    }
  }, [currentSession?.id, refreshSessions]);

  const trashSession = useCallback(async (id: string) => {
    await gameSessionService.trashSession(id);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    if (id === currentSession?.id) {
      setCurrentSession(null);
    }
  }, [currentSession?.id, refreshSessions]);

  const restoreFromTrash = useCallback(async (id: string) => {
    await gameSessionService.restoreSessionFromTrash(id);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
  }, [refreshSessions]);

  const emptyTrash = useCallback(async () => {
    if (!activeCampaignId.current) return;
    await dbEmptyTrash(activeCampaignId.current);
    await refreshSessions(activeCampaignId.current);
  }, [refreshSessions]);

  const deleteSession = useCallback(async (id: string) => {
    await gameSessionService.deleteSessionPermanently(id);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    if (id === currentSession?.id) {
      setCurrentSession(null);
    }
  }, [currentSession?.id, refreshSessions]);

  const saveAsTemplate = useCallback(async (name: string, description?: string) => {
    const template = await gameSessionService.saveAsTemplate(name, description);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    return template;
  }, [refreshSessions]);

  const createCheckpoint = useCallback(async (name: string, type: 'manual' | 'auto' = 'manual', trigger: string = 'manual_snapshot') => {
    return gameSessionService.createCheckpoint(name, type, trigger);
  }, []);

  const restoreCheckpointAsCopy = useCallback(async (checkpointId: string, customName?: string) => {
    const newSession = await gameSessionService.restoreCheckpointAsCopy(checkpointId, customName);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    return newSession;
  }, [refreshSessions]);

  const getBackupStatus = useCallback((session?: GameSession | null) => {
    return gameSessionService.getBackupStatus(session);
  }, []);

  const exportCurrentSession = useCallback(async (downloadExternal: boolean = false) => {
    await gameSessionService.exportCurrentSession(downloadExternal);
  }, []);

  const importFromFile = useCallback(async (
    file: File,
    strategy: 'keep_local' | 'overwrite' | 'duplicate' = 'duplicate'
  ) => {
    const result = await gameSessionService.importFromFile(file, strategy);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    return result;
  }, [refreshSessions]);

  const prepareNextSession = useCallback(async (sourceSessionId: string, options?: NextSessionOptions) => {
    const nextSession = await gameSessionService.prepareNextSession(sourceSessionId, options);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    return nextSession;
  }, [refreshSessions]);

  const createSessionForNewGroup = useCallback(async (sourceSessionId: string, options: NewGroupSessionOptions) => {
    const newSession = await gameSessionService.createSessionForNewGroup(sourceSessionId, options);
    if (activeCampaignId.current) {
      await refreshSessions(activeCampaignId.current);
    }
    return newSession;
  }, [refreshSessions]);

  return {
    currentSession,
    draftSaveState,
    sessions,
    trashedSessions,
    templates,
    isLoading,
    initSession,
    saveDraft,
    saveLiveState,
    switchSession,
    createNewSession,
    renameCurrentSession,
    saveNotes,
    duplicateCurrentSession,
    archiveSession,
    trashSession,
    restoreFromTrash,
    emptyTrash,
    deleteSession,
    saveAsTemplate,
    createCheckpoint,
    restoreCheckpointAsCopy,
    getBackupStatus,
    exportCurrentSession,
    importFromFile,
    refreshSessions,
    prepareNextSession,
    createSessionForNewGroup,
  };
}
