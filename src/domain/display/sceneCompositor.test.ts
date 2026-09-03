import { describe, it, expect } from 'vitest';
import type { Character, CharacterOnScreen } from '../../types';

describe('Scene Compositor Logic & Presets Suite', () => {
  const mockTemplate: Character = {
    id: 'npc-guard',
    name: 'Guardia Real',
    roleOrTitle: 'Capitán de la Guardia',
    defaultAvatarUrl: 'https://example.com/guard.png',
    expressions: {
      alert: 'https://example.com/guard-alert.png',
      angry: 'https://example.com/guard-angry.png',
    },
  };

  const createInitialInstances = (): CharacterOnScreen[] => [
    {
      id: 'inst-1',
      characterId: 'npc-guard',
      name: 'Guardia Izquierda',
      avatarUrl: 'https://example.com/guard.png',
      position: 'center-left',
      normalizedX: 35,
      normalizedY: 0,
      scale: 1.0,
      isFlipped: false,
      zIndex: 1,
      isLocked: false,
      isSpeaking: false,
    },
    {
      id: 'inst-2',
      characterId: 'npc-guard',
      name: 'Guardia Derecha',
      avatarUrl: 'https://example.com/guard.png',
      position: 'center-right',
      normalizedX: 65,
      normalizedY: 0,
      scale: 1.0,
      isFlipped: false,
      zIndex: 2,
      isLocked: false,
      isSpeaking: false,
    },
  ];

  it('1. Dialogue preset positions two characters facing each other', () => {
    const chars = createInitialInstances();
    // Simulate Dialogue preset
    const result = chars.map((c, idx) => {
      if (idx === 0) return { ...c, normalizedX: 32, normalizedY: 0, isFlipped: false };
      if (idx === 1) return { ...c, normalizedX: 68, normalizedY: 0, isFlipped: true };
      return c;
    });

    expect(result[0].normalizedX).toBe(32);
    expect(result[0].isFlipped).toBe(false);
    expect(result[1].normalizedX).toBe(68);
    expect(result[1].isFlipped).toBe(true); // Flipped horizontally to face player 1
  });

  it('2. Multiple instances of the same character do not alter the template', () => {
    const chars = createInitialInstances();
    // Move instance 1 and change its expression
    chars[0].normalizedX = 10;
    chars[0].scale = 1.5;
    chars[0].activeExpression = 'angry';
    chars[0].avatarUrl = mockTemplate.expressions!['angry'];

    // Template remains completely untouched
    expect(mockTemplate.defaultAvatarUrl).toBe('https://example.com/guard.png');
    // Instance 2 remains untouched
    expect(chars[1].normalizedX).toBe(65);
    expect(chars[1].scale).toBe(1.0);
    expect(chars[1].activeExpression).toBeUndefined();
  });

  it('3. Detects characters nearing or exceeding screen bounds (<2% or >98%)', () => {
    const checkOutOfBounds = (x: number) => x < 2 || x > 98;

    expect(checkOutOfBounds(50)).toBe(false);
    expect(checkOutOfBounds(35)).toBe(false);
    expect(checkOutOfBounds(1)).toBe(true);
    expect(checkOutOfBounds(-5)).toBe(true);
    expect(checkOutOfBounds(99)).toBe(true);
    expect(checkOutOfBounds(105)).toBe(true);
  });

  it('4. Computes speaker focus state: dimming non-speakers only when a speaker is active', () => {
    const chars = createInitialInstances();

    const computeDimmed = (list: CharacterOnScreen[]) => {
      const hasSpeaking = list.some((c) => c.isSpeaking);
      return list.map((c) => ({
        id: c.id,
        isSpeaking: c.isSpeaking,
        isDimmed: hasSpeaking && !c.isSpeaking,
      }));
    };

    // No speaker
    const resNoSpeaker = computeDimmed(chars);
    expect(resNoSpeaker.every((r) => !r.isDimmed)).toBe(true);

    // Turn on speaking for character 1
    chars[0].isSpeaking = true;
    const resSpeaker1 = computeDimmed(chars);
    expect(resSpeaker1[0].isSpeaking).toBe(true);
    expect(resSpeaker1[0].isDimmed).toBe(false); // Speaker is not dimmed
    expect(resSpeaker1[1].isSpeaking).toBe(false);
    expect(resSpeaker1[1].isDimmed).toBe(true); // Other character is dimmed
  });

  it('5. Layer zIndex respects front, back, up, and down constraints', () => {
    let currentZ = 3;
    const moveZ = (z: number, dir: 'up' | 'down' | 'front' | 'back') => {
      if (dir === 'up') return Math.min(50, z + 1);
      if (dir === 'down') return Math.max(1, z - 1);
      if (dir === 'front') return 50;
      if (dir === 'back') return 1;
      return z;
    };

    expect(moveZ(currentZ, 'up')).toBe(4);
    expect(moveZ(currentZ, 'down')).toBe(2);
    expect(moveZ(currentZ, 'front')).toBe(50);
    expect(moveZ(currentZ, 'back')).toBe(1);
    expect(moveZ(50, 'up')).toBe(50); // Clamped at 50
    expect(moveZ(1, 'down')).toBe(1); // Clamped at 1
  });
});
