import { describe, it, expect } from 'vitest';
import type { DisplayState } from '../../types';
import {
  calculatePendingChangesCount,
  computeCategoryDiffs,
  mergeSelectiveState,
} from './displayDiff';

const baseDisplayState: DisplayState = {
  currentSceneId: 'scene-tavern',
  sceneName: 'Taberna del Dragón',
  backgroundUrl: 'https://example.com/tavern.jpg',
  characters: [
    {
      id: 'char-gromm',
      name: 'Gromm',
      avatarUrl: 'https://example.com/gromm.jpg',
      position: 'center-left',
      isSpeaking: false,
    },
  ],
  weather: 'none',
  weatherIntensity: 0.5,
  lighting: 'normal',
  locationBanner: {
    text: 'TABERNA DEL DRAGÓN',
    subtitle: 'Valle Central',
    visible: true,
  },
  isBlackout: false,
  shakeTrigger: 0,
  lightningTrigger: 0,
  ambientAudioUrl: '',
  ambientPlaying: false,
  ambientVolume: 0.5,
  lastSfx: null,
  combatState: {
    isActive: false,
    round: 1,
    currentTurnIndex: 0,
    combatants: [],
  },
};

describe('displayDiff domain logic', () => {
  it('returns 0 pending changes when live and staged are identical', () => {
    const live = { ...baseDisplayState };
    const staged = { ...baseDisplayState };

    const count = calculatePendingChangesCount(live, staged, 'staging');
    expect(count).toBe(0);

    const diffs = computeCategoryDiffs(live, staged);
    expect(diffs.length).toBe(0);
  });

  it('returns 0 pending changes when in live mode regardless of differences', () => {
    const live = { ...baseDisplayState };
    const staged = { ...baseDisplayState, weather: 'storm' as const };

    const count = calculatePendingChangesCount(live, staged, 'live');
    expect(count).toBe(0);
  });

  it('accurately counts multi-category changes in staging mode', () => {
    const live = { ...baseDisplayState };
    const staged: DisplayState = {
      ...baseDisplayState,
      backgroundUrl: 'https://example.com/mountain.jpg',
      weather: 'snow',
      lighting: 'night',
      isBlackout: true,
    };

    const count = calculatePendingChangesCount(live, staged, 'staging');
    expect(count).toBe(4);

    const diffs = computeCategoryDiffs(live, staged);
    expect(diffs.map((d) => d.key)).toEqual(['background', 'weather', 'lighting', 'blackout']);
  });

  it('selectively merges only the chosen categories into liveState', () => {
    const live = { ...baseDisplayState };
    const staged: DisplayState = {
      ...baseDisplayState,
      currentSceneId: 'scene-mountain',
      sceneName: 'Pico Nevado',
      backgroundUrl: 'https://example.com/mountain.jpg',
      weather: 'snow',
      weatherIntensity: 0.9,
      lighting: 'night',
      locationBanner: {
        text: 'PICO NEVADO',
        subtitle: '3.000m',
        visible: true,
      },
    };

    // Merge only weather and lighting
    const merged = mergeSelectiveState(live, staged, ['weather', 'lighting']);

    // Changed in live
    expect(merged.weather).toBe('snow');
    expect(merged.weatherIntensity).toBe(0.9);
    expect(merged.lighting).toBe('night');

    // Untouched in live (kept old values)
    expect(merged.backgroundUrl).toBe(baseDisplayState.backgroundUrl);
    expect(merged.sceneName).toBe(baseDisplayState.sceneName);
    expect(merged.locationBanner.text).toBe(baseDisplayState.locationBanner.text);
  });
});
