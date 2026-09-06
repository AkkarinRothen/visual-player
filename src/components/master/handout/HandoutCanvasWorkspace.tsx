import React from 'react';
import type { HandoutPage, RevealedRegionCircle } from '../../../types';
import type { HandoutTouchMode, DragRect } from './handoutTypes';

interface HandoutCanvasWorkspaceProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  imgRef: React.RefObject<HTMLImageElement | null>;
  currentPage: HandoutPage;
  fallbackTitle: string;
  touchMode: HandoutTouchMode;
  brushRadius: number;
  isDrawing: boolean;
  currentDragRect: DragRect | null;
  strokeCircles: RevealedRegionCircle[];
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export const HandoutCanvasWorkspace: React.FC<HandoutCanvasWorkspaceProps> = ({
  containerRef,
  imgRef,
  currentPage,
  fallbackTitle,
  touchMode,
  brushRadius,
  isDrawing,
  currentDragRect,
  strokeCircles,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={`relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center select-none ${
        touchMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Document container with current zoom/pan */}
      <div
        className="relative transition-transform duration-100 ease-out"
        style={{
          transform: `scale(${currentPage.zoom}) translate(${currentPage.panOffset.x}%, ${currentPage.panOffset.y}%)`,
          transformOrigin: 'center center',
        }}
      >
        {/* The Document Image */}
        <img
          ref={imgRef}
          src={currentPage.imageUrl}
          alt={currentPage.title || fallbackTitle}
          className="max-h-[64vh] max-w-[85vw] object-contain rounded shadow-2xl pointer-events-none select-none"
          draggable={false}
        />

        {/* DM GHOST MASK PREVIEW: Shows what players see vs what is hidden */}
        {!currentPage.isFullyRevealed && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark translucent tint over all non-revealed areas (50% opacity) */}
            <div className="absolute inset-0 bg-black/55 backdrop-brightness-75" />

            {/* Render clear window cutouts for revealed rectangles */}
            {currentPage.revealedRects.map((rect) => (
              <div
                key={rect.id}
                className="absolute border-2 border-dashed border-amber-400/90 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                style={{
                  left: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                  background: 'rgba(255,255,255,0.01)',
                  backdropFilter: 'brightness(1.8) contrast(1.1)',
                }}
              >
                <span className="absolute -top-4 left-0 text-[9px] px-1 bg-amber-950 text-amber-300 font-bold rounded">
                  Público
                </span>
              </div>
            ))}

            {/* Render clear circular cutouts for revealed circles */}
            {currentPage.revealedCircles?.map((circle) => (
              <div
                key={circle.id}
                className="absolute border-2 border-dashed border-amber-400/90 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                style={{
                  left: `${circle.cx - circle.r}%`,
                  top: `${circle.cy - circle.r}%`,
                  width: `${circle.r * 2}%`,
                  height: `${circle.r * 2}%`,
                  background: 'rgba(255,255,255,0.01)',
                  backdropFilter: 'brightness(1.8) contrast(1.1)',
                }}
              />
            ))}
          </div>
        )}

        {/* Active Dragging Rectangle preview */}
        {isDrawing && currentDragRect && (
          <div
            className="absolute border-2 border-emerald-400 bg-emerald-500/20 pointer-events-none"
            style={{
              left: `${currentDragRect.x}%`,
              top: `${currentDragRect.y}%`,
              width: `${currentDragRect.w}%`,
              height: `${currentDragRect.h}%`,
            }}
          />
        )}

        {/* Active Brush Stroke preview */}
        {isDrawing && strokeCircles.length > 0 && (
          <>
            {strokeCircles.map((c) => (
              <div
                key={c.id}
                className="absolute border border-emerald-400 rounded-full bg-emerald-500/25 pointer-events-none"
                style={{
                  left: `${c.cx - c.r}%`,
                  top: `${c.cy - c.r}%`,
                  width: `${c.r * 2}%`,
                  height: `${c.r * 2}%`,
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Mode Overlay Tip */}
      <div className="absolute bottom-3 left-4 px-3 py-1 rounded bg-slate-900/80 border border-slate-700 text-[11px] text-slate-300 pointer-events-none">
        {touchMode === 'reveal-brush' && (
          <span>🖌 Pincel Circular: Pinta o toca para despejar niebla con radio {brushRadius}%</span>
        )}
        {touchMode === 'reveal-rect' && (
          <span>✂️ Recuadro: Arrastra sobre la imagen para despejar esa región</span>
        )}
        {touchMode === 'pan' && <span>🖐 Modo Mover: Arrastra para desplazar el documento libremente</span>}
      </div>
    </div>
  );
};
