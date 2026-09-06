import React from 'react';
import { Trash2, Check, Send } from 'lucide-react';

interface HandoutFooterProps {
  pageTitle: string;
  imageUrl: string;
  isCurrentlyProjected: boolean;
  isThisPageOnMesa: boolean;
  safeEditorIdx: number;
  onChangeTitle: (title: string) => void;
  onChangeImageUrl: (url: string) => void;
  onDismissHandout: () => Promise<void>;
  onPublishPageToMesa: () => void;
}

export const HandoutFooter: React.FC<HandoutFooterProps> = ({
  pageTitle,
  imageUrl,
  isCurrentlyProjected,
  isThisPageOnMesa,
  safeEditorIdx,
  onChangeTitle,
  onChangeImageUrl,
  onDismissHandout,
  onPublishPageToMesa,
}) => {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/90">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={pageTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs w-48 sm:w-60"
          placeholder="Título de la Página"
        />
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => onChangeImageUrl(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-400 rounded px-2 py-1 text-[11px] w-40 sm:w-60 hidden sm:block"
          placeholder="URL de imagen"
        />
      </div>

      <div className="flex items-center gap-2">
        {isCurrentlyProjected && (
          <button
            type="button"
            onClick={onDismissHandout}
            className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Trash2 size={13} />
            <span>Retirar de la Mesa</span>
          </button>
        )}

        <button
          type="button"
          onClick={onPublishPageToMesa}
          className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-50 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-900/40 transition-all active:scale-95"
        >
          {isThisPageOnMesa ? (
            <>
              <Check size={14} />
              <span>Actualizar en Mesa</span>
            </>
          ) : (
            <>
              <Send size={14} />
              <span>Proyectar Pág. {safeEditorIdx + 1} a la Mesa</span>
            </>
          )}
        </button>
      </div>
    </footer>
  );
};
