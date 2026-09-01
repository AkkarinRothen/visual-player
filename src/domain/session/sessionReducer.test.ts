import { describe, it, expect } from 'vitest';
import type { DisplayState } from '../../types';
import {
  initialSessionState,
  sessionReducer,
} from './sessionReducer';

const sampleDisplayState: DisplayState = {
  currentSceneId: 'scene-tavern',
  sceneName: 'Taberna del Dragón',
  backgroundUrl: 'https://example.com/tavern.jpg',
  characters: [],
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

describe('sessionReducer domain machine', () => {
  it('initializes liveState and stagedState correctly with INIT_STATE', () => {
    const state = sessionReducer(initialSessionState, {
      type: 'INIT_STATE',
      payload: sampleDisplayState,
    });

    expect(state.liveState.sceneName).toBe('Taberna del Dragón');
    expect(state.stagedState.sceneName).toBe('Taberna del Dragón');
    expect(state.operationMode).toBe('live');
  });

  it('updates both liveState and stagedState when in live mode, recording history', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT_STATE',
      payload: sampleDisplayState,
    });

    state = sessionReducer(state, {
      type: 'UPDATE_DISPLAY',
      payload: {
        updater: (prev) => ({ ...prev, weather: 'rain' }),
        description: 'Clima: rain',
      },
    });

    expect(state.liveState.weather).toBe('rain');
    expect(state.stagedState.weather).toBe('rain');
    expect(state.pastEvents.length).toBe(1);
    expect(state.pastEvents[0].description).toBe('Clima: rain');
    expect(state.pastEvents[0].stateSnapshot.weather).toBe('none');
  });

  it('updates only stagedState when in staging mode, leaving liveState untouched', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT_STATE',
      payload: sampleDisplayState,
    });

    state = sessionReducer(state, {
      type: 'SET_OPERATION_MODE',
      payload: 'staging',
    });

    state = sessionReducer(state, {
      type: 'UPDATE_DISPLAY',
      payload: {
        updater: (prev) => ({ ...prev, weather: 'snow' }),
        description: 'Clima: snow',
      },
    });

    // Staged updated, live remains unchanged
    expect(state.stagedState.weather).toBe('snow');
    expect(state.liveState.weather).toBe('none');
    expect(state.pastEvents.length).toBe(1);
    expect(state.pastEvents[0].mode).toBe('staging');
  });

  it('handles contextual Undo and Redo correctly', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT_STATE',
      payload: sampleDisplayState,
    });

    // Action 1: Change to storm
    state = sessionReducer(state, {
      type: 'UPDATE_DISPLAY',
      payload: {
        updater: (prev) => ({ ...prev, weather: 'storm' }),
        description: 'Clima: storm',
      },
    });
    expect(state.liveState.weather).toBe('storm');

    // Undo action 1
    state = sessionReducer(state, { type: 'UNDO' });
    expect(state.liveState.weather).toBe('none');
    expect(state.futureEvents.length).toBe(1);

    // Redo action 1
    state = sessionReducer(state, { type: 'REDO' });
    expect(state.liveState.weather).toBe('storm');
    expect(state.futureEvents.length).toBe(0);
  });

  it('publishes all staged changes and clears redo history', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT_STATE',
      payload: sampleDisplayState,
    });

    state = sessionReducer(state, { type: 'SET_OPERATION_MODE', payload: 'staging' });
    state = sessionReducer(state, {
      type: 'UPDATE_DISPLAY',
      payload: {
        updater: (prev) => ({ ...prev, sceneName: 'Pico Helado' }),
        description: 'Nueva escena',
      },
    });

    expect(state.liveState.sceneName).toBe('Taberna del Dragón');

    // Publish all
    state = sessionReducer(state, { type: 'PUBLISH_ALL' });
    expect(state.liveState.sceneName).toBe('Pico Helado');
  });

  it('discards staged changes returning stagedState to liveState', () => {
    let state = sessionReducer(initialSessionState, {
      type: 'INIT_STATE',
      payload: sampleDisplayState,
    });

    state = sessionReducer(state, { type: 'SET_OPERATION_MODE', payload: 'staging' });
    state = sessionReducer(state, {
      type: 'UPDATE_DISPLAY',
      payload: {
        updater: (prev) => ({ ...prev, weather: 'embers' }),
        description: 'Clima: embers',
      },
    });

    expect(state.stagedState.weather).toBe('embers');

    // Discard
    state = sessionReducer(state, { type: 'DISCARD_STAGED' });
    expect(state.stagedState.weather).toBe('none');
  });
});
