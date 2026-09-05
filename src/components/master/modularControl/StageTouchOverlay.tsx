import React, { useRef } from 'react';
import type { CharacterOnScreen } from '../../../types';

export interface StageTouchOverlayProps {
  characters: CharacterOnScreen[];
  selectedCharId: string | null;
  onSelectCharacter: (id: string) => void;
  onMoveCharacter?: (id: string, normalizedX: number, normalizedY: number) => void;
}

export const StageTouchOverlay: React.FC<StageTouchOverlayProps> = ({
  characters,
  selectedCharId,
  onSelectCharacter,
  onMoveCharacter,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeDragRef = useRef<{
    charId: string;
    startX: number;
    startY: number;
    initialNormX: number;
    initialNormY: number;
    hasMoved: boolean;
  } | null>(null);

  const handlePointerDown = (
    char: CharacterOnScreen,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    const target = e.currentTarget;
    if (typeof target.setPointerCapture === 'function') {
      target.setPointerCapture(e.pointerId);
    }

    const normX = char.normalizedX !== undefined ? char.normalizedX : 50;
    const normY = char.normalizedY !== undefined ? char.normalizedY : 15;

    activeDragRef.current = {
      charId: char.id,
      startX: e.clientX,
      startY: e.clientY,
      initialNormX: normX,
      initialNormY: normY,
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
      // In web, downwards movement is +Y, whereas stage ground line may be inverted or direct
      const deltaPercentY = -(deltaPixelY / rect.height) * 100;

      const newX = Math.max(5, Math.min(95, Math.round(drag.initialNormX + deltaPercentX)));
      const newY = Math.max(0, Math.min(85, Math.round(drag.initialNormY + deltaPercentY)));

      onMoveCharacter(drag.charId, newX, newY);
    }
  };

  const handlePointerUp = (
    char: CharacterOnScreen,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    const drag = activeDragRef.current;
    if (drag && drag.charId === char.id) {
      if (!drag.hasMoved) {
        // Was a tap/click => select
        onSelectCharacter(char.id);
      }
    }
    activeDragRef.current = null;
    try {
      if (typeof e.currentTarget.releasePointerCapture === 'function') {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore if pointer capture already lost
    }
  };

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
      {characters.map((char) => {
        if (char.isHidden) return null;
        const posX = char.normalizedX !== undefined ? char.normalizedX : 50;
        const posY = char.normalizedY !== undefined ? char.normalizedY : 15;
        const isSelected = char.id === selectedCharId;
        const scale = char.scale || 1.0;

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
              transform: `translate(-50%, 0) scale(${scale})`,
              width: '120px',
              height: '180px',
              cursor: 'pointer',
              pointerEvents: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              touchAction: 'none',
              zIndex: isSelected ? 35 : (char.zIndex || 10),
            }}
            title={`${char.name} (Tocar para editar)`}
          >
            {/* Cyan/Gold RPG Ring under selected character */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  width: '90px',
                  height: '28px',
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
