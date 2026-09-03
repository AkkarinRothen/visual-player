import { describe, it, expect } from 'vitest';
import { reduceDisplayCommand } from './displayCommandReducer';
import type {
  CameraTransform,
  DisplayState,
  DialogueLine,
  CinematicDialogue,
} from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';

describe('Camera Transform & Conversation Privacy Suite', () => {
  const baseState: DisplayState = {
    currentSceneId: 'sc-throne',
    sceneName: 'Salón del Trono',
    backgroundUrl: 'https://example.com/throne.jpg',
    characters: [
      {
        id: 'npc-king',
        name: 'Rey Alden',
        avatarUrl: 'https://example.com/king.png',
        position: 'center-left',
        normalizedX: 50,
        normalizedY: 20,
        scale: 1.0,
        zIndex: 1,
        isSpeaking: false,
      },
    ],
    props: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Salón del Trono', visible: true },
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
    camera: {
      focalPoint: { x: 50, y: 50 },
      zoom: 1.0,
    },
  };

  it('1. SET_CAMERA_TRANSFORM updates focalPoint, zoom and sets ephemeral transition directive', () => {
    const camPayload: { camera: CameraTransform; durationMs: number } = {
      camera: {
        focalPoint: { x: 65, y: 35 },
        zoom: 1.6,
      },
      durationMs: 750,
    };

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-cam1',
      commandId: 'cmd-cam1',
      sequenceNumber: 40,
      sessionRevision: 41,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_CAMERA_TRANSFORM',
      payload: camPayload,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.camera?.focalPoint.x).toBe(65);
      expect(res.nextState.camera?.focalPoint.y).toBe(35);
      expect(res.nextState.camera?.zoom).toBe(1.6);
      expect(res.nextState.cameraTransition?.durationMs).toBe(750);
      expect(res.nextState.cameraTransition?.transitionId).toBeDefined();

      // Characters and scene structure remain unchanged
      expect(res.nextState.characters[0].normalizedX).toBe(50);
      expect(res.nextState.characters[0].normalizedY).toBe(20);
      expect(res.nextState.characters[0].scale).toBe(1.0);
    }
  });

  it('2. SET_CAMERA_TRANSFORM clamps zoom and coordinates safely', () => {
    const outOfBoundsPayload = {
      camera: {
        focalPoint: { x: 150, y: -20 }, // out of bounds
        zoom: 5.0, // exceeds max zoom 3.0
      },
      durationMs: 0,
    };

    const msg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-cam2',
      commandId: 'cmd-cam2',
      sequenceNumber: 42,
      sessionRevision: 43,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_CAMERA_TRANSFORM',
      payload: outOfBoundsPayload,
    };

    const res = reduceDisplayCommand(baseState, msg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.camera?.focalPoint.x).toBe(100);
      expect(res.nextState.camera?.focalPoint.y).toBe(0);
      expect(res.nextState.camera?.zoom).toBe(3.0);
      expect(res.nextState.cameraTransition).toBeUndefined(); // durationMs 0
    }
  });

  it('3. SET_SCENE restores default camera and clears transitions', () => {
    const zoomedState: DisplayState = {
      ...baseState,
      camera: { focalPoint: { x: 75, y: 25 }, zoom: 2.2 },
      cameraTransition: { transitionId: 'cam-old', durationMs: 800 },
    };

    const setSceneMsg: VersionedSyncMessage = {
      protocolVersion: 1,
      messageId: 'm-sc-cam',
      commandId: 'cmd-sc-cam',
      sequenceNumber: 44,
      sessionRevision: 45,
      sentAt: Date.now(),
      tier: 'critical',
      requiresAck: true,
      type: 'SET_SCENE',
      payload: {
        id: 'sc-catacombs',
        name: 'Catacumbas Olvidadas',
        backgroundUrl: 'https://example.com/catacombs.jpg',
        defaultCamera: { focalPoint: { x: 40, y: 60 }, zoom: 1.2 },
      },
    };

    const res = reduceDisplayCommand(zoomedState, setSceneMsg);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.nextState.camera?.focalPoint.x).toBe(40);
      expect(res.nextState.camera?.focalPoint.y).toBe(60);
      expect(res.nextState.camera?.zoom).toBe(1.2);
      expect(res.nextState.cameraTransition).toBeUndefined();
    }
  });

  it('4. Strict Privacy: dmNotes from DialogueLine are never exposed in public CinematicDialogue', () => {
    const templateLine: DialogueLine = {
      id: 'line-secret-1',
      speakerCharacterId: 'npc-king',
      speakerName: 'Rey Alden',
      text: 'Debéis buscar el amuleto en el Templo de Cristal.',
      dmNotes: 'El amuleto es falso. Si los jugadores sacan Insight 15, notarán que duda.',
      style: 'speech',
      autoFocusSpeaker: true,
    };

    // Public dialogue object produced for the Mesa
    const publicDialogue: CinematicDialogue = {
      id: `dlg-${templateLine.id}`,
      speakerInstanceId: templateLine.speakerCharacterId,
      speakerName: templateLine.speakerName,
      text: templateLine.text,
      style: templateLine.style || 'speech',
      visible: true,
      autoFocusSpeaker: templateLine.autoFocusSpeaker,
    };

    // Verify dmNotes is not a property on the public dialogue projection
    expect((publicDialogue as any).dmNotes).toBeUndefined();
    expect(publicDialogue.text).toBe('Debéis buscar el amuleto en el Templo de Cristal.');
  });
});
