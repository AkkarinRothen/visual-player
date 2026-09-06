import React from 'react';
import { Plus, Trash2, Tv } from 'lucide-react';
import type { HandoutPage } from '../../../types';

interface HandoutMultipageBarProps {
  draftPages: HandoutPage[];
  safeEditorIdx: number;
  mesaPageIndex: number;
  isCurrentlyProjected: boolean;
  isThisPageOnMesa: boolean;
  onSelectPage: (index: number) => void;
  onAddPage: () => void;
  onRemovePage: (index: number) => void;
  onPublishPageToMesa: () => void;
}

export const HandoutMultipageBar: React.FC<HandoutMultipageBarProps> = ({
  draftPages,
  safeEditorIdx,
  mesaPageIndex,
  isCurrentlyProjected,
  isThisPageOnMesa,
  onSelectPage,
  onAddPage,
  onRemovePage,
  onPublishPageToMesa,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-1.5 bg-slate-950 border-b border-slate-800 text-xs overflow-x-auto">
      <div className="flex items-center gap-1.5">
        {draftPages.map((page, idx) => {
          const isSelected = idx === safeEditorIdx;
          const isOnMesa = isCurrentlyProjected && idx === mesaPageIndex;
          return (
            <div key={page.id || idx} className="flex items-center">
              <button
                type="button"
                onClick={() => onSelectPage(idx)}
                className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-amber-300 border border-amber-500/50 shadow'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                }`}
              >
                <span>Pág. {idx + 1}</span>
                {isOnMesa && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    title="Actualmente proyectada en la Mesa"
                  />
                )}
              </button>
              {draftPages.length > 1 && isSelected && (
                <button
                  type="button"
                  onClick={() => onRemovePage(idx)}
                  className="ml-0.5 p-1 text-red-400 hover:text-red-300"
                  title="Eliminar esta página"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onAddPage}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 text-xs"
          title="Añadir una nueva página al documento"
        >
          <Plus size={13} />
          <span>Página</span>
        </button>
      </div>

      {/* Quick Publish Page to Mesa */}
      <div className="flex items-center gap-2">
        {!isThisPageOnMesa && isCurrentlyProjected && (
          <button
            type="button"
            onClick={onPublishPageToMesa}
            className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/60 font-bold flex items-center gap-1 text-xs transition-all shadow"
            title="Mostrar esta página a los jugadores en la Mesa"
          >
            <Tv size={12} />
            <span>Mostrar Pág. {safeEditorIdx + 1} en Mesa</span>
          </button>
        )}
      </div>
    </div>
  );
};
