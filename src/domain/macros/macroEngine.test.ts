import { describe, it, expect } from 'vitest';
import type { CinematicMacro, DisplayState, MacroStep } from '../../types';
import { applyStepToState, accumulateMacroToState } from './macroEngine';

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

describe('macroEngine domain logic', () => {
  it('applies a single step with blackout and weather modification', () => {
    const step: MacroStep = {
      id: 'step-1',
      delayMs: 1000,
      blackout: true,
      weather: 'storm',
      weatherIntensity: 0.9,
    };

    const next = applyStepToState(step, baseDisplayState);
    expect(next.isBlackout).toBe(true);
    expect(next.weather).toBe('storm');
    expect(next.weatherIntensity).toBe(0.9);
    expect(next.characters.length).toBe(1); // Gromm is still there
  });

  it('adds unique characters without duplicating existing IDs', () => {
    const step: MacroStep = {
      id: 'step-chars',
      delayMs: 0,
      charactersToAdd: [
        {
          id: 'char-gromm', // Duplicate ID
          name: 'Gromm Duplicate',
          avatarUrl: 'https://example.com/gromm2.jpg',
          position: 'right',
          isSpeaking: false,
        },
        {
          id: 'char-vaelthazar', // New ID
          name: 'Vaelthazar',
          avatarUrl: 'https://example.com/dragon.jpg',
          position: 'center-right',
          isSpeaking: true,
        },
      ],
    };

    const next = applyStepToState(step, baseDisplayState);
    expect(next.characters.length).toBe(2);
    expect(next.characters.map((c) => c.id)).toEqual(['char-gromm', 'char-vaelthazar']);
  });

  it('accumulates multi-step macros into a consolidated state', () => {
    const macro: CinematicMacro = {
      id: 'macro-boss-reveal',
      name: 'Aparición del Jefe',
      description: 'Blackout luego revelación',
      icon: 'Skull',
      steps: [
        {
          id: 'step-1',
          delayMs: 1500,
          blackout: true,
        },
        {
          id: 'step-2',
          delayMs: 0,
          blackout: false,
          sceneId: 'scene-boss-room',
          backgroundUrl: 'https://example.com/boss.jpg',
          lighting: 'blood_moon',
          locationBanner: {
            text: '¡EL JUICIO FINAL!',
            subtitle: 'Sala del Trono',
            visible: true,
          },
        },
      ],
    };

    const result = accumulateMacroToState(macro, baseDisplayState);
    expect(result.isBlackout).toBe(false);
    expect(result.currentSceneId).toBe('scene-boss-room');
    expect(result.backgroundUrl).toBe('https://example.com/boss.jpg');
    expect(result.lighting).toBe('blood_moon');
    expect(result.locationBanner.text).toBe('¡EL JUICIO FINAL!');
  });
});
