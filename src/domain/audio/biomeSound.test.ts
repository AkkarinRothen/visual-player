import { describe, it, expect } from 'vitest';
import type { DisplayState, BiomeSoundProfile } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';
import {
  getDefaultBiomeProfiles,
  findBiomeProfile,
  resolveBiomeTrackLayer,
} from './biomeDefaults';
import { resolveAudioTransitionPlan } from './biomeSoundCoordinator';
import { reduceDisplayCommand } from '../display/displayCommandReducer';

describe('Biome & Situation Soundtrack Selector Suite', () => {
  const initialDisplay: DisplayState = {
    currentSceneId: 'sc-tavern',
    sceneName: 'Taberna del Jabalí Cantor',
    backgroundUrl: 'https://example.com/tavern.jpg',
    characters: [
      {
        id: 'npc-bard',
        name: 'Bardo Elfo',
        avatarUrl: 'https://example.com/bard.png',
        position: 'center-right',
        isSpeaking: false,
      },
    ],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: { text: 'Taberna', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/audio/tavern-lute.mp3',
    ambientPlaying: true,
    ambientVolume: 0.6,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
  };

  const createMsg = (payload: any): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'm-audio-test',
    commandId: 'cmd-audio-test',
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'critical',
    requiresAck: true,
    type: 'FULL_STATE',
    payload,
  });

  it('1. Provides 6 default biome profiles covering all four dramatic situations', () => {
    const profiles = getDefaultBiomeProfiles();
    expect(profiles.length).toBe(6);

    const biomes = new Set(profiles.map((p) => p.biome));
    expect(biomes.has('tavern')).toBe(true);
    expect(biomes.has('forest')).toBe(true);
    expect(biomes.has('dungeon')).toBe(true);
    expect(biomes.has('city')).toBe(true);
    expect(biomes.has('ruins')).toBe(true);
    expect(biomes.has('sea')).toBe(true);

    profiles.forEach((p) => {
      expect(p.situations.exploration).toBeDefined();
      expect(p.situations.tension).toBeDefined();
      expect(p.situations.combat).toBeDefined();
      expect(p.situations.rest).toBeDefined();
    });
  });

  it('2. Resolves target track layer accurately by biome and situation', () => {
    const profiles = getDefaultBiomeProfiles();
    const tavernProfile = findBiomeProfile(profiles, 'tavern') as BiomeSoundProfile;
    expect(tavernProfile).toBeDefined();

    const combatLayer = resolveBiomeTrackLayer(tavernProfile, 'combat');
    expect(combatLayer.musicUrl).toContain('tavern-brawl');
    expect(combatLayer.musicVolume).toBeGreaterThan(0.7);

    const restLayer = resolveBiomeTrackLayer(tavernProfile, 'rest');
    expect(restLayer.musicUrl).toContain('tavern-hearth');
    expect(restLayer.crossfadeSeconds).toBe(3.0);
  });

  it('3. Guarantees zero unnecessary audio restarts when identical track is already playing', () => {
    const currentAudio = {
      url: 'https://example.com/audio/tavern-lute.mp3',
      volume: 0.6,
      playing: true,
    };

    // Target layer with identical musicUrl
    const targetLayer = {
      musicUrl: 'https://example.com/audio/tavern-lute.mp3',
      musicVolume: 0.8,
      crossfadeSeconds: 2.0,
    };

    const plan = resolveAudioTransitionPlan(currentAudio, targetLayer);
    expect(plan.action).toBe('keep_playing_adjust_volume');
    expect(plan.crossfade).toBe(false); // NO restart/cutout!
    expect(plan.volume).toBe(0.8);
    expect(plan.url).toBe(currentAudio.url);
  });

  it('4. Applies smooth crossfade when switching from exploration to combat track', () => {
    const currentAudio = {
      url: 'https://example.com/audio/forest-peace.mp3',
      volume: 0.5,
      playing: true,
    };

    const targetLayer = {
      musicUrl: 'https://example.com/audio/forest-hunt.mp3',
      musicVolume: 0.85,
      crossfadeSeconds: 1.5,
    };

    const plan = resolveAudioTransitionPlan(currentAudio, targetLayer);
    expect(plan.action).toBe('crossfade_new_track');
    expect(plan.crossfade).toBe(true);
    expect(plan.crossfadeSeconds).toBe(1.5);
    expect(plan.url).toBe('https://example.com/audio/forest-hunt.mp3');
  });

  it('5. Reduces FULL_STATE with soundtrack update preserving stage background, characters, and lighting intact', () => {
    const updatedState: DisplayState = {
      ...initialDisplay,
      ambientAudioUrl: 'https://example.com/audio/tavern-brawl.mp3',
      ambientVolume: 0.85,
      ambientPlaying: true,
      currentSituation: 'combat',
    };
    const msg = createMsg(updatedState);

    const result = reduceDisplayCommand(initialDisplay, msg);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.ambientAudioUrl).toBe('https://example.com/audio/tavern-brawl.mp3');
      expect(result.nextState.ambientVolume).toBe(0.85);
      expect(result.nextState.ambientPlaying).toBe(true);
      expect(result.nextState.currentSituation).toBe('combat');

      // Verify underlying stage is completely unharmed
      expect(result.nextState.backgroundUrl).toBe('https://example.com/tavern.jpg');
      expect(result.nextState.characters).toHaveLength(1);
      expect(result.nextState.lighting).toBe('normal');
    }
  });
});
