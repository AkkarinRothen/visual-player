import { describe, it, expect } from 'vitest';
import { reduceDisplayCommand } from './displayCommandReducer';
import type { DisplayState, SceneLight } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

describe('Scene Lights Architecture Suite', () => {
  const baseState: DisplayState = {
    currentSceneId: 'sc-dungeon',
    sceneName: 'Cripta Olvidada',
    backgroundUrl: 'https://example.com/crypt.jpg',
    characters: [
      {
        id: 'npc-guard',
        name: 'Guardián',
        avatarUrl: 'https://example.com/guard.png',
        position: 'center-left',
        normalizedX: 40,
        normalizedY: 80,
        scale: 1.0,
        zIndex: 1,
        isSpeaking: false,
      },
    ],
    props: [],
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
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
    },
    dialogue: null,
    lights: [],
  };

  it('1. UPDATE_SCENE_LIGHTS updates scene lights correctly', () => {
    const lightsPayload: SceneLight[] = [
      {
        id: 'light-torch-1',
        name: 'Antorcha del Guardián',
        preset: 'torch',
        color: '#ff8822',
        intensity: 1.2,
        radiusPct: 25,
        normalizedX: 40,
        normalizedY: 60,
        attachedTo: {
          targetType: 'character',
          targetId: 'npc-guard',
          offsetX: 5,
          offsetY: -20,
        },
        flicker: true,
        visible: true,
      },
      {
        id: 'light-candle-1',
        name: 'Vela del Altar',
        preset: 'candle',
        color: '#ffcc44',
        intensity: 0.8,
        radiusPct: 15,
        normalizedX: 75,
        normalizedY: 70,
        flicker: true,
        visible: true,
      },
    ];

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-light-1',
      commandId: 'cmd-light-1',
      sequenceNumber: 50,
      sessionRevision: 51,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'UPDATE_SCENE_LIGHTS',
      payload: lightsPayload,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.lights).toHaveLength(2);
      expect(res.nextState.lights?.[0].preset).toBe('torch');
      expect(res.nextState.lights?.[0].attachedTo?.targetId).toBe('npc-guard');
      expect(res.nextState.lights?.[1].preset).toBe('candle');
    }
  });

  it('2. Rejects invalid lights payload', () => {
    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-light-err',
      commandId: 'cmd-light-err',
      sequenceNumber: 52,
      sessionRevision: 53,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'UPDATE_SCENE_LIGHTS',
      payload: { invalid: true } as any,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe('INVALID_LIGHTS_PAYLOAD');
    }
  });

  it('3. SET_SCENE loads lights from scene payload', () => {
    const setSceneMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-sc-light',
      commandId: 'cmd-sc-light',
      sequenceNumber: 54,
      sessionRevision: 55,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_SCENE',
      payload: {
        id: 'sc-temple',
        name: 'Templo Solar',
        backgroundUrl: 'https://example.com/temple.jpg',
        lights: [
          {
            id: 'light-moon-1',
            name: 'Luz de Luna',
            preset: 'moonlight',
            color: '#aaccff',
            intensity: 1.0,
            radiusPct: 40,
            normalizedX: 50,
            normalizedY: 30,
            flicker: false,
            visible: true,
          },
        ],
      },
    };

    const res = reduceDisplayCommand(baseState, setSceneMsg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.lights).toHaveLength(1);
      expect(res.nextState.lights?.[0].preset).toBe('moonlight');
    }
  });
});
