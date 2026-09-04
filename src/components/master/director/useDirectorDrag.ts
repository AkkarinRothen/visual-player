import { useRef, useEffect, useState } from 'react';
import type { CharacterOnScreen, CameraTransform } from '../../../types';
import type { DragState } from './directorTypes';

export interface UseDirectorDragProps {
  characters: CharacterOnScreen[];
  camera?: CameraTransform;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  isMultiSelectMode: boolean;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onUpdateMultipleCharacterPositions: (
    updates: { id: string; normalizedX: number; normalizedY: number }[],
    description: string
  ) => void;
}

export function useDirectorDrag({
  characters,
  camera,
  selectedIds,
  setSelectedIds,
  isMultiSelectMode,
  onUpdateCharacter,
  onUpdateMultipleCharacterPositions,
}: UseDirectorDragProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const prevCameraRef = useRef<CameraTransform | undefined>(camera);
  const [, setForceRender] = useState({});

  // Cancel dragging if camera changes during gesture
  useEffect(() => {
    if (dragRef.current?.isDragging && camera && prevCameraRef.current) {
      if (
        camera.zoom !== prevCameraRef.current.zoom ||
        camera.focalPoint?.x !== prevCameraRef.current.focalPoint?.x ||
        camera.focalPoint?.y !== prevCameraRef.current.focalPoint?.y
      ) {
        dragRef.current = null;
        setForceRender({});
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
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
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

    dragRef.current = {
      isDragging: true,
      anchorId: char.id,
      startX: currentX,
      startY: currentY,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      currentX,
      currentY,
      initialPositions: initialMap,
    };

    setForceRender({});
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !drag.isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaPixelX = e.clientX - drag.pointerStartX;
    const deltaPixelY = e.clientY - drag.pointerStartY;

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

    drag.currentX = Math.round(drag.startX + clampedDeltaX);
    drag.currentY = Math.round(drag.startY + clampedDeltaY);

    setForceRender({});
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !drag.isDragging) return;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const deltaX = drag.currentX - drag.startX;
    const deltaY = drag.currentY - drag.startY;

    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      const updates: { id: string; normalizedX: number; normalizedY: number }[] = [];

      drag.initialPositions.forEach((initial, id) => {
        const char = characters.find((c) => c.id === id);
        if (char && !char.isLocked) {
          const nextX = Math.round(initial.x + deltaX);
          const nextY = Math.round(initial.y + deltaY);
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
    setForceRender({});
  };

  const handlePointerLeave = (e: React.PointerEvent) => {
    if (dragRef.current?.isDragging && e.buttons === 0) {
      dragRef.current = null;
      setForceRender({});
    }
  };

  const handlePointerCancel = () => {
    dragRef.current = null;
    setForceRender({});
  };

  return {
    containerRef,
    dragRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  };
}
