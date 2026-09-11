import { useDisplayStore } from './useDisplayStore';
import type { DisplayState } from '../types';

type BroadcastFn = (state: DisplayState) => void;
type AutoCheckpointFn = (triggerName: string, state: DisplayState) => void;

let broadcastCallback: BroadcastFn | null = null;
let autoCheckpointCallback: AutoCheckpointFn | null = null;
let unsubscribeListener: (() => void) | null = null;

export function registerDisplayBroadcastHandler(fn: BroadcastFn | null): () => void {
  broadcastCallback = fn;
  ensureSyncListener();
  return () => {
    if (broadcastCallback === fn) {
      broadcastCallback = null;
    }
  };
}

export function registerDisplayAutoCheckpointHandler(fn: AutoCheckpointFn | null): () => void {
  autoCheckpointCallback = fn;
  ensureSyncListener();
  return () => {
    if (autoCheckpointCallback === fn) {
      autoCheckpointCallback = null;
    }
  };
}

export function triggerDisplayBroadcast(state?: DisplayState): void {
  const target = state ?? useDisplayStore.getState().liveState;
  broadcastCallback?.(target);
}

export function triggerDisplayAutoCheckpoint(triggerName: string, state?: DisplayState): void {
  const target = state ?? useDisplayStore.getState().liveState;
  autoCheckpointCallback?.(triggerName, target);
}

function ensureSyncListener() {
  if (unsubscribeListener) return;

  unsubscribeListener = useDisplayStore.subscribe((curr, prev) => {
    // 1. WebRTC Broadcast to Mesa when in live mode and liveState changes
    if (curr.operationMode === 'live' && curr.liveState !== prev.liveState) {
      broadcastCallback?.(curr.liveState);
    }

    // 2. Auto-checkpoint trigger on full publish or major session revision change
    if (curr.sessionRevision !== prev.sessionRevision && curr.pastEvents.length > prev.pastEvents.length) {
      const latestEvent = curr.pastEvents[0];
      if (latestEvent?.description.startsWith('Publicación')) {
        autoCheckpointCallback?.(latestEvent.description, curr.liveState);
      }
    }
  });
}
