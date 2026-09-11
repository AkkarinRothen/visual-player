import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useDisplayStore,
  selectActiveDisplay,
  selectPendingChangesCount,
  selectCanUndo,
  selectCanRedo,
} from './useDisplayStore';
import type { DisplayState } from '../types';

vi.mock('../services/soundEngine', () => ({
  soundEngine: {
    playSynth: vi.fn(),
    setAmbient: vi.fn(),
  },
}));

describe('useDisplayStore', () => {
  beforeEach(() => {
    useDisplayStore.getState().resetSessionState();
  });

  it('initializes with default session state and live mode', () => {
    const state = useDisplayStore.getState();
    expect(state.operationMode).toBe('live');
    expect(state.pastEvents).toHaveLength(0);
    expect(state.futureEvents).toHaveLength(0);
    expect(selectCanUndo(state)).toBe(false);
    expect(selectCanRedo(state)).toBe(false);
  });

  it('updates live display state and creates history event in live mode', () => {
    useDisplayStore.getState().updateDisplay(
      (prev) => ({ ...prev, sceneName: 'Templo del Sol' }),
      'Cambio de escena'
    );

    const state = useDisplayStore.getState();
    expect(state.liveState.sceneName).toBe('Templo del Sol');
    expect(state.pastEvents).toHaveLength(1);
    expect(state.pastEvents[0].description).toBe('Cambio de escena');
    expect(selectCanUndo(state)).toBe(true);

    // Test Undo
    useDisplayStore.getState().undo();
    const undoneState = useDisplayStore.getState();
    expect(undoneState.liveState.sceneName).toBe('Cargando Aventura...');
    expect(selectCanRedo(undoneState)).toBe(true);

    // Test Redo
    useDisplayStore.getState().redo();
    const redoneState = useDisplayStore.getState();
    expect(redoneState.liveState.sceneName).toBe('Templo del Sol');
  });

  it('handles staging mode, pending changes, and full publishing', () => {
    useDisplayStore.getState().setOperationMode('staging');
    expect(useDisplayStore.getState().operationMode).toBe('staging');

    // Update staged state
    useDisplayStore.getState().updateDisplay(
      (prev) => ({ ...prev, sceneName: 'Mazmorra Subterránea', weather: 'rain' }),
      'Preparar mazmorra'
    );

    const stateAfterStaging = useDisplayStore.getState();
    expect(stateAfterStaging.liveState.sceneName).toBe('Cargando Aventura...');
    expect(stateAfterStaging.stagedState.sceneName).toBe('Mazmorra Subterránea');
    expect(selectPendingChangesCount(stateAfterStaging)).toBeGreaterThan(0);
    expect(selectActiveDisplay(stateAfterStaging).sceneName).toBe('Mazmorra Subterránea');

    // Publish all staged
    useDisplayStore.getState().publishAllStaged();
    const stateAfterPublish = useDisplayStore.getState();
    expect(stateAfterPublish.liveState.sceneName).toBe('Mazmorra Subterránea');
    expect(stateAfterPublish.liveState.weather).toBe('rain');
    expect(selectPendingChangesCount(stateAfterPublish)).toBe(0);
  });

  it('discards staged changes cleanly', () => {
    useDisplayStore.getState().setOperationMode('staging');
    useDisplayStore.getState().updateDisplay(
      (prev) => ({ ...prev, sceneName: 'Borrador Descartable' }),
      'Cambio temporal'
    );

    expect(useDisplayStore.getState().stagedState.sceneName).toBe('Borrador Descartable');

    useDisplayStore.getState().discardStaged();
    expect(useDisplayStore.getState().stagedState.sceneName).toBe(
      useDisplayStore.getState().liveState.sceneName
    );
  });
});
