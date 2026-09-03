import type { SessionCheckpoint, DisplayState, GameSession } from '../types';
import { db } from './index';
import { generateId } from './dbUtils';

export async function getCampaignCheckpoints(campaignId: string): Promise<SessionCheckpoint[]> {
  const all = await db.checkpoints.where('campaignId').equals(campaignId).toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSessionCheckpoints(sessionId: string): Promise<SessionCheckpoint[]> {
  const all = await db.checkpoints.where('sessionId').equals(sessionId).toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveCheckpoint(cp: SessionCheckpoint): Promise<void> {
  await db.checkpoints.put(cp);
  if (cp.type === 'auto') {
    await cleanOldAutoCheckpoints(cp.campaignId, 30);
  }
}

export async function deleteCheckpoint(id: string): Promise<void> {
  await db.checkpoints.delete(id);
}

export async function cleanOldAutoCheckpoints(campaignId: string, limit: number = 30): Promise<void> {
  const autoCheckpoints = await db.checkpoints
    .where('campaignId')
    .equals(campaignId)
    .filter((cp) => cp.type === 'auto')
    .toArray();

  autoCheckpoints.sort((a, b) => b.createdAt - a.createdAt);
  if (autoCheckpoints.length > limit) {
    const toDelete = autoCheckpoints.slice(limit);
    for (const item of toDelete) {
      await db.checkpoints.delete(item.id);
    }
  }
}

/**
 * Crea un punto de control (checkpoint) explícitamente vinculado a una sesión concreta.
 */
export async function createSessionCheckpoint(
  sessionId: string,
  campaignId: string,
  name: string,
  state: DisplayState,
  type: 'manual' | 'auto' = 'manual',
  trigger: string = 'manual_snapshot'
): Promise<SessionCheckpoint> {
  const cp: SessionCheckpoint = {
    id: generateId('cp'),
    campaignId,
    sessionId,
    name,
    type,
    trigger,
    createdAt: Date.now(),
    state: JSON.parse(JSON.stringify(state)),
  };
  await saveCheckpoint(cp);
  return cp;
}

/**
 * Restaura un checkpoint como una NUEVA preparación por defecto,
 * sin sobrescribir la sesión actual ni publicar nada en la Mesa.
 */
export async function restoreCheckpointAsNewSession(
  checkpointId: string,
  customName?: string
): Promise<GameSession> {
  const cp = await db.checkpoints.get(checkpointId);
  if (!cp) throw new Error(`Punto de control ${checkpointId} no encontrado`);

  const campaign = await db.campaigns.get(cp.campaignId);
  const existing = await db.sessions.where('campaignId').equals(cp.campaignId).toArray();
  const sessionNumber = existing.filter((s) => s.status !== 'archived' && !s.isDeleted).length + 1;

  const newSession: GameSession = {
    id: generateId('gs'),
    campaignId: cp.campaignId,
    name: customName || `${cp.name} (Restaurada)`,
    status: 'preparing',
    schemaVersion: 1,
    planNotes: `Restaurada desde el punto de control: ${cp.name} (${new Date(cp.createdAt).toLocaleString()})`,
    stagedState: JSON.parse(JSON.stringify(cp.state)),
    liveState: null,
    frozenScenes: campaign?.scenes ? JSON.parse(JSON.stringify(campaign.scenes)) : [],
    frozenCharacters: campaign?.characters ? JSON.parse(JSON.stringify(campaign.characters)) : [],
    revision: 1,
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    sessionNumber,
  };

  await db.sessions.put(newSession);
  return newSession;
}
