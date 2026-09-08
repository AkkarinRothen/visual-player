import { describe, it, expect } from 'vitest';
import { interpolateTransform, type TransformState } from './characterTransformSmoother';

describe('characterTransformSmoother Pure Interpolation Suite', () => {
  it('1. Smoothly moves towards target over multiple time steps', () => {
    let current: TransformState = { x: 10, y: 10, scale: 1.0 };
    const target: TransformState = { x: 30, y: 20, scale: 1.5 };
    const dt = 0.016; // ~60 fps (16ms)

    // Step 1
    const r1 = interpolateTransform(current, target, dt);
    expect(r1.isSettled).toBe(false);
    expect(r1.next.x).toBeGreaterThan(10);
    expect(r1.next.x).toBeLessThan(30);
    expect(r1.next.scale).toBeGreaterThan(1.0);
    expect(r1.next.scale).toBeLessThan(1.5);
    current = r1.next;

    // Simulate 30 frames (~0.5s)
    let isSettled = false;
    for (let frame = 0; frame < 30; frame++) {
      const res = interpolateTransform(current, target, dt);
      current = res.next;
      isSettled = res.isSettled;
      if (isSettled) break;
    }

    // Should have converged and settled
    expect(isSettled).toBe(true);
    expect(current.x).toBe(30);
    expect(current.y).toBe(20);
    expect(current.scale).toBe(1.5);
  });

  it('2. Snaps immediately if displacement exceeds snap threshold (teleport / scene change)', () => {
    const current: TransformState = { x: 10, y: 10, scale: 1.0 };
    // Large jump: dx = 60 (> 45 default threshold)
    const target: TransformState = { x: 70, y: 10, scale: 1.0 };

    const result = interpolateTransform(current, target, 0.016);
    expect(result.isSettled).toBe(true);
    expect(result.next.x).toBe(70);
    expect(result.next.y).toBe(10);
  });

  it('3. Snaps immediately when within epsilon', () => {
    const current: TransformState = { x: 40.02, y: 15.01, scale: 1.0005 };
    const target: TransformState = { x: 40.0, y: 15.0, scale: 1.0 };

    const result = interpolateTransform(current, target, 0.016);
    expect(result.isSettled).toBe(true);
    expect(result.next.x).toBe(40.0);
    expect(result.next.y).toBe(15.0);
    expect(result.next.scale).toBe(1.0);
  });

  it('4. Custom options speed and snap threshold', () => {
    const current: TransformState = { x: 10, y: 10, scale: 1.0 };
    const target: TransformState = { x: 40, y: 10, scale: 1.0 };

    // High speed converges much faster in 1 frame
    const fastRes = interpolateTransform(current, target, 0.016, { speed: 60 });
    const normalRes = interpolateTransform(current, target, 0.016, { speed: 18 });

    expect(fastRes.next.x).toBeGreaterThan(normalRes.next.x);
  });
});
