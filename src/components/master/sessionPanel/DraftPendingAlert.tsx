import React from 'react';
import { Layers, Check, Send } from 'lucide-react';

export interface DraftPendingAlertProps {
  pendingChangesCount: number;
  publishStatus: 'idle' | 'sending' | 'ack';
  onPublishClick: () => void;
  onOpenSelectivePublish?: () => void;
  onDiscardStaged?: () => void;
}

export const DraftPendingAlert: React.FC<DraftPendingAlertProps> = ({
  pendingChangesCount,
  publishStatus,
  onPublishClick,
  onOpenSelectivePublish,
  onDiscardStaged,
}) => {
  if (pendingChangesCount <= 0) return null;

  return (
    <div className="session-draft-alert-banner">
      <div className="draft-alert-info">
        <Layers size={16} className="text-amber-400" />
        <span>
          <strong>{pendingChangesCount} cambio(s)</strong> listos en Preparación
        </span>
      </div>
      <div className="draft-alert-actions">
        <button
          className="btn-publish-quick"
          onClick={onPublishClick}
          disabled={publishStatus === 'sending'}
          title="Publicar todo a la pantalla de los jugadores"
        >
          {publishStatus === 'sending' ? (
            <span>Publicando...</span>
          ) : publishStatus === 'ack' ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span>¡Enviado!</span>
            </>
          ) : (
            <>
              <Send size={14} />
              <span>Llevar a Mesa</span>
            </>
          )}
        </button>
        {onOpenSelectivePublish && (
          <button
            className="btn-publish-inspect"
            onClick={onOpenSelectivePublish}
            title="Inspeccionar diferencias y publicar selectivamente"
          >
            Inspeccionar
          </button>
        )}
        {onDiscardStaged && (
          <button
            className="btn-publish-discard"
            onClick={onDiscardStaged}
            title="Descartar borrador y volver al estado en vivo"
          >
            Descartar
          </button>
        )}
      </div>
    </div>
  );
};
