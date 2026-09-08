import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseLiveStreamSliderOptions {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  throttleMs?: number;
  onStreamChange: (value: number) => void;
  onCommit: (value: number) => void;
}

/**
 * Reusable hook for interactive range sliders.
 * Provides instant local response (60 fps), throttled streaming (~20 Hz)
 * to remote viewers, and an atomic commit when the interaction ends.
 */
export function useLiveStreamSlider({
  value,
  min = 0,
  max = 1,
  step,
  throttleMs = 50,
  onStreamChange,
  onCommit,
}: UseLiveStreamSliderOptions) {
  const [localValue, setLocalValue] = useState<number>(value);
  const isInteractingRef = useRef<boolean>(false);
  const lastEmitTimeRef = useRef<number>(0);
  const pendingValueRef = useRef<number>(value);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external state only when user is NOT actively dragging
  useEffect(() => {
    if (!isInteractingRef.current) {
      setLocalValue(value);
      pendingValueRef.current = value;
    }
  }, [value]);

  const emitStream = useCallback(
    (nextVal: number) => {
      const now = performance.now();
      pendingValueRef.current = nextVal;

      if (now - lastEmitTimeRef.current >= throttleMs) {
        lastEmitTimeRef.current = now;
        onStreamChange(nextVal);
      } else if (!throttleTimerRef.current) {
        const remaining = throttleMs - (now - lastEmitTimeRef.current);
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          lastEmitTimeRef.current = performance.now();
          onStreamChange(pendingValueRef.current);
        }, remaining);
      }
    },
    [throttleMs, onStreamChange]
  );

  const handlePointerDown = useCallback(() => {
    isInteractingRef.current = true;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | number) => {
      const rawVal = typeof e === 'number' ? e : Number(e.target.value);
      const clamped = Math.max(min, Math.min(max, rawVal));
      pendingValueRef.current = clamped;
      setLocalValue(clamped);
      emitStream(clamped);

      // If interaction was not initiated by a pointer drag (e.g. keyboard step, fireEvent.change, assistive tech)
      if (!isInteractingRef.current) {
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
        onCommit(clamped);
      }
    },
    [min, max, emitStream, onCommit]
  );

  const handleCommit = useCallback(() => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    onCommit(pendingValueRef.current);
  }, [onCommit]);

  return {
    localValue,
    displayValue: localValue,
    setLocalValue,
    sliderProps: {
      type: 'range' as const,
      min,
      max,
      step,
      value: localValue,
      onPointerDown: handlePointerDown,
      onTouchStart: handlePointerDown,
      onMouseDown: handlePointerDown,
      onChange: handleChange,
      onPointerUp: handleCommit,
      onTouchEnd: handleCommit,
      onMouseUp: handleCommit,
      onKeyUp: handleCommit,
    },
    handleCommit,
  };
}
