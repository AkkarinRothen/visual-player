import React from 'react';
import { FileText, X, BookOpen, Edit3 } from 'lucide-react';
import type { HandoutViewTab } from './handoutTypes';

interface HandoutHeaderProps {
  isCurrentlyProjected: boolean;
  mesaPageIndex: number;
  activeTab?: HandoutViewTab;
  onTabChange?: (tab: HandoutViewTab) => void;
  onClose: () => void;
}

export const HandoutHeader: React.FC<HandoutHeaderProps> = ({
  isCurrentlyProjected,
  mesaPageIndex,
  activeTab = 'editor',
  onTabChange,
  onClose,
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 gap-2">
      <div className="flex items-center gap-2.5">
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

      {/* VIEW MODE TABS */}
      {onTabChange && (
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onTabChange('library')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              activeTab === 'library'
                ? 'bg-amber-600 text-amber-50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen size={13} />
            <span>Biblioteca</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('editor')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              activeTab === 'editor'
                ? 'bg-amber-600 text-amber-50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 size={13} />
            <span>Editor</span>
          </button>
        </div>
      )}

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
