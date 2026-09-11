import { useEffect, useMemo } from 'react';
import type { DisplayState } from '../types';
import {
  useDisplayStore,
  selectActiveDisplay,
  selectPendingChangesCount,
} from '../stores/useDisplayStore';
import {
  registerDisplayBroadcastHandler,
  registerDisplayAutoCheckpointHandler,
} from '../stores/displaySyncBridge';

interface UseDisplaySessionOptions {
  onBroadcastState?: (state: DisplayState) => void;
  onCreateAutoCheckpoint?: (triggerName: string, state: DisplayState) => void;
}

export function useDisplaySession(options: UseDisplaySessionOptions = {}) {
  const { onBroadcastState, onCreateAutoCheckpoint } = options;

  // Register bridge callbacks for WebRTC broadcast and auto-checkpoints
  useEffect(() => {
    if (onBroadcastState) {
      return registerDisplayBroadcastHandler(onBroadcastState);
    }
  }, [onBroadcastState]);

  useEffect(() => {
    if (onCreateAutoCheckpoint) {
      return registerDisplayAutoCheckpointHandler(onCreateAutoCheckpoint);
    }
  }, [onCreateAutoCheckpoint]);

  const liveState = useDisplayStore((s) => s.liveState);
  const stagedState = useDisplayStore((s) => s.stagedState);
  const operationMode = useDisplayStore((s) => s.operationMode);
  const pastEvents = useDisplayStore((s) => s.pastEvents);
  const futureEvents = useDisplayStore((s) => s.futureEvents);
  const sessionRevision = useDisplayStore((s) => s.sessionRevision);

  const initSessionState = useDisplayStore((s) => s.initSessionState);
  const setStagedStateOnly = useDisplayStore((s) => s.setStagedStateOnly);
  const updateDisplay = useDisplayStore((s) => s.updateDisplay);
  const setOperationMode = useDisplayStore((s) => s.setOperationMode);
  const undo = useDisplayStore((s) => s.undo);
  const redo = useDisplayStore((s) => s.redo);
  const publishAllStaged = useDisplayStore((s) => s.publishAllStaged);
  const publishSelectiveStaged = useDisplayStore((s) => s.publishSelectiveStaged);
  const discardStaged = useDisplayStore((s) => s.discardStaged);
  const restoreSnapshot = useDisplayStore((s) => s.restoreSnapshot);

  const activeDisplay = useMemo(
    () => selectActiveDisplay({ liveState, stagedState, operationMode } as any),
    [liveState, stagedState, operationMode]
  );

  const pendingChangesCount = useMemo(
    () => selectPendingChangesCount({ liveState, stagedState, operationMode } as any),
    [liveState, stagedState, operationMode]
  );

  // Keyboard shortcuts listener for Undo (Ctrl+Z) & Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    liveState,
    stagedState,
    activeDisplay,
    operationMode,
    pendingChangesCount,
    pastEvents,
    futureEvents,
    sessionRevision,
    initSessionState,
    setStagedStateOnly,
    updateDisplay,
    setOperationMode,
    undo,
    redo,
    publishAllStaged,
    publishSelectiveStaged,
    discardStaged,
    restoreSnapshot,
  };
}
