import React from 'react';
import { Play, Pause, SkipForward, Square, Sparkles } from 'lucide-react';
import type { RunningMacroState } from '../../../hooks/useMacroSequencer';

interface CinematicSequenceHUDProps {
  runningMacro: RunningMacroState;
  onAdvanceNextStep: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export const CinematicSequenceHUD: React.FC<CinematicSequenceHUDProps> = ({
  runningMacro,
  onAdvanceNextStep,
  onPause,
  onResume,
  onCancel,
}) => {
  const { macro, currentStepIndex, totalSteps, isPaused, isWaitingForManualAdvance, remainingDelayMs } = runningMacro;
  const currentStep = macro.steps[currentStepIndex];
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  return (
    <aside
      aria-label="Panel flotante de secuencia cinemática activa"
      className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border-2 border-amber-500/60 backdrop-blur-xl shadow-2xl p-4 text-slate-100 flex flex-col gap-3 animate-fade-in"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles size={16} className="animate-spin-slow" />
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Secuencia Cinemática Activa
            </span>
            <span className="text-sm font-extrabold text-slate-100 line-clamp-1">
              {macro.name}
            </span>
          </div>
        </div>

        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          {currentStepIndex + 1}/{totalSteps}
        </span>
      </div>

      {/* PROGRESS BAR */}
      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-amber-500 to-orange-400 h-full transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* CURRENT STEP INFO */}
      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex flex-col flex-1 pr-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Acción Actual:</span>
          <span className="font-semibold text-slate-200 line-clamp-1">
            {currentStep?.actionLabel || `Paso ${currentStepIndex + 1}`}
          </span>
        </div>

        {isWaitingForManualAdvance ? (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1">
            <span>👆 Esperando toque</span>
          </span>
        ) : isPaused ? (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
            ⏸ Pausado
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full text-[10px] font-mono text-slate-300 bg-slate-800 border border-slate-700">
            ⏱️ {Math.max(1, Math.round((remainingDelayMs || 0) / 1000))}s
          </span>
        )}
      </div>

      {/* CONTROLS */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
        {/* Advance Next Button */}
        <button
          type="button"
          onClick={onAdvanceNextStep}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg ${
            isWaitingForManualAdvance
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
          }`}
          title="Avanzar al siguiente paso de la secuencia"
        >
          <SkipForward size={14} />
          <span>{currentStepIndex + 1 < totalSteps ? 'Siguiente Paso' : 'Finalizar'}</span>
        </button>

        {/* Pause / Resume Button */}
        {!isWaitingForManualAdvance && (
          <button
            type="button"
            onClick={isPaused ? onResume : onPause}
            className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
            title={isPaused ? 'Reanudar secuencia' : 'Pausar secuencia'}
          >
            {isPaused ? <Play size={13} className="text-emerald-400" /> : <Pause size={13} className="text-yellow-400" />}
            <span>{isPaused ? 'Reanudar' : 'Pausa'}</span>
          </button>
        )}

        {/* Cancel / Rollback Button */}
        <button
          type="button"
          onClick={onCancel}
          className="py-1.5 px-3 rounded-xl bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-bold flex items-center gap-1 transition-colors"
          title="Detener secuencia y restaurar escena previa"
        >
          <Square size={12} />
          <span>Cancelar</span>
        </button>
      </div>
    </aside>
  );
};
