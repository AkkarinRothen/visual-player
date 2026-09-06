import React from 'react';
import { Play } from 'lucide-react';
import type { CinematicDialogue } from '../../../types';
import { CinematicDialogueLayer } from '../../display/CinematicDialogueLayer';

interface ConversationRehearsalViewProps {
  rehearsalIndex: number;
  totalLines: number;
  rehearsalDialogue: CinematicDialogue | null;
  onPrev: () => void;
  onReset: () => void;
  onNext: () => void;
}

export const ConversationRehearsalView: React.FC<ConversationRehearsalViewProps> = ({
  rehearsalIndex,
  totalLines,
  rehearsalDialogue,
  onPrev,
  onReset,
  onNext,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-between gap-4 p-4 rounded-xl border border-purple-500/30 bg-slate-950/80">
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
          <Play size={14} />
          <span>Modo Ensayo Local (Sin conexión a la Mesa)</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Frase {rehearsalIndex + 1} de {totalLines}
        </span>
      </div>

      {/* SIMULATED PLAYER SCREEN WITH CINEMATIC DIALOGUE LAYER */}
      <div className="w-full h-64 sm:h-80 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner flex flex-col justify-end p-4">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute top-3 left-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Previsualización del Jugador
        </div>
        <CinematicDialogueLayer dialogue={rehearsalDialogue} />
      </div>

      {/* REHEARSAL STEP NAVIGATION */}
      <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800">
        <button
          onClick={onPrev}
          disabled={rehearsalIndex === 0}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold"
        >
          Anterior
        </button>

        <button
          onClick={onReset}
          className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white"
        >
          Reiniciar
        </button>

        <button
          onClick={onNext}
          disabled={rehearsalIndex >= totalLines - 1}
          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white text-xs font-semibold"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};
