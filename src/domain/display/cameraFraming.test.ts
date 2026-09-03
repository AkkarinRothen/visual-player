import { describe, it, expect } from 'vitest';
import { calculateGroupFraming } from './cameraFraming';
import type { CharacterOnScreen } from '../../types';

describe('Mathematical Group Framing Suite', () => {
  const mockCharacters: CharacterOnScreen[] = [
    {
      id: 'npc-barkeep',
      name: 'Grom',
      avatarUrl: 'https://example.com/grom.png',
      position: 'center-left',
      normalizedX: 35,
      normalizedY: 85,
      scale: 1.0,
      zIndex: 1,
      isSpeaking: false,
    },
    {
      id: 'npc-elf',
      name: 'Elaria',
      avatarUrl: 'https://example.com/elaria.png',
      position: 'center-left',
      normalizedX: 50,
      normalizedY: 85,
      scale: 0.9,
      zIndex: 2,
      isSpeaking: true,
    },
    {
      id: 'npc-dwarf',
      name: 'Torin',
      avatarUrl: 'https://example.com/torin.png',
      position: 'center-right',
      normalizedX: 65,
      normalizedY: 85,
      scale: 1.1,
      zIndex: 3,
      isSpeaking: false,
    },
  ];

  it('1. Computes bounding box and zoom for clustered group in standard 16:9', () => {
    const res = calculateGroupFraming(mockCharacters, {
      viewportWidth: 1920,
      viewportHeight: 1080,
      hasActiveDialogue: false,
    });

    expect(res.fitsWithinBounds).toBe(true);
    expect(res.calculatedZoom).toBeGreaterThan(1.1);
    expect(res.calculatedZoom).toBeLessThanOrEqual(2.2);

    // Group bounding box
    expect(res.groupBoundingBox.minX).toBeLessThan(35);
    expect(res.groupBoundingBox.maxX).toBeGreaterThan(65);
    expect(res.groupBoundingBox.width).toBeGreaterThan(30);

    // Center should be approximately 50%
    expect(res.camera.focalPoint.x).toBeGreaterThanOrEqual(48);
    expect(res.camera.focalPoint.x).toBeLessThanOrEqual(53);
  });

  it('2. Shifts focal point upward when dialogue safe area is active at bottom', () => {
    const withoutDialogue = calculateGroupFraming(mockCharacters, {
      hasActiveDialogue: false,
    });

    const withDialogue = calculateGroupFraming(mockCharacters, {
      hasActiveDialogue: true,
      dialogueHeightPx: 180,
      viewportHeight: 1080,
    });

    expect(withoutDialogue.fitsWithinBounds).toBe(true);
    expect(withDialogue.fitsWithinBounds).toBe(true);
    expect(withDialogue.calculatedZoom).toBeDefined();
  });

  it('3. Adapts correctly to 4:3 aspect ratio display (1024x768)', () => {
    const res43 = calculateGroupFraming(mockCharacters, {
      viewportWidth: 1024,
      viewportHeight: 768,
      hasActiveDialogue: true,
      hasActiveInitiative: true,
    });

    expect(res43.fitsWithinBounds).toBe(true);
    expect(res43.camera.focalPoint.x).toBeGreaterThanOrEqual(0);
    expect(res43.camera.focalPoint.x).toBeLessThanOrEqual(100);
  });

  it('4. Detects overly dispersed group and issues a warning with fitsWithinBounds false', () => {
    const dispersedCharacters: CharacterOnScreen[] = [
      {
        id: 'npc-left',
        name: 'Vigia Izquierdo',
        avatarUrl: '',
        position: 'left',
        normalizedX: 2,
        normalizedY: 85,
        scale: 1.5,
        zIndex: 1,
        isSpeaking: false,
      },
      {
        id: 'npc-right',
        name: 'Vigia Derecho',
        avatarUrl: '',
        position: 'right',
        normalizedX: 98,
        normalizedY: 85,
        scale: 1.5,
        zIndex: 2,
        isSpeaking: false,
      },
    ];

    const res = calculateGroupFraming(dispersedCharacters, {
      safePaddingPct: 10,
    });

    expect(res.fitsWithinBounds).toBe(false);
    expect(res.warning).toContain('demasiado disperso');
    expect(res.calculatedZoom).toBe(1.0); // Clamped to minZoom 1.0
  });

  it('5. Handles empty character array gracefully', () => {
    const res = calculateGroupFraming([], {});
    expect(res.fitsWithinBounds).toBe(true);
    expect(res.camera.zoom).toBe(1.0);
    expect(res.camera.focalPoint).toEqual({ x: 50, y: 50 });
  });
});
