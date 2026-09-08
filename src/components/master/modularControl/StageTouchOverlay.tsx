import React, { useRef, useState, useMemo } from 'react';
import { ZoomIn, RotateCcw } from 'lucide-react';
import type { CharacterOnScreen, TacticalGridConfig, CameraTransform } from '../../../types';
import { tacticalDistanceInCells } from '../../../domain/display/tacticalDistance';
import {
  shouldRenderAsToken,
  findContextualMagneticSnap,
  snapToCellCenter,
} from '../../../domain/display/tacticalFormations';

export interface StageTouchOverlayProps {
  characters: CharacterOnScreen[];
  selectedCharId: string | null;
  onSelectCharacter: (id: string) => void;
  onMoveCharacter?: (id: string, normalizedX: number, normalizedY: number) => void;
  onStreamMoveCharacter?: (id: string, normalizedX: number, normalizedY: number) => void;
  onScaleCharacter?: (id: string, scale: number) => void;
  onStreamScaleCharacter?: (id: string, scale: number) => void;
  onCameraChange?: (camera: CameraTransform) => void;
  onStreamCameraChange?: (camera: CameraTransform) => void;
  camera?: CameraTransform;
  isTacticalMode?: boolean;
  gridConfig?: TacticalGridConfig;
}

interface PointerInfo {
  x: number;
  y: number;
  targetCharId: string | null;
}

const getDndScaleLabel = (scale: number): string => {
  if (scale <= 0.35) return 'Diminuto';
  if (scale <= 0.75) return 'Pequeño';
  if (scale >= 1.75) return 'Enorme';
  if (scale >= 1.35) return 'Grande';
  return 'Mediano';
};

