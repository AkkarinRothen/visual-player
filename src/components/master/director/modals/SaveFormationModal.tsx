import React from 'react';
import { Users, X } from 'lucide-react';

export interface SaveFormationModalProps {
  isOpen: boolean;
  selectedCount: number;
  formationNameInput?: string;
  setFormationNameInput?: (name: string) => void;
  onSaveCurrentFormation?: () => void;
  onClose: () => void;
}

export const SaveFormationModal: React.FC<SaveFormationModalProps> = ({
  isOpen,
  selectedCount,
  formationNameInput = '',
  setFormationNameInput,
  onSaveCurrentFormation,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
            <Users size={14} />
            <span>Guardar formación personalizada</span>
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
          Guarda las posiciones relativas actuales de las{' '}
          <strong className="text-amber-300">{selectedCount} figuras seleccionadas</strong> para
          reutilizar esta disposición táctica rápidamente con cualquier grupo.
        </p>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-400 font-medium">Nombre de la formación:</label>
          <input
            type="text"
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
            placeholder="ej. Escolta en V, Guardia en puerta, Emboscada..."
            value={formationNameInput}
            onChange={(e) => setFormationNameInput?.(e.target.value)}
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
            disabled={!formationNameInput.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-40"
            onClick={() => {
              onSaveCurrentFormation?.();
              onClose();
            }}
          >
            Guardar formación
          </button>
        </div>
      </div>
    </div>
  );
};
