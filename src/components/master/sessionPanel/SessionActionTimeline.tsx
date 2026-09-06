import React from 'react';
import type { HistoryEvent } from '../../../types';
import { History } from 'lucide-react';

export interface SessionActionTimelineProps {
  pastEvents: HistoryEvent[];
  onOpenHistory?: () => void;
}

export const SessionActionTimeline: React.FC<SessionActionTimelineProps> = ({
  pastEvents,
  onOpenHistory,
}) => {
  if (pastEvents.length === 0) return null;

  return (
    <section className="session-action-timeline" aria-label="Últimas acciones del director">
      <div className="session-action-timeline-header">
        <div className="flex-align-gap">
          <History size={15} className="text-amber-400" />
          <span>Últimas acciones</span>
        </div>
        {onOpenHistory && (
          <button type="button" onClick={onOpenHistory}>
            Ver historial completo
          </button>
        )}
      </div>
      <div className="session-action-timeline-list">
        {pastEvents.slice(0, 4).map((event) => (
          <div className="session-action-timeline-item" key={event.id}>
            <span className={`timeline-mode-dot ${event.mode}`} />
            <div>
              <strong>{event.description}</strong>
              <span>
                {event.stateSnapshot.sceneName || 'Sin escena'} ·{' '}
                {new Date(event.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
