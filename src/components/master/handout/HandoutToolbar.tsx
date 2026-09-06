import React from 'react';
import {
  Crop,
  Paintbrush,
  Hand,
  Undo2,
  EyeOff,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import type { HandoutTouchMode } from './handoutTypes';

interface HandoutToolbarProps {
  touchMode: HandoutTouchMode;
  setTouchMode: (mode: HandoutTouchMode) => void;
  brushRadius: number;
  setBrushRadius: (r: number) => void;
  totalRevealedShapes: number;
  onUndo: () => void;
  onResetFog: () => void;
  onRevealAll: () => void;
  zoom: number;
  onZoom: (delta: number) => void;
  onResetView: () => void;
}

export const HandoutToolbar: React.FC<HandoutToolbarProps> = ({
  touchMode,
  setTouchMode,
  brushRadius,
  setBrushRadius,
  totalRevealedShapes,
  onUndo,
  onResetFog,
  onRevealAll,
  zoom,
  onZoom,
  onResetView,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs">
      {/* Mode Selector */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => setTouchMode('reveal-rect')}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold transition-all ${
            touchMode === 'reveal-rect'
              ? 'bg-amber-600 text-amber-50 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Arrastra un recuadro para recortar la niebla"
        >
          <Crop size={13} />
          <span>Recuadro</span>
        </button>

        <button
          type="button"
          onClick={() => setTouchMode('reveal-brush')}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold transition-all ${
            touchMode === 'reveal-brush'
              ? 'bg-amber-600 text-amber-50 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Pincel circular para descubrir pistas gradualmente"
        >
          <Paintbrush size={13} />
          <span>Pincel</span>
        </button>

        <button
          type="button"
          onClick={() => setTouchMode('pan')}
          className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-bold transition-all ${
            touchMode === 'pan'
              ? 'bg-blue-600 text-blue-50 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Mover documento libremente sin pintar"
        >
          <Hand size={13} />
          <span>Mover</span>
        </button>
      </div>

      {/* Brush Radius Selector (Only visible in brush mode) */}
      {touchMode === 'reveal-brush' && (
        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400">Radio:</span>
          <button
            type="button"
            onClick={() => setBrushRadius(4)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              brushRadius === 4 ? 'bg-amber-600 text-white' : 'text-slate-400'
            }`}
          >
            Fino
          </button>
          <button
            type="button"
            onClick={() => setBrushRadius(8)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              brushRadius === 8 ? 'bg-amber-600 text-white' : 'text-slate-400'
            }`}
          >
            Medio
          </button>
          <button
            type="button"
            onClick={() => setBrushRadius(14)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              brushRadius === 14 ? 'bg-amber-600 text-white' : 'text-slate-400'
            }`}
          >
            Grande
          </button>
        </div>
      )}

      {/* Reveal & Mask Action Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={totalRevealedShapes === 0}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 flex items-center gap-1 transition-all"
          title="Deshacer último trazo o rectángulo"
        >
          <Undo2 size={13} />
          <span>Deshacer ({totalRevealedShapes})</span>
        </button>

        <button
          type="button"
          onClick={onResetFog}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-all"
          title="Cubrir toda la página con niebla"
        >
          <EyeOff size={13} />
          <span>Ocultar Todo</span>
        </button>

        <button
          type="button"
          onClick={onRevealAll}
          className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/40 flex items-center gap-1 transition-all"
          title="Revelar toda la página a los jugadores"
        >
          <Eye size={13} />
          <span>Revelar Todo</span>
        </button>
      </div>

      {/* Zoom and Navigation */}
      <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => onZoom(-0.25)}
          className="p-1 rounded text-slate-400 hover:text-slate-200"
          title="Alejar"
        >
          <ZoomOut size={13} />
        </button>
        <span className="text-[11px] font-mono font-bold text-amber-300 w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => onZoom(0.25)}
          className="p-1 rounded text-slate-400 hover:text-slate-200"
          title="Acercar"
        >
          <ZoomIn size={13} />
        </button>
        <button
          type="button"
          onClick={onResetView}
          className="p-1 rounded text-slate-400 hover:text-slate-200 ml-1"
          title="Restablecer zoom y posición"
        >
          <Maximize2 size={13} />
        </button>
      </div>
    </div>
  );
};
