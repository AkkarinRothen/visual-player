import type {
  GameSession,
  DisplayState,
} from '../../types';
import { db } from '../index';
import { generateId } from '../dbUtils';

/**
 * Obtiene todas las sesiones de una campaña ordenadas por fecha descendente.
 * Excluye por defecto las que están en la papelera (isDeleted: true).
 */
export async function getSessionsByCampaign(campaignId: string, includeDeleted: boolean = false): Promise<GameSession[]> {
  let sessions = await db.sessions.where('campaignId').equals(campaignId).toArray();
  if (!includeDeleted) {
    sessions = sessions.filter((s) => !s.isDeleted);
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Obtiene todas las sesiones de todas las campañas.
 * Excluye por defecto las que están en la papelera (isDeleted: true).
 */
export async function getAllSessions(includeDeleted: boolean = false): Promise<GameSession[]> {
  let sessions = await db.sessions.toArray();
  if (!includeDeleted) {
    sessions = sessions.filter((s) => !s.isDeleted);
  }
  return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Obtiene una sesión por ID.
 */
export async function getGameSession(id: string): Promise<GameSession | undefined> {
  return db.sessions.get(id);
}

/**
 * Crea una sesión nueva con snapshot congelado de escenas y personajes de la campaña.
 */
export async function createGameSession(campaignId: string, name: string): Promise<GameSession> {
  const existing = await getSessionsByCampaign(campaignId);
  const sessionNumber = existing.filter((s) => s.status !== 'archived' && !s.isDeleted).length + 1;
  const campaign = await db.campaigns.get(campaignId);

  const session: GameSession = {
    id: generateId('gs'),
    campaignId,
    name: name || `Sesión ${sessionNumber}`,
    status: 'preparing',
    schemaVersion: 1,
    planNotes: '',
    stagedState: null,
    liveState: null,
    frozenScenes: campaign?.scenes ? JSON.parse(JSON.stringify(campaign.scenes)) : [],
    frozenCharacters: campaign?.characters ? JSON.parse(JSON.stringify(campaign.characters)) : [],
    frozenConversations: campaign?.savedConversations ? JSON.parse(JSON.stringify(campaign.savedConversations)) : [],
    frozenHandouts: campaign?.savedHandouts ? JSON.parse(JSON.stringify(campaign.savedHandouts)) : [],
    frozenMacros: campaign?.macros ? JSON.parse(JSON.stringify(campaign.macros)) : [],
    revision: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber,
  };
  await db.sessions.put(session);
  return session;
}

/**
 * Actualiza el borrador (Staging) de la sesión de forma transaccional.
 */
export async function updateGameSessionDraft(
  id: string,
  stagedState: DisplayState
): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(id);
    if (!session) return;
    const initialBaselineConfig = session.initialBaselineConfig || {
      state: JSON.parse(JSON.stringify(stagedState)),
      savedAt: Date.now(),
      version: 1,
      label: 'Configuración inicial creada con la preparación',
    };
    await db.sessions.update(id, {
      stagedState,
      initialBaselineConfig,
      revision: (session.revision || 1) + 1,
      updatedAt: Date.now(),
    });
  });
}

/**
 * Actualiza el último estado publicado (liveState) de la sesión.
 */
export async function updateGameSessionLiveState(
  id: string,
  liveState: DisplayState
): Promise<void> {
  const session = await db.sessions.get(id);
  await db.sessions.update(id, {
    liveState,
    status: 'active',
    revision: ((session?.revision || 1) + 1),
    updatedAt: Date.now(),
  });
}

/**
 * Actualiza las notas del plan del director.
 */
export async function updateGameSessionNotes(id: string, planNotes: string): Promise<void> {
  await db.sessions.update(id, { planNotes, updatedAt: Date.now() });
}

/**
 * Renombra una sesión.
 */
export async function renameGameSession(id: string, name: string): Promise<void> {
  await db.sessions.update(id, { name, updatedAt: Date.now() });
}

/**
 * Archiva una sesión (soft-status). No borra los datos.
 */
export async function archiveGameSession(id: string): Promise<void> {
  await db.sessions.update(id, { status: 'archived', updatedAt: Date.now() });
}

/**
 * Marca una sesión como completada.
 */
export async function completeGameSession(id: string): Promise<void> {
  await db.sessions.update(id, { status: 'completed', updatedAt: Date.now() });
}

