export interface TransformState {
  x: number;
  y: number;
  scale: number;
}

export interface SmootherOptions {
  /** Damping speed factor (default 18). Higher = faster response, lower = more smoothing */
  speed?: number;
  /** Snap threshold in coordinate percentage (default 45). Delta above this snaps immediately */
  snapThreshold?: number;
  /** Epsilon under which coordinates and scale are considered settled */
  epsilon?: number;
}

/**
 * Pure frame-rate independent exponential smoothing (critically damped lerp).
 * Given the current interpolated state, the target state, and elapsed delta time (in seconds),
 * returns the next state and whether the transform has settled within epsilon.
 */
export function interpolateTransform(
  current: TransformState,
  target: TransformState,
  dtSeconds: number,
  options?: SmootherOptions
): { next: TransformState; isSettled: boolean } {
  const speed = options?.speed ?? 18;
  const snapThreshold = options?.snapThreshold ?? 45;
  const epsilon = options?.epsilon ?? 0.05;

  const dx = Math.abs(target.x - current.x);
  const dy = Math.abs(target.y - current.y);
  const dScale = Math.abs(target.scale - current.scale);

  // 1. If displacement exceeds snap threshold (e.g. teleporting, scene switch), snap immediately
  if (dx > snapThreshold || dy > snapThreshold) {
    return { next: { ...target }, isSettled: true };
  }

  // 2. If within settling epsilon, snap to exact target
  if (dx <= epsilon && dy <= epsilon && dScale <= 0.001) {
    return { next: { ...target }, isSettled: true };
  }

  // 3. Exponential smoothing factor (critically damped decay)
  // factor = 1 - e^(-speed * dt)
  const factor = 1 - Math.exp(-speed * Math.max(0, Math.min(0.2, dtSeconds)));

  return {
    next: {
      x: current.x + (target.x - current.x) * factor,
      y: current.y + (target.y - current.y) * factor,
      scale: current.scale + (target.scale - current.scale) * factor,
    },
    isSettled: false,
  };
}
