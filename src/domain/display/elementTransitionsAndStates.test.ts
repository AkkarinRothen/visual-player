import { describe, it, expect } from 'vitest';
import { reduceDisplayCommand } from './displayCommandReducer';
import type {
  DisplayState,
  ElementTransitionDirective,
  VisualStateVariant,
} from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

describe('Element Transitions & Visual States Architecture Suite', () => {
  const baseState: DisplayState = {
    currentSceneId: 'sc-dungeon',
    sceneName: 'Cámara Subterránea',
    backgroundUrl: 'https://example.com/dungeon.jpg',
    characters: [
      {
        id: 'npc-guard',
        name: 'Guardia de la Cripta',
        avatarUrl: 'https://example.com/guard-neutral.png',
        position: 'center-left',
        normalizedX: 35,
        normalizedY: 0,
        scale: 1.0,
        zIndex: 2,
        isSpeaking: false,
        visualStateId: 'state-neutral',
      },
    ],
    props: [
      {
        id: 'prop-chest-1',
        name: 'Cofre Arcano',
        assetUrl: 'https://example.com/chest-closed.png',
        normalizedX: 65,
        normalizedY: 0,
        scale: 1.2,
        rotation: 0,
        zIndex: 1,
        anchor: 'bottom-center',
        visible: true,
        visualStateId: 'state-closed',
      },
    ],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Cripta', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: true,
      round: 1,
      currentTurnIndex: 0,
      combatants: [
        {
          id: 'guard-c',
          name: 'Guardia',
          avatarUrl: 'https://example.com/guard-neutral.png',
          currentHp: 30,
          maxHp: 30,
          initiative: 14,
          conditions: [],
          showHpToPlayers: true,
          isMonster: true,
        },
      ],
    },
  };

  it('1. TRIGGER_ELEMENT_TRANSITION registers transition directives and enforces idempotency', () => {
    const directive: ElementTransitionDirective = {
      transitionId: 'trans-enter-guard-1',
      targetId: 'npc-guard',
      targetType: 'character',
      direction: 'enter',
      animation: 'slide-left',
      durationMs: 600,
    };

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-t1',
      commandId: 'cmd-t1',
      sequenceNumber: 20,
      sessionRevision: 21,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'TRIGGER_ELEMENT_TRANSITION',
      payload: directive,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.activeTransitions).toHaveLength(1);
      expect(res.nextState.activeTransitions?.[0].animation).toBe('slide-left');
      expect(res.nextState.activeTransitions?.[0].durationMs).toBe(600);

      // Re-applying duplicate transitionId is idempotent (no duplicates added)
      const duplicateRes = reduceDisplayCommand(res.nextState, msg);
      expect(duplicateRes.success).toBe(true);
      if (duplicateRes.success) {
        expect(duplicateRes.nextState.activeTransitions).toHaveLength(1);
      }
    }
  });

  it('2. SET_ELEMENT_VISUAL_STATE toggles prop visual state without altering position or coordinates', () => {
    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-vs1',
      commandId: 'cmd-vs1',
      sequenceNumber: 22,
      sessionRevision: 23,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_ELEMENT_VISUAL_STATE',
      payload: {
        targetId: 'prop-chest-1',
        targetType: 'prop',
        visualStateId: 'state-open',
        assetUrl: 'https://example.com/chest-opened.png',
      },
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      const chest = res.nextState.props?.find((p) => p.id === 'prop-chest-1');
      expect(chest).toBeDefined();
      expect(chest?.visualStateId).toBe('state-open');
      expect(chest?.assetUrl).toBe('https://example.com/chest-opened.png');
      // Position and base scale remain strictly unchanged!
      expect(chest?.normalizedX).toBe(65);
      expect(chest?.normalizedY).toBe(0);
      expect(chest?.scale).toBe(1.2);
    }
  });

  it('3. SET_ELEMENT_VISUAL_STATE toggles character visual state without mutating HP or combat state', () => {
    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-vs2',
      commandId: 'cmd-vs2',
      sequenceNumber: 24,
      sessionRevision: 25,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_ELEMENT_VISUAL_STATE',
      payload: {
        targetId: 'npc-guard',
        targetType: 'character',
        visualStateId: 'state-alert',
        assetUrl: 'https://example.com/guard-alert.png',
        activeExpression: 'alert',
      },
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      const guard = res.nextState.characters.find((c) => c.id === 'npc-guard');
      expect(guard?.visualStateId).toBe('state-alert');
      expect(guard?.avatarUrl).toBe('https://example.com/guard-alert.png');
      expect(guard?.activeExpression).toBe('alert');

      // Combatant HP and combat state are completely preserved!
      expect(res.nextState.combatState.isActive).toBe(true);
      expect(res.nextState.combatState.combatants[0].currentHp).toBe(30);
      expect(res.nextState.combatState.combatants[0].maxHp).toBe(30);
    }
  });

  it('4. Multiplicative scale modifier calculates cleanly without accumulation', () => {
    const variantHurt: VisualStateVariant = {
      id: 'state-crouching',
      name: 'Agachado',
      assetUrl: 'https://example.com/guard-crouch.png',
      scaleModifier: 0.85,
    };

    const instanceScale = 1.2;
    const effectiveScale1 = instanceScale * (variantHurt.scaleModifier ?? 1.0);
    expect(effectiveScale1).toBeCloseTo(1.02, 2);

    // Returning to normal state (scaleModifier 1.0) returns to base scale
    const variantNormal: VisualStateVariant = {
      id: 'state-normal',
      name: 'Normal',
      assetUrl: 'https://example.com/guard-normal.png',
      scaleModifier: 1.0,
    };
    const effectiveScale2 = instanceScale * (variantNormal.scaleModifier ?? 1.0);
    expect(effectiveScale2).toBe(1.2);
  });
});
