import React from 'react';
import type { Scene } from '../../../types';
import { AlertTriangle } from 'lucide-react';

export interface OverwriteStagingModalProps {
  confirmOverwriteStaging: Scene | null;
  pendingChangesCount: number;
  onCancel: () => void;
  onConfirmOverwrite: () => void;
  onPublishFirstAndLoad: () => void;
}

export const OverwriteStagingModal: React.FC<OverwriteStagingModalProps> = ({
  confirmOverwriteStaging,
  pendingChangesCount,
  onCancel,
  onConfirmOverwrite,
  onPublishFirstAndLoad,
}) => {
  if (!confirmOverwriteStaging) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content overwrite-confirm-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex-align-gap">
            <AlertTriangle size={20} className="text-amber-400" />
            <h2>¿Sobrescribir Borrador en Preparación?</h2>
          </div>
        </div>
        <p className="confirm-body-text">
          Actualmente tienes <strong>{pendingChangesCount} cambio(s)</strong> sin publicar en el
          modo Preparación.
          <br />
          Si cargas "{confirmOverwriteStaging.name}", se reemplazarán esos cambios.
        </p>
        <div className="modal-footer flex-justify-between">
          <button
            className="btn-secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <div className="flex-align-gap">
            <button
              className="btn-secondary"
              onClick={onPublishFirstAndLoad}
            >
              Publicar Primero y Cargar
            </button>
            <button className="btn-danger" onClick={onConfirmOverwrite}>
              Reemplazar Borrador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
