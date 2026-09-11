import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CinematicMacro, DisplayState, MacroStep } from '../types';
import { applyStepToState, accumulateMacroToState } from '../domain/macros/macroEngine';
import { useMacroSequencer } from '../hooks/useMacroSequencer';

const mockBaseDisplayState: DisplayState = {
  currentSceneId: 'scene-dungeon',
  sceneName: 'Cripta Olvidada',
  backgroundUrl: 'https://example.com/crypt.jpg',
  characters: [
    {
      id: 'char-hero',
      name: 'Aiden',
      avatarUrl: 'https://example.com/aiden.jpg',
      position: 'center-left',
      isSpeaking: false,
    },
  ],
  weather: 'none',
  weatherIntensity: 0.5,
  lighting: 'dim',
  locationBanner: {
    text: 'CRIPTA OLVIDADA',
    subtitle: 'Nivel 1',
    visible: true,
  },
  isBlackout: false,
  shakeTrigger: 0,
  lightningTrigger: 0,
  ambientAudioUrl: 'https://example.com/ambience.mp3',
  ambientPlaying: true,
  ambientVolume: 0.6,
  lastSfx: null,
  combatState: {
    isActive: false,
    round: 1,
    currentTurnIndex: 0,
    combatants: [],
  },
};

describe('Cinematic Sequencer & Dramatic Macro Engine (Sprint D)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('1. applyStepToState with Cinematic Dialogue & Visuals', () => {
    it('applies blackout, lightning, and shake triggers correctly', () => {
      const step: MacroStep = {
        id: 'step-fx',
        delayMs: 1000,
        blackout: true,
        lightning: true,
        shake: true,
        weather: 'fog',
      };

      const result = applyStepToState(step, mockBaseDisplayState);
      expect(result.isBlackout).toBe(true);
      expect(result.lightningTrigger).toBeGreaterThan(0);
      expect(result.shakeTrigger).toBeGreaterThan(0);
      expect(result.weather).toBe('fog');
    });

    it('injects cinematic dialogue when dialogueText is provided', () => {
      const step: MacroStep = {
        id: 'step-boss-words',
        delayMs: 2000,
        dialogueSpeakerName: 'Señor de las Sombras',
        dialogueText: 'Habéis llegado demasiado tarde, mortales...',
        dialogueAvatarUrl: 'https://example.com/shadowlord.jpg',
      };

      const result = applyStepToState(step, mockBaseDisplayState);
      expect(result.cinematicDialogue).toBeDefined();
      expect(result.cinematicDialogue?.visible).toBe(true);
      expect(result.cinematicDialogue?.speakerName).toBe('Señor de las Sombras');
      expect(result.cinematicDialogue?.text).toBe('Habéis llegado demasiado tarde, mortales...');
      expect(result.cinematicDialogue?.avatarUrl).toBe('https://example.com/shadowlord.jpg');
    });

    it('retains previous dialogue if step does not define dialogueText', () => {
      const stateWithDialogue: DisplayState = {
        ...mockBaseDisplayState,
        cinematicDialogue: {
          speakerName: 'Guía',
          text: '¡Cuidado!',
          visible: true,
        },
      };

      const stepWithoutDialogue: MacroStep = {
        id: 'step-just-shake',
        delayMs: 500,
        shake: true,
      };

      const result = applyStepToState(stepWithoutDialogue, stateWithDialogue);
      expect(result.cinematicDialogue?.speakerName).toBe('Guía');
      expect(result.cinematicDialogue?.text).toBe('¡Cuidado!');
    });
  });

  describe('2. accumulateMacroToState', () => {
    it('accumulates multiple steps including dialogue and scene transitions', () => {
      const macro: CinematicMacro = {
        id: 'macro-reveal',
        name: 'Aparición del Jefe',
        description: 'Blackout, trueno, cambio de fondo y diálogo del boss',
        steps: [
          {
            id: 's1',
            delayMs: 1000,
            blackout: true,
            sfxPreset: 'thunder',
          },
          {
            id: 's2',
            delayMs: 1500,
            blackout: false,
            backgroundUrl: 'https://example.com/throne.jpg',
            dialogueSpeakerName: 'Rey Espectro',
            dialogueText: 'Arrodillaos ante el trono del abismo.',
          },
        ],
      };

      const accumulated = accumulateMacroToState(macro, mockBaseDisplayState);
      expect(accumulated.isBlackout).toBe(false);
      expect(accumulated.backgroundUrl).toBe('https://example.com/throne.jpg');
      expect(accumulated.cinematicDialogue?.speakerName).toBe('Rey Espectro');
      expect(accumulated.cinematicDialogue?.text).toBe('Arrodillaos ante el trono del abismo.');
    });
  });

  describe('3. useMacroSequencer Controlled Execution (Auto vs Manual vs Pause)', () => {
    it('executes automated steps sequentially with delay', () => {
      const broadcastSpy = vi.fn();
      const checkpointSpy = vi.fn();
      const recordSpy = vi.fn();

      const { result } = renderHook(() =>
        useMacroSequencer({
          onBroadcastState: broadcastSpy,
          onCreateAutoCheckpoint: checkpointSpy,
          onRecordHistoryEvent: recordSpy,
        })
      );

      const testMacro: CinematicMacro = {
        id: 'macro-auto',
        name: 'Secuencia Automática',
        steps: [
          {
            id: 's1',
            delayMs: 1000,
            blackout: true,
            advanceMode: 'auto',
          },
          {
            id: 's2',
            delayMs: 1000,
            blackout: false,
            advanceMode: 'auto',
          },
        ],
      };

      let currentState = mockBaseDisplayState;
      const onSetState = vi.fn((updater) => {
        currentState = typeof updater === 'function' ? updater(currentState) : updater;
      });

      act(() => {
        result.current.executeMacro(testMacro, mockBaseDisplayState, onSetState);
      });

      // After starting: step 0 is active
      expect(result.current.runningMacro).not.toBeNull();
      expect(result.current.runningMacro?.currentStepIndex).toBe(0);
      expect(checkpointSpy).toHaveBeenCalledWith('Antes de ejecutar Momento: Secuencia Automática', mockBaseDisplayState);
      expect(currentState.isBlackout).toBe(true);

      // Advance timer by 1000ms
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Step 1 should have executed
      expect(result.current.runningMacro?.currentStepIndex).toBe(1);
      expect(currentState.isBlackout).toBe(false);

      // Advance step 2 timer by 1000ms
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.runningMacro).toBeNull();
    });

    it('waits for manual advance when step has advanceMode = "manual"', () => {
      const { result } = renderHook(() => useMacroSequencer());

      const manualMacro: CinematicMacro = {
        id: 'macro-manual',
        name: 'Secuencia Controlada por DM',
        steps: [
          {
            id: 's1-manual',
            delayMs: 5000, // Even with delay, manual mode halts timer!
            advanceMode: 'manual',
            blackout: true,
          },
          {
            id: 's2-auto',
            delayMs: 1500,
            blackout: false,
            advanceMode: 'auto',
          },
        ],
      };

      let currentState = mockBaseDisplayState;
      const onSetState = vi.fn((updater) => {
        currentState = typeof updater === 'function' ? updater(currentState) : updater;
      });

      act(() => {
        result.current.executeMacro(manualMacro, mockBaseDisplayState, onSetState);
      });

      expect(result.current.runningMacro?.currentStepIndex).toBe(0);
      expect(result.current.runningMacro?.isWaitingForManualAdvance).toBe(true);

      // Advance timer past delayMs — it must NOT advance automatically!
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.runningMacro?.currentStepIndex).toBe(0);
      expect(result.current.runningMacro?.isWaitingForManualAdvance).toBe(true);

      // DM triggers manual advance
      act(() => {
        result.current.advanceNextStep();
      });

      // Now it moved to step 1
      expect(result.current.runningMacro?.currentStepIndex).toBe(1);
      expect(currentState.isBlackout).toBe(false);

      // Finish step 2
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(result.current.runningMacro).toBeNull();
    });

    it('pauses and resumes preserving remaining delay time', () => {
      const { result } = renderHook(() => useMacroSequencer());

      const timedMacro: CinematicMacro = {
        id: 'macro-timed',
        name: 'Secuencia Pausable',
        steps: [
          {
            id: 's1',
            delayMs: 4000,
            advanceMode: 'auto',
            blackout: true,
          },
          {
            id: 's2',
            delayMs: 1500,
            advanceMode: 'auto',
            blackout: false,
          },
        ],
      };

      let currentState = mockBaseDisplayState;
      const onSetState = vi.fn((updater) => {
        currentState = typeof updater === 'function' ? updater(currentState) : updater;
      });

      act(() => {
        result.current.executeMacro(timedMacro, mockBaseDisplayState, onSetState);
      });

      // Advance 1500ms of the 4000ms delay
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // DM pauses the macro
      act(() => {
        result.current.pauseMacro();
      });

      expect(result.current.runningMacro?.isPaused).toBe(true);
      const remaining = result.current.runningMacro?.remainingDelayMs;
      expect(remaining).toBeDefined();
      expect(remaining).toBeLessThanOrEqual(2500);
      expect(remaining).toBeGreaterThanOrEqual(2400);

      // Advancing time while paused should NOT advance step
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(result.current.runningMacro?.currentStepIndex).toBe(0);

      // DM resumes the macro
      act(() => {
        result.current.resumeMacro();
      });
      expect(result.current.runningMacro?.isPaused).toBe(false);

      // Advance the remaining time (e.g. 2600ms)
      act(() => {
        vi.advanceTimersByTime(2600);
      });

      // Macro has advanced to step 1
      expect(result.current.runningMacro?.currentStepIndex).toBe(1);
      expect(currentState.isBlackout).toBe(false);

      // Finish step 2
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(result.current.runningMacro).toBeNull();
    });

    it('cancels macro and rolls back to backup state', () => {
      const rollbackSpy = vi.fn();
      const broadcastSpy = vi.fn();

      const { result } = renderHook(() =>
        useMacroSequencer({
          onBroadcastState: broadcastSpy,
        })
      );

      const cancelableMacro: CinematicMacro = {
        id: 'macro-cancel',
        name: 'Secuencia a Cancelar',
        steps: [
          {
            id: 's1',
            delayMs: 3000,
            blackout: true,
          },
        ],
      };

      act(() => {
        result.current.executeMacro(cancelableMacro, mockBaseDisplayState, vi.fn());
      });

      expect(result.current.runningMacro).not.toBeNull();

      // DM cancels
      act(() => {
        result.current.cancelMacro(rollbackSpy);
      });

      expect(rollbackSpy).toHaveBeenCalledWith(mockBaseDisplayState);
      expect(broadcastSpy).toHaveBeenCalledWith(mockBaseDisplayState);
      expect(result.current.runningMacro).toBeNull();
    });
  });

  describe('4. Step Reordering and Duplication Operations', () => {
    it('moves steps up and down correctly', () => {
      const steps: MacroStep[] = [
        { id: '1', delayMs: 1000, actionLabel: 'Primero' },
        { id: '2', delayMs: 2000, actionLabel: 'Segundo' },
        { id: '3', delayMs: 3000, actionLabel: 'Tercero' },
      ];

      const moveStep = (list: MacroStep[], index: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= list.length) return list;
        const next = [...list];
        const temp = next[index];
        next[index] = next[target];
        next[target] = temp;
        return next;
      };

      const movedDown = moveStep(steps, 0, 'down');
      expect(movedDown.map((s) => s.id)).toEqual(['2', '1', '3']);

      const movedUp = moveStep(movedDown, 2, 'up');
      expect(movedUp.map((s) => s.id)).toEqual(['2', '3', '1']);
    });

    it('duplicates a step and inserts it immediately after', () => {
      const steps: MacroStep[] = [
        { id: '1', delayMs: 1000, actionLabel: 'Paso Original' },
        { id: '2', delayMs: 2000, actionLabel: 'Paso Final' },
      ];

      const duplicateStep = (list: MacroStep[], index: number) => {
        const copy: MacroStep = {
          ...JSON.parse(JSON.stringify(list[index])),
          id: `step-copy-${index}`,
          actionLabel: `${list[index].actionLabel || `Paso ${index + 1}`} (Copia)`,
        };
        const next = [...list];
        next.splice(index + 1, 0, copy);
        return next;
      };

      const result = duplicateStep(steps, 0);
      expect(result.length).toBe(3);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('step-copy-0');
      expect(result[1].actionLabel).toBe('Paso Original (Copia)');
      expect(result[2].id).toBe('2');
    });
  });
});
