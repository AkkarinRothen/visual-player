import React from 'react';
import {
  MessageSquare,
  RotateCcw,
  RotateCw,
  Eye,
  Check,
  X,
} from 'lucide-react';

interface ConversationHeaderProps {
  isEditing: boolean;
  historyLength: number;
  futureLength: number;
  onUndo: () => void;
  onRedo: () => void;
  isRehearsalMode: boolean;
  onToggleRehearsal: () => void;
  onSave: () => void;
  onClose: () => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  isEditing,
  historyLength,
  futureLength,
  onUndo,
  onRedo,
  isRehearsalMode,
  onToggleRehearsal,
  onSave,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
      <div className="flex items-center gap-2.5">
        <MessageSquare size={18} className="text-amber-400" />
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {isEditing ? 'Editar Conversación' : 'Nueva Conversación'}
          </h2>
          <span className="text-[11px] text-slate-400">
            Guión de intervenciones y diálogos cinematográficos
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={historyLength === 0}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
          title="Deshacer"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={onRedo}
          disabled={futureLength === 0}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
          title="Rehacer"
        >
          <RotateCw size={14} />
        </button>

        <button
          onClick={onToggleRehearsal}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            isRehearsalMode
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30'
          }`}
        >
          <Eye size={14} />
          <span>{isRehearsalMode ? 'Salir del Ensayo' : 'Modo Ensayo'}</span>
        </button>

        <button
          onClick={onSave}
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
        >
          <Check size={14} />
          <span>Guardar</span>
        </button>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Cerrar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
