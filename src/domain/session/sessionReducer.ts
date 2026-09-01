import type { DisplayState, HistoryEvent, PublishCategoryKey } from '../../types';
import { mergeSelectiveState } from '../display/displayDiff';

export interface SessionState {
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';
  pastEvents: HistoryEvent[];
  futureEvents: HistoryEvent[];
}

export type SessionAction =
  | {
      type: 'INIT_STATE';
      payload: DisplayState;
    }
  | {
      type: 'UPDATE_DISPLAY';
      payload: {
        updater: (prev: DisplayState) => DisplayState;
        description: string;
      };
    }
  | {
      type: 'SET_OPERATION_MODE';
      payload: 'live' | 'staging';
    }
  | {
      type: 'UNDO';
    }
  | {
      type: 'REDO';
    }
  | {
      type: 'PUBLISH_ALL';
      payload?: { description?: string };
    }
  | {
      type: 'PUBLISH_SELECTIVE';
      payload: { selectedKeys: PublishCategoryKey[] };
    }
  | {
      type: 'DISCARD_STAGED';
    }
  | {
      type: 'RESTORE_SNAPSHOT';
      payload: { snapshot: DisplayState; description: string };
    };

export const initialSessionState: SessionState = {
  liveState: {
    sceneName: 'Cargando Aventura...',
    backgroundUrl: '',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: { text: '', visible: true },
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
  },
  stagedState: {
    sceneName: 'Cargando Aventura...',
    backgroundUrl: '',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: { text: '', visible: true },
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
  },
  operationMode: 'live',
  pastEvents: [],
  futureEvents: [],
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'INIT_STATE': {
      return {
        ...state,
        liveState: action.payload,
        stagedState: action.payload,
      };
    }

    case 'UPDATE_DISPLAY': {
      const current = state.operationMode === 'live' ? state.liveState : state.stagedState;
      const next = action.payload.updater(current);

      const historyEvent: HistoryEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: Date.now(),
        description: action.payload.description,
        mode: state.operationMode,
        stateSnapshot: current,
      };

      const newPast = [historyEvent, ...state.pastEvents.slice(0, 19)];

      if (state.operationMode === 'live') {
        return {
          ...state,
          liveState: next,
          stagedState: next,
          pastEvents: newPast,
          futureEvents: [], // Clear redo stack on new action
        };
      } else {
        return {
          ...state,
          stagedState: next,
          pastEvents: newPast,
          futureEvents: [],
        };
      }
    }

    case 'SET_OPERATION_MODE': {
      return {
        ...state,
        operationMode: action.payload,
      };
    }

    case 'UNDO': {
      if (state.pastEvents.length === 0) return state;

      const [lastEvent, ...remainingPast] = state.pastEvents;
      const currentSnapshot = state.operationMode === 'live' ? state.liveState : state.stagedState;

      const redoItem: HistoryEvent = {
        id: `redo-${Date.now()}`,
        timestamp: Date.now(),
        description: `Rehacer: ${lastEvent.description}`,
        mode: state.operationMode,
        stateSnapshot: currentSnapshot,
      };

      if (state.operationMode === 'live') {
        return {
          ...state,
          liveState: lastEvent.stateSnapshot,
          stagedState: lastEvent.stateSnapshot,
          pastEvents: remainingPast,
          futureEvents: [redoItem, ...state.futureEvents],
        };
      } else {
        return {
          ...state,
          stagedState: lastEvent.stateSnapshot,
          pastEvents: remainingPast,
          futureEvents: [redoItem, ...state.futureEvents],
        };
      }
    }

    case 'REDO': {
      if (state.futureEvents.length === 0) return state;

      const [nextEvent, ...remainingFuture] = state.futureEvents;
      const currentSnapshot = state.operationMode === 'live' ? state.liveState : state.stagedState;

      const undoItem: HistoryEvent = {
        id: `undo-${Date.now()}`,
        timestamp: Date.now(),
        description: nextEvent.description,
        mode: state.operationMode,
        stateSnapshot: currentSnapshot,
      };

      if (state.operationMode === 'live') {
        return {
          ...state,
          liveState: nextEvent.stateSnapshot,
          stagedState: nextEvent.stateSnapshot,
          pastEvents: [undoItem, ...state.pastEvents.slice(0, 19)],
          futureEvents: remainingFuture,
        };
      } else {
        return {
          ...state,
          stagedState: nextEvent.stateSnapshot,
          pastEvents: [undoItem, ...state.pastEvents.slice(0, 19)],
          futureEvents: remainingFuture,
        };
      }
    }

    case 'PUBLISH_ALL': {
      const historyEvent: HistoryEvent = {
        id: `evt-publish-all-${Date.now()}`,
        timestamp: Date.now(),
        description: action.payload?.description || `Publicado: ${state.stagedState.sceneName}`,
        mode: 'live',
        stateSnapshot: state.liveState,
      };

      return {
        ...state,
        liveState: state.stagedState,
        pastEvents: [historyEvent, ...state.pastEvents.slice(0, 19)],
        futureEvents: [],
      };
    }

    case 'PUBLISH_SELECTIVE': {
      const newLive = mergeSelectiveState(state.liveState, state.stagedState, action.payload.selectedKeys);

      const historyEvent: HistoryEvent = {
        id: `evt-publish-selective-${Date.now()}`,
        timestamp: Date.now(),
        description: `Publicación Selectiva: ${action.payload.selectedKeys.join(', ')}`,
        mode: 'live',
        stateSnapshot: state.liveState,
      };

      return {
        ...state,
        liveState: newLive,
        pastEvents: [historyEvent, ...state.pastEvents.slice(0, 19)],
        futureEvents: [],
      };
    }

    case 'DISCARD_STAGED': {
      return {
        ...state,
        stagedState: state.liveState,
      };
    }

    case 'RESTORE_SNAPSHOT': {
      const historyEvent: HistoryEvent = {
        id: `evt-restore-${Date.now()}`,
        timestamp: Date.now(),
        description: action.payload.description,
        mode: state.operationMode,
        stateSnapshot: state.operationMode === 'live' ? state.liveState : state.stagedState,
      };

      if (state.operationMode === 'live') {
        return {
          ...state,
          liveState: action.payload.snapshot,
          stagedState: action.payload.snapshot,
          pastEvents: [historyEvent, ...state.pastEvents.slice(0, 19)],
          futureEvents: [],
        };
      } else {
        return {
          ...state,
          stagedState: action.payload.snapshot,
          pastEvents: [historyEvent, ...state.pastEvents.slice(0, 19)],
          futureEvents: [],
        };
      }
    }

    default:
      return state;
  }
}
