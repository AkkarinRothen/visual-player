import React from 'react';
import type { CharacterOnScreen } from '../../../types';
import { EyeOff, DoorOpen, Lock, Plus, Sparkles } from 'lucide-react';

export interface DirectorChipsStripProps {
  characters: CharacterOnScreen[];
  selectedIds: Set<string>;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onTogglePresence: (character: CharacterOnScreen) => void;
  onOpenCharacterLibrary?: () => void;
  onBeginReserveDrag?: (character: CharacterOnScreen, event: React.PointerEvent) => void;
}

export const DirectorChipsStrip: React.FC<DirectorChipsStripProps> = ({
  characters,
  selectedIds,
  onSelect,
  onTogglePresence,
  onOpenCharacterLibrary,
  onBeginReserveDrag,
}) => {
  return (
    <div className="director-ui-element absolute top-11 left-2 right-2 flex items-center gap-1 overflow-x-auto py-1 px-1 pointer-events-auto no-scrollbar z-30">
      {onOpenCharacterLibrary && (
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] whitespace-nowrap bg-amber-500 text-slate-950 border border-amber-300 font-bold shadow-sm"
          onClick={onOpenCharacterLibrary}
          title="Añadir un personaje de la biblioteca al escenario"
        >
          <Plus size={11} />
          <span>Añadir</span>
        </button>
      )}
      {characters.map((c) => {
        const isSelected = selectedIds.has(c.id);
        const isHidden = c.isHidden === true;
        const isReserve = c.presence === 'in_reserve';
        const isLocked = !!c.isLocked;

        return (
          <div key={c.id} className="flex items-stretch shrink-0">
            <button
            type="button"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-l-lg text-[11px] whitespace-nowrap transition-all border border-r-0 shadow-sm ${
              isSelected
                ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-semibold ring-1 ring-amber-400'
                : isHidden || isReserve
                ? 'bg-slate-900/80 text-slate-400 border-slate-700/60 opacity-70 hover:opacity-100'
                : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-slate-500'
            }`}
            onClick={(e) => onSelect(c.id, e)}
            onPointerDown={(event) => {
              if (isReserve) onBeginReserveDrag?.(c, event);
            }}
          >
            <img
              src={c.avatarUrl}
              alt={c.name}
              className="w-4 h-4 rounded-full object-cover border border-slate-600"
            />
            <span className="truncate max-w-[90px]">
              {c.privateLabel ? `[${c.privateLabel}]` : c.name}
            </span>
            {isHidden && <span title="Oculto en escena"><EyeOff size={10} className="text-amber-400" /></span>}
            {isReserve && <span title="En reserva"><DoorOpen size={10} className="text-purple-400" /></span>}
            {isLocked && <span title="Bloqueado"><Lock size={10} className="text-rose-400" /></span>}
            {c.isSpeaking && <span title="Hablando"><Sparkles size={10} className="text-yellow-300 animate-pulse" /></span>}
            </button>
            <button
              type="button"
              className={`px-1.5 rounded-r-lg border transition-colors ${
                isReserve
                  ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/60 hover:bg-emerald-800'
                  : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:text-purple-300 hover:bg-purple-950'
              }`}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePresence(c);
              }}
              aria-label={isReserve ? `Hacer entrar a ${c.name}` : `Retirar a ${c.name} a reserva`}
              title={isReserve ? 'Hacer entrar ahora' : 'Retirar a reserva ahora'}
            >
              <DoorOpen size={11} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
