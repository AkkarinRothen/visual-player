import { useRef, useEffect, useReducer, useCallback } from 'react';
import type { CharacterOnScreen } from '../../types';
import { interpolateTransform, type TransformState, type SmootherOptions } from '../../domain/display/characterTransformSmoother';

export interface UseCharacterTransformSmootherResult {
  getSmoothedTransform: (
    id: string,
    targetX: number,
    targetY: number,
    targetScale: number
  ) => TransformState;
}

/**
 * Hook for 60 fps / 120 fps continuous interpolation of character coordinates and scale in the Display.
 * Decouples rendering from network packet rate (20 Hz) and Wi-Fi jitter.
 * Automatically halts requestAnimationFrame when all figures have settled (zero idle cost).
 */
export function useCharacterTransformSmoother(
  characters: CharacterOnScreen[],
  options?: SmootherOptions
): UseCharacterTransformSmootherResult {
  const currentTransformsRef = useRef<Map<string, TransformState>>(new Map());
  const targetTransformsRef = useRef<Map<string, TransformState>>(new Map());
  const isLoopRunningRef = useRef<boolean>(false);
  const rafHandleRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [, forceRender] = useReducer((s: number) => (s + 1) | 0, 0);

  // Stop loop on unmount
  useEffect(() => {
    return () => {
      if (rafHandleRef.current !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
      isLoopRunningRef.current = false;
    };
  }, []);

  const runAnimationLoop = useCallback(() => {
    if (isLoopRunningRef.current) return;
    if (typeof requestAnimationFrame !== 'function') return;

    isLoopRunningRef.current = true;
    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = lastTimeRef.current ? Math.min(0.1, (now - lastTimeRef.current) / 1000) : 0.016;
      lastTimeRef.current = now;

      let allSettled = true;

      for (const [id, target] of targetTransformsRef.current.entries()) {
        const current = currentTransformsRef.current.get(id);
        if (!current) {
          currentTransformsRef.current.set(id, { ...target });
          continue;
        }

        const { next, isSettled } = interpolateTransform(current, target, dt, options);
        currentTransformsRef.current.set(id, next);

        if (!isSettled) {
          allSettled = false;
        }
      }

      forceRender();

      if (!allSettled) {
        rafHandleRef.current = requestAnimationFrame(tick);
      } else {
        isLoopRunningRef.current = false;
        rafHandleRef.current = null;
      }
    };

    rafHandleRef.current = requestAnimationFrame(tick);
  }, [options]);

  const getSmoothedTransform = useCallback(
    (id: string, targetX: number, targetY: number, targetScale: number): TransformState => {
      const target: TransformState = { x: targetX, y: targetY, scale: targetScale };
      targetTransformsRef.current.set(id, target);

      const existing = currentTransformsRef.current.get(id);

      // 1. Initial mount for this character: initialize immediately to target
      if (!existing) {
        const initial = { ...target };
        currentTransformsRef.current.set(id, initial);
        return initial;
      }

      // 2. If displacement is above snap threshold (e.g. teleporting, initial scene load), snap immediately
      const snapThreshold = options?.snapThreshold ?? 45;
      if (
        Math.abs(target.x - existing.x) > snapThreshold ||
        Math.abs(target.y - existing.y) > snapThreshold
      ) {
        currentTransformsRef.current.set(id, { ...target });
        return target;
      }

      // 3. If target differs from current by more than epsilon, trigger rAF loop if idle
      const epsilon = options?.epsilon ?? 0.05;
      const isDifferent =
        Math.abs(target.x - existing.x) > epsilon ||
        Math.abs(target.y - existing.y) > epsilon ||
        Math.abs(target.scale - existing.scale) > 0.001;

      if (isDifferent && !isLoopRunningRef.current) {
        runAnimationLoop();
      }

      return existing;
    },
    [options, runAnimationLoop]
  );

  // Clean up characters that were removed from the scene
  useEffect(() => {
    const activeIds = new Set(characters.map((c) => c.id));
    for (const id of currentTransformsRef.current.keys()) {
      if (!activeIds.has(id)) {
        currentTransformsRef.current.delete(id);
        targetTransformsRef.current.delete(id);
      }
    }
  }, [characters]);

  return { getSmoothedTransform };
}
