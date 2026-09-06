import React from 'react';
import type { CharacterOnScreen } from '../../../types';
import type { QuickDropTarget } from './directorTypes';
import { Archive, EyeOff, RotateCcw, Trash2 } from 'lucide-react';

export interface DirectorDropZonesAndFeedbackProps {
  reserveDrag: {
    character: CharacterOnScreen;
    passedSlop: boolean;
    normalizedX: number;
    normalizedY: number;
  } | null;
  groundLineY?: number;
  hasPassedTouchSlop?: boolean;
  quickDropTarget?: QuickDropTarget | null;
  quickActionMessage: string | null;
  onUndo?: () => void;
  onClearQuickActionMessage: () => void;
}

export const DirectorDropZonesAndFeedback: React.FC<DirectorDropZonesAndFeedbackProps> = ({
  reserveDrag,
  groundLineY = 0,
  hasPassedTouchSlop,
  quickDropTarget,
  quickActionMessage,
  onUndo,
  onClearQuickActionMessage,
}) => {
  return (
    <>
      {reserveDrag?.passedSlop && (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2 rounded-2xl border-2 border-emerald-300 bg-emerald-500/20 p-1 shadow-2xl"
          style={{
            left: `${reserveDrag.normalizedX}%`,
            bottom: `${reserveDrag.normalizedY + groundLineY}%`,
            width: `${Math.round(80 * (reserveDrag.character.scale ?? 1))}px`,
            height: `${Math.round(120 * (reserveDrag.character.scale ?? 1))}px`,
          }}
        >
          <img
            src={reserveDrag.character.avatarUrl}
            alt=""
            className="h-full w-full object-contain opacity-80"
          />
        </div>
      )}

      {hasPassedTouchSlop && (
        <div
          className="director-ui-element pointer-events-none absolute z-[60] flex w-[min(104px,22%)] flex-col gap-1.5"
          style={{
            top: 'max(80px, calc(var(--sat, 0px) + 60px))',
            bottom: 'max(12px, calc(var(--sab, 0px) + 8px))',
            right: 'max(8px, calc(var(--sar, 0px) + 8px))',
          }}
        >
          {([
            ['reserve', 'Reserva', Archive, 'border-purple-400 bg-purple-950/90 text-purple-200'],
            ['hide', 'Ocultar', EyeOff, 'border-amber-400 bg-amber-950/90 text-amber-200'],
            ['remove', 'Quitar', Trash2, 'border-rose-400 bg-rose-950/90 text-rose-200'],
          ] as const).map(([target, label, Icon, colors]) => (
            <div
              key={target}
              className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 text-[11px] font-bold shadow-xl transition-transform ${colors} ${
                quickDropTarget === target ? 'scale-105 ring-2 ring-white' : 'opacity-80'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {quickActionMessage && (
        <div
          className="director-ui-element absolute left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-400/60 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-2xl pointer-events-auto"
          style={{ bottom: 'max(64px, calc(var(--sab, 0px) + 58px))' }}
        >
          <span>{quickActionMessage}</span>
          {onUndo && (
            <button
              type="button"
              className="flex items-center gap-1 font-bold text-amber-300 hover:text-amber-200"
              onClick={() => {
                onUndo();
                onClearQuickActionMessage();
              }}
            >
              <RotateCcw size={13} />
              <span>Deshacer</span>
            </button>
          )}
        </div>
      )}
    </>
  );
};
