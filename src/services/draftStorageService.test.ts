import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSceneDraft,
  getSceneDraft,
  clearSceneDraft,
  hasUnsavedDraft,
  createSceneCopyFromDraft,
  type SceneDraftState,
} from './draftStorageService';
import type { Scene } from '../types';

describe('draftStorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('guarda y recupera un borrador de escena de forma atómica', () => {
    const draft: SceneDraftState = {
      campaignId: 'camp-1',
      sceneId: 'scene-1',
      sceneName: 'Cueva de los Lamentos',
      characters: [
        {
          id: 'char-inst-1',
          characterId: 'char-1',
          name: 'Guerrero',
          avatarUrl: 'data:image/png;base64,abc',
          position: 'center-left',
          isSpeaking: false,
          normalizedX: 0.35,
          normalizedY: 0.75,
        },
      ],
      bgOffset: { x: 10, y: -5 },
      editorZoom: 1.2,
      selectedCharId: 'char-inst-1',
      activeTab: 'figures',
      updatedAt: 1000000,
      revision: 1,
    };

    saveSceneDraft(draft);

    const retrieved = getSceneDraft('camp-1', 'scene-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.sceneName).toBe('Cueva de los Lamentos');
    expect(retrieved?.characters).toHaveLength(1);
    expect(retrieved?.characters[0].normalizedX).toBe(0.35);
    expect(retrieved?.bgOffset).toEqual({ x: 10, y: -5 });
  });

  it('detecta si hay un borrador no consolidado más reciente que la escena guardada', () => {
    const now = Date.now();
    const draft: SceneDraftState = {
      campaignId: 'camp-1',
      sceneId: 'scene-2',
      sceneName: 'Plaza Mayor',
      characters: [],
      bgOffset: { x: 0, y: 0 },
      editorZoom: 1,
      selectedCharId: null,
      activeTab: 'figures',
      updatedAt: now + 5000,
      revision: 2,
    };

    saveSceneDraft(draft);

    // Si la escena consolidada fue guardada antes del borrador
    expect(hasUnsavedDraft('camp-1', 'scene-2', now)).toBe(true);
    // Si la escena consolidada es posterior al borrador
    expect(hasUnsavedDraft('camp-1', 'scene-2', now + 10000)).toBe(false);
  });

  it('elimina el borrador al consolidar la escena', () => {
    const draft: SceneDraftState = {
      campaignId: 'camp-1',
      sceneId: 'scene-3',
      sceneName: 'Castillo',
      characters: [],
      bgOffset: { x: 0, y: 0 },
      editorZoom: 1,
      selectedCharId: null,
      activeTab: 'figures',
      updatedAt: Date.now(),
      revision: 1,
    };

    saveSceneDraft(draft);
    expect(getSceneDraft('camp-1', 'scene-3')).not.toBeNull();

    clearSceneDraft('camp-1', 'scene-3');
    expect(getSceneDraft('camp-1', 'scene-3')).toBeNull();
  });

  it('permite crear una copia independiente de la escena desde el borrador', () => {
    const originalScene: Scene = {
      id: 'scene-orig',
      name: 'Entrada del Templo',
      backgroundUrl: 'bg.jpg',
      activeCharacters: [],
    };

    const draft: SceneDraftState = {
      campaignId: 'camp-1',
      sceneId: 'scene-orig',
      sceneName: 'Entrada del Templo',
      characters: [
        {
          id: 'char-1',
          characterId: 'c1',
          name: 'Mago',
          avatarUrl: 'mago.png',
          position: 'center-left',
          isSpeaking: false,
          normalizedX: 0.5,
          normalizedY: 0.8,
        },
      ],
      bgOffset: { x: 15, y: 20 },
      editorZoom: 1,
      selectedCharId: 'char-1',
      activeTab: 'figures',
      updatedAt: Date.now(),
      revision: 3,
    };

    const copy = createSceneCopyFromDraft(originalScene, draft);
    expect(copy.id).not.toBe(originalScene.id);
    expect(copy.name).toContain('Copia Borrador');
    expect(copy.activeCharacters).toHaveLength(1);
    expect(copy.focalPoint).toEqual({ x: 15, y: 20 });
  });
});
