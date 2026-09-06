import React from 'react';
import { FileText, X } from 'lucide-react';

interface HandoutHeaderProps {
  isCurrentlyProjected: boolean;
  mesaPageIndex: number;
  onClose: () => void;
}

export const HandoutHeader: React.FC<HandoutHeaderProps> = ({
  isCurrentlyProjected,
  mesaPageIndex,
  onClose,
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
      <div className="flex items-center gap-2">
        <FileText size={18} className="text-amber-400" />
        <span className="font-bold text-slate-100 text-sm sm:text-base">
          Visor de Handouts y Cartas
        </span>
        {isCurrentlyProjected ? (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Mesa: Pág. {mesaPageIndex + 1}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
            Borrador DM
          </span>
        )}
      </div>

      <button
        onClick={onClose}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        title="Cerrar visor"
      >
        <X size={18} />
      </button>
    </header>
  );
};
