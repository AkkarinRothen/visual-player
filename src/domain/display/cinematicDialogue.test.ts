import { describe, it, expect } from 'vitest';
import { reduceDisplayCommand } from './displayCommandReducer';
import type {
  CinematicDialogue,
  DisplayState,
} from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

describe('Cinematic Dialogue & Narration Architecture Suite', () => {
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
        zIndex: 2,
        isSpeaking: false,
      },
    ],
    props: [],
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
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
    },
    dialogue: null,
  };

  it('1. SET_CINEMATIC_DIALOGUE sets active dialogue and auto-focuses speaker on screen', () => {
    const dialoguePayload: CinematicDialogue = {
      id: 'dlg-101',
      speakerInstanceId: 'npc-barkeep',
      speakerName: 'Grom',
      text: '¡Bienvenidos al Jabalí Alado, forasteros!',
      avatarUrl: 'https://example.com/grom.png',
      activeExpression: 'smiling',
      style: 'speech',
      visible: true,
      autoFocusSpeaker: true,
    };

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-dlg1',
      commandId: 'cmd-dlg1',
      sequenceNumber: 30,
      sessionRevision: 31,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_CINEMATIC_DIALOGUE',
      payload: dialoguePayload,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.dialogue).toBeDefined();
      expect(res.nextState.dialogue?.text).toBe('¡Bienvenidos al Jabalí Alado, forasteros!');
      expect(res.nextState.dialogue?.speakerName).toBe('Grom');
      expect(res.nextState.dialogue?.style).toBe('speech');

      // Barkeep should be speaking, Adventurer dimmed/not speaking
      const barkeep = res.nextState.characters.find((c) => c.id === 'npc-barkeep');
      const adventurer = res.nextState.characters.find((c) => c.id === 'npc-adventurer');
      expect(barkeep?.isSpeaking).toBe(true);
      expect(adventurer?.isSpeaking).toBe(false);
    }
  });

  it('2. DISMISS_CINEMATIC_DIALOGUE clears dialogue and restores speaker focus cleanly', () => {
    // State with active dialogue and barkeep speaking
    const activeState: DisplayState = {
      ...baseState,
      characters: [
        { ...baseState.characters[0], isSpeaking: true },
        { ...baseState.characters[1], isSpeaking: false },
      ],
      dialogue: {
        id: 'dlg-101',
        speakerInstanceId: 'npc-barkeep',
        speakerName: 'Grom',
        text: '¡Bienvenidos!',
        style: 'speech',
        visible: true,
        autoFocusSpeaker: true,
      },
    };

    const dismissMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-dlg2',
      commandId: 'cmd-dlg2',
      sequenceNumber: 32,
      sessionRevision: 33,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'DISMISS_CINEMATIC_DIALOGUE',
      payload: {},
    };

    const res = reduceDisplayCommand(activeState, dismissMsg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.dialogue).toBeNull();
      // Barkeep speaking focus is cleanly cleared
      const barkeep = res.nextState.characters.find((c) => c.id === 'npc-barkeep');
      expect(barkeep?.isSpeaking).toBe(false);
    }
  });

  it('3. Supports narration style without speaker NPC or avatar', () => {
    const narrationPayload: CinematicDialogue = {
      id: 'dlg-narration-1',
      text: 'La lluvia repiquetea contra los vitrales mientras una sombra cruza la plaza.',
      style: 'narration',
      visible: true,
      autoFocusSpeaker: false,
    };

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-dlg3',
      commandId: 'cmd-dlg3',
      sequenceNumber: 34,
      sessionRevision: 35,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_CINEMATIC_DIALOGUE',
      payload: narrationPayload,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.dialogue?.style).toBe('narration');
      expect(res.nextState.dialogue?.speakerName).toBeUndefined();
      expect(res.nextState.dialogue?.avatarUrl).toBeUndefined();
      // Characters remain untouched
      expect(res.nextState.characters.every((c) => !c.isSpeaking)).toBe(true);
    }
  });

  it('4. Rejects invalid dialogue payloads cleanly', () => {
    const invalidMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-dlg-err',
      commandId: 'cmd-dlg-err',
      sequenceNumber: 36,
      sessionRevision: 37,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_CINEMATIC_DIALOGUE',
      payload: { invalidField: true } as any,
    };

    const res = reduceDisplayCommand(baseState, invalidMsg);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe('INVALID_DIALOGUE_PAYLOAD');
    }
  });
});
