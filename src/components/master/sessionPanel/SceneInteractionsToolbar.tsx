import React from 'react';
import type { SceneInteraction, SceneInteractionTransition } from '../../../types';
import { Sliders } from 'lucide-react';

export interface SceneInteractionsToolbarProps {
  interactions?: SceneInteraction[];
  executingInteractionId?: string | null;
  onTriggerInteraction?: (interaction: SceneInteraction, transition: SceneInteractionTransition) => void;
}

export const SceneInteractionsToolbar: React.FC<SceneInteractionsToolbarProps> = ({
  interactions,
  executingInteractionId,
  onTriggerInteraction,
}) => {
  if (!interactions || interactions.length === 0 || !onTriggerInteraction) {
    return null;
  }

  return (
    <div className="scene-interactions-row flex flex-col gap-1.5 p-2 bg-slate-950/70 border border-emerald-900/40 rounded-lg text-xs mt-2">
      <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
        <Sliders size={12} className="text-emerald-400" />
        <span>Interacciones de Escenario:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {interactions.map((interaction) => {
          const availableTransitions = interaction.transitions.filter(
            (t) => t.fromState === interaction.currentState
          );
          if (availableTransitions.length === 0) return null;

          return availableTransitions.map((transition) => {
            const isExecuting = executingInteractionId === transition.id;
            return (
              <button
                key={transition.id}
                type="button"
                disabled={isExecuting}
                onClick={() => onTriggerInteraction(interaction, transition)}
                className={`px-2.5 py-1 rounded font-semibold text-[11px] flex items-center gap-1.5 border transition-all ${
                  isExecuting
                    ? 'bg-emerald-950/30 border-emerald-800 text-emerald-400 opacity-60 cursor-not-allowed'
                    : 'bg-emerald-950/60 hover:bg-emerald-900/70 border-emerald-700/50 text-emerald-200 active:scale-95'
                }`}
                title={`${interaction.name}: ${transition.label}${transition.requiredHint ? ` (${transition.requiredHint})` : ''}`}
              >
                <span>{interaction.name}:</span>
                <strong className="text-emerald-100">{transition.label}</strong>
                {transition.requiredHint && (
                  <span className="text-[9px] bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-normal">
                    {transition.requiredHint}
                  </span>
                )}
              </button>
            );
          });
        })}
      </div>
    </div>
  );
};
