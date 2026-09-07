import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="session-dialog-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="session-dialog session-checkpoints-dialog"
        >
        <div className="session-dialog-header">
          <Bookmark size={18} />
          <Dialog.Title>Puntos de Recuperación: {session.name}</Dialog.Title>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
