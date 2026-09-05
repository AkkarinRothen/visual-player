import { useRef, useEffect, useState } from 'react';
import type { CharacterOnScreen, CameraTransform, StageWaypoint } from '../../../types';
import type { DragState } from './directorTypes';
import { evaluateMagneticSnap } from './formationMath';

const TOUCH_SLOP_PX = 10;
const POSITION_PRECISION = 10;

const roundStagePosition = (value: number) =>
  Math.round(value * POSITION_PRECISION) / POSITION_PRECISION;

export interface UseDirectorDragProps {
  characters: CharacterOnScreen[];
  camera?: CameraTransform;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  isMultiSelectMode: boolean;
  followMesaLive?: boolean;
  magneticSnapping?: boolean;
  waypoints?: StageWaypoint[];
  onLiveDragMove?: (
    updates: { id: string; normalizedX: number; normalizedY: number }[]
  ) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onUpdateMultipleCharacterPositions: (
    updates: { id: string; normalizedX: number; normalizedY: number }[],
    description: string
  ) => void;
  onQuickDrop?: (
    characterIds: string[],
    target: 'reserve' | 'hide' | 'remove'
  ) => void;
}

function resolveQuickDropTarget(
  rect: DOMRect,
  clientX: number,
  clientY: number
): DragState['quickDropTarget'] {
  const railWidth = Math.min(104, rect.width * 0.22);
  if (clientX < rect.right - railWidth || clientX > rect.right) return null;
  if (clientY < rect.top || clientY > rect.bottom) return null;
  const segment = (clientY - rect.top) / rect.height;
  if (segment < 1 / 3) return 'reserve';
  if (segment < 2 / 3) return 'hide';
  return 'remove';
}

