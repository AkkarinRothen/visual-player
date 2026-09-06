import React from 'react';
import { RefreshCw, Check, FolderPlus, Copy, Plus } from 'lucide-react';
import type { ScenePresetFooterProps } from './scenePresetTypes';

export const ScenePresetFooter: React.FC<ScenePresetFooterProps> = ({
  mode,
  onClose,
  isSaving,
  saveSuccess,
  presetName,
  onSave,
  selectedPreset,
  confirmReplaceStaged,
  setConfirmReplaceStaged,
  isInstantiating,
  onInstantiate,
}) => {
  return (
    <div className="scene-preset-footer">
      <button className="btn-preset-secondary" onClick={onClose}>
        Cancelar
      </button>

      {mode === 'save' ? (
        <button
          className="btn-preset-primary"
          onClick={onSave}
          disabled={isSaving || !presetName.trim()}
        >
          {isSaving ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              <span>Guardando...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check size={14} className="text-emerald-300" />
              <span>¡Preset Guardado!</span>
            </>
          ) : (
            <>
              <FolderPlus size={14} />
              <span>Guardar Preset de Escena</span>
            </>
          )}
        </button>
      ) : (
        selectedPreset && !confirmReplaceStaged && (
          <>
            <button
              className="btn-preset-secondary"
              onClick={() => setConfirmReplaceStaged(true)}
              disabled={isInstantiating}
              title="Reemplaza la composición actual creando un punto de control previo"
            >
              <Copy size={14} />
              <span>Reemplazar Borrador</span>
            </button>
            <button
              className="btn-preset-primary"
              onClick={() => onInstantiate('append_scene')}
              disabled={isInstantiating}
            >
              {isInstantiating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Insertando...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Añadir como Escena Nueva (Recomendado)</span>
                </>
              )}
            </button>
          </>
        )
      )}
    </div>
  );
};
