import React from 'react';
import { Sliders, Radio, X } from 'lucide-react';

export interface CompositorHeaderProps {
  operationMode: 'live' | 'staging';
  aspectGuide: '16:9' | '16:10' | '4:3';
  onSelectAspectGuide: (aspect: '16:9' | '16:10' | '4:3') => void;
  onClose: () => void;
}

export const CompositorHeader: React.FC<CompositorHeaderProps> = ({
  operationMode,
  aspectGuide,
  onSelectAspectGuide,
  onClose,
}) => {
  return (
    <header className="compositor-header px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
      <div className="compositor-heading flex items-center gap-2">
        <Sliders size={20} className="text-amber-400" />
        <h2 className="font-bold text-lg text-white">
          <span className="compositor-title-full">Control de mesa</span>
          <span className="compositor-title-mobile">Control</span>
        </h2>
        <span
          className={`compositor-mode-badge text-xs px-2 py-0.5 rounded-full font-semibold ${
            operationMode === 'live'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}
        >
          {operationMode === 'live' ? (
            <>
              <Radio size={12} aria-hidden="true" /> En vivo
            </>
          ) : (
            'Preparación'
          )}
        </span>
      </div>

      <div className="compositor-header-actions flex items-center gap-3">
        {/* ASPECT GUIDE TOGGLE */}
        <div className="aspect-selector flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
          <button
            className={`px-2 py-1 rounded ${aspectGuide === '16:9' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
            onClick={() => onSelectAspectGuide('16:9')}
          >
            16:9
          </button>
          <button
            className={`px-2 py-1 rounded ${aspectGuide === '16:10' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
            onClick={() => onSelectAspectGuide('16:10')}
          >
            16:10
          </button>
          <button
            className={`px-2 py-1 rounded ${aspectGuide === '4:3' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
            onClick={() => onSelectAspectGuide('4:3')}
          >
            4:3
          </button>
        </div>

        <button
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          onClick={onClose}
          aria-label="Cerrar compositor"
        >
          <X size={20} />
        </button>
      </div>
    </header>
  );
};