export function useDirectorDrag({
  characters,
  camera,
  selectedIds,
  setSelectedIds,
  isMultiSelectMode,
  followMesaLive = false,
  magneticSnapping = true,
  waypoints = [],
  onLiveDragMove,
  onUpdateCharacter,
  onUpdateMultipleCharacterPositions,
  onQuickDrop,
}: UseDirectorDragProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const prevCameraRef = useRef<CameraTransform | undefined>(camera);
  const lastLiveMoveTimeRef = useRef<number>(0);
  const lastSnappedKeyRef = useRef<string | null>(null);
  const [dragPreview, setDragPreview] = useState<DragState | null>(null);

  // Cancel dragging if camera changes during gesture
  useEffect(() => {
    if (dragRef.current?.isDragging && camera && prevCameraRef.current) {
      if (
        camera.zoom !== prevCameraRef.current.zoom ||
        camera.focalPoint?.x !== prevCameraRef.current.focalPoint?.x ||
        camera.focalPoint?.y !== prevCameraRef.current.focalPoint?.y
      ) {
        dragRef.current = null;
        setDragPreview(null);
      }
    }
    prevCameraRef.current = camera;
  }, [camera]);

  const handlePointerDown = (char: CharacterOnScreen, e: React.PointerEvent) => {
    if (char.isLocked) return;
    e.stopPropagation();

    // Select this character if not part of current multi-selection
    if (!selectedIds.has(char.id)) {
      if (isMultiSelectMode) {
        setSelectedIds((prev) => new Set(prev).add(char.id));
      } else {
        setSelectedIds(new Set([char.id]));
      }
    }

    const container = containerRef.current;
    if (!container) return;

    try {
      container.setPointerCapture(e.pointerId);
    } catch {}

    const initialMap = new Map<string, { x: number; y: number }>();
    const effectiveSelected = selectedIds.has(char.id)
      ? Array.from(selectedIds)
      : [char.id];

    characters.forEach((c) => {
      if (effectiveSelected.includes(c.id)) {
        initialMap.set(c.id, {
          x: c.normalizedX ?? 50,
          y: c.normalizedY ?? 0,
        });
      }
    });

    const currentX = char.normalizedX ?? 50;
    const currentY = char.normalizedY ?? 0;

    const dragState: DragState = {
      isDragging: true,
      hasPassedTouchSlop: false,
      pointerClientX: e.clientX,
      pointerClientY: e.clientY,
      quickDropTarget: null,
      anchorId: char.id,
      startX: currentX,
      startY: currentY,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      currentX,
      currentY,
      initialPositions: initialMap,
    };
    dragRef.current = dragState;
    setDragPreview(dragState);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !drag.isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaPixelX = e.clientX - drag.pointerStartX;
    const deltaPixelY = e.clientY - drag.pointerStartY;

    if (!drag.hasPassedTouchSlop) {
      if (Math.hypot(deltaPixelX, deltaPixelY) < TOUCH_SLOP_PX) return;
      drag.hasPassedTouchSlop = true;
    }

    const deltaPercentX = (deltaPixelX / rect.width) * 100;
    const deltaPercentY = -(deltaPixelY / rect.height) * 100; // Inverted Y: 0 is ground line

    // Rigid formation: calculate a single bounding box for all unlocked characters
    let minAllowedDeltaX = -100;
    let maxAllowedDeltaX = 100;
    let minAllowedDeltaY = -100;
    let maxAllowedDeltaY = 100;

    drag.initialPositions.forEach((pos, id) => {
      const char = characters.find((c) => c.id === id);
      if (char && !char.isLocked) {
        const halfWidth = 5 * (char.scale ?? 1.0);
        const charMinDeltaX = 0 + halfWidth - pos.x;
        const charMaxDeltaX = 100 - halfWidth - pos.x;
        const charMinDeltaY = 0 - pos.y;
        const charMaxDeltaY = 70 - pos.y;

        if (charMinDeltaX > minAllowedDeltaX) minAllowedDeltaX = charMinDeltaX;
        if (charMaxDeltaX < maxAllowedDeltaX) maxAllowedDeltaX = charMaxDeltaX;
        if (charMinDeltaY > minAllowedDeltaY) minAllowedDeltaY = charMinDeltaY;
        if (charMaxDeltaY < maxAllowedDeltaY) maxAllowedDeltaY = charMaxDeltaY;
      }
    });

    if (minAllowedDeltaX > maxAllowedDeltaX) {
      minAllowedDeltaX = 0;
      maxAllowedDeltaX = 0;
    }
    if (minAllowedDeltaY > maxAllowedDeltaY) {
      minAllowedDeltaY = 0;
      maxAllowedDeltaY = 0;
    }

    const clampedDeltaX = Math.max(minAllowedDeltaX, Math.min(maxAllowedDeltaX, deltaPercentX));
    const clampedDeltaY = Math.max(minAllowedDeltaY, Math.min(maxAllowedDeltaY, deltaPercentY));

    let candidateX = roundStagePosition(drag.startX + clampedDeltaX);
    let candidateY = roundStagePosition(drag.startY + clampedDeltaY);

    if (magneticSnapping) {
      const snapResult = evaluateMagneticSnap(candidateX, candidateY, {
        groundLineY: 0,
        waypoints,
        snapToCenter: true,
        snapToThirds: true,
        snapThreshold: 2.2,
      });
      candidateX = snapResult.snappedX;
      candidateY = snapResult.snappedY;
      drag.snapGuideLines = snapResult.guideLines.length > 0 ? snapResult.guideLines : undefined;

      if (snapResult.guideLines.length > 0) {
        const snapKey = snapResult.guideLines.map((g) => `${g.axis}-${g.position}`).join('|');
        if (lastSnappedKeyRef.current !== snapKey) {
          lastSnappedKeyRef.current = snapKey;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate(10);
            } catch {}
          }
        }
      } else {
        lastSnappedKeyRef.current = null;
      }
    } else {
      drag.snapGuideLines = undefined;
      lastSnappedKeyRef.current = null;
    }

    drag.currentX = candidateX;
    drag.currentY = candidateY;
    drag.pointerClientX = e.clientX;
    drag.pointerClientY = e.clientY;
    drag.quickDropTarget = resolveQuickDropTarget(rect, e.clientX, e.clientY);

    if (followMesaLive && onLiveDragMove) {
      const now = Date.now();
      if (now - lastLiveMoveTimeRef.current >= 60) {
        lastLiveMoveTimeRef.current = now;
        const deltaX = drag.currentX - drag.startX;
        const deltaY = drag.currentY - drag.startY;
        const liveUpdates: { id: string; normalizedX: number; normalizedY: number }[] = [];
        drag.initialPositions.forEach((initial, id) => {
          const char = characters.find((c) => c.id === id);
          if (char && !char.isLocked) {
            liveUpdates.push({
              id,
              normalizedX: roundStagePosition(initial.x + deltaX),
              normalizedY: roundStagePosition(initial.y + deltaY),
            });
          }
        });
        if (liveUpdates.length > 0) {
          onLiveDragMove(liveUpdates);
        }
      }
    }

    setDragPreview({ ...drag });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !drag.isDragging) return;

    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {}

    const deltaX = drag.currentX - drag.startX;
    const deltaY = drag.currentY - drag.startY;

    if (drag.hasPassedTouchSlop && drag.quickDropTarget) {
      onQuickDrop?.(Array.from(drag.initialPositions.keys()), drag.quickDropTarget);
      dragRef.current = null;
      lastSnappedKeyRef.current = null;
      setDragPreview(null);
      return;
    }

    if (drag.hasPassedTouchSlop && (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0)) {
      const updates: { id: string; normalizedX: number; normalizedY: number }[] = [];

      drag.initialPositions.forEach((initial, id) => {
        const char = characters.find((c) => c.id === id);
        if (char && !char.isLocked) {
          const nextX = roundStagePosition(initial.x + deltaX);
          const nextY = roundStagePosition(initial.y + deltaY);
          updates.push({ id, normalizedX: nextX, normalizedY: nextY });
        }
      });

      if (updates.length === 1) {
        const char = characters.find((c) => c.id === updates[0].id);
        const name = char?.privateLabel || char?.name || 'Personaje';
        onUpdateCharacter(
          updates[0].id,
          { normalizedX: updates[0].normalizedX, normalizedY: updates[0].normalizedY },
          `Mover a ${name} a (${updates[0].normalizedX}%, ${updates[0].normalizedY}%)`
        );
      } else if (updates.length > 1) {
        onUpdateMultipleCharacterPositions(
          updates,
          `Mover grupo de ${updates.length} personajes`
        );
      }
    }

    dragRef.current = null;
    lastSnappedKeyRef.current = null;
    setDragPreview(null);
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (dragRef.current?.isDragging && e.buttons === 0) {
      dragRef.current = null;
      lastSnappedKeyRef.current = null;
      setDragPreview(null);
    }
  };

  const handlePointerCancel = () => {
    dragRef.current = null;
    lastSnappedKeyRef.current = null;
    setDragPreview(null);
  };

  return {
    containerRef,
    dragPreview,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  };
}
