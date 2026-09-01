import { useState, useRef, useCallback } from 'react';
import type { CinematicMacro, DisplayState } from '../types';
import { applyStepToState } from '../domain/macros/macroEngine';
import { soundEngine } from '../services/soundEngine';
import { peerService } from '../services/peerService';

export interface RunningMacroState {
  macro: CinematicMacro;
  currentStepIndex: number;
  totalSteps: number;
  isPaused: boolean;
  backupState: DisplayState;
}

interface UseMacroSequencerOptions {
  onBroadcastState?: (state: DisplayState) => void;
  onCreateAutoCheckpoint?: (triggerName: string, state: DisplayState) => void;
  onRecordHistoryEvent?: (description: string, snapshot: DisplayState) => void;
}

export function useMacroSequencer(options: UseMacroSequencerOptions = {}) {
  const { onBroadcastState, onCreateAutoCheckpoint, onRecordHistoryEvent } = options;
  const [runningMacro, setRunningMacro] = useState<RunningMacroState | null>(null);
  const macroTimerRef = useRef<number | null>(null);

  const executeStep = useCallback(
    (
      macro: CinematicMacro,
      stepIdx: number,
      backup: DisplayState,
      currentState: DisplayState,
      onSetState: (updater: (prev: DisplayState) => DisplayState) => void
    ) => {
      if (stepIdx >= macro.steps.length) {
        setRunningMacro(null);
        return;
      }

      const step = macro.steps[stepIdx];
      setRunningMacro({
        macro,
        currentStepIndex: stepIdx,
        totalSteps: macro.steps.length,
        isPaused: false,
        backupState: backup,
      });

      // SFX Presets
      if (step.sfxPreset) {
        soundEngine.playSynth(step.sfxPreset);
        peerService.send({
          type: 'PLAY_SFX',
          payload: {
            id: `sfx-${Date.now()}`,
            name: step.sfxPreset,
            synthPreset: step.sfxPreset,
            timestamp: Date.now(),
          },
        });
      }

      if (step.lightning) peerService.send({ type: 'TRIGGER_LIGHTNING' });
      if (step.shake) peerService.send({ type: 'TRIGGER_SHAKE' });

      onSetState((prev) => {
        const next = applyStepToState(step, prev);
        onBroadcastState?.(next);
        if (next.ambientAudioUrl && next.ambientPlaying) {
          soundEngine.setAmbient(next.ambientAudioUrl, true, next.ambientVolume, true);
        }
        return next;
      });

      if (step.delayMs > 0 && stepIdx + 1 < macro.steps.length) {
        macroTimerRef.current = window.setTimeout(() => {
          executeStep(macro, stepIdx + 1, backup, currentState, onSetState);
        }, step.delayMs);
      } else if (stepIdx + 1 < macro.steps.length) {
        executeStep(macro, stepIdx + 1, backup, currentState, onSetState);
      } else {
        setRunningMacro(null);
      }
    },
    [onBroadcastState]
  );

  const executeMacro = useCallback(
    (
      macro: CinematicMacro,
      currentLiveState: DisplayState,
      onSetState: (updater: (prev: DisplayState) => DisplayState) => void
    ) => {
      if (macroTimerRef.current) {
        clearTimeout(macroTimerRef.current);
      }

      const backup = { ...currentLiveState };
      onCreateAutoCheckpoint?.(`Antes de ejecutar Momento: ${macro.name}`, backup);
      onRecordHistoryEvent?.(`Momento: ${macro.name}`, backup);

      executeStep(macro, 0, backup, currentLiveState, onSetState);
    },
    [executeStep, onCreateAutoCheckpoint, onRecordHistoryEvent]
  );

  const cancelMacro = useCallback(
    (onRollback: (backup: DisplayState) => void) => {
      if (macroTimerRef.current) {
        clearTimeout(macroTimerRef.current);
        macroTimerRef.current = null;
      }
      if (runningMacro) {
        onRollback(runningMacro.backupState);
        onBroadcastState?.(runningMacro.backupState);
        if (runningMacro.backupState.ambientAudioUrl && runningMacro.backupState.ambientPlaying) {
          soundEngine.setAmbient(
            runningMacro.backupState.ambientAudioUrl,
            true,
            runningMacro.backupState.ambientVolume,
            true
          );
        }
        setRunningMacro(null);
        soundEngine.playSynth('heartbeat');
      }
    },
    [runningMacro, onBroadcastState]
  );

  return {
    runningMacro,
    executeMacro,
    cancelMacro,
  };
}
