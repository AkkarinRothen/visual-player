import type { CharacterOnScreen, Scene } from '../types';
import { db } from '../db';
import { generateId } from '../db/dbUtils';

export interface SceneDraftState {
  campaignId: string;
  sceneId: string;
  sceneName: string;
  characters: CharacterOnScreen[];
  bgOffset: { x: number; y: number };
  editorZoom: number;
  selectedCharId: string | null;
  activeTab: 'figures' | 'background' | 'nudge';
  updatedAt: number;
  revision: number;
  savedSceneTimestamp?: number;
}

const DRAFT_PREFIX = 'vp_scene_draft_';

/**
 * Obtiene la clave de almacenamiento para una escena y campaña específicas.
 */
function getDraftKey(campaignId: string, sceneId: string): string {
  return `${DRAFT_PREFIX}${campaignId}_${sceneId}`;
}

/**
 * Guarda inmediatamente de forma atómica el borrador de una escena en almacenamiento persistente.
 * Combina localStorage (durabilidad instantánea ante cierre forzado) y Dexie settings.
 */
export function saveSceneDraft(draft: SceneDraftState): void {
  const key = getDraftKey(draft.campaignId, draft.sceneId);
  const serialized = JSON.stringify(draft);
  try {
    localStorage.setItem(key, serialized);
  } catch (err) {
    console.warn('Error guardando borrador en localStorage:', err);
  }

  // Respaldo asíncrono en Dexie settings sin bloquear
  try {
    db.settings.put({ key, value: serialized }).catch(() => {});
  } catch {
    // Ignorar si db no está inicializada
  }
}

/**
 * Obtiene el borrador activo guardado para una escena, si existe.
 */
export function getSceneDraft(campaignId: string, sceneId: string): SceneDraftState | null {
  const key = getDraftKey(campaignId, sceneId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SceneDraftState;
    if (parsed && parsed.sceneId === sceneId && Array.isArray(parsed.characters)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Error leyendo borrador:', err);
  }
  return null;
}

/**
 * Elimina el borrador una vez que el usuario consolida y guarda la escena o decide descartarlo.
 */
export function clearSceneDraft(campaignId: string, sceneId: string): void {
  const key = getDraftKey(campaignId, sceneId);
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Error eliminando borrador de localStorage:', err);
  }
  try {
    db.settings.delete(key).catch(() => {});
  } catch {}
}

/**
 * Comprueba si existe un borrador que contenga cambios posteriores a la última versión guardada de la escena.
 */
export function hasUnsavedDraft(campaignId: string, sceneId: string, sceneLastSaved?: number): boolean {
  const draft = getSceneDraft(campaignId, sceneId);
  if (!draft) return false;
  if (!sceneLastSaved) return true;
  // Si el borrador es al menos 1 segundo más reciente que la escena guardada
  return draft.updatedAt > sceneLastSaved + 1000;
}

/**
 * Crea una copia independiente de la escena a partir del borrador para no perder trabajo.
 */
export function createSceneCopyFromDraft(originalScene: Scene, draft: SceneDraftState): Scene {
  return {
    ...originalScene,
    id: generateId('scene'),
    name: `${originalScene.name} (Copia Borrador)`,
    activeCharacters: [...draft.characters],
    focalPoint: draft.bgOffset,
  };
}
