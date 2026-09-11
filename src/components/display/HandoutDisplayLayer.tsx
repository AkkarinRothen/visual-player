import React from 'react';
import type { HandoutState, HandoutTheme, HandoutTypography } from '../../types';
import { normalizeHandoutState } from '../../domain/display/handoutNormalizer';

interface HandoutDisplayLayerProps {
  handout?: HandoutState | null;
}

const THEME_STYLES: Record<
  HandoutTheme,
  {
    bg: string;
    border: string;
    text: string;
    subText: string;
    shadow: string;
    innerBorder: string;
    sealBg: string;
    sealBorder: string;
  }
> = {
  parchment: {
    bg: 'linear-gradient(145deg, #f6eedb 0%, #ecdcb4 45%, #e2ce9e 100%)',
    border: 'border-amber-900/60',
    text: 'text-[#2a1708]',
    subText: 'text-[#6e4624]',
    shadow: 'shadow-[0_25px_60px_rgba(42,23,8,0.7)]',
    innerBorder: 'border-amber-800/30',
    sealBg: 'bg-amber-900',
    sealBorder: 'border-amber-700',
  },
  dark: {
    bg: 'linear-gradient(145deg, #1b1624 0%, #120e1a 50%, #0a0710 100%)',
    border: 'border-purple-800/60',
    text: 'text-[#f3ebfc]',
    subText: 'text-[#b9a2dc]',
    shadow: 'shadow-[0_25px_60px_rgba(20,8,38,0.85)]',
    innerBorder: 'border-purple-500/30',
    sealBg: 'bg-purple-950',
    sealBorder: 'border-purple-600',
  },
  scroll: {
    bg: 'linear-gradient(145deg, #eee3ca 0%, #dec89c 50%, #ceb480 100%)',
    border: 'border-[#7a481c]',
    text: 'text-[#2c1704]',
    subText: 'text-[#70421a]',
    shadow: 'shadow-[0_25px_60px_rgba(50,25,5,0.7)]',
    innerBorder: 'border-[#945826]/40',
    sealBg: 'bg-[#7a3b12]',
    sealBorder: 'border-[#a85a24]',
  },
  royal: {
    bg: 'linear-gradient(145deg, #fcfaf5 0%, #f4eee2 50%, #e8decb 100%)',
    border: 'border-amber-500/80',
    text: 'text-[#161220]',
    subText: 'text-[#8b1a1a]',
    shadow: 'shadow-[0_25px_60px_rgba(139,26,26,0.5)]',
    innerBorder: 'border-amber-600/50',
    sealBg: 'bg-red-950',
    sealBorder: 'border-amber-500',
  },
};

const TYPOGRAPHY_CLASSES: Record<HandoutTypography, string> = {
  medieval: 'font-serif tracking-wide',
  serif: 'font-serif leading-relaxed',
  classic: 'font-sans leading-normal',
  typewriter: 'font-mono leading-relaxed tracking-normal',
};

export const HandoutDisplayLayer: React.FC<HandoutDisplayLayerProps> = ({ handout }) => {
  if (!handout) return null;

  const { pages, activePageIndex, activePage } = normalizeHandoutState(handout);
  const maskId = `handout-fog-mask-${handout.id}-p${activePage.pageNumber}`;
  const totalPages = pages.length;

  const isDocument = activePage.type === 'document' || (Boolean(activePage.textContent) && !activePage.imageUrl);
  const theme = THEME_STYLES[activePage.theme || 'parchment'] || THEME_STYLES.parchment;
  const typographyClass = TYPOGRAPHY_CLASSES[activePage.typography || 'medieval'] || TYPOGRAPHY_CLASSES.medieval;

  // Icon for floating banner
  const bannerIcon = activePage.type === 'map' ? '🗺️' : isDocument ? '📜' : '🖼️';

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
        <div className={`relative inline-block max-w-[92vw] max-h-[86vh] rounded-xl overflow-hidden border ${theme.border} ${theme.shadow}`}>
          {isDocument ? (
            /* THEMATIC TEXT DOCUMENT / PARCHMENT VIEW */
            <div
              className={`p-6 sm:p-10 w-[88vw] max-w-2xl max-h-[82vh] overflow-y-auto flex flex-col justify-between ${theme.text} ${typographyClass}`}
              style={{ background: theme.bg }}
            >
              {/* Inner Decorative Border */}
              <div className={`border ${theme.innerBorder} p-6 sm:p-8 rounded-lg flex flex-col gap-4 relative min-h-[50vh]`}>
                {/* Header with Title & Subtitle */}
                <div className="text-center pb-3 border-b border-current/20">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
                    {activePage.title || handout.title}
                  </h2>
                  {activePage.subtitle && (
                    <p className={`text-sm sm:text-base italic font-serif opacity-85 ${theme.subText}`}>
                      {activePage.subtitle}
                    </p>
                  )}
                </div>

                {/* Body Content with Paragraphs */}
                <div className="flex-1 py-2 text-base sm:text-lg leading-relaxed whitespace-pre-line text-justify">
                  {activePage.textContent || 'Sin contenido de texto.'}
                </div>

                {/* Wax Seal / Author Signatory */}
                {activePage.authorSeal && (
                  <div className="mt-6 pt-4 border-t border-current/20 flex items-center justify-between">
                    <span className="text-xs sm:text-sm italic opacity-75 font-serif">
                      Sellado y certificado
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-full ${theme.sealBg} border-2 ${theme.sealBorder} text-amber-200 flex items-center justify-center text-lg shadow-lg`}
                        title={activePage.authorSeal}
                      >
                        {activePage.authorSeal.length <= 2 ? activePage.authorSeal : '⚜️'}
                      </div>
                      <span className="text-xs sm:text-sm font-bold tracking-wide">
                        {activePage.authorSeal}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* IMAGE / MAP VIEW */
            <img
              key={activePage.id || activePageIndex}
              src={activePage.imageUrl}
              alt={activePage.title || handout.title}
              className="block max-w-[92vw] max-h-[86vh] object-contain select-none animate-fade-in"
              loading="eager"
            />
          )}

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
        <span>{bannerIcon}</span>
        <span>{activePage.title || handout.title}</span>
        {totalPages > 1 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-medium border border-slate-700">
            Página {activePage.pageNumber} de {totalPages}
          </span>
        )}
        {activePage.isFullyRevealed && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-normal border border-amber-500/30">
            Revelado Completo
          </span>
        )}
      </div>
    </div>
  );
};
