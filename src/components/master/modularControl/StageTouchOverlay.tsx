import React, { useRef, useState, useMemo } from 'react';
import type { CharacterOnScreen, TacticalGridConfig } from '../../../types';
import { tacticalDistanceInCells } from '../../../domain/display/tacticalDistance';

export interface StageTouchOverlayProps {
  characters: CharacterOnScreen[];
  selectedCharId: string | null;
  onSelectCharacter: (id: string) => void;
  onMoveCharacter?: (id: string, normalizedX: number, normalizedY: number) => void;
  isTacticalMode?: boolean;
  gridConfig?: TacticalGridConfig;
}

export const StageTouchOverlay: React.FC<StageTouchOverlayProps> = ({
  characters,
  selectedCharId,
  onSelectCharacter,
  onMoveCharacter,
  isTacticalMode = false,
  gridConfig,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    charId: string;
    currentNormX: number;
    currentNormY: number;
  } | null>(null);

  const activeDragRef = useRef<{
    charId: string;
    startX: number;
    startY: number;
    initialNormX: number;
    initialNormY: number;
    currentNormX: number;
    currentNormY: number;
    hasMoved: boolean;
  } | null>(null);

  const activeGrid: TacticalGridConfig = useMemo(() => {
    return gridConfig || { enabled: true, type: 'square', columns: 10, opacity: 0.55 };
  }, [gridConfig]);

  const columns = Math.max(2, activeGrid.columns || 10);
  const rows = Math.max(2, Math.round((columns * 9) / 16));
  const stepX = 100 / columns;
  const stepY = 100 / rows;

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

    const normX = char.normalizedX !== undefined ? char.normalizedX : 50;
    const normY = char.normalizedY !== undefined ? char.normalizedY : 15;

    activeDragRef.current = {
      charId: char.id,
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

      const newX = Math.max(0, Math.min(100, Math.round(drag.initialNormX + deltaPercentX)));
      const newY = Math.max(0, Math.min(100, Math.round(drag.initialNormY + deltaPercentY)));

      drag.currentNormX = newX;
      drag.currentNormY = newY;

      if (isTacticalMode) {
        setDragState({
          charId: drag.charId,
          currentNormX: newX,
          currentNormY: newY,
        });
      } else {
        onMoveCharacter(drag.charId, newX, newY);
      }
    }
  };

  const handlePointerUp = (
    char: CharacterOnScreen,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    const drag = activeDragRef.current;
    if (drag && drag.charId === char.id) {
      if (!drag.hasMoved) {
        // Tap/click => select
        onSelectCharacter(char.id);
      } else if (isTacticalMode && onMoveCharacter) {
        // Snap to grid center on release
        const snappedX = Math.max(0, Math.min(100, Math.round(drag.currentNormX / stepX) * stepX));
        const snappedY = Math.max(0, Math.min(100, Math.round(drag.currentNormY / stepY) * stepY));
        onMoveCharacter(char.id, snappedX, snappedY);
      }
    }

    activeDragRef.current = null;
    setDragState(null);

    try {
      if (typeof e.currentTarget.releasePointerCapture === 'function') {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore if pointer capture already released
    }
  };

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

      {/* 3. CHARACTERS: EITHER TACTICAL CIRCULAR TOKENS OR STAND-EE HITBOXES */}
      {characters.map((char) => {
        if (char.isHidden) return null;
        const isSelected = char.id === selectedCharId;
        const isDragging = dragState?.charId === char.id;

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
        const scale = char.scale || 1.0;

        if (isTacticalMode) {
          // TACTICAL CIRCULAR TOKEN
          const teamColor =
            char.tacticalTeam === 'enemies'
              ? '#ef4444'
              : char.tacticalTeam === 'allies'
              ? '#22c55e'
              : '#fbbf24';

          const tokenSizeStyle = `clamp(40px, calc(var(--stage-height, 100vh) * 0.14 * ${scale}), 96px)`;

          return (
            <div
              key={char.id}
              data-testid={`stage-char-hitbox-${char.id}`}
              onPointerDown={(e) => handlePointerDown(char, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => handlePointerUp(char, e)}
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
                zIndex: isSelected || isDragging ? 35 : char.zIndex || 10,
              }}
              title={`${char.name} (Token táctico - arrastrar para mover)`}
            >
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
                  transform: isDragging ? 'scale(1.15)' : 'scale(1)',
                  transition: isDragging ? 'none' : 'transform 0.15s ease',
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
        const standeeWidthStyle = `clamp(70px, calc(var(--stage-height, 100vh) * 0.28 * ${scale}), 260px)`;
        const standeeHeightStyle = `clamp(110px, calc(var(--stage-height, 100vh) * 0.46 * ${scale}), 400px)`;

        return (
          <div
            key={char.id}
            data-testid={`stage-char-hitbox-${char.id}`}
            onPointerDown={(e) => handlePointerDown(char, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(char, e)}
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
              zIndex: isSelected ? 35 : char.zIndex || 10,
            }}
            title={`${char.name} (Tocar para editar)`}
          >
            {/* Cyan/Gold RPG Ring under selected character */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  width: `clamp(60px, calc(var(--stage-height, 100vh) * 0.22 * ${scale}), 200px)`,
                  height: `clamp(18px, calc(var(--stage-height, 100vh) * 0.07 * ${scale}), 55px)`,
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

