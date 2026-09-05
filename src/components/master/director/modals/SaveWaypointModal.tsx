import React from 'react';
import type { CharacterOnScreen, StageWaypoint } from '../../../../types';
import { MapPin, X } from 'lucide-react';

export interface SaveWaypointModalProps {
  isOpen: boolean;
  primarySelectedChar: CharacterOnScreen | null;
  waypointNameInput: string;
  setWaypointNameInput: (name: string) => void;
  onSaveWaypoint?: (waypoint: Omit<StageWaypoint, 'id'>) => void;
  onClose: () => void;
}

export const SaveWaypointModal: React.FC<SaveWaypointModalProps> = ({
  isOpen,
  primarySelectedChar,
  waypointNameInput,
  setWaypointNameInput,
  onSaveWaypoint,
  onClose,
}) => {
  if (!isOpen || !primarySelectedChar) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
            <MapPin size={14} />
            <span>Guardar punto narrativo de escena</span>
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
          Guarda las coordenadas actuales de <strong>{primarySelectedChar.name}</strong> (X: {primarySelectedChar.normalizedX ?? 50}%, Y: {primarySelectedChar.normalizedY ?? 0}%, Capa {primarySelectedChar.zIndex ?? 10}) como un punto reutilizable para esta escena.
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Nombre del punto:</label>
          <input
            type="text"
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            placeholder="ej. En la puerta, Detrás de la barra..."
            value={waypointNameInput}
            onChange={(e) => setWaypointNameInput(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!waypointNameInput.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40"
            onClick={() => {
              if (onSaveWaypoint && waypointNameInput.trim()) {
                onSaveWaypoint({
                  name: waypointNameInput.trim(),
                  normalizedX: primarySelectedChar.normalizedX ?? 50,
                  normalizedY: primarySelectedChar.normalizedY ?? 0,
                  targetZIndex: primarySelectedChar.zIndex,
                });
              }
              onClose();
            }}
          >
            Guardar punto
          </button>
        </div>
      </div>
    </div>
  );
};
