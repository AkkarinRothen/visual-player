import { describe, it, expect } from 'vitest';
import { reduceDisplayCommand } from './displayCommandReducer';
import type { DisplayState } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

describe('reduceDisplayCommand Pure Reducer Suite', () => {
  const baseState: DisplayState = {
    currentSceneId: 'sc-1',
    sceneName: 'Bosque Antiguo',
    backgroundUrl: 'https://example.com/forest.jpg',
    characters: [
      {
        id: 'c-1',
        name: 'Elfo',
        avatarUrl: 'https://example.com/elf.png',
        position: 'center-left',
        isSpeaking: false,
      },
    ],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: { text: 'Bosque', subtitle: '', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: { isActive: false, round: 1, currentTurnIndex: 0, combatants: [] },
  };

  it('1. Reduces FULL_STATE correctly and generates side-effects for audio and background', () => {
    const nextState: DisplayState = {
      ...baseState,
      sceneName: 'Cueva Helada',
      backgroundUrl: 'https://example.com/cave.jpg',
      ambientAudioUrl: 'https://example.com/wind.mp3',
      ambientPlaying: true,
      ambientVolume: 0.8,
    };

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-1',
      commandId: 'cmd-1',
      sequenceNumber: 1,
      sessionRevision: 2,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'FULL_STATE',
      payload: nextState,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.sceneName).toBe('Cueva Helada');
      expect(res.nextState.backgroundUrl).toBe('https://example.com/cave.jpg');
      expect(res.sideEffects).toBeDefined();
      expect(res.sideEffects?.some((e) => e.type === 'trigger_bg_transition')).toBe(true);
      expect(res.sideEffects?.some((e) => e.type === 'set_ambient')).toBe(true);
    }
  });

  it('2. Returns deterministic rejection on UNKNOWN_COMMAND', () => {
    const msg = {
      protocolVersion: 1 as const,
      messageId: 'm-unk',
      commandId: 'cmd-unk',
      sequenceNumber: 1,
      sessionRevision: 1,
      sentAt: Date.now(),
      tier: 'ephemeral' as const,
      requiresAck: false,
      type: 'NON_EXISTENT_TYPE' as any,
      payload: {},
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe('UNKNOWN_COMMAND');
      expect(res.errorMessage).toContain('NON_EXISTENT_TYPE');
    }
  });

  it('3. Validates payloads and rejects malformed inputs', () => {
    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-bad',
      commandId: 'cmd-bad',
      sequenceNumber: 1,
      sessionRevision: 1,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'FULL_STATE',
      payload: null,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe('INVALID_PAYLOAD');
    }
  });

  it('4. Correctly reduces combat start, update, and end commands', () => {
    const combatMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-c',
      commandId: 'cmd-c',
      sequenceNumber: 2,
      sessionRevision: 3,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'UPDATE_COMBAT',
      payload: {
        isActive: true,
        round: 3,
        currentTurnIndex: 1,
        combatants: [{ id: 'goblin-1', name: 'Goblin', initiative: 14, currentHp: 7, maxHp: 7 }],
      },
    };

    const res1 = reduceDisplayCommand(baseState, combatMsg);
    expect(res1.success).toBe(true);
    if (res1.success) {
      expect(res1.nextState.combatState?.isActive).toBe(true);
      expect(res1.nextState.combatState?.round).toBe(3);
    }

    const endMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-end',
      commandId: 'cmd-end',
      sequenceNumber: 3,
      sessionRevision: 4,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'END_COMBAT',
      payload: {},
    };

    const res2 = reduceDisplayCommand(res1.success ? res1.nextState : baseState, endMsg);
    expect(res2.success).toBe(true);
    if (res2.success) {
      expect(res2.nextState.combatState?.isActive).toBe(false);
    }
  });

  it('5. Reduces SET_BLACKOUT cleanly without mutating original state', () => {
    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-bl',
      commandId: 'cmd-bl',
      sequenceNumber: 4,
      sessionRevision: 5,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_BLACKOUT',
      payload: true,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.isBlackout).toBe(true);
    }
    expect(baseState.isBlackout).toBe(false); // Original state unmodified
  });

  it('6. Reduces UPDATE_CHARACTER_TRANSFORM with normalized coordinates, scale, and flip', () => {
    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-tr',
      commandId: 'cmd-tr',
      sequenceNumber: 5,
      sessionRevision: 6,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'UPDATE_CHARACTER_TRANSFORM',
      payload: {
        id: 'c-1',
        normalizedX: 35.5,
        normalizedY: 10,
        scale: 1.3,
        isFlipped: true,
        zIndex: 5,
        isLocked: true,
      },
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      const char = res.nextState.characters.find((c) => c.id === 'c-1');
      expect(char).toBeDefined();
      expect(char?.normalizedX).toBe(35.5);
      expect(char?.normalizedY).toBe(10);
      expect(char?.scale).toBe(1.3);
      expect(char?.isFlipped).toBe(true);
      expect(char?.zIndex).toBe(5);
      expect(char?.isLocked).toBe(true);
    }
  });

  it('7. Reduces APPLY_SCENE_VARIANT with focalPoint, fitMode, and zoom while preserving characters', () => {
    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-var',
      commandId: 'cmd-var',
      sequenceNumber: 6,
      sessionRevision: 7,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'APPLY_SCENE_VARIANT',
      payload: {
        variantId: 'var-night',
        backgroundUrl: 'https://example.com/forest-night.jpg',
        fitMode: 'contain',
        focalPoint: { x: 40, y: 60 },
        zoom: 1.2,
        lighting: 'dim',
        weather: 'fog',
        weatherIntensity: 0.7,
      },
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.backgroundUrl).toBe('https://example.com/forest-night.jpg');
      expect(res.nextState.activeVariantId).toBe('var-night');
      expect(res.nextState.fitMode).toBe('contain');
      expect(res.nextState.focalPoint).toEqual({ x: 40, y: 60 });
      expect(res.nextState.zoom).toBe(1.2);
      expect(res.nextState.lighting).toBe('dim');
      expect(res.nextState.weather).toBe('fog');
      // Characters must be completely preserved!
      expect(res.nextState.characters.length).toBe(1);
      expect(res.nextState.characters[0].name).toBe('Elfo');
      // Side effects must trigger background crossfade
      expect(res.sideEffects?.some((e) => e.type === 'trigger_bg_transition')).toBe(true);
    }
  });
});
