import { describe, it, expect } from 'vitest';
import { reduceDisplayCommand } from './displayCommandReducer';
import type {
  DisplayState,
  SceneCompositionPreset,
  SceneProp,
} from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

describe('Scene Props & Composition Presets Architecture Suite', () => {
  const baseState: DisplayState = {
    currentSceneId: 'sc-tavern',
    sceneName: 'Taberna del Jabalí Alado',
    backgroundUrl: 'https://example.com/tavern.jpg',
    characters: [
      {
        id: 'npc-barkeep',
        name: 'Grom el Tabernero',
        avatarUrl: 'https://example.com/grom.png',
        position: 'center-left',
        normalizedX: 30,
        normalizedY: 0,
        scale: 1.0,
        zIndex: 1,
        isSpeaking: false,
      },
      {
        id: 'npc-adventurer',
        name: 'Elira la Picara',
        avatarUrl: 'https://example.com/elira.png',
        position: 'center-right',
        normalizedX: 60,
        normalizedY: 0,
        scale: 1.0,
        zIndex: 3,
        isSpeaking: false,
      },
    ],
    props: [
      {
        id: 'prop-bar',
        name: 'Mostrador de Madera',
        assetUrl: 'https://example.com/bar.png',
        normalizedX: 32,
        normalizedY: 0,
        scale: 1.2,
        zIndex: 2, // Placed between Barkeep (1) and Adventurer (3)!
        anchor: 'bottom-center',
        visible: true,
      },
      {
        id: 'prop-lantern',
        name: 'Farol de Bronce',
        assetUrl: 'https://example.com/lantern.png',
        normalizedX: 75,
        normalizedY: 50,
        scale: 0.8,
        rotation: 15,
        zIndex: 4, // Placed in foreground!
        anchor: 'center',
        visible: true,
      },
    ],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Taberna', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: true,
      round: 2,
      currentTurnIndex: 1,
      combatants: [
        {
          id: 'barkeep-c',
          name: 'Grom',
          avatarUrl: 'https://example.com/grom.png',
          currentHp: 25,
          maxHp: 25,
          initiative: 12,
          conditions: [],
          showHpToPlayers: true,
          isMonster: false,
        },
        {
          id: 'elira-c',
          name: 'Elira',
          avatarUrl: 'https://example.com/elira.png',
          currentHp: 18,
          maxHp: 20,
          initiative: 18,
          conditions: [],
          showHpToPlayers: true,
          isMonster: false,
        },
      ],
    },
  };

  it('1. Correctly interleaves NPCs and Props in unified zIndex order (Background -> NPC1 -> Bar -> NPC2 -> Lantern)', () => {
    type StageItem =
      | { type: 'character'; id: string; zIndex: number }
      | { type: 'prop'; id: string; zIndex: number };

    const stageItems: StageItem[] = [
      ...baseState.characters.map((c) => ({
        type: 'character' as const,
        id: c.id,
        zIndex: c.zIndex ?? 1,
      })),
      ...(baseState.props || []).map((p) => ({
        type: 'prop' as const,
        id: p.id,
        zIndex: p.zIndex,
      })),
    ].sort((a, b) => a.zIndex - b.zIndex);

    // Exact stacking order validation
    expect(stageItems).toHaveLength(4);
    expect(stageItems[0]).toEqual({ type: 'character', id: 'npc-barkeep', zIndex: 1 });
    expect(stageItems[1]).toEqual({ type: 'prop', id: 'prop-bar', zIndex: 2 });
    expect(stageItems[2]).toEqual({ type: 'character', id: 'npc-adventurer', zIndex: 3 });
    expect(stageItems[3]).toEqual({ type: 'prop', id: 'prop-lantern', zIndex: 4 });
  });

  it('2. UPDATE_SCENE_PROPS updates props cleanly in pure reducer and rejects malformed payloads', () => {
    const nextProps: SceneProp[] = [
      {
        id: 'prop-chest',
        name: 'Cofre Dorado',
        assetUrl: 'https://example.com/chest.png',
        normalizedX: 50,
        normalizedY: 0,
        scale: 1.1,
        rotation: 0,
        zIndex: 5,
        anchor: 'bottom-center',
        visible: true,
      },
    ];

    const validMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-p1',
      commandId: 'cmd-p1',
      sequenceNumber: 10,
      sessionRevision: 11,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'UPDATE_SCENE_PROPS',
      payload: nextProps,
    };

    const res = reduceDisplayCommand(baseState, validMsg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.props).toHaveLength(1);
      expect(res.nextState.props?.[0].name).toBe('Cofre Dorado');
      // Characters must remain untouched
      expect(res.nextState.characters).toHaveLength(2);
    }

    // Malformed payload rejection
    const invalidMsg = { ...validMsg, payload: 'invalid-string' };
    const errRes = reduceDisplayCommand(baseState, invalidMsg as any);
    expect(errRes.success).toBe(false);
    if (!errRes.success) {
      expect(errRes.errorCode).toBe('INVALID_PROPS_PAYLOAD');
    }
  });

  it('3. APPLY_COMPOSITION_PRESET applies visual layout without touching HP, active combat, or notes', () => {
    const preset: SceneCompositionPreset = {
      id: 'comp-tavern-calm',
      name: 'Taberna en Calma',
      description: 'Disposición matutina antes del combate',
      backgroundUrl: 'https://example.com/tavern-morning.jpg',
      variantId: 'var-morning',
      characters: [
        {
          id: 'npc-barkeep',
          name: 'Grom',
          avatarUrl: 'https://example.com/grom-calm.png',
          activeExpression: 'smiling',
          normalizedX: 45,
          normalizedY: 0,
          scale: 1.0,
          zIndex: 1,
        },
      ],
      props: [
        {
          id: 'prop-bar',
          name: 'Mostrador',
          assetUrl: 'https://example.com/bar.png',
          normalizedX: 45,
          normalizedY: 0,
          scale: 1.0,
          zIndex: 2,
          anchor: 'bottom-center',
          visible: true,
        },
      ],
      lighting: 'normal',
      weather: 'none',
      createdAt: Date.now(),
    };

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-comp1',
      commandId: 'cmd-comp1',
      sequenceNumber: 12,
      sessionRevision: 13,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'APPLY_COMPOSITION_PRESET',
      payload: preset,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      // Visual state updated:
      expect(res.nextState.backgroundUrl).toBe('https://example.com/tavern-morning.jpg');
      expect(res.nextState.activeVariantId).toBe('var-morning');
      expect(res.nextState.characters).toHaveLength(1);
      expect(res.nextState.characters[0].activeExpression).toBe('smiling');
      expect(res.nextState.characters[0].isSpeaking).toBe(false); // speaking state reset
      expect(res.nextState.props).toHaveLength(1);

      // GAMEPLAY STATE IMMUTABILITY: Combat, HP, initiative, rounds are strictly preserved!
      expect(res.nextState.combatState.isActive).toBe(true);
      expect(res.nextState.combatState.round).toBe(2);
      expect(res.nextState.combatState.currentTurnIndex).toBe(1);
      expect(res.nextState.combatState.combatants).toHaveLength(2);
      expect(res.nextState.combatState.combatants[0].currentHp).toBe(25);
      expect(res.nextState.combatState.combatants[1].currentHp).toBe(18);

      // Background transition side effect generated:
      expect(res.sideEffects?.some((e) => e.type === 'trigger_bg_transition')).toBe(true);
    }
  });
});
