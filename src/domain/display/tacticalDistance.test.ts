import { describe, expect, it } from 'vitest';
import { tacticalDistanceInCells } from './tacticalDistance';

describe('tactical distance', () => {
  it('returns a grid-relative distance independently of pixels', () => {
    expect(tacticalDistanceInCells({ normalizedX: 10, normalizedY: 10 }, { normalizedX: 20, normalizedY: 10 }, 10)).toBeCloseTo(1, 2);
  });
});
