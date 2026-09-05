import { describe, it, expect } from 'vitest';
import { computeDialogueGeometry } from './dialogueGeometry';
import type { CharacterOnScreen } from '../../types';

describe('dialogueGeometry suite', () => {
  const baseSpeaker: CharacterOnScreen = {
    id: 'char-1',
    name: 'Kyra',
    avatarUrl: 'https://example.com/kyra.png',
    position: 'center-left',
    normalizedX: 25,
    normalizedY: 10,
    scale: 1.0,
    isSpeaking: true,
  };

  it('1. Computes top anchored balloon when figure is in lower or mid stage', () => {
    const result = computeDialogueGeometry({
      speaker: baseSpeaker,
      preferredMode: 'auto',
    });

    expect(result.mode).toBe('balloon');
    expect(result.coordinates.placement).toBe('top');
    expect(result.coordinates.tailDirection).toBe('down');
    expect(result.coordinates.y).toBeGreaterThan(baseSpeaker.normalizedY!);
    expect(result.coordinates.x).toBe(25);
  });

  it('2. Switches to side placement when character is near the top edge', () => {
    const topSpeaker: CharacterOnScreen = {
      ...baseSpeaker,
      normalizedX: 75,
      normalizedY: 70, // High on stage -> top would exceed safe bounds
    };

    const result = computeDialogueGeometry({
      speaker: topSpeaker,
      preferredMode: 'auto',
    });

    expect(result.mode).toBe('balloon');
    expect(result.coordinates.placement).toBe('left'); // Placed to left because normX > 50
    expect(result.coordinates.tailDirection).toBe('right');
    expect(result.coordinates.x).toBeLessThan(75);
  });

  it('3. Falls back to visual-novel bottom dock when no speaker exists', () => {
    const result = computeDialogueGeometry({
      speaker: null,
      preferredMode: 'auto',
    });

    expect(result.mode).toBe('visual-novel');
    expect(result.coordinates.placement).toBe('bottom');
    expect(result.coordinates.tailDirection).toBe('none');
  });

  it('4. Respects explicit preferredMode (narration, subtitle, visual-novel)', () => {
    const narrationResult = computeDialogueGeometry({
      speaker: baseSpeaker,
      preferredMode: 'narration',
    });
    expect(narrationResult.mode).toBe('narration');
    expect(narrationResult.coordinates.placement).toBe('bottom');

    const vnResult = computeDialogueGeometry({
      speaker: baseSpeaker,
      preferredMode: 'visual-novel',
    });
    expect(vnResult.mode).toBe('visual-novel');
  });

  it('5. Maintains hysteresis when previous placement was valid and still within tolerance', () => {
    const prevCoords = {
      x: 30,
      y: 40,
      placement: 'top' as const,
      tailDirection: 'down' as const,
    };

    const slightlyMovedSpeaker: CharacterOnScreen = {
      ...baseSpeaker,
      normalizedX: 27, // minor shift
      normalizedY: 12,
    };

    const result = computeDialogueGeometry({
      speaker: slightlyMovedSpeaker,
      previousCoordinates: prevCoords,
    });

    expect(result.coordinates.placement).toBe('top');
    expect(result.coordinates.tailDirection).toBe('down');
  });
});
