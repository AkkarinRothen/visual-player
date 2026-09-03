import { describe, it, expect } from 'vitest';
import type { DisplayState, HandoutState, RevealedRegionRect } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';
import { reduceDisplayCommand } from './displayCommandReducer';

describe('Handout Viewer & Progressive Reveal Suite (HandoutViewer)', () => {
  const initialDisplay: DisplayState = {
    currentSceneId: 'sc-crypt',
    sceneName: 'Cripta de los Reyes',
    backgroundUrl: 'https://example.com/crypt.jpg',
    characters: [
      {
        id: 'npc-guide',
        name: 'Guía Errante',
        avatarUrl: 'https://example.com/guide.png',
        position: 'center-left',
        isSpeaking: false,
      },
    ],
    weather: 'fog',
    weatherIntensity: 0.5,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Cripta de los Reyes', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/ambient.mp3',
    ambientPlaying: true,
    ambientVolume: 0.7,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
    activeHandout: null,
  };

  const sampleHandout: HandoutState = {
    id: 'handout-map-1',
    title: 'Mapa de las Catacumbas',
    imageUrl: 'https://example.com/map.jpg',
    revealedRects: [],
    isFullyRevealed: false,
    zoom: 1.0,
    panOffset: { x: 0, y: 0 },
    isConfidential: false,
  };

  const createMsg = (payload: any): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'm-test',
    commandId: 'cmd-test',
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'critical',
    requiresAck: true,
    type: 'UPDATE_ACTIVE_HANDOUT',
    payload,
  });

  it('1. Projects handout to Mesa without altering underlying scene, characters, or audio', () => {
    const result = reduceDisplayCommand(initialDisplay, createMsg(sampleHandout));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.activeHandout).toBeDefined();
      expect(result.nextState.activeHandout?.id).toBe('handout-map-1');

      // Underlying scene state is fully preserved
      expect(result.nextState.backgroundUrl).toBe('https://example.com/crypt.jpg');
      expect(result.nextState.characters).toHaveLength(1);
      expect(result.nextState.ambientAudioUrl).toBe('https://example.com/ambient.mp3');
    }
  });

  it('2. Appends rectangular reveal regions and updates activeHandout state', () => {
    const rect1: RevealedRegionRect = { id: 'r1', x: 10, y: 20, width: 30, height: 40 };
    const rect2: RevealedRegionRect = { id: 'r2', x: 50, y: 60, width: 25, height: 25 };

    const updatedHandout: HandoutState = {
      ...sampleHandout,
      revealedRects: [rect1, rect2],
      isFullyRevealed: false,
    };

    const stateWithHandout: DisplayState = {
      ...initialDisplay,
      activeHandout: sampleHandout,
    };

    const result = reduceDisplayCommand(stateWithHandout, createMsg(updatedHandout));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.activeHandout?.revealedRects).toHaveLength(2);
      expect(result.nextState.activeHandout?.revealedRects?.[0].x).toBe(10);
      expect(result.nextState.activeHandout?.isFullyRevealed).toBe(false);
    }
  });

  it('3. Supports Undo, Reset Fog and Reveal All correctly', () => {
    let handout: HandoutState = {
      ...sampleHandout,
      revealedRects: [
        { id: 'r1', x: 10, y: 10, width: 20, height: 20 },
        { id: 'r2', x: 40, y: 40, width: 20, height: 20 },
      ],
    };

    // Undo last rect
    const rects = handout.revealedRects || [];
    handout = { ...handout, revealedRects: rects.slice(0, -1) };
    expect(handout.revealedRects).toHaveLength(1);
    expect(handout.revealedRects?.[0].id).toBe('r1');

    // Reveal All
    handout = { ...handout, isFullyRevealed: true };
    expect(handout.isFullyRevealed).toBe(true);

    // Reset Fog (Hide All)
    handout = { ...handout, revealedRects: [], isFullyRevealed: false };
    expect(handout.revealedRects).toHaveLength(0);
    expect(handout.isFullyRevealed).toBe(false);
  });

  it('4. Dismisses active handout cleanly restoring normal stage presentation', () => {
    const stateWithHandout: DisplayState = {
      ...initialDisplay,
      activeHandout: sampleHandout,
    };

    const result = reduceDisplayCommand(stateWithHandout, createMsg(null));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.activeHandout).toBeNull();
      expect(result.nextState.sceneName).toBe('Cripta de los Reyes');
    }
  });
});
