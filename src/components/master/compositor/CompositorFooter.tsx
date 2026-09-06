import React from 'react';
import { RotateCcw, Radio, Check } from 'lucide-react';

export interface CompositorFooterProps {
  historyLength: number;
  operationMode: 'live' | 'staging';
  isSaving: boolean;
  onUndo: () => void;
  onCancel: () => void;
  onSave: (directToLive: boolean) => void;
}

export const CompositorFooter: React.FC<CompositorFooterProps> = ({
  historyLength,
  operationMode,
  isSaving,
  onUndo,
  onCancel,
  onSave,
}) => {
  return (
    <footer className="compositor-footer px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/80">
      <div className="flex items-center gap-2">
        <button
          className="compositor-undo-button px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          onClick={onUndo}
          disabled={historyLength === 0}
        >
          <RotateCcw size={14} />
          <span>Deshacer ({historyLength})</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {operationMode === 'live' && (
          <span className="compositor-live-hint">
            <Radio size={12} aria-hidden="true" /> Los cambios ya están en la mesa
          </span>
        )}
        {operationMode === 'staging' && (
          <button
            className="compositor-cancel-button px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
        <button
          className="compositor-publish-button px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg disabled:opacity-50"
          onClick={() => onSave(operationMode === 'live')}
          disabled={isSaving}
        >
          <Check size={16} />
          <span>{operationMode === 'live' ? 'Listo' : 'Guardar en Borrador'}</span>
        </button>
      </div>
    </footer>
  );
};
