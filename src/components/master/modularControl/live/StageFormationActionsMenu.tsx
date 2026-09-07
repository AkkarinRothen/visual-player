import React, { useState, useRef, useEffect } from 'react';
import {
  Swords,
  Grid,
  AlignHorizontalJustifyCenter,
  Maximize2,
  Sparkles,
  X,
} from 'lucide-react';

export interface StageFormationActionsMenuProps {
  onApplyBattleRanks: () => void;
  onSnapAllToGrid: () => void;
  onDistributeHorizontally: () => void;
  onFitScaleToGrid: () => void;
  disabled?: boolean;
}

export const StageFormationActionsMenu: React.FC<StageFormationActionsMenuProps> = ({
  onApplyBattleRanks,
  onSnapAllToGrid,
  onDistributeHorizontally,
  onFitScaleToGrid,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('touchstart', handleDown);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('touchstart', handleDown);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        className={`modular-stage-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled}
        title="Formaciones y alineación rápida de personajes"
        aria-label="Formaciones de combate"
        id="stage-formation-actions-btn"
        style={{
          backgroundColor: isOpen ? 'rgba(245, 158, 11, 0.25)' : undefined,
          borderColor: isOpen ? '#f59e0b' : undefined,
          color: isOpen ? '#f59e0b' : undefined,
        }}
      >
        <Sparkles size={18} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 p-2 rounded-xl bg-slate-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-md z-50 flex flex-col gap-1 text-slate-100 select-none animate-in fade-in zoom-in-95 duration-150"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-700/60">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" />
              Formaciones Rápidas
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Cerrar menú"
            >
              <X size={14} />
            </button>
          </div>

          <button
            type="button"
            className="flex items-center gap-2.5 px-3 py-2 text-left text-xs rounded-lg hover:bg-amber-500/20 active:bg-amber-500/30 transition-all text-slate-200 hover:text-amber-200"
            onClick={() => handleAction(onApplyBattleRanks)}
          >
            <div className="w-6 h-6 rounded-md bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
              <Swords size={13} />
            </div>
            <div>
              <div className="font-semibold text-slate-100">Fila de Batalla (JRPG)</div>
              <div className="text-[10px] text-slate-400">Aliados izq vs Enemigos der</div>
            </div>
          </button>

          <button
            type="button"
            className="flex items-center gap-2.5 px-3 py-2 text-left text-xs rounded-lg hover:bg-amber-500/20 active:bg-amber-500/30 transition-all text-slate-200 hover:text-amber-200"
            onClick={() => handleAction(onSnapAllToGrid)}
          >
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
              <Grid size={13} />
            </div>
            <div>
              <div className="font-semibold text-slate-100">Alinear a Cuadrícula</div>
              <div className="text-[10px] text-slate-400">Centra en las casillas más próximas</div>
            </div>
          </button>

          <button
            type="button"
            className="flex items-center gap-2.5 px-3 py-2 text-left text-xs rounded-lg hover:bg-amber-500/20 active:bg-amber-500/30 transition-all text-slate-200 hover:text-amber-200"
            onClick={() => handleAction(onDistributeHorizontally)}
          >
            <div className="w-6 h-6 rounded-md bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
              <AlignHorizontalJustifyCenter size={13} />
            </div>
            <div>
              <div className="font-semibold text-slate-100">Distribuir en Línea</div>
              <div className="text-[10px] text-slate-400">Alinea horizontalmente con espacio parejo</div>
            </div>
          </button>

          <button
            type="button"
            className="flex items-center gap-2.5 px-3 py-2 text-left text-xs rounded-lg hover:bg-amber-500/20 active:bg-amber-500/30 transition-all text-slate-200 hover:text-amber-200"
            onClick={() => handleAction(onFitScaleToGrid)}
          >
            <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Maximize2 size={13} />
            </div>
            <div>
              <div className="font-semibold text-slate-100">Ajustar Tamaño a Casilla</div>
              <div className="text-[10px] text-slate-400">Escala óptima para 1 celda de mapa</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
