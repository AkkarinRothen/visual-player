import React from 'react';
import type { CharacterOnScreen, CameraTransform } from '../../../../types';

export interface SaveCameraPresetModalProps {
  isOpen: boolean;
  presetNameInput: string;
  setPresetNameInput: (val: string) => void;
  primarySelectedChar: CharacterOnScreen | null;
  onSaveCameraPreset?: (name: string, camera: CameraTransform) => void;
  onClose: () => void;
}

export const SaveCameraPresetModal: React.FC<SaveCameraPresetModalProps> = ({
  isOpen,
  presetNameInput,
  setPresetNameInput,
  primarySelectedChar,
  onSaveCameraPreset,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-xs">
        <span className="font-bold text-amber-300 text-xs">Guardar encuadre actual</span>
        <input
          type="text"
          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          placeholder="ej. Mostrador, Puerta sótano..."
          value={presetNameInput}
          onChange={(e) => setPresetNameInput(e.target.value)}
          autoFocus
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white"
            onClick={() => {
              onClose();
              setPresetNameInput('');
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400"
            onClick={() => {
              if (presetNameInput.trim() && onSaveCameraPreset) {
                onSaveCameraPreset(presetNameInput.trim(), {
                  focalPoint: {
                    x: primarySelectedChar?.normalizedX ?? 50,
                    y: primarySelectedChar?.normalizedY ?? 50,
                  },
                  zoom: 1.35,
                });
              }
              onClose();
              setPresetNameInput('');
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
