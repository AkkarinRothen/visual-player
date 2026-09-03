import { describe, it, expect } from 'vitest';
import type { DisplayState, SceneLight, SceneLightingPreset } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';
import {
  getDefaultLightingPresets,
  findLightingPreset,
  applyLightingPreset,
} from './lightingPresetDefaults';
import { reduceDisplayCommand } from './displayCommandReducer';

describe('Scene Lighting Presets & Composition Suite', () => {
  const initialDisplay: DisplayState = {
    currentSceneId: 'sc-dungeon-antechamber',
    sceneName: 'Antecámara de la Cripta',
    backgroundUrl: 'https://example.com/crypt.jpg',
    characters: [
      {
        id: 'npc-paladin',
        name: 'Paladín Sagrado',
        avatarUrl: 'https://example.com/paladin.png',
        position: 'center-left',
        isSpeaking: false,
      },
    ],
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'night',
    locationBanner: { text: 'Cripta Olvidada', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/audio/crypt-echo.mp3',
    ambientPlaying: true,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
    lights: [
      {
        id: 'light-torch-initial',
        name: 'Antorcha del Jugador',
        preset: 'torch',
        color: '#ffaa33',
        intensity: 1.0,
        radiusPct: 25,
        normalizedX: 30,
        normalizedY: 50,
        flicker: true,
        visible: true,
      },
    ],
  };

  const createMsg = (payload: SceneLight[]): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'm-lights-test',
    commandId: 'cmd-lights-test',
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'critical',
    requiresAck: true,
    type: 'UPDATE_SCENE_LIGHTS',
    payload,
  });

  it('1. Provides 3 default presets (Warm Tavern, Moonlit Ruins, Arcane Shrine) with calibrated lighting', () => {
    const presets = getDefaultLightingPresets();
    expect(presets.length).toBe(3);

    const ids = new Set(presets.map((p) => p.id));
    expect(ids.has('preset-warm-tavern')).toBe(true);
    expect(ids.has('preset-moonlit-ruins')).toBe(true);
    expect(ids.has('preset-arcane-shrine')).toBe(true);

    const tavern = findLightingPreset(presets, 'preset-warm-tavern') as SceneLightingPreset;
    expect(tavern.lightingFilter).toBe('torch_flicker');
    expect(tavern.lights.length).toBe(3);

    const moonlit = findLightingPreset(presets, 'preset-moonlit-ruins') as SceneLightingPreset;
    expect(moonlit.lightingFilter).toBe('night');
    expect(moonlit.lights.some((l) => l.color === '#99ccff')).toBe(true);

    const arcane = findLightingPreset(presets, 'preset-arcane-shrine') as SceneLightingPreset;
    expect(arcane.lightingFilter).toBe('mystic_violet');
    expect(arcane.lights.some((l) => l.preset === 'magic')).toBe(true);
  });

  it('2. Replaces all existing lights in "replace" mode', () => {
    const presets = getDefaultLightingPresets();
    const moonlit = findLightingPreset(presets, 'preset-moonlit-ruins') as SceneLightingPreset;

    const replaced = applyLightingPreset(initialDisplay.lights || [], moonlit, 'replace');
    expect(replaced.length).toBe(2);
    // Initial torch must not be in replaced set
    expect(replaced.some((l) => l.id === 'light-torch-initial')).toBe(false);
    expect(replaced[0].id).toBe('light-moon-overhead');
  });

  it('3. Merges lights idempotently without duplicates in "merge" mode', () => {
    const presets = getDefaultLightingPresets();
    const tavern = findLightingPreset(presets, 'preset-warm-tavern') as SceneLightingPreset;

    // First merge: 1 existing + 3 tavern lights = 4 total
    const mergedOnce = applyLightingPreset(initialDisplay.lights || [], tavern, 'merge');
    expect(mergedOnce.length).toBe(4);
    expect(mergedOnce.some((l) => l.id === 'light-torch-initial')).toBe(true);
    expect(mergedOnce.some((l) => l.id === 'light-tavern-hearth')).toBe(true);

    // Second merge with same preset: MUST NOT DUPLICATE (idempotent!)
    const mergedTwice = applyLightingPreset(mergedOnce, tavern, 'merge');
    expect(mergedTwice.length).toBe(4);
  });

  it('4. Reduces SET_SCENE_LIGHTS preserving background, characters, audio, and combat intact', () => {
    const presets = getDefaultLightingPresets();
    const arcane = findLightingPreset(presets, 'preset-arcane-shrine') as SceneLightingPreset;
    const nextLights = applyLightingPreset([], arcane, 'replace');

    const msg = createMsg(nextLights);
    const result = reduceDisplayCommand(initialDisplay, msg);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.lights).toHaveLength(3);
      expect(result.nextState.lights?.[0].name).toBe('Orbe Rúnico');

      // Stage preservation guarantees:
      expect(result.nextState.backgroundUrl).toBe('https://example.com/crypt.jpg');
      expect(result.nextState.characters).toHaveLength(1);
      expect(result.nextState.characters[0].name).toBe('Paladín Sagrado');
      expect(result.nextState.ambientAudioUrl).toBe('https://example.com/audio/crypt-echo.mp3');
      expect(result.nextState.combatState.isActive).toBe(false);
    }
  });
});
