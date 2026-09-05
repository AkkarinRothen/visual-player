import React from 'react';
import type { CharacterOnScreen, StageWaypoint } from '../../../../types';
import { Move, X, MapPin, AlertTriangle } from 'lucide-react';

export interface MoveToWaypointModalProps {
  isOpen: boolean;
  primarySelectedChar: CharacterOnScreen | null;
  characters: CharacterOnScreen[];
  waypoints: StageWaypoint[];
  onClose: () => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
}

export const MoveToWaypointModal: React.FC<MoveToWaypointModalProps> = ({
  isOpen,
  primarySelectedChar,
  characters,
  waypoints,
  onClose,
  onUpdateCharacter,
}) => {
  if (!isOpen || !primarySelectedChar) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
            <Move size={14} />
            <span>Mover a punto narrativo: {primarySelectedChar.name}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          Elegí el destino. El personaje mantendrá su escala, apoyo calibrado y expresión facial:
        </p>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-60 pr-1">
          {waypoints.map((wp) => {
            const isOccupied = characters.some(
              (c) =>
                c.id !== primarySelectedChar.id &&
                Math.abs((c.normalizedX ?? 50) - wp.normalizedX) < 6 &&
                Math.abs((c.normalizedY ?? 0) - wp.normalizedY) < 6
            );

            return (
              <div
                key={wp.id}
                className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">{wp.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({wp.normalizedX}%, {wp.normalizedY}%)
                      {wp.targetZIndex !== undefined && ` • Capa ${wp.targetZIndex}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="px-2 py-1 rounded text-[11px] font-semibold bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/50"
                      onClick={() => {
                        const updates: Partial<CharacterOnScreen> = {
                          normalizedX: wp.normalizedX,
                          normalizedY: wp.normalizedY,
                        };
                        if (wp.targetZIndex !== undefined) {
                          updates.zIndex = wp.targetZIndex;
                        }
                        onUpdateCharacter(
                          primarySelectedChar.id,
                          updates,
                          `Mover a ${primarySelectedChar.name} suave a ${wp.name}`
                        );
                        onClose();
                      }}
                    >
                      Suave (0.4s)
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      onClick={() => {
                        const updates: Partial<CharacterOnScreen> = {
                          normalizedX: wp.normalizedX,
                          normalizedY: wp.normalizedY,
                        };
                        if (wp.targetZIndex !== undefined) {
                          updates.zIndex = wp.targetZIndex;
                        }
                        onUpdateCharacter(
                          primarySelectedChar.id,
                          updates,
                          `Mover a ${primarySelectedChar.name} instantáneo a ${wp.name}`
                        );
                        onClose();
                      }}
                    >
                      Instantáneo
                    </button>
                  </div>
                </div>
                {isOccupied && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                    <AlertTriangle size={11} />
                    <span>Hay otra figura cerca de este punto.</span>
                  </div>
                )}
              </div>
            );
          })}
          {waypoints.length === 0 && (
            <div className="text-center text-xs text-slate-500 py-4">
              No hay puntos narrativos guardados en esta escena. Podés guardar la posición actual usando el botón «Guardar posición como punto…».
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
