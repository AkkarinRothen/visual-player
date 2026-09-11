import { useState, useRef, useCallback, useEffect } from 'react';
import type { CinematicMacro, DisplayState } from '../types';
import { applyStepToState } from '../domain/macros/macroEngine';
import { soundEngine } from '../services/soundEngine';
import { peerService } from '../services/peerService';

export interface RunningMacroState {
  macro: CinematicMacro;
  currentStepIndex: number;
  totalSteps: number;
  isPaused: boolean;
  isWaitingForManualAdvance?: boolean;
  backupState: DisplayState;
  remainingDelayMs?: number;
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
  const stepStartTimeRef = useRef<number>(0);
  const scheduledDelayMsRef = useRef<number>(0);
  const onSetStateRef = useRef<((updater: (prev: DisplayState) => DisplayState) => void) | null>(null);
  const runningMacroRef = useRef<RunningMacroState | null>(null);

  useEffect(() => {
    runningMacroRef.current = runningMacro;
  }, [runningMacro]);

  const executeStep = useCallback(
    (
      macro: CinematicMacro,
      stepIdx: number,
      backup: DisplayState,
      currentState: DisplayState,
      onSetState: (updater: (prev: DisplayState) => DisplayState) => void
    ) => {
      if (macroTimerRef.current) {
        clearTimeout(macroTimerRef.current);
        macroTimerRef.current = null;
      }

      if (stepIdx >= macro.steps.length) {
        setRunningMacro(null);
        return;
      }

      const step = macro.steps[stepIdx];
      const isManual = step.advanceMode === 'manual';

      setRunningMacro({
        macro,
        currentStepIndex: stepIdx,
        totalSteps: macro.steps.length,
        isPaused: false,
        isWaitingForManualAdvance: isManual,
        backupState: backup,
        remainingDelayMs: step.delayMs,
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

      // Advance logic
      if (isManual) {
        // Stop here and wait for DM manual trigger (advanceNextStep)
        return;
      }

      if (step.delayMs > 0) {
        stepStartTimeRef.current = Date.now();
        scheduledDelayMsRef.current = step.delayMs;
        macroTimerRef.current = window.setTimeout(() => {
          if (stepIdx + 1 < macro.steps.length) {
            executeStep(macro, stepIdx + 1, backup, currentState, onSetState);
          } else {
            setRunningMacro(null);
          }
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
        macroTimerRef.current = null;
      }

      onSetStateRef.current = onSetState;
      const backup = { ...currentLiveState };
      onCreateAutoCheckpoint?.(`Antes de ejecutar Momento: ${macro.name}`, backup);
      onRecordHistoryEvent?.(`Momento: ${macro.name}`, backup);

      executeStep(macro, 0, backup, currentLiveState, onSetState);
    },
    [executeStep, onCreateAutoCheckpoint, onRecordHistoryEvent]
  );

  const advanceNextStep = useCallback(() => {
    if (macroTimerRef.current) {
      clearTimeout(macroTimerRef.current);
      macroTimerRef.current = null;
    }

    const current = runningMacroRef.current;
    if (!current || !onSetStateRef.current) return;

    const nextIdx = current.currentStepIndex + 1;
    if (nextIdx < current.macro.steps.length) {
      executeStep(
        current.macro,
        nextIdx,
        current.backupState,
        current.backupState,
        onSetStateRef.current
      );
    } else {
      setRunningMacro(null);
    }
  }, [executeStep]);

  const pauseMacro = useCallback(() => {
    if (macroTimerRef.current) {
      clearTimeout(macroTimerRef.current);
      macroTimerRef.current = null;
      const elapsed = Date.now() - stepStartTimeRef.current;
      const rem = Math.max(0, scheduledDelayMsRef.current - elapsed);
      setRunningMacro((prev) => (prev ? { ...prev, isPaused: true, remainingDelayMs: rem } : null));
    } else {
      setRunningMacro((prev) => (prev ? { ...prev, isPaused: true } : null));
    }
  }, []);

  const resumeMacro = useCallback(() => {
    const current = runningMacroRef.current;
    if (!current || !onSetStateRef.current || !current.isPaused) return;

    const nextIdx = current.currentStepIndex + 1;
    const rem = current.remainingDelayMs ?? 1000;
    setRunningMacro((prev) => (prev ? { ...prev, isPaused: false } : null));
    stepStartTimeRef.current = Date.now();
    scheduledDelayMsRef.current = rem;

    macroTimerRef.current = window.setTimeout(() => {
      if (nextIdx < current.macro.steps.length && onSetStateRef.current) {
        executeStep(
          current.macro,
          nextIdx,
          current.backupState,
          current.backupState,
          onSetStateRef.current
        );
      } else {
        setRunningMacro(null);
      }
    }, rem);
  }, [executeStep]);

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
    advanceNextStep,
    pauseMacro,
    resumeMacro,
    cancelMacro,
  };
}