// ─── Papelera de Reciclaje (Soft-Delete) ──────────────────────────────────────

/**
 * Envía una sesión a la papelera (soft-delete).
 */
export async function trashGameSession(id: string): Promise<void> {
  await db.sessions.update(id, { isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now() });
}

/**
 * Restaura una sesión enviada a la papelera.
 */
export async function restoreGameSessionFromTrash(id: string): Promise<void> {
  await db.sessions.update(id, { isDeleted: false, deletedAt: undefined, updatedAt: Date.now() });
}

/**
 * Obtiene las sesiones que están en la papelera de una campaña.
 */
export async function getTrashedSessions(campaignId: string): Promise<GameSession[]> {
  const sessions = await db.sessions.where('campaignId').equals(campaignId).toArray();
  return sessions.filter((s) => s.isDeleted).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
}

/**
 * Vacía la papelera eliminando definitivamente las sesiones marcadas como isDeleted.
 */
export async function emptyTrash(campaignId: string): Promise<number> {
  const trashed = await getTrashedSessions(campaignId);
  const ids = trashed.map((s) => s.id);
  await db.sessions.bulkDelete(ids);
  return ids.length;
}

/**
 * Elimina una sesión permanentemente de la base de datos.
 */
export async function deleteGameSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}

/**
 * Migra explícitamente una sesión antigua que no cuenta con snapshots inmutables.
 * No falsea que la campaña actual sea la versión original si esta ha cambiado.
 */
export async function migrateLegacySession(sessionId: string): Promise<GameSession> {
  const session = await db.sessions.get(sessionId);
  if (!session) throw new Error(`Sesión ${sessionId} no encontrada`);

  const campaign = await db.campaigns.get(session.campaignId);

  const hasScenes = session.frozenScenes && session.frozenScenes.length > 0;
  const hasCharacters = session.frozenCharacters && session.frozenCharacters.length > 0;

  if (hasScenes && hasCharacters && session.initialBaselineConfig) {
    return session;
  }

  const migrationTimestamp = Date.now();
  const dateStr = new Date(migrationTimestamp).toLocaleDateString();

  session.frozenScenes = hasScenes ? session.frozenScenes : (campaign?.scenes ? JSON.parse(JSON.stringify(campaign.scenes)) : []);
  session.frozenCharacters = hasCharacters ? session.frozenCharacters : (campaign?.characters ? JSON.parse(JSON.stringify(campaign.characters)) : []);
  session.frozenConversations = session.frozenConversations?.length ? session.frozenConversations : (campaign?.savedConversations ? JSON.parse(JSON.stringify(campaign.savedConversations)) : []);
  session.frozenHandouts = session.frozenHandouts?.length ? session.frozenHandouts : (campaign?.savedHandouts ? JSON.parse(JSON.stringify(campaign.savedHandouts)) : []);
  session.frozenMacros = session.frozenMacros?.length ? session.frozenMacros : (campaign?.macros ? JSON.parse(JSON.stringify(campaign.macros)) : []);

  if (!session.initialBaselineConfig) {
    const raw = session.stagedState || session.liveState || {
      sceneName: session.frozenScenes?.[0]?.name || 'Escena Inicial Migrada',
      backgroundUrl: session.frozenScenes?.[0]?.backgroundUrl || '',
      characters: [],
      props: [],
      weather: 'none',
      lighting: 'normal',
      weatherIntensity: 0.5,
      fitMode: 'cover',
      zoom: 1,
      focalPoint: { x: 50, y: 50 },
      locationBanner: { text: '', visible: false },
      isBlackout: false,
      ambientAudioUrl: '',
      ambientVolume: 0.5,
      ambientPlaying: false,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      shakeTrigger: 0,
      lightningTrigger: 0,
    };
    session.initialBaselineConfig = {
      state: JSON.parse(JSON.stringify(raw)),
      savedAt: migrationTimestamp,
      version: 1,
      label: `Línea base fijada en migración (${dateStr})`,
    };
  }

  session.isMigratedFromLegacy = true;
  session.legacyMigrationNote = `Sesión migrada desde formato antiguo el ${dateStr}. Los snapshots de escenas, personajes y diálogos fueron congelados a partir del estado de la campaña en esta fecha y pueden diferir de la preparación original si la campaña sufrió modificaciones previas.`;
  session.updatedAt = migrationTimestamp;

  await db.sessions.put(session);
  return session;
}
