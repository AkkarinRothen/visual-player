import { useReducer, useEffect, useCallback, useMemo } from 'react';
import type { DisplayState, PublishCategoryKey } from '../types';
import { initialSessionState, sessionReducer } from '../domain/session/sessionReducer';
import { calculatePendingChangesCount } from '../domain/display/displayDiff';
import { soundEngine } from '../services/soundEngine';

interface UseDisplaySessionOptions {
  onBroadcastState?: (state: DisplayState) => void;
  onCreateAutoCheckpoint?: (triggerName: string, state: DisplayState) => void;
}

export function useDisplaySession(options: UseDisplaySessionOptions = {}) {
  const { onBroadcastState, onCreateAutoCheckpoint } = options;
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);

  const { liveState, stagedState, operationMode, pastEvents, futureEvents } = state;

  const activeDisplay = operationMode === 'live' ? liveState : stagedState;
  const pendingChangesCount = useMemo(
    () => calculatePendingChangesCount(liveState, stagedState, operationMode),
    [liveState, stagedState, operationMode]
  );

  // Initialize display state (from campaign scene)
  const initSessionState = useCallback((initialState: DisplayState) => {
    dispatch({ type: 'INIT_STATE', payload: initialState });
  }, []);

  // Update display wrapper
  const updateDisplay = useCallback(
    (
      updater: (prev: DisplayState) => DisplayState,
      description: string = 'Modificación de Escena',
      broadcastImmediate: boolean = true
    ) => {
      dispatch({
        type: 'UPDATE_DISPLAY',
        payload: { updater, description },
      });

      if (operationMode === 'live' && broadcastImmediate) {
        const next = updater(liveState);
        onBroadcastState?.(next);
      }
    },
    [operationMode, liveState, onBroadcastState]
  );

  // Toggle Mode
  const setOperationMode = useCallback((mode: 'live' | 'staging') => {
    dispatch({ type: 'SET_OPERATION_MODE', payload: mode });
  }, []);

  // Undo Handler
  const undo = useCallback(() => {
    if (pastEvents.length === 0) return;
    const lastEvent = pastEvents[0];

    dispatch({ type: 'UNDO' });

    if (operationMode === 'live') {
      onBroadcastState?.(lastEvent.stateSnapshot);
      if (lastEvent.stateSnapshot.ambientAudioUrl && lastEvent.stateSnapshot.ambientPlaying) {
        soundEngine.setAmbient(
          lastEvent.stateSnapshot.ambientAudioUrl,
          true,
          lastEvent.stateSnapshot.ambientVolume,
          true
        );
      }
    }
    soundEngine.playSynth('heartbeat');
  }, [pastEvents, operationMode, onBroadcastState]);

  // Redo Handler
  const redo = useCallback(() => {
    if (futureEvents.length === 0) return;
    const nextEvent = futureEvents[0];

    dispatch({ type: 'REDO' });

    if (operationMode === 'live') {
      onBroadcastState?.(nextEvent.stateSnapshot);
      if (nextEvent.stateSnapshot.ambientAudioUrl && nextEvent.stateSnapshot.ambientPlaying) {
        soundEngine.setAmbient(
          nextEvent.stateSnapshot.ambientAudioUrl,
          true,
          nextEvent.stateSnapshot.ambientVolume,
          true
        );
      }
    }
    soundEngine.playSynth('heartbeat');
  }, [futureEvents, operationMode, onBroadcastState]);

  // Publish All Staged Changes
  const publishAllStaged = useCallback(() => {
    soundEngine.playSynth('magic_spell');
    onCreateAutoCheckpoint?.(`Publicación Completa: ${stagedState.sceneName}`, liveState);

    dispatch({ type: 'PUBLISH_ALL' });
    onBroadcastState?.(stagedState);

    if (stagedState.ambientAudioUrl && stagedState.ambientPlaying) {
      soundEngine.setAmbient(stagedState.ambientAudioUrl, true, stagedState.ambientVolume, true);
    }
  }, [stagedState, liveState, onBroadcastState, onCreateAutoCheckpoint]);

  // Selective Publish
  const publishSelectiveStaged = useCallback(
    (selectedKeys: PublishCategoryKey[]) => {
      if (selectedKeys.length === 0) return;

      soundEngine.playSynth('magic_spell');
      onCreateAutoCheckpoint?.(`Publicación Selectiva (${selectedKeys.length} categorías)`, liveState);

      dispatch({ type: 'PUBLISH_SELECTIVE', payload: { selectedKeys } });

      // Calculate the resulting live state to broadcast
      const tempMerged = { ...liveState };
      if (selectedKeys.includes('background')) {
        tempMerged.currentSceneId = stagedState.currentSceneId;
        tempMerged.sceneName = stagedState.sceneName;
        tempMerged.backgroundUrl = stagedState.backgroundUrl;
      }
      if (selectedKeys.includes('characters')) tempMerged.characters = stagedState.characters;
      if (selectedKeys.includes('weather')) {
        tempMerged.weather = stagedState.weather;
        tempMerged.weatherIntensity = stagedState.weatherIntensity;
      }
      if (selectedKeys.includes('lighting')) tempMerged.lighting = stagedState.lighting;
      if (selectedKeys.includes('locationBanner')) tempMerged.locationBanner = stagedState.locationBanner;
      if (selectedKeys.includes('ambientAudio')) {
        tempMerged.ambientAudioUrl = stagedState.ambientAudioUrl;
        tempMerged.ambientPlaying = stagedState.ambientPlaying;
        tempMerged.ambientVolume = stagedState.ambientVolume;
      }
      if (selectedKeys.includes('blackout')) tempMerged.isBlackout = stagedState.isBlackout;

      onBroadcastState?.(tempMerged);

      if (selectedKeys.includes('ambientAudio') && tempMerged.ambientAudioUrl && tempMerged.ambientPlaying) {
        soundEngine.setAmbient(tempMerged.ambientAudioUrl, true, tempMerged.ambientVolume, true);
      }
    },
    [liveState, stagedState, onBroadcastState, onCreateAutoCheckpoint]
  );

  // Discard Staged
  const discardStaged = useCallback(() => {
    dispatch({ type: 'DISCARD_STAGED' });
  }, []);

  // Restore Snapshot
  const restoreSnapshot = useCallback(
    (snapshot: DisplayState, description: string) => {
      dispatch({ type: 'RESTORE_SNAPSHOT', payload: { snapshot, description } });

      if (operationMode === 'live') {
        onBroadcastState?.(snapshot);
        if (snapshot.ambientAudioUrl && snapshot.ambientPlaying) {
          soundEngine.setAmbient(snapshot.ambientAudioUrl, true, snapshot.ambientVolume, true);
        }
      }
    },
    [operationMode, onBroadcastState]
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
    initSessionState,
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
