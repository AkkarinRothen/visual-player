import { describe, it, expect } from 'vitest';
import type { DisplayState, HandoutState, RevealedRegionCircle, HandoutPage } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';
import { normalizeHandoutState } from './handoutNormalizer';
import { reduceDisplayCommand } from './displayCommandReducer';

describe('Handout Viewer Phase 2: Multipage & Circular Brush Suite', () => {
  const initialDisplay: DisplayState = {
    currentSceneId: 'sc-dungeon',
    sceneName: 'Mazmorra Subterránea',
    backgroundUrl: 'https://example.com/dungeon.jpg',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'torch_flicker',
    locationBanner: { text: 'Mazmorra', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/drip.mp3',
    ambientPlaying: true,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
    activeHandout: null,
  };

  const createMsg = (payload: any): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'm-phase2',
    commandId: 'cmd-phase2',
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'critical',
    requiresAck: true,
    type: 'UPDATE_ACTIVE_HANDOUT',
    payload,
  });

  it('1. Normalizes legacy single-page handouts seamlessly with full backward compatibility', () => {
    const legacyHandout: HandoutState = {
      id: 'h-legacy',
      title: 'Carta Sellada',
      imageUrl: 'https://example.com/letter.jpg',
      revealedRects: [{ id: 'r1', x: 10, y: 10, width: 20, height: 20 }],
      isFullyRevealed: false,
      zoom: 1.25,
      panOffset: { x: 5, y: -5 },
    };

    const normalized = normalizeHandoutState(legacyHandout);
    expect(normalized.pages).toHaveLength(1);
    expect(normalized.activePageIndex).toBe(0);
    expect(normalized.activePage.imageUrl).toBe('https://example.com/letter.jpg');
    expect(normalized.activePage.zoom).toBe(1.25);
    expect(normalized.activePage.revealedRects).toHaveLength(1);
    expect(normalized.activePage.revealedCircles).toEqual([]);
  });

  it('2. Supports circular brush masks (RevealedRegionCircle) and multipage navigation', () => {
    const circle1: RevealedRegionCircle = { id: 'c1', cx: 30, cy: 40, r: 8 };
    const circle2: RevealedRegionCircle = { id: 'c2', cx: 35, cy: 45, r: 8 };

    const page1: HandoutPage = {
      id: 'p1',
      pageNumber: 1,
      title: 'Parte Superior del Diario',
      imageUrl: 'https://example.com/diary-p1.jpg',
      revealedRects: [],
      revealedCircles: [circle1, circle2],
      isFullyRevealed: false,
      zoom: 1.0,
      panOffset: { x: 0, y: 0 },
    };

    const page2: HandoutPage = {
      id: 'p2',
      pageNumber: 2,
      title: 'Parte Inferior del Diario',
      imageUrl: 'https://example.com/diary-p2.jpg',
      revealedRects: [{ id: 'r-secret', x: 20, y: 20, width: 40, height: 20 }],
      revealedCircles: [],
      isFullyRevealed: false,
      zoom: 1.5,
      panOffset: { x: 10, y: 0 },
    };

    const multipageHandout: HandoutState = {
      id: 'h-multipage',
      title: 'Diario del Archigramático',
      pages: [page1, page2],
      activePageIndex: 0, // Viewing Page 1 on Mesa
    };

    // Verify Page 1
    const norm1 = normalizeHandoutState(multipageHandout);
    expect(norm1.pages).toHaveLength(2);
    expect(norm1.activePageIndex).toBe(0);
    expect(norm1.activePage.revealedCircles).toHaveLength(2);
    expect(norm1.activePage.zoom).toBe(1.0);

    // Switch active page to Page 2 on Mesa
    const switchedHandout: HandoutState = {
      ...multipageHandout,
      activePageIndex: 1,
    };
    const norm2 = normalizeHandoutState(switchedHandout);
    expect(norm2.activePageIndex).toBe(1);
    expect(norm2.activePage.title).toBe('Parte Inferior del Diario');
    expect(norm2.activePage.zoom).toBe(1.5);
    expect(norm2.activePage.revealedRects).toHaveLength(1);
  });

  it('3. Projects multipage handout to Mesa via displayCommandReducer with zero side-effects on stage', () => {
    const multipageHandout: HandoutState = {
      id: 'h-multi',
      title: 'Tomo de Hechizos',
      pages: [
        {
          id: 'p-1',
          pageNumber: 1,
          imageUrl: 'https://example.com/spells-1.jpg',
          revealedRects: [],
          revealedCircles: [{ id: 'c-runic', cx: 50, cy: 50, r: 12 }],
          isFullyRevealed: false,
          zoom: 1.0,
          panOffset: { x: 0, y: 0 },
        },
      ],
      activePageIndex: 0,
    };

    const result = reduceDisplayCommand(initialDisplay, createMsg(multipageHandout));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.activeHandout?.pages).toHaveLength(1);
      expect(result.nextState.activeHandout?.pages?.[0].revealedCircles).toHaveLength(1);
      // Stage audio, background, and lighting are completely preserved
      expect(result.nextState.backgroundUrl).toBe('https://example.com/dungeon.jpg');
      expect(result.nextState.ambientAudioUrl).toBe('https://example.com/drip.mp3');
      expect(result.nextState.lighting).toBe('torch_flicker');
    }
  });
});
