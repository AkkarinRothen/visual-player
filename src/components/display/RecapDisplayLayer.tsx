import React from 'react';
import type { CampaignRecap } from '../../types';

interface RecapDisplayLayerProps {
  recap?: CampaignRecap | null;
}

export const RecapDisplayLayer: React.FC<RecapDisplayLayerProps> = ({ recap }) => {
  if (!recap || !recap.slides || recap.slides.length === 0) return null;

  const currentSlide = recap.slides[recap.currentSlideIndex] || recap.slides[0];
  const totalSlides = recap.slides.length;
  const currentIdx = Math.min(totalSlides - 1, Math.max(0, recap.currentSlideIndex));

  return (
    <div
      className="recap-display-layer fixed inset-0 z-40 flex flex-col justify-between items-center bg-black select-none overflow-hidden animate-fade-in"
      style={{ pointerEvents: 'none' }}
    >
      {/* Background Illustrated Slide */}
      <div className="absolute inset-0 overflow-hidden">
        {currentSlide.imageUrl && (
          <img
            key={currentSlide.id || currentIdx}
            src={currentSlide.imageUrl}
            alt={currentSlide.title}
            className="w-full h-full object-cover object-center opacity-65 filter brightness-90 contrast-105 animate-fade-in"
            style={{
              transition: 'opacity 0.6s ease-in-out, transform 8s ease-out',
              transform: 'scale(1.04)',
            }}
          />
        )}

        {/* Heavy Cinematic Vignette Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(5,7,15,0.7) 60%, rgba(2,3,7,0.96) 100%)',
          }}
        />
      </div>

      {/* Top Header Prologue Banner */}
      <header className="relative z-10 pt-8 sm:pt-12 px-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-semibold tracking-widest uppercase backdrop-blur-md shadow-xl mb-3">
          <span>📜</span>
          <span>Anteriormente en la campaña...</span>
        </div>
        <h2 className="text-xl sm:text-3xl font-serif font-bold text-amber-100 tracking-wide drop-shadow-md">
          {currentSlide.title}
        </h2>
        {currentSlide.caption && (
          <p className="text-xs sm:text-sm text-slate-400 font-sans tracking-wide mt-1">
            {currentSlide.caption}
          </p>
        )}
      </header>

      {/* Narrative Subtitle Card */}
      <main className="relative z-10 max-w-4xl w-[92vw] sm:w-[85vw] p-6 sm:p-10 rounded-2xl bg-slate-950/85 border border-amber-500/35 backdrop-blur-xl shadow-2xl mb-8 sm:mb-12">
        <p
          key={currentSlide.id || currentIdx}
          className="text-base sm:text-xl md:text-2xl text-slate-100 font-serif leading-relaxed italic text-center tracking-wide animate-fade-in"
        >
          “{currentSlide.text}”
        </p>
      </main>

      {/* Bottom Slide Progress Indicator */}
      <footer className="relative z-10 pb-6 sm:pb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-1.5">
          {recap.slides.map((slide, i) => (
            <div
              key={slide.id || i}
              className={`transition-all duration-300 rounded-full ${
                i === currentIdx
                  ? 'w-7 sm:w-10 h-1.5 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                  : 'w-2 h-1.5 bg-slate-700/80'
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-mono font-medium text-amber-200/70 tracking-wider">
          {currentIdx + 1} de {totalSlides}
        </span>
      </footer>
    </div>
  );
};
