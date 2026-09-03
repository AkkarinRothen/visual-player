import { describe, it, expect } from 'vitest';
import type { DisplayState, SoundboardPad } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';
import {
  getDefaultSoundboardBank,
  filterPadsByCategory,
  DEFAULT_SOUNDBOARD_PADS,
} from './soundboardDefaults';
import { reduceDisplayCommand } from '../display/displayCommandReducer';

describe('Tactile Soundboard & SFX Rapid Matrix Suite', () => {
  const initialDisplay: DisplayState = {
    currentSceneId: 'sc-crypt',
    sceneName: 'Cripta Olvidada',
    backgroundUrl: 'https://example.com/crypt.jpg',
    characters: [],
    weather: 'fog',
    weatherIntensity: 0.8,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Cripta', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/crypt-ambient.mp3',
    ambientPlaying: true,
    ambientVolume: 0.6,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
  };

  const createMsg = (type: string, payload: any): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'm-sfx-test',
    commandId: 'cmd-sfx-test',
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'ephemeral',
    requiresAck: false,
    type: type as any,
    payload,
  });

  it('1. Generates complete 12-pad default bank covering all four categories', () => {
    const bank = getDefaultSoundboardBank('Campaña del Dragón');
    expect(bank.pads.length).toBe(12);
    expect(bank.name).toContain('Campaña del Dragón');

    const categories = new Set(bank.pads.map((p) => p.category));
    expect(categories.has('combat')).toBe(true);
    expect(categories.has('ambient')).toBe(true);
    expect(categories.has('creature')).toBe(true);
    expect(categories.has('narrative')).toBe(true);
  });

  it('2. Filters pads correctly by category without mutating original bank', () => {
    const combatPads = filterPadsByCategory(DEFAULT_SOUNDBOARD_PADS, 'combat');
    expect(combatPads.every((p) => p.category === 'combat')).toBe(true);
    expect(combatPads.length).toBe(3);

    const ambientPads = filterPadsByCategory(DEFAULT_SOUNDBOARD_PADS, 'ambient');
    expect(ambientPads.every((p) => p.category === 'ambient')).toBe(true);
    expect(ambientPads.length).toBe(3);

    const allPads = filterPadsByCategory(DEFAULT_SOUNDBOARD_PADS, 'all');
    expect(allPads.length).toBe(DEFAULT_SOUNDBOARD_PADS.length);
  });

  it('3. Processes PLAY_SFX and emergency STOP_ALL_SFX cleanly with zero scene side-effects', () => {
    const sfxPad: SoundboardPad = {
      id: 'pad-sword',
      label: 'Espadazo',
      category: 'combat',
      sfxPreset: 'sword_clash',
    };

    // 1. Trigger SFX
    const playMsg = createMsg('PLAY_SFX', {
      id: sfxPad.id,
      name: sfxPad.label,
      synthPreset: sfxPad.sfxPreset,
    });
    const playResult = reduceDisplayCommand(initialDisplay, playMsg);

    expect(playResult.success).toBe(true);
    if (playResult.success) {
      expect(playResult.nextState.lastSfx).toBeDefined();
      expect(playResult.nextState.lastSfx?.id).toBe('pad-sword');
      expect(playResult.sideEffects).toEqual([
        { type: 'play_synth', payload: { preset: 'sword_clash' } },
      ]);
      // Background, ambient audio, and weather remain 100% intact
      expect(playResult.nextState.backgroundUrl).toBe('https://example.com/crypt.jpg');
      expect(playResult.nextState.ambientPlaying).toBe(true);
      expect(playResult.nextState.ambientVolume).toBe(0.6);
    }

    // 2. Trigger Emergency Stop All SFX
    const stateWithPlayingSfx: DisplayState = {
      ...initialDisplay,
      lastSfx: { id: 'pad-sword', name: 'Espadazo', synthPreset: 'sword_clash' } as any,
    };
    const stopMsg = createMsg('STOP_ALL_SFX', {});
    const stopResult = reduceDisplayCommand(stateWithPlayingSfx, stopMsg);

    expect(stopResult.success).toBe(true);
    if (stopResult.success) {
      expect(stopResult.nextState.lastSfx).toBeNull();
      expect(stopResult.sideEffects).toEqual([{ type: 'stop_sfx' }]);
      // Ambient music must NOT be silenced by SFX Stop
      expect(stopResult.nextState.ambientPlaying).toBe(true);
    }
  });
});