export const StageTouchOverlay: React.FC<StageTouchOverlayProps> = ({
  characters,
  selectedCharId,
  onSelectCharacter,
  onMoveCharacter,
  onStreamMoveCharacter,
  onScaleCharacter,
  onStreamScaleCharacter,
  onCameraChange,
  onStreamCameraChange,
  camera,
  isTacticalMode = false,
  gridConfig,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastStreamEmitRef = useRef<number>(0);
  const lastCameraStreamEmitRef = useRef<number>(0);

  // Active pointers registry across the stage
  const activePointersRef = useRef<Map<number, PointerInfo>>(new Map());

  // ── Dragging State ──
  const [dragState, setDragState] = useState<{
    charId: string;
    currentNormX: number;
    currentNormY: number;
  } | null>(null);

  const activeDragRef = useRef<{
    charId: string;
    pointerId: number;
    startX: number;
    startY: number;
    initialNormX: number;
    initialNormY: number;
    currentNormX: number;
    currentNormY: number;
    hasMoved: boolean;
  } | null>(null);

  // ── Character Pinch-to-Scale State ──
  const [pinchScaleState, setPinchScaleState] = useState<{
    charId: string;
    scale: number;
  } | null>(null);

  const activeCharPinchRef = useRef<{
    charId: string;
    initialDistance: number;
    initialScale: number;
    currentScale: number;
  } | null>(null);

  // ── Camera Pinch-to-Zoom State ──
  const activeCameraRef = useRef<CameraTransform>({
    focalPoint: camera?.focalPoint || { x: 50, y: 50 },
    zoom: camera?.zoom || 1.0,
  });

  // Keep activeCameraRef in sync with external camera prop changes when not pinching
  const isCameraPinchingRef = useRef(false);
  if (!isCameraPinchingRef.current && camera) {
    activeCameraRef.current = {
      focalPoint: camera.focalPoint || { x: 50, y: 50 },
      zoom: camera.zoom || 1.0,
    };
  }

  const [cameraPinchState, setCameraPinchState] = useState<CameraTransform | null>(null);
  const activeCameraPinchRef = useRef<{
    initialDistance: number;
    initialZoom: number;
    currentZoom: number;
  } | null>(null);

  const lastBackgroundTapTimeRef = useRef<number>(0);

  const activeGrid: TacticalGridConfig = useMemo(() => {
    return gridConfig || { enabled: true, type: 'square', columns: 10, opacity: 0.55 };
  }, [gridConfig]);

  const columns = Math.max(2, activeGrid.columns || 10);
  const rows = Math.max(2, Math.round((columns * 9) / 16));

  // ── Character Pointer Handlers ──
  const handlePointerDown = (
    char: CharacterOnScreen,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    const target = e.currentTarget;
    if (typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Ignore pointer capture errors in testing/unsupported environments
      }
    }

    activePointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      targetCharId: char.id,
    });

    const pointersForChar = Array.from(activePointersRef.current.values()).filter(
      (p) => p.targetCharId === char.id
    );

    // If 2 pointers touch down on this character, initiate pinch-to-scale!
    if (pointersForChar.length >= 2) {
      const p1 = pointersForChar[0];
      const p2 = pointersForChar[1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const startScale = char.scale || 1.0;

      activeCharPinchRef.current = {
        charId: char.id,
        initialDistance: Math.max(10, dist),
        initialScale: startScale,
        currentScale: startScale,
      };
      setPinchScaleState({
        charId: char.id,
        scale: startScale,
      });

      // Clear any single-finger drag
      activeDragRef.current = null;
      setDragState(null);
      return;
    }

    // Otherwise initiate single-finger drag
    const normX = char.normalizedX !== undefined ? char.normalizedX : 50;
    const normY = char.normalizedY !== undefined ? char.normalizedY : 15;

    activeDragRef.current = {
      charId: char.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialNormX: normX,
      initialNormY: normY,
      currentNormX: normX,
      currentNormY: normY,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Update pointer position in registry
    if (activePointersRef.current.has(e.pointerId)) {
      const prev = activePointersRef.current.get(e.pointerId)!;
      activePointersRef.current.set(e.pointerId, {
        ...prev,
        x: e.clientX,
        y: e.clientY,
      });
    }

    // 1. Check Character Pinch
    const charPinch = activeCharPinchRef.current;
    if (charPinch) {
      const pointersForChar = Array.from(activePointersRef.current.values()).filter(
        (p) => p.targetCharId === charPinch.charId
      );
      if (pointersForChar.length >= 2) {
        const p1 = pointersForChar[0];
        const p2 = pointersForChar[1];
        const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const ratio = currentDist / charPinch.initialDistance;
        const newScale = Math.max(0.15, Math.min(2.5, Math.round(charPinch.initialScale * ratio * 100) / 100));

        charPinch.currentScale = newScale;
        setPinchScaleState({
          charId: charPinch.charId,
          scale: newScale,
        });

        if (onStreamScaleCharacter) {
          const now = performance.now();
          if (now - lastStreamEmitRef.current >= 50) {
            lastStreamEmitRef.current = now;
            onStreamScaleCharacter(charPinch.charId, newScale);
          }
        }
        return;
      }
    }

    // 2. Check Single-finger Drag
    const drag = activeDragRef.current;
    if (!drag || !containerRef.current || !onMoveCharacter) return;

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaPixelX = e.clientX - drag.startX;
    const deltaPixelY = e.clientY - drag.startY;

    if (!drag.hasMoved && (Math.abs(deltaPixelX) > 4 || Math.abs(deltaPixelY) > 4)) {
      drag.hasMoved = true;
    }

    if (drag.hasMoved) {
      const deltaPercentX = (deltaPixelX / rect.width) * 100;
      const deltaPercentY = -(deltaPixelY / rect.height) * 100;

      const rawX = Math.max(0, Math.min(100, Math.round(drag.initialNormX + deltaPercentX)));
      const rawY = Math.max(0, Math.min(100, Math.round(drag.initialNormY + deltaPercentY)));

      const activeGridSnap = isTacticalMode ? (gridConfig || { enabled: true, columns, type: 'square', opacity: 0.5 }) : undefined;
      const snapResult = findContextualMagneticSnap(
        rawX,
        rawY,
        characters,
        drag.charId,
        activeGridSnap
      );

      const targetX = snapResult.snapped ? snapResult.x : rawX;
      const targetY = snapResult.snapped ? snapResult.y : rawY;

      drag.currentNormX = targetX;
      drag.currentNormY = targetY;

      // Always maintain instant responsive local visual feedback on the mobile device
      setDragState({
        charId: drag.charId,
        currentNormX: targetX,
        currentNormY: targetY,
      });

      if (onStreamMoveCharacter) {
        const now = performance.now();
        if (now - lastStreamEmitRef.current >= 50) {
          lastStreamEmitRef.current = now;
          onStreamMoveCharacter(drag.charId, targetX, targetY);
        }
      } else if (!isTacticalMode && onMoveCharacter) {
        // Fallback for non-stream callers or legacy tests
        onMoveCharacter(drag.charId, targetX, targetY);
      }
    }
  };

  const handlePointerUp = (
    char: CharacterOnScreen,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    activePointersRef.current.delete(e.pointerId);

    // If we were pinching this character
    const charPinch = activeCharPinchRef.current;
    if (charPinch && charPinch.charId === char.id) {
      if (onScaleCharacter) {
        onScaleCharacter(char.id, charPinch.currentScale);
      }
      activeCharPinchRef.current = null;
      setPinchScaleState(null);
    }

    // If we were dragging this character
    const drag = activeDragRef.current;
    if (drag && drag.charId === char.id) {
      if (!drag.hasMoved) {
        // Tap/click => select
        onSelectCharacter(char.id);
      } else if (onMoveCharacter) {
        if (isTacticalMode) {
          const snapped = snapToCellCenter(drag.currentNormX, drag.currentNormY, columns, rows);
          onMoveCharacter(char.id, snapped.x, snapped.y);
        } else {
          const snapResult = findContextualMagneticSnap(
            drag.currentNormX,
            drag.currentNormY,
            characters,
            char.id
          );
          onMoveCharacter(char.id, snapResult.x, snapResult.y);
        }
      }
      activeDragRef.current = null;
      setDragState(null);
    }

    try {
      if (typeof e.currentTarget.releasePointerCapture === 'function') {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore if pointer capture already released
    }
  };

  // ── Background Stage Handlers (Pinch-to-Zoom Camera) ──
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      targetCharId: null,
    });

    const bgPointers = Array.from(activePointersRef.current.values()).filter(
      (p) => p.targetCharId === null
    );

    if (bgPointers.length >= 2) {
      isCameraPinchingRef.current = true;
      const p1 = bgPointers[0];
      const p2 = bgPointers[1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const startZoom = activeCameraRef.current.zoom || 1.0;

      activeCameraPinchRef.current = {
        initialDistance: Math.max(10, dist),
        initialZoom: startZoom,
        currentZoom: startZoom,
      };
      setCameraPinchState({
        ...activeCameraRef.current,
        zoom: startZoom,
      });
    }
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      const prev = activePointersRef.current.get(e.pointerId)!;
      activePointersRef.current.set(e.pointerId, {
        ...prev,
        x: e.clientX,
        y: e.clientY,
      });
    }

    const camPinch = activeCameraPinchRef.current;
    if (camPinch) {
      const bgPointers = Array.from(activePointersRef.current.values()).filter(
        (p) => p.targetCharId === null
      );
      if (bgPointers.length >= 2) {
        const p1 = bgPointers[0];
        const p2 = bgPointers[1];
        const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const ratio = currentDist / camPinch.initialDistance;
        const newZoom = Math.max(1.0, Math.min(2.5, Math.round(camPinch.initialZoom * ratio * 100) / 100));

        camPinch.currentZoom = newZoom;
        const nextCam = {
          ...activeCameraRef.current,
          zoom: newZoom,
        };
        setCameraPinchState(nextCam);

        if (onStreamCameraChange) {
          const now = performance.now();
          if (now - lastCameraStreamEmitRef.current >= 50) {
            lastCameraStreamEmitRef.current = now;
            onStreamCameraChange(nextCam);
          }
        }
      }
    }
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);

    const camPinch = activeCameraPinchRef.current;
    if (camPinch) {
      const bgPointers = Array.from(activePointersRef.current.values()).filter(
        (p) => p.targetCharId === null
      );
      if (bgPointers.length < 2) {
        const committedCam = {
          ...activeCameraRef.current,
          zoom: camPinch.currentZoom,
        };
        activeCameraRef.current = committedCam;
        if (onCameraChange) {
          onCameraChange(committedCam);
        }
        activeCameraPinchRef.current = null;
        isCameraPinchingRef.current = false;
        setCameraPinchState(null);
      }
    }

    // Double-tap on background reset zoom to 1.0x
    const now = Date.now();
    if (now - lastBackgroundTapTimeRef.current < 300) {
      handleResetCameraZoom();
    }
    lastBackgroundTapTimeRef.current = now;
  };

  const handleResetCameraZoom = () => {
    const resetCam: CameraTransform = {
      focalPoint: { x: 50, y: 50 },
      zoom: 1.0,
    };
    activeCameraRef.current = resetCam;
    if (onCameraChange) {
      onCameraChange(resetCam);
    }
    if (onStreamCameraChange) {
      onStreamCameraChange(resetCam);
    }
    setCameraPinchState(null);
  };

  const currentEffectiveZoom = cameraPinchState?.zoom ?? camera?.zoom ?? activeCameraRef.current.zoom ?? 1.0;

  // Find dragging or selected character for tactical distance calculation
  const activeCharForTactics = useMemo(() => {
    if (!isTacticalMode) return null;
    const targetId = dragState?.charId || selectedCharId;
    if (!targetId) return null;
    const baseChar = characters.find((c) => c.id === targetId);
    if (!baseChar) return null;

    if (dragState && dragState.charId === targetId) {
      return {
        ...baseChar,
        normalizedX: dragState.currentNormX,
        normalizedY: dragState.currentNormY,
      };
    }
    return baseChar;
  }, [isTacticalMode, dragState, selectedCharId, characters]);

  // Nearest opponent calculation
  const nearestOpponent = useMemo(() => {
    if (!isTacticalMode || !activeCharForTactics) return null;
    const opponents = characters.filter(
      (c) =>
        c.id !== activeCharForTactics.id &&
        !c.isHidden &&
        c.tacticalTeam &&
        c.tacticalTeam !== activeCharForTactics.tacticalTeam
    );
    if (opponents.length === 0) return null;

    const mapped = opponents.map((opp) => ({
      character: opp,
      distance: tacticalDistanceInCells(activeCharForTactics, opp, columns),
    }));
    mapped.sort((a, b) => a.distance - b.distance);
    return mapped[0] || null;
  }, [isTacticalMode, activeCharForTactics, characters, columns]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
      }}
    >
      {/* 0. BACKGROUND HITBOX FOR CAMERA PINCH-TO-ZOOM AND DOUBLE-TAP RESET */}
      <div
        data-testid="stage-background-touch-area"
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'auto',
          touchAction: 'none',
          zIndex: 0,
        }}
      />

      {/* 1. TACTICAL GRID SVG LAYER (LINES / HEXES & DISTANCE ELASTIC LINE) */}
      {isTacticalMode && (
        <svg
          viewBox="0 0 1000 562.5"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
            opacity: activeGrid.opacity || 0.55,
          }}
          aria-hidden="true"
        >
          {/* Square Grid */}
          {activeGrid.type === 'square' && (
            <>
              {Array.from({ length: columns + 1 }, (_, i) => {
                const x = (i * 1000) / columns;
                return (
                  <line
                    key={`grid-v-${i}`}
                    x1={x}
                    y1={0}
                    x2={x}
                    y2={562.5}
                    stroke="rgba(56, 189, 248, 0.45)"
                    strokeWidth="1"
                  />
                );
              })}
              {Array.from({ length: rows + 1 }, (_, j) => {
                const y = (j * 562.5) / rows;
                return (
                  <line
                    key={`grid-h-${j}`}
                    x1={0}
                    y1={y}
                    x2={1000}
                    y2={y}
                    stroke="rgba(56, 189, 248, 0.45)"
                    strokeWidth="1"
                  />
                );
              })}
            </>
          )}

          {/* Hexagonal Grid */}
          {activeGrid.type === 'hex' &&
            (() => {
              const radius = 1000 / columns / Math.sqrt(3);
              const verticalStep = radius * 1.5;
              const hexRows = Math.ceil(562.5 / verticalStep) + 1;
              const hexes: React.ReactNode[] = [];

              for (let r = -1; r < hexRows; r++) {
                for (let c = -1; c < columns + 1; c++) {
                  const cx = c * radius * Math.sqrt(3) + (r % 2 ? (radius * Math.sqrt(3)) / 2 : 0);
                  const cy = r * verticalStep;
                  const pts = Array.from({ length: 6 }, (_, idx) => {
                    const angle = (Math.PI / 180) * (60 * idx + 30);
                    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
                  }).join(' ');
                  hexes.push(
                    <polygon
                      key={`hex-${r}-${c}`}
                      points={pts}
                      fill="none"
                      stroke="rgba(56, 189, 248, 0.45)"
                      strokeWidth="1"
                    />
                  );
                }
              }
              return hexes;
            })()}

          {/* Elastic Distance Line to Nearest Opponent */}
          {activeCharForTactics && nearestOpponent && (
            <line
              x1={((activeCharForTactics.normalizedX ?? 50) / 100) * 1000}
              y1={562.5 - ((activeCharForTactics.normalizedY ?? 15) / 100) * 562.5}
              x2={((nearestOpponent.character.normalizedX ?? 50) / 100) * 1000}
              y2={562.5 - ((nearestOpponent.character.normalizedY ?? 15) / 100) * 562.5}
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeDasharray="6,4"
              strokeLinecap="round"
            />
          )}
        </svg>
      )}

      {/* 2. PRIVATE DM HUD DISTANCE BADGE */}
      {isTacticalMode && activeCharForTactics && nearestOpponent && (
        <div
          className="stage-tactical-hud-distance"
          data-testid="stage-tactical-hud-distance"
          style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid rgba(245, 158, 11, 0.6)',
            borderRadius: '9999px',
            padding: '4px 12px',
            color: '#fef3c7',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.02em',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(245, 158, 11, 0.2)',
            zIndex: 40,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ color: '#f59e0b' }}>📏</span>
          <span>
            {nearestOpponent.distance.toFixed(1)} celdas ({(nearestOpponent.distance * 5).toFixed(0)} ft) a{' '}
            <strong style={{ color: '#f8fafc' }}>{nearestOpponent.character.name}</strong>
          </span>
        </div>
      )}

      {/* 2.5 FLOATING CAMERA ZOOM PILL (WHEN ZOOM > 1.0X) */}
      {currentEffectiveZoom > 1.01 && (
        <div
          data-testid="stage-camera-zoom-pill"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            borderRadius: '9999px',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#38bdf8',
            fontSize: '0.75rem',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 42,
            pointerEvents: 'auto',
          }}
        >
          <ZoomIn size={14} />
          <span>Zoom: {currentEffectiveZoom.toFixed(1)}x</span>
          <button
            type="button"
            data-testid="stage-camera-reset-zoom-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleResetCameraZoom();
            }}
            title="Restablecer zoom a 1.0x"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              marginLeft: '2px',
              borderRadius: '4px',
            }}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      )}

      {/* 3. CHARACTERS: EITHER TACTICAL CIRCULAR TOKENS OR STAND-EE HITBOXES */}
      {characters.map((char) => {
        if (char.isHidden) return null;
        const isSelected = char.id === selectedCharId;
        const isDragging = dragState?.charId === char.id;
        const isPinching = pinchScaleState?.charId === char.id;

        const posX = isDragging
          ? dragState.currentNormX
          : char.normalizedX !== undefined
          ? char.normalizedX
          : 50;
        const posY = isDragging
          ? dragState.currentNormY
          : char.normalizedY !== undefined
          ? char.normalizedY
          : 15;
        const scale = isPinching ? pinchScaleState.scale : (char.scale || 1.0);

        const isToken = shouldRenderAsToken(char, isTacticalMode);

        if (isToken) {
          // TACTICAL CIRCULAR TOKEN
          const teamColor =
            char.tacticalTeam === 'enemies'
              ? '#ef4444'
              : char.tacticalTeam === 'allies'
              ? '#22c55e'
              : '#fbbf24';

          const tokenSizeStyle = `clamp(24px, calc(var(--stage-height, 100vh) * 0.14 * ${scale}), 120px)`;

          return (
            <div
              key={char.id}
              data-testid={`stage-char-hitbox-${char.id}`}
              onPointerDown={(e) => handlePointerDown(char, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(char, e)}
              onPointerCancel={(e) => handlePointerUp(char, e)}
              style={{
                position: 'absolute',
                left: `${posX}%`,
                bottom: `${posY}%`,
                transform: 'translate(-50%, 50%)',
                width: tokenSizeStyle,
                height: `calc(${tokenSizeStyle} + 18px)`,
                cursor: 'pointer',
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'none',
                zIndex: isSelected || isDragging || isPinching ? 35 : char.zIndex || 10,
              }}
              title={`${char.name} (Token táctico - arrastrar para mover)`}
            >
              {/* Floating Live Pinch Badge */}
              {isPinching && (
                <div
                  data-testid={`stage-pinch-scale-chip-${char.id}`}
                  style={{
                    position: 'absolute',
                    top: '-26px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid #38bdf8',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    color: '#38bdf8',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                    pointerEvents: 'none',
                    zIndex: 50,
                  }}
                >
                  {Math.round(scale * 100)}% · {getDndScaleLabel(scale)}
                </div>
              )}

              <div
                style={{
                  width: tokenSizeStyle,
                  height: tokenSizeStyle,
                  borderRadius: '50%',
                  border: `3px solid ${isSelected ? '#fef3c7' : teamColor}`,
                  backgroundColor: '#020617',
                  backgroundImage: char.avatarUrl ? `url(${char.avatarUrl})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: isSelected
                    ? `0 0 16px ${teamColor}, inset 0 0 8px rgba(254, 243, 199, 0.8)`
                    : '0 4px 10px rgba(0, 0, 0, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  transform: isDragging || isPinching ? 'scale(1.12)' : 'scale(1)',
                  transition: isDragging || isPinching ? 'none' : 'transform 0.15s ease',
                }}
              >
                {!char.avatarUrl && char.name.charAt(0)}
              </div>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  backgroundColor: 'rgba(2, 6, 23, 0.85)',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  maxWidth: '70px',
                  overflow: 'hidden',
                  textAlign: 'center',
                }}
              >
                {char.name}
              </span>
            </div>
          );
        }

        // CLASSIC STANDEE HITBOX (NON-TACTICAL MODE)
        const standeeWidthStyle = `clamp(22px, calc(var(--stage-height, 100vh) * 0.28 * ${scale}), 260px)`;
        const standeeHeightStyle = `clamp(32px, calc(var(--stage-height, 100vh) * 0.46 * ${scale}), 400px)`;

        return (
          <div
            key={char.id}
            data-testid={`stage-char-hitbox-${char.id}`}
            onPointerDown={(e) => handlePointerDown(char, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(char, e)}
            onPointerCancel={(e) => handlePointerUp(char, e)}
            style={{
              position: 'absolute',
              left: `${posX}%`,
              bottom: `${posY}%`,
              transform: 'translate(-50%, 0)',
              width: standeeWidthStyle,
              height: standeeHeightStyle,
              cursor: 'pointer',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              touchAction: 'none',
              zIndex: isSelected || isPinching ? 35 : char.zIndex || 10,
            }}
            title={`${char.name} (Tocar para editar)`}
          >
            {/* Floating Live Pinch Badge */}
            {isPinching && (
              <div
                data-testid={`stage-pinch-scale-chip-${char.id}`}
                style={{
                  position: 'absolute',
                  top: '-26px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid #38bdf8',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  color: '#38bdf8',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                  zIndex: 50,
                }}
              >
                {Math.round(scale * 100)}% · {getDndScaleLabel(scale)}
              </div>
            )}

            {/* Cyan/Gold RPG Ring under selected character */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  width: `clamp(20px, calc(var(--stage-height, 100vh) * 0.22 * ${scale}), 200px)`,
                  height: `clamp(6px, calc(var(--stage-height, 100vh) * 0.07 * ${scale}), 55px)`,
                  borderRadius: '50%',
                  border: '2.5px solid #38bdf8',
                  boxShadow: '0 0 16px #38bdf8, inset 0 0 10px rgba(56, 189, 248, 0.6)',
                  pointerEvents: 'none',
                  animation: 'pulse 1.8s infinite',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

