import React from 'react';
import type { GameSession, SessionCheckpoint } from '../../../../types';
import { Bookmark, RefreshCw, RotateCcw } from 'lucide-react';

export interface SessionCheckpointsDialogProps {
  session: GameSession;
  checkpoints: SessionCheckpoint[];
  isLoading: boolean;
  onClose: () => void;
  onRestoreCheckpointCopy: (checkpoint: SessionCheckpoint) => void;
}

export const SessionCheckpointsDialog: React.FC<SessionCheckpointsDialogProps> = ({
  session,
  checkpoints,
  isLoading,
  onClose,
  onRestoreCheckpointCopy,
}) => {
  return (
    <div className="session-dialog-overlay" role="dialog" aria-modal="true">
      <div className="session-dialog session-checkpoints-dialog">
        <div className="session-dialog-header">
          <Bookmark size={18} />
          <h3>Puntos de Recuperación: {session.name}</h3>
        </div>

        {isLoading ? (
          <div className="p-4 text-center text-slate-400">
            <RefreshCw size={18} className="animate-spin inline mr-2" />
            Cargando puntos de control…
          </div>
        ) : checkpoints.length === 0 ? (
          <div className="session-library-empty">
            <p>No hay puntos de control guardados para esta sesión.</p>
          </div>
        ) : (
          <div className="checkpoints-list-scroll">
            {checkpoints.map((cp) => (
              <div key={cp.id} className="checkpoint-card-item">
                <div className="checkpoint-item-info">
                  <span className="checkpoint-name">{cp.name}</span>
                  <span className="checkpoint-date">{new Date(cp.createdAt).toLocaleString()}</span>
                  <span className="checkpoint-trigger">Motivo: {cp.trigger}</span>
                </div>
                <button
                  className="btn-restore-cp-copy"
                  onClick={() => onRestoreCheckpointCopy(cp)}
                  title="Restaura este punto como una preparación nueva sin sobrescribir la actual"
                >
                  <RotateCcw size={13} />
                  <span>Restaurar como copia</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="session-dialog-actions">
          <button className="btn-dialog-cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
