import React from 'react';
import {
  MessageSquare,
  Plus,
  ChevronUp,
  ChevronDown,
  Copy,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import type { DialogueLine } from '../../../types';

interface ConversationLineListProps {
  title: string;
  onChangeTitle: (title: string) => void;
  description: string;
  onChangeDescription: (desc: string) => void;
  lines: DialogueLine[];
  selectedLineIndex: number;
  onSelectLine: (index: number) => void;
  onAddLine: () => void;
  onMoveLine: (index: number, direction: 'up' | 'down') => void;
  onDuplicateLine: (index: number) => void;
  onDeleteLine: (index: number) => void;
}

export const ConversationLineList: React.FC<ConversationLineListProps> = ({
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  lines,
  selectedLineIndex,
  onSelectLine,
  onAddLine,
  onMoveLine,
  onDuplicateLine,
  onDeleteLine,
}) => {
  return (
    <div className="w-full md:w-5/12 border-r border-slate-800 flex flex-col bg-slate-950/40 shrink-0">
      {/* CONVERSATION TITLE & DESCRIPTION */}
      <div className="p-3 border-b border-slate-800 flex flex-col gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Título de la conversación..."
          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="Descripción o contexto para el DM (opcional)..."
          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-slate-600"
        />
      </div>

      {/* LINES LIST HEADER */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Intervenciones ({lines.length})
        </span>
        <button
          onClick={onAddLine}
          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-semibold flex items-center gap-1"
        >
          <Plus size={12} />
          <span>Añadir</span>
        </button>
      </div>

      {/* LINES SCROLLABLE LIST */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {lines.map((line, idx) => {
          const isSelected = idx === selectedLineIndex;
          const isLong = line.text.length > 180;
          return (
            <div
              key={line.id}
              onClick={() => onSelectLine(idx)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-amber-500/15 border-amber-500/60 shadow-md'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* AVATAR / ICON */}
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-black flex items-center justify-center">
                {line.avatarUrl ? (
                  <img src={line.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <MessageSquare size={14} className="text-sky-400" />
                )}
              </div>

              {/* LINE INFO */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    {line.speakerName || 'Narrador'}
                  </span>
                  {line.style && line.style !== 'speech' && (
                    <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">
                      {line.style}
                    </span>
                  )}
                  {isLong && (
                    <span title="Texto extenso (>180 car.)">
                      <AlertTriangle size={11} className="text-amber-400" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-300 truncate italic">
                  {line.text ? `"${line.text}"` : <span className="text-slate-500">Vacío...</span>}
                </p>
              </div>

              {/* REORDER & ACTION BUTTONS */}
              <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onMoveLine(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-20 text-slate-400"
                  title="Subir"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={() => onMoveLine(idx, 'down')}
                  disabled={idx === lines.length - 1}
                  className="p-1 rounded hover:bg-slate-800 disabled:opacity-20 text-slate-400"
                  title="Bajar"
                >
                  <ChevronDown size={13} />
                </button>
                <button
                  onClick={() => onDuplicateLine(idx)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Duplicar frase"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => onDeleteLine(idx)}
                  disabled={lines.length <= 1}
                  className="p-1 rounded hover:bg-rose-900/50 disabled:opacity-20 text-slate-400 hover:text-rose-300"
                  title="Eliminar frase"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
