import React from 'react';
import type { CharacterOnScreen } from '../../../../types';
import { Play, X, Check } from 'lucide-react';

export interface PrepareEntryModalProps {
  char: CharacterOnScreen | null;
  preparingTransition: 'fade' | 'slide-bottom' | 'slide-left' | 'slide-right';
  setPreparingTransition: (t: 'fade' | 'slide-bottom' | 'slide-left' | 'slide-right') => void;
  onClose: () => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
}

export const PrepareEntryModal: React.FC<PrepareEntryModalProps> = ({
  char,
  preparingTransition,
  setPreparingTransition,
  onClose,
  onUpdateCharacter,
}) => {
  if (!char) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border-2 border-purple-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
            <Play size={14} />
            <span>Preparar entrada: {char.name}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] text-slate-300">
          Configurá la animación de entrada. El recurso público ya está listo en la Mesa. Al
          pulsar entrar se ejecutará con animación suave.
        </p>

        <div className="flex flex-col gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Tipo de animación:</span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'fade', label: 'Fundido (Fade)' },
              { id: 'slide-bottom', label: 'Desde abajo' },
              { id: 'slide-left', label: 'Desde izquierda' },
              { id: 'slide-right', label: 'Desde derecha' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`px-2 py-1.5 rounded-lg border text-xs text-left ${
                  preparingTransition === t.id
                    ? 'bg-purple-600 text-white border-purple-400 font-semibold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
                onClick={() => setPreparingTransition(t.id as any)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry status badge */}
        <div className="p-2 rounded-xl bg-slate-950/80 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300">
          <Check size={14} className="text-emerald-400 shrink-0" />
          <span>Recurso público verificado y listo en Mesa</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-1.5 shadow-lg shadow-purple-900/40"
            onClick={() => {
              onUpdateCharacter(
                char.id,
                {
                  presence: 'on_stage',
                },
                `Entrada a escena con ${preparingTransition} para ${char.name}`
              );
              onClose();
            }}
          >
            <Play size={13} fill="currentColor" />
            <span>Hacer entrar a escena</span>
          </button>
        </div>
      </div>
    </div>
  );
};
