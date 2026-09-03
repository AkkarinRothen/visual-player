import { describe, it, expect } from 'vitest';
import { reduceDisplayCommand } from './displayCommandReducer';
import type { DisplayState, SceneZoneEmitter, CharacterOnScreen } from '../../types';

describe('Atmospheric Zone Emitters Suite (SceneZoneEmitter)', () => {
  const initialState: DisplayState = {
    currentSceneId: 'sc-crypt',
    sceneName: 'Cripta Olvidada',
    backgroundUrl: 'https://example.com/crypt.jpg',
    characters: [
      {
        id: 'npc-ghoul',
        name: 'Necrófago',
        avatarUrl: 'https://example.com/ghoul.png',
        position: 'center-right',
        normalizedX: 65,
        normalizedY: 85,
        isSpeaking: false,
      },
    ],
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: { text: 'Cripta', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
    emitters: [],
  };

  const sampleEmitters: SceneZoneEmitter[] = [
    {
      id: 'emitter-ground-fog',
      type: 'fog',
      name: 'Niebla en el suelo',
      x: 0,
      y: 70,
      width: 100,
      height: 30,
      color: '#e2e8f0',
      density: 0.7,
      speed: 0.8,
      opacity: 0.45,
      zIndex: 5, // Behind characters at zIndex 10
      enabled: true,
    },
    {
      id: 'emitter-chimney-smoke',
      type: 'smoke',
      name: 'Humo de chimenea',
      x: 35,
      y: 40,
      width: 15,
      height: 35,
      color: '#94a3b8',
      density: 0.5,
      speed: 1.2,
      direction: 270, // Rising straight up
      opacity: 0.6,
      zIndex: 12,
      attachedTo: {
        instanceId: 'npc-ghoul',
        offsetX: 0,
        offsetY: -30,
      },
      enabled: true,
    },
    {
      id: 'emitter-window-rain',
      type: 'rain',
      name: 'Lluvia tras ventana',
      x: 10,
      y: 15,
      width: 25,
      height: 40,
      color: '#7dd3fc',
      density: 0.8,
      speed: 1.5,
      direction: 80,
      opacity: 0.7,
      zIndex: 3,
      isClipped: true, // Strictly contained within window box
      enabled: true,
    },
  ];

  it('1. Reduces UPDATE_ZONE_EMITTERS command and sets active emitters list', () => {
    const result = reduceDisplayCommand(initialState, {
      type: 'UPDATE_ZONE_EMITTERS',
      payload: sampleEmitters,
      sequence: 1,
      timestamp: Date.now(),
      messageId: 'msg-emitters-1',
    } as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.emitters).toHaveLength(3);
      expect(result.nextState.emitters![0].type).toBe('fog');
      expect(result.nextState.emitters![2].isClipped).toBe(true);
    }
  });

  it('2. Rejects invalid UPDATE_ZONE_EMITTERS payload deterministically', () => {
    const result = reduceDisplayCommand(initialState, {
      type: 'UPDATE_ZONE_EMITTERS',
      payload: 'invalid-not-an-array',
      sequence: 2,
      timestamp: Date.now(),
      messageId: 'msg-emitters-2',
    } as any);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe('INVALID_EMITTERS_PAYLOAD');
    }
  });

  it('3. Loads scene emitters automatically upon SET_SCENE', () => {
    const result = reduceDisplayCommand(initialState, {
      type: 'SET_SCENE',
      payload: {
        id: 'sc-tavern',
        name: 'Taberna del Jabalí',
        backgroundUrl: 'https://example.com/tavern.jpg',
        emitters: sampleEmitters,
      },
      sequence: 3,
      timestamp: Date.now(),
      messageId: 'msg-set-scene-emitters',
    } as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.emitters).toHaveLength(3);
      expect(result.nextState.emitters![1].name).toBe('Humo de chimenea');
    }
  });

  it('4. Filters out attached emitters when target instance is deleted from scene', () => {
    const activeCharacters: CharacterOnScreen[] = []; // Target 'npc-ghoul' is missing/deleted

    const validActiveEmitters = sampleEmitters.filter((emitter) => {
      if (!emitter.enabled) return false;
      if (emitter.attachedTo) {
        const charExists = activeCharacters.some((c) => c.id === emitter.attachedTo?.instanceId);
        if (!charExists) return false;
      }
      return true;
    });

    // Chimney smoke was attached to 'npc-ghoul' and must be filtered out
    expect(validActiveEmitters).toHaveLength(2);
    expect(validActiveEmitters.some((e) => e.id === 'emitter-chimney-smoke')).toBe(false);
    expect(validActiveEmitters.some((e) => e.id === 'emitter-ground-fog')).toBe(true);
    expect(validActiveEmitters.some((e) => e.id === 'emitter-window-rain')).toBe(true);
  });
});
