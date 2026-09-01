import React from 'react';
import type { HistoryEvent } from '../../types';
import { History, RotateCcw, X, Radio, Layers } from 'lucide-react';

interface HistoryModalProps {
  pastEvents: HistoryEvent[];
  onRestoreEvent: (event: HistoryEvent) => void;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  pastEvents,
  onRestoreEvent,
  onClose,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content history-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex-align-gap">
            <History size={20} className="text-amber-400" />
            <h2>Historial de Acciones</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p className="modal-subtitle">
          Últimas acciones registradas. Puedes viajar a cualquier punto anterior sin perder la trazabilidad.
        </p>

        {pastEvents.length === 0 ? (
          <div className="empty-history-box">
            <History size={36} className="text-slate-600 mb-2" />
            <p>No hay acciones previas registradas en esta sesión.</p>
          </div>
        ) : (
          <div className="history-events-list">
            {pastEvents.map((evt, index) => {
              const timeStr = new Date(evt.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div key={evt.id || index} className="history-event-card">
                  <div className="event-info">
                    <div className="event-header-row">
                      <span className={`event-mode-badge ${evt.mode}`}>
                        {evt.mode === 'live' ? (
                          <>
                            <Radio size={12} />
                            <span>En Vivo</span>
                          </>
                        ) : (
                          <>
                            <Layers size={12} />
                            <span>Borrador</span>
                          </>
                        )}
                      </span>
                      <span className="event-time">{timeStr}</span>
                    </div>
                    <strong className="event-desc">{evt.description}</strong>
                    <span className="event-scene-meta">
                      Escenario: {evt.stateSnapshot.sceneName || 'Sin Escenario'} •{' '}
                      {evt.stateSnapshot.characters.length} NPCs
                    </span>
                  </div>

                  <button
                    className="btn-secondary-sm restore-event-btn"
                    onClick={() => {
                      if (window.confirm(`¿Restaurar estado: "${evt.description}"?`)) {
                        onRestoreEvent(evt);
                        onClose();
                      }
                    }}
                    title="Restaurar este punto"
                  >
                    <RotateCcw size={14} />
                    <span>Restaurar</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
