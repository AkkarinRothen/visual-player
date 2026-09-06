import React from 'react';
import { Library, Upload, HardDrive, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface SessionLibraryHeaderProps {
  onClose: () => void;
  onOpenFileChosen: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importFileRef: React.RefObject<HTMLInputElement | null>;
  onOpenStorageAudit: () => void;
  importError: string | null;
  onClearImportError: () => void;
  importSuccess: boolean;
}

export const SessionLibraryHeader: React.FC<SessionLibraryHeaderProps> = ({
  onClose,
  onOpenFileChosen,
  importFileRef,
  onOpenStorageAudit,
  importError,
  onClearImportError,
  importSuccess,
}) => {
  return (
    <>
      <div className="session-library-header">
        <div className="session-library-title">
          <Library size={20} />
          <h2>Biblioteca de Preparaciones</h2>
        </div>
        <div className="session-library-header-actions">
          <label className="btn-import-session" title="Importar preparación (.vpp.json) con inspección de diferencias">
            <Upload size={14} />
            <span>Importar</span>
            <input
              ref={importFileRef}
              type="file"
              accept="*/*,.vpp.json,.json,application/json,application/octet-stream"
              onChange={onOpenFileChosen}
              className="sr-only"
              aria-label="Seleccionar archivo de sesión para importar"
            />
          </label>
          <button
            className="btn-import-session"
            onClick={onOpenStorageAudit}
            title="Auditar espacio ocupado y purgar archivos huérfanos"
            style={{ background: 'rgba(255, 255, 255, 0.06)' }}
          >
            <HardDrive size={13} />
            <span>Espacio</span>
          </button>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar biblioteca">
            <X size={20} />
          </button>
        </div>
      </div>

      {importError && (
        <div className="session-library-alert error">
          <AlertTriangle size={14} />
          <span>{importError}</span>
          <button className="alert-close" onClick={onClearImportError} aria-label="Cerrar alerta">
            <X size={12} />
          </button>
        </div>
      )}
      {importSuccess && (
        <div className="session-library-alert success">
          <CheckCircle2 size={14} />
          <span>Preparación importada con éxito</span>
        </div>
      )}
    </>
  );
};
