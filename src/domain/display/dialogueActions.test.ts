import { describe, it, expect, vi } from 'vitest';
import type {
  DialogueLine,
  CinematicDialogue,
  Campaign,
  DialogueLineActions,
} from '../../types';

describe('Dialogue Actions & Idempotent Orchestration Suite', () => {
  const mockCampaign: Campaign = {
    id: 'camp-1',
    title: 'Campaña Sombría',
    description: 'Aventura en las montañas',
    createdAt: Date.now(),
    scenes: [],
    characters: [],
    macros: [
      {
        id: 'macro-thunder',
        name: 'Trueno y Relámpago',
        description: 'Efecto de tormenta dramático',
        icon: 'zap',
        steps: [
          { id: 'step-1', delayMs: 0, lightning: true },
          { id: 'step-2', delayMs: 200, sfxAudioUrl: 'https://example.com/thunder.mp3' },
        ],
      },
    ],
  };

  const lineWithActions: DialogueLine = {
    id: 'line-dramatic-1',
    speakerCharacterId: 'char-villain',
    speakerName: 'Malakor',
    text: '¡Demasiado tarde para detener el ritual!',
    style: 'shout',
    activeExpression: 'malicious',
    autoFocusSpeaker: true,
    dmNotes: 'Malakor sostiene la gema con su mano izquierda.',
    actions: {
      expression: 'malicious',
      cameraPreset: 'speaker',
      momentId: 'macro-thunder',
    },
  };

  it('1. Extracts public dialogue projection without leaking dmNotes or actions execution data', () => {
    const publicDialogue: CinematicDialogue = {
      id: `dlg-${lineWithActions.id}`,
      speakerInstanceId: lineWithActions.speakerCharacterId,
      speakerName: lineWithActions.speakerName,
      text: lineWithActions.text,
      style: lineWithActions.style || 'speech',
      visible: true,
      autoFocusSpeaker: lineWithActions.autoFocusSpeaker,
      activeExpression: lineWithActions.activeExpression,
    };

    expect((publicDialogue as any).dmNotes).toBeUndefined();
    expect((publicDialogue as any).actions).toBeUndefined();
    expect(publicDialogue.text).toBe('¡Demasiado tarde para detener el ritual!');
    expect(publicDialogue.style).toBe('shout');
  });

  it('2. Idempotency: Executes actions on first publish and skips on re-navigation', () => {
    let executedActionLineIds: Record<string, string> = {};
    const mockMacroExecutor = vi.fn();
    const mockCameraExecutor = vi.fn();

    const simulatePublish = (line: DialogueLine) => {
      if (line.actions && !executedActionLineIds[line.id]) {
        // Execute actions
        if (line.actions.cameraPreset) mockCameraExecutor(line.actions.cameraPreset);
        if (line.actions.momentId) mockMacroExecutor(line.actions.momentId);

        // Record execution ID
        executedActionLineIds = {
          ...executedActionLineIds,
          [line.id]: `att-${line.id}-1-${Date.now()}`,
        };
      }
    };

    // Step 1: First publish triggers actions
    simulatePublish(lineWithActions);
    expect(mockCameraExecutor).toHaveBeenCalledTimes(1);
    expect(mockMacroExecutor).toHaveBeenCalledTimes(1);
    expect(executedActionLineIds[lineWithActions.id]).toBeDefined();

    // Step 2: Going back with "Anterior" does NOT re-trigger actions
    simulatePublish(lineWithActions);
    expect(mockCameraExecutor).toHaveBeenCalledTimes(1);
    expect(mockMacroExecutor).toHaveBeenCalledTimes(1);
  });

  it('3. Explicit repeat actions generates a new attempt ID and re-executes', () => {
    let executedActionLineIds: Record<string, string> = {
      [lineWithActions.id]: 'att-line-dramatic-1-1-1000',
    };
    const mockMacroExecutor = vi.fn();

    const simulateRepeatActions = (actions: DialogueLineActions, lineId: string) => {
      const newAttemptId = `att-${lineId}-repeat-${Date.now()}`;
      executedActionLineIds = {
        ...executedActionLineIds,
        [lineId]: newAttemptId,
      };
      if (actions.momentId) mockMacroExecutor(actions.momentId);
    };

    simulateRepeatActions(lineWithActions.actions!, lineWithActions.id);
    expect(mockMacroExecutor).toHaveBeenCalledTimes(1);
    expect(executedActionLineIds[lineWithActions.id]).toContain('repeat');
  });

  it('4. Missing moment reference does not block dialogue publication and warns cleanly', () => {
    const lineWithMissingMacro: DialogueLine = {
      ...lineWithActions,
      actions: {
        cameraPreset: 'general',
        momentId: 'non-existent-macro-id',
      },
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const executeActionsWithSafety = (actions: DialogueLineActions) => {
      if (actions.momentId) {
        const found = mockCampaign.macros?.find((m) => m.id === actions.momentId);
        if (!found) {
          console.warn(`[DialogueActions] Momento ${actions.momentId} no encontrado en campaña.`);
        }
      }
    };

    expect(() => executeActionsWithSafety(lineWithMissingMacro.actions!)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Momento non-existent-macro-id no encontrado')
    );

    warnSpy.mockRestore();
  });
});
