import React from 'react';
import type { CharacterOnScreen } from '../../../types';
import type { DragPreviewState } from './directorTypes';
import { Lock, Mic } from 'lucide-react';

export interface DirectorCharacterTokensProps {
  characters: CharacterOnScreen[];
  selectedIds: Set<string>;
  dragPreview: DragPreviewState | null;
  groundLineY?: number;
  onSelect: (charId: string, e?: React.MouseEvent) => void;
  onPointerDown: (character: CharacterOnScreen, e: React.PointerEvent<HTMLDivElement>) => void;
}

export const DirectorCharacterTokens: React.FC<DirectorCharacterTokensProps> = ({
  characters,
  selectedIds,
  dragPreview,
  groundLineY = 0,
  onSelect,
  onPointerDown,
}) => {
  return (
    <>
      {characters.map((char) => {
        if (char.presence === 'in_reserve') return null;

        const isSelected = selectedIds.has(char.id);
        const activeDrag = dragPreview;
        const isDraggingThis =
          !!activeDrag?.isDragging && activeDrag.initialPositions.has(char.id);
        const isLocked = !!char.isLocked;
        const cursorClass = isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing';

        const initialDragPosition = activeDrag?.initialPositions.get(char.id);
        const dragDeltaX = activeDrag?.hasPassedTouchSlop
          ? activeDrag.currentX - activeDrag.startX
          : 0;
        const dragDeltaY = activeDrag?.hasPassedTouchSlop
          ? activeDrag.currentY - activeDrag.startY
          : 0;
        const posX = initialDragPosition
          ? initialDragPosition.x + dragDeltaX
          : char.normalizedX ?? 50;
        const logicalPosY = initialDragPosition
          ? initialDragPosition.y + dragDeltaY
          : char.normalizedY ?? 0;
        const posY = logicalPosY + groundLineY;
        const visualAnchorOffsetY = char.visualAnchorOffsetY || 0;
        const effectiveScale = char.scale ?? 1.0;

        return (
          <div
            key={char.id}
            data-testid={`director-handle-${char.id}`}
            className={`director-ui-element absolute pointer-events-auto ${cursorClass} transition-transform ${
              isSelected ? 'z-40' : 'z-20'
            }`}
            style={{
              left: `${posX}%`,
              bottom: `${posY}%`,
              transform: `translate(-50%, ${visualAnchorOffsetY}%)`,
              touchAction: 'none',
            }}
            onClick={(e) => onSelect(char.id, e)}
            onPointerDown={(e) => onPointerDown(char, e)}
          >
            {/* Direct Selection Box */}
            <div
              className={`relative rounded-2xl transition-all p-1 flex flex-col items-center justify-center ${
                isSelected
                  ? 'ring-2 ring-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'hover:ring-1 hover:ring-amber-400/50 hover:bg-slate-900/30'
              }`}
              style={{
                width: `${Math.round(80 * effectiveScale)}px`,
                height: `${Math.round(120 * effectiveScale)}px`,
              }}
            >
              {isDraggingThis && activeDrag?.hasPassedTouchSlop && (
                <img
                  src={char.avatarUrl}
                  alt=""
                  className="absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)] object-contain opacity-70 pointer-events-none drop-shadow-xl"
                  draggable={false}
                />
              )}

              {/* Center crosshair dot */}
              <div
                className={`w-2 h-2 rounded-full border border-slate-950 transition-colors ${
                  isSelected ? 'bg-amber-400 shadow-sm' : 'bg-slate-300 opacity-60'
                }`}
              />

              {/* Private label tag pill */}
              <div
                className={`absolute -top-5 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-md transition-colors ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950/80 text-slate-200 border border-slate-700'
                }`}
              >
                {char.privateLabel || char.name}
              </div>

              {/* Badges corner */}
              <div className="absolute top-1 right-1 flex items-center gap-0.5">
                {char.isHidden && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Oculto" />
                )}
                {char.isLocked && <Lock size={10} className="text-rose-400" />}
                {char.isSpeaking && <Mic size={10} className="text-yellow-300 animate-pulse" />}
              </div>
            </div>

            {isDraggingThis &&
              activeDrag?.hasPassedTouchSlop &&
              activeDrag.anchorId === char.id && (
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-7 pointer-events-none bg-slate-950/95 border border-amber-400 px-2 py-0.5 rounded-md text-[10px] text-amber-200 font-mono whitespace-nowrap shadow-xl">
                  X {posX.toFixed(1)}% · Y {logicalPosY.toFixed(1)}%
                </div>
              )}
          </div>
        );
      })}
    </>
  );
};
