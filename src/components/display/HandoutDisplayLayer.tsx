import React from 'react';
import type { HandoutState } from '../../types';
import { normalizeHandoutState } from '../../domain/display/handoutNormalizer';

interface HandoutDisplayLayerProps {
  handout?: HandoutState | null;
}

export const HandoutDisplayLayer: React.FC<HandoutDisplayLayerProps> = ({ handout }) => {
  if (!handout) return null;

  const { pages, activePageIndex, activePage } = normalizeHandoutState(handout);
  const maskId = `handout-fog-mask-${handout.id}-p${activePage.pageNumber}`;
  const totalPages = pages.length;

  return (
    <div
      className="handout-display-layer fixed inset-0 z-40 flex items-center justify-center bg-black/92 backdrop-blur-md select-none animate-fade-in"
      style={{
        transition: 'opacity 0.4s ease-out',
        pointerEvents: 'none',
      }}
    >
      {/* Document Viewport with Sync Zoom and Pan */}
      <div
        className="handout-viewport relative flex items-center justify-center overflow-hidden"
        style={{
          width: '100vw',
          height: '100vh',
          transform: `scale(${activePage.zoom}) translate(${activePage.panOffset.x}%, ${activePage.panOffset.y}%)`,
          transformOrigin: 'center center',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Document Content Container */}
        <div className="relative inline-block max-w-[92vw] max-h-[86vh] shadow-2xl rounded-lg overflow-hidden border border-amber-900/40">
          <img
            key={activePage.id || activePageIndex}
            src={activePage.imageUrl}
            alt={activePage.title || handout.title}
            className="block max-w-[92vw] max-h-[86vh] object-contain select-none animate-fade-in"
            loading="eager"
          />

          {/* Fog-of-War Mask Overlay (Cutout for Revealed Rectangles and Circles) */}
          {!activePage.isFullyRevealed && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <mask id={maskId}>
                  {/* White = opaque fog */}
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {/* Black = cutouts / revealed holes */}
                  {activePage.revealedRects.map((rect) => (
                    <rect
                      key={rect.id}
                      x={`${rect.x}%`}
                      y={`${rect.y}%`}
                      width={`${rect.width}%`}
                      height={`${rect.height}%`}
                      fill="black"
                    />
                  ))}
                  {activePage.revealedCircles?.map((circle) => (
                    <circle
                      key={circle.id}
                      cx={`${circle.cx}%`}
                      cy={`${circle.cy}%`}
                      r={`${circle.r}%`}
                      fill="black"
                    />
                  ))}
                </mask>
              </defs>

              {/* Fog Layer applied with mask */}
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="#050508"
                mask={`url(#${maskId})`}
                opacity="0.98"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Floating Header Banner */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2 rounded-full bg-slate-950/85 border border-amber-500/40 text-amber-200 text-sm font-semibold tracking-wide backdrop-blur-md shadow-2xl flex items-center gap-2.5">
        <span>📜</span>
        <span>{activePage.title || handout.title}</span>
        {totalPages > 1 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-medium border border-slate-700">
            Página {activePage.pageNumber} de {totalPages}
          </span>
        )}
        {activePage.isFullyRevealed && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal border border-amber-500/30">
            Documento Completo
          </span>
        )}
      </div>
    </div>
  );
};
