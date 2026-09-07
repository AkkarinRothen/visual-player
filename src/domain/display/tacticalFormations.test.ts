import { describe, it, expect } from 'vitest';
import type { CharacterOnScreen } from '../../types';
import {
  shouldRenderAsToken,
  calculateCellScale,
  snapToCellCenter,
  snapCharactersToGrid,
  alignBattleRanks,
  distributeHorizontally,
  findContextualMagneticSnap,
} from './tacticalFormations';

const mockCharacter = (id: string, overrides: Partial<CharacterOnScreen> = {}): CharacterOnScreen => ({
  id,
  name: `Hero ${id}`,
  avatarUrl: `https://example.com/${id}.png`,
  position: 'center-left',
  normalizedX: 50,
  normalizedY: 10,
  scale: 1.0,
  isSpeaking: false,
  ...overrides,
});

describe('tacticalFormations domain logic', () => {
  describe('shouldRenderAsToken', () => {
    it('returns true when displayStyle is token, regardless of grid', () => {
      const char = mockCharacter('1', { displayStyle: 'token' });
      expect(shouldRenderAsToken(char, false)).toBe(true);
      expect(shouldRenderAsToken(char, true)).toBe(true);
    });

    it('returns false when displayStyle is standee, even if grid is enabled', () => {
      const char = mockCharacter('1', { displayStyle: 'standee' });
      expect(shouldRenderAsToken(char, true)).toBe(false);
      expect(shouldRenderAsToken(char, false)).toBe(false);
    });

    it('inherits from isTacticalGridEnabled when displayStyle is auto or undefined', () => {
      const char = mockCharacter('1');
      expect(shouldRenderAsToken(char, true)).toBe(true);
      expect(shouldRenderAsToken(char, false)).toBe(false);

      const charAuto = mockCharacter('2', { displayStyle: 'auto' });
      expect(shouldRenderAsToken(charAuto, true)).toBe(true);
      expect(shouldRenderAsToken(charAuto, false)).toBe(false);
    });
  });

  describe('calculateCellScale', () => {
    it('calculates proportional scale for 10 columns', () => {
      const scale = calculateCellScale(10);
      expect(scale).toBeCloseTo(0.36, 2);
    });

    it('clamps scale between 0.15 and 1.0', () => {
      expect(calculateCellScale(40)).toBeGreaterThanOrEqual(0.15);
      expect(calculateCellScale(2)).toBeLessThanOrEqual(1.0);
    });
  });

  describe('snapToCellCenter', () => {
    it('snaps arbitrary coordinates to the nearest grid step in a 10-column grid', () => {
      // In 10 columns, stepX = 10. Multiples: 0, 10, 20...
      const res = snapToCellCenter(2.5, 3, 10);
      expect(res.x).toBe(0);
    });

    it('centers in the correct column when x is in the middle', () => {
      // 33 is closest to 30
      const res = snapToCellCenter(33, 10, 10);
      expect(res.x).toBe(30);
    });
  });

  describe('snapCharactersToGrid', () => {
    it('snaps multiple characters and optionally updates scale', () => {
      const chars = [
        mockCharacter('1', { normalizedX: 12, normalizedY: 8 }),
        mockCharacter('2', { normalizedX: 47, normalizedY: 22 }),
      ];

      const snapped = snapCharactersToGrid(chars, 10, true);
      expect(snapped).toHaveLength(2);
      expect(snapped[0].normalizedX).toBe(10);
      expect(snapped[0].scale).toBeCloseTo(0.36, 2);
    });
  });

  describe('alignBattleRanks', () => {
    it('separates allies and enemies onto opposing sides with mirrored facing', () => {
      const chars = [
        mockCharacter('a1', { tacticalTeam: 'allies' }),
        mockCharacter('a2', { tacticalTeam: 'allies' }),
        mockCharacter('e1', { tacticalTeam: 'enemies' }),
        mockCharacter('e2', { tacticalTeam: 'enemies' }),
      ];

      const arranged = alignBattleRanks(chars);
      const ally1 = arranged.find((c) => c.id === 'a1')!;
      const enemy1 = arranged.find((c) => c.id === 'e1')!;

      expect(ally1.normalizedX).toBeLessThan(50);
      expect(ally1.isFlipped).toBe(false);

      expect(enemy1.normalizedX).toBeGreaterThan(50);
      expect(enemy1.isFlipped).toBe(true);
      expect(ally1.scale).toBeLessThanOrEqual(0.5);
    });
  });

  describe('distributeHorizontally', () => {
    it('places characters along a common ground Y line with even spacing', () => {
      const chars = [mockCharacter('1'), mockCharacter('2'), mockCharacter('3')];
      const distributed = distributeHorizontally(chars, 15);

      expect(distributed[0].normalizedY).toBe(15);
      expect(distributed[1].normalizedY).toBe(15);
      expect(distributed[2].normalizedY).toBe(15);

      expect(distributed[0].normalizedX).toBeLessThan(distributed[1].normalizedX!);
      expect(distributed[1].normalizedX).toBeLessThan(distributed[2].normalizedX!);
    });
  });

  describe('findContextualMagneticSnap', () => {
    it('snaps to grid cell center when grid is enabled and point is near center', () => {
      const grid = { enabled: true, type: 'square' as const, columns: 10, opacity: 0.5 };
      // Nearest step to (9.8, 16.2) is (10, 16.7)
      const res = findContextualMagneticSnap(9.8, 16.2, [], 'char-1', grid);
      expect(res.snapped).toBe(true);
      expect(res.snapType).toBe('grid');
      expect(res.x).toBe(10);
    });

    it('snaps Y to peer ground line when grid is inactive and Y is close to peer', () => {
      const peers = [mockCharacter('p1', { normalizedX: 20, normalizedY: 14 })];
      // Dragging at Y=15.2 (diff 1.2 <= 3.5%)
      const res = findContextualMagneticSnap(60, 15.2, peers, 'char-drag', { enabled: false, type: 'square', columns: 10, opacity: 0 });

      expect(res.snapped).toBe(true);
      expect(res.snapType).toBe('ground');
      expect(res.x).toBe(60);
      expect(res.y).toBe(14);
    });

    it('does not snap when distance is outside magnet threshold', () => {
      const peers = [mockCharacter('p1', { normalizedX: 20, normalizedY: 14 })];
      // Dragging at Y=30 (diff 16 > 3.5%)
      const res = findContextualMagneticSnap(60, 30, peers, 'char-drag');
      expect(res.snapped).toBe(false);
      expect(res.y).toBe(30);
    });
  });
});
