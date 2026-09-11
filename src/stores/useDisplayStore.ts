import { create } from 'zustand';
import type { DisplayState, PublishCategoryKey } from '../types';
import { initialSessionState, sessionReducer, type SessionState } from '../domain/session/sessionReducer';
import { calculatePendingChangesCount } from '../domain/display/displayDiff';
import { soundEngine } from '../services/soundEngine';

export interface DisplayStoreState extends SessionState {
  // Actions
  initSessionState: (initialState: DisplayState) => void;
  setStagedStateOnly: (stagedState: DisplayState) => void;
  updateDisplay: (
    updater: (prev: DisplayState) => DisplayState,
    description?: string,
    broadcastImmediate?: boolean
  ) => void;
  setOperationMode: (mode: 'live' | 'staging') => void;
  undo: () => void;
  redo: () => void;
  publishAllStaged: () => void;
  publishSelectiveStaged: (selectedKeys: PublishCategoryKey[]) => void;
  discardStaged: () => void;
  restoreSnapshot: (snapshot: DisplayState, description?: string) => void;
  resetSessionState: () => void;
}

export const useDisplayStore = create<DisplayStoreState>((set, get) => ({
  ...initialSessionState,

  initSessionState: (initialState: DisplayState) => {
    set((state) => sessionReducer(state, { type: 'INIT_STATE', payload: initialState }));
  },

  setStagedStateOnly: (stagedState: DisplayState) => {
    set((state) => sessionReducer(state, { type: 'SET_STAGED_STATE_ONLY', payload: stagedState }));
  },

  updateDisplay: (
    updater: (prev: DisplayState) => DisplayState,
    description: string = 'Modificación de Escena',
    _broadcastImmediate: boolean = true
  ) => {
    set((state) => sessionReducer(state, {
      type: 'UPDATE_DISPLAY',
      payload: { updater, description },
    }));
  },

  setOperationMode: (mode: 'live' | 'staging') => {
    set((state) => sessionReducer(state, { type: 'SET_OPERATION_MODE', payload: mode }));
  },

  undo: () => {
    const { pastEvents, operationMode } = get();
    if (pastEvents.length === 0) return;
    const lastEvent = pastEvents[0];

    set((state) => sessionReducer(state, { type: 'UNDO' }));

    if (operationMode === 'live' && lastEvent.stateSnapshot.ambientAudioUrl && lastEvent.stateSnapshot.ambientPlaying) {
      soundEngine.setAmbient(
        lastEvent.stateSnapshot.ambientAudioUrl,
        true,
        lastEvent.stateSnapshot.ambientVolume,
        true
      );
    }
    soundEngine.playSynth('heartbeat');
  },

  redo: () => {
    const { futureEvents, operationMode } = get();
    if (futureEvents.length === 0) return;
    const nextEvent = futureEvents[0];

    set((state) => sessionReducer(state, { type: 'REDO' }));

    if (operationMode === 'live' && nextEvent.stateSnapshot.ambientAudioUrl && nextEvent.stateSnapshot.ambientPlaying) {
      soundEngine.setAmbient(
        nextEvent.stateSnapshot.ambientAudioUrl,
        true,
        nextEvent.stateSnapshot.ambientVolume,
        true
      );
    }
    soundEngine.playSynth('heartbeat');
  },

  publishAllStaged: () => {
    const { stagedState } = get();
    soundEngine.playSynth('magic_spell');

    set((state) => sessionReducer(state, { type: 'PUBLISH_ALL' }));

    if (stagedState.ambientAudioUrl && stagedState.ambientPlaying) {
      soundEngine.setAmbient(stagedState.ambientAudioUrl, true, stagedState.ambientVolume, true);
    }
  },

  publishSelectiveStaged: (selectedKeys: PublishCategoryKey[]) => {
    if (selectedKeys.length === 0) return;
    const { stagedState } = get();
    soundEngine.playSynth('magic_spell');

    set((state) => sessionReducer(state, {
      type: 'PUBLISH_SELECTIVE',
      payload: { selectedKeys },
    }));

    if (selectedKeys.includes('ambientAudio') && stagedState.ambientAudioUrl && stagedState.ambientPlaying) {
      soundEngine.setAmbient(stagedState.ambientAudioUrl, true, stagedState.ambientVolume, true);
    }
  },

  discardStaged: () => {
    soundEngine.playSynth('trash');
    set((state) => sessionReducer(state, { type: 'DISCARD_STAGED' }));
  },

  restoreSnapshot: (snapshot: DisplayState, description: string = 'Restaurar Snapshot') => {
    set((state) => sessionReducer(state, {
      type: 'RESTORE_SNAPSHOT',
      payload: { snapshot, description },
    }));

    const { operationMode } = get();
    if (operationMode === 'live' && snapshot.ambientAudioUrl && snapshot.ambientPlaying) {
      soundEngine.setAmbient(snapshot.ambientAudioUrl, true, snapshot.ambientVolume, true);
    }
  },

  resetSessionState: () => {
    set({ ...initialSessionState });
  },
}));

// Helper selectors for granular component consumption
export const selectActiveDisplay = (state: DisplayStoreState): DisplayState =>
  state.operationMode === 'live' ? state.liveState : state.stagedState;

export const selectPendingChangesCount = (state: DisplayStoreState): number =>
  calculatePendingChangesCount(state.liveState, state.stagedState, state.operationMode);

export const selectCanUndo = (state: DisplayStoreState): boolean =>
  state.pastEvents.length > 0;

export const selectCanRedo = (state: DisplayStoreState): boolean =>
  state.futureEvents.length > 0;
