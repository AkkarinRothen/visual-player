import React from 'react';
import type { SceneOcclusionRegion } from '../../../../types';
import type { OcclusionFormState } from '../directorTypes';
import { Layers, X } from 'lucide-react';

export interface CreateOcclusionModalProps {
  isOpen: boolean;
  occlusionForm: OcclusionFormState;
  setOcclusionForm: React.Dispatch<React.SetStateAction<OcclusionFormState>>;
  onSaveOcclusionRegion?: (region: Omit<SceneOcclusionRegion, 'id'>) => void;
  onClose: () => void;
}

export const CreateOcclusionModal: React.FC<CreateOcclusionModalProps> = ({
  isOpen,
  occlusionForm,
  setOcclusionForm,
  onSaveOcclusionRegion,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border-2 border-purple-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
            <Layers size={14} />
            <span>Nueva región de oclusión frontal</span>
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
          Define una porción del fondo que actuará como máscara frontal. Cualquier figura con capa inferior quedará oculta detrás de este elemento:
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-400 font-medium">Nombre de la máscara:</label>
            <input
              type="text"
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
              value={occlusionForm.name}
              onChange={(e) => setOcclusionForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-slate-400 font-medium">Posición X (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                value={occlusionForm.x}
                onChange={(e) => setOcclusionForm((prev) => ({ ...prev, x: Number(e.target.value) }))}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-slate-400 font-medium">Posición Y (%):</label>
              <input
                type="number"
                min="0"
                max="100"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                value={occlusionForm.y}
                onChange={(e) => setOcclusionForm((prev) => ({ ...prev, y: Number(e.target.value) }))}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-slate-400 font-medium">Ancho (%):</label>
              <input
                type="number"
                min="1"
                max="100"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                value={occlusionForm.width}
                onChange={(e) => setOcclusionForm((prev) => ({ ...prev, width: Number(e.target.value) }))}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-slate-400 font-medium">Alto (%):</label>
              <input
                type="number"
                min="1"
                max="100"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                value={occlusionForm.height}
                onChange={(e) => setOcclusionForm((prev) => ({ ...prev, height: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-slate-400 font-medium">Nivel de capa (zIndex):</label>
            <input
              type="number"
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
              value={occlusionForm.zIndex}
              onChange={(e) => setOcclusionForm((prev) => ({ ...prev, zIndex: Number(e.target.value) }))}
            />
          </div>
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
            disabled={!occlusionForm.name.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
            onClick={() => {
              if (onSaveOcclusionRegion && occlusionForm.name.trim()) {
                onSaveOcclusionRegion({
                  name: occlusionForm.name.trim(),
                  x: occlusionForm.x,
                  y: occlusionForm.y,
                  width: occlusionForm.width,
                  height: occlusionForm.height,
                  zIndex: occlusionForm.zIndex,
                });
              }
              onClose();
            }}
          >
            Crear región
          </button>
        </div>
      </div>
    </div>
  );
};
