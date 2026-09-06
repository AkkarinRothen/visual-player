import React from 'react';
import { X, Sparkles, FolderPlus, ShieldCheck } from 'lucide-react';
import type { ScenePresetHeaderProps } from './scenePresetTypes';

export const ScenePresetHeader: React.FC<ScenePresetHeaderProps> = ({ mode, onClose }) => {
  return (
    <>
      <div className="scene-preset-header">
        <div className="scene-preset-header-left">
          <div className="scene-preset-icon-badge">
            {mode === 'save' ? <FolderPlus size={18} /> : <Sparkles size={18} />}
          </div>
          <div className="scene-preset-title-group">
            <h2>
              {mode === 'save'
                ? 'Guardar Escena como Preset Reutilizable'
                : 'Insertar Preset de Escena en Preparación'}
            </h2>
            <div className="scene-preset-subtitle">
              {mode === 'save'
                ? 'Guarda la composición completa de tu borrador para usarla en cualquier campaña o grupo.'
                : 'Explora y reutiliza composiciones completas con control de dependencias.'}
            </div>
          </div>
        </div>
        <button className="icon-action-btn" onClick={onClose} title="Cerrar">
          <X size={18} />
        </button>
      </div>

      <div className="scene-preset-staging-notice">
        <ShieldCheck size={14} className="text-blue-400 flex-shrink-0" />
        <span>
          <strong>Modo Preparación Segura:</strong> Las operaciones con presets se aplican únicamente a tu borrador. NUNCA emiten a la Mesa de los jugadores ni reproducen sonido.
        </span>
      </div>
    </>
  );
};
