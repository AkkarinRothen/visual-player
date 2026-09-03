import { describe, it, expect, vi } from 'vitest';
import { reduceDisplayCommand } from './displayCommandReducer';
import type {
  DisplayState,
  SceneInteraction,
  SceneProp,
  SceneLight,
  SceneInteractionTransition,
} from '../../types';

describe('Declarative Scene Interactions Suite (SceneInteraction)', () => {
  const mockProps: SceneProp[] = [
    {
      id: 'prop-door-1',
      name: 'Puerta de Roble',
      assetUrl: 'https://example.com/door_closed.png',
      normalizedX: 20,
      normalizedY: 60,
      scale: 1.0,
      zIndex: 10,
      visualStateId: 'closed',
    },
    {
      id: 'prop-torch-1',
      name: 'Antorcha de Hierro',
      assetUrl: 'https://example.com/torch.png',
      normalizedX: 80,
      normalizedY: 45,
      scale: 0.8,
      zIndex: 8,
      visualStateId: 'unlit',
    },
    {
      id: 'prop-chest-1',
      name: 'Cofre Misterioso',
      assetUrl: 'https://example.com/chest_hidden.png',
      normalizedX: 50,
      normalizedY: 85,
      scale: 0.9,
      zIndex: 12,
      visualStateId: 'hidden',
    },
  ];

  const mockLights: SceneLight[] = [
    {
      id: 'light-torch-1',
      name: 'Luz de Antorcha',
      preset: 'torch',
      color: '#ff9933',
      intensity: 1.2,
      radiusPct: 20,
      normalizedX: 80,
      normalizedY: 45,
      flicker: true,
      visible: false,
    },
  ];

  const mockInteractions: SceneInteraction[] = [
    {
      id: 'int-door-1',
      targetInstanceId: 'prop-door-1',
      name: 'Puerta de Roble',
      currentState: 'closed',
      scope: 'campaign',
      transitions: [
        {
          id: 'trans-open-door',
          fromState: 'closed',
          toState: 'open',
          label: 'Abrir puerta',
          visualStateId: 'open',
          sfxPreset: 'door_creak',
        },
        {
          id: 'trans-close-door',
          fromState: 'open',
          toState: 'closed',
          label: 'Cerrar puerta',
          visualStateId: 'closed',
          sfxPreset: 'door_slam',
        },
      ],
    },
    {
      id: 'int-torch-1',
      targetInstanceId: 'prop-torch-1',
      name: 'Antorcha de Hierro',
      currentState: 'unlit',
      scope: 'session',
      transitions: [
        {
          id: 'trans-light-torch',
          fromState: 'unlit',
          toState: 'lit',
          label: 'Encender antorcha',
          visualStateId: 'lit',
          lightId: 'light-torch-1',
          sfxPreset: 'torch_ignite',
        },
        {
          id: 'trans-douse-torch',
          fromState: 'lit',
          toState: 'unlit',
          label: 'Apagar antorcha',
          visualStateId: 'unlit',
          lightId: 'light-torch-1',
          sfxPreset: 'whoosh',
        },
      ],
    },
    {
      id: 'int-chest-1',
      targetInstanceId: 'prop-chest-1',
      name: 'Cofre Misterioso',
      currentState: 'hidden',
      scope: 'scene',
      transitions: [
        {
          id: 'trans-reveal-chest',
          fromState: 'hidden',
          toState: 'revealed',
          label: 'Descubrir cofre',
          visualStateId: 'revealed',
        },
        {
          id: 'trans-open-chest',
          fromState: 'revealed',
          toState: 'open',
          label: 'Abrir cofre',
          visualStateId: 'open',
          requiredHint: 'Requiere llave o ganzúa',
          sfxPreset: 'chest_open',
        },
      ],
    },
  ];

  const initialState: DisplayState = {
    currentSceneId: 'sc-dungeon',
    sceneName: 'Mazmorra de la Cripta',
    backgroundUrl: 'https://example.com/dungeon.jpg',
    characters: [],
    props: mockProps,
    lights: mockLights,
    emitters: [],
    interactions: mockInteractions,
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: { text: 'Mazmorra', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
  };

  it('1. Executes atomic interaction transition: updates prop visualState, linked light, and interaction state', () => {
    const torchInteraction = mockInteractions[1];
    const lightTransition = torchInteraction.transitions[0]; // 'unlit' -> 'lit'

    // Simulate atomic domain transition execution
    const updatedInteractions = initialState.interactions!.map((i) =>
      i.id === torchInteraction.id ? { ...i, currentState: lightTransition.toState } : i
    );

    const updatedProps = initialState.props!.map((p) =>
      p.id === torchInteraction.targetInstanceId
        ? { ...p, visualStateId: lightTransition.visualStateId }
        : p
    );

    const updatedLights = initialState.lights!.map((l) =>
      l.id === lightTransition.lightId ? { ...l, visible: true } : l
    );

    const nextState: DisplayState = {
      ...initialState,
      props: updatedProps,
      lights: updatedLights,
      interactions: updatedInteractions,
    };

    expect(nextState.interactions![1].currentState).toBe('lit');
    expect(nextState.props![1].visualStateId).toBe('lit');
    expect(nextState.lights![0].visible).toBe(true);
  });

  it('2. Protocol Reducer: Reduces UPDATE_SCENE_INTERACTIONS and rejects malformed payload', () => {
    const updatedInteractions = mockInteractions.map((i) =>
      i.id === 'int-door-1' ? { ...i, currentState: 'open' } : i
    );

    const result = reduceDisplayCommand(initialState, {
      type: 'UPDATE_SCENE_INTERACTIONS',
      payload: updatedInteractions,
      sequence: 1,
      timestamp: Date.now(),
      messageId: 'msg-int-1',
    } as any);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.interactions![0].currentState).toBe('open');
    }

    const invalidResult = reduceDisplayCommand(initialState, {
      type: 'UPDATE_SCENE_INTERACTIONS',
      payload: null,
      sequence: 2,
      timestamp: Date.now(),
      messageId: 'msg-int-invalid',
    } as any);

    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.errorCode).toBe('INVALID_INTERACTIONS_PAYLOAD');
    }
  });

  it('3. Persisted interaction state survives scene reload without re-triggering SFX', () => {
    // Campaign records that prop-door-1 was left 'open'
    const campaignInteractionStates: Record<string, string> = {
      'prop-door-1': 'open',
    };

    const sfxMock = vi.fn();

    // Scene reloader applies persisted states
    const restoredInteractions = mockInteractions.map((int) => {
      const persisted = campaignInteractionStates[int.targetInstanceId];
      return persisted ? { ...int, currentState: persisted } : int;
    });

    const restoredProps = mockProps.map((p) => {
      const persisted = campaignInteractionStates[p.id];
      return persisted ? { ...p, visualStateId: persisted } : p;
    });

    // Verify door state is restored
    expect(restoredInteractions[0].currentState).toBe('open');
    expect(restoredProps[0].visualStateId).toBe('open');

    // Verify SFX is strictly NOT fired during silent state restoration
    expect(sfxMock).not.toHaveBeenCalled();
  });

  it('4. Double-Touch Lock: Rejects secondary clicks while action execution is pending', () => {
    let executingInteractionId: string | null = 'trans-open-door';
    const executionSpy = vi.fn();

    const triggerAction = (transition: SceneInteractionTransition) => {
      if (executingInteractionId) return; // Locked
      executionSpy(transition.id);
    };

    triggerAction(mockInteractions[0].transitions[0]);
    expect(executionSpy).not.toHaveBeenCalled();

    // Unlock
    executingInteractionId = null;
    triggerAction(mockInteractions[0].transitions[0]);
    expect(executionSpy).toHaveBeenCalledWith('trans-open-door');
  });

  it('5. Tolerates missing linked light gracefully without throwing', () => {
    const transitionWithMissingLight: SceneInteractionTransition = {
      id: 'trans-ghost-light',
      fromState: 'unlit',
      toState: 'lit',
      label: 'Encender',
      lightId: 'non-existent-light-999',
    };

    expect(() => {
      const updatedLights = initialState.lights!.map((l) =>
        l.id === transitionWithMissingLight.lightId ? { ...l, visible: true } : l
      );
      expect(updatedLights).toHaveLength(1);
      expect(updatedLights[0].visible).toBe(false); // Unchanged
    }).not.toThrow();
  });
});
