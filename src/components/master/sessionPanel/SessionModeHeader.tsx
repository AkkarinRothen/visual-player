import React from 'react';
import { Radio, Layers, Sliders } from 'lucide-react';

export interface SessionModeHeaderProps {
  operationMode: 'live' | 'staging';
  onToggleOperationMode: (mode: 'live' | 'staging') => void;
  pendingChangesCount: number;
  onToggleClassicView: () => void;
}

export const SessionModeHeader: React.FC<SessionModeHeaderProps> = ({
  operationMode,
  onToggleOperationMode,
  pendingChangesCount,
  onToggleClassicView,
}) => {
  return (
    <div className="session-status-header">
      <div className="session-status-left">
        <div className="session-mode-badge-group">
          <button
            className={`session-mode-pill ${operationMode === 'live' ? 'active-live' : ''}`}
            onClick={() => onToggleOperationMode('live')}
            title="Modo En Vivo: los cambios se transmiten inmediatamente"
          >
            <Radio size={13} className={operationMode === 'live' ? 'animate-pulse' : ''} />
            <span>EN VIVO</span>
          </button>
          <button
            className={`session-mode-pill ${operationMode === 'staging' ? 'active-staging' : ''}`}
            onClick={() => onToggleOperationMode('staging')}
            title="Modo Preparación: edita borradores antes de proyectar"
          >
            <Layers size={13} />
            <span>PREPARACIÓN</span>
            {pendingChangesCount > 0 && (
              <span className="pending-bubble">{pendingChangesCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="session-status-right">
        <button
          className="btn-classic-toggle"
          onClick={onToggleClassicView}
          title="Alternar entre Vista de Sesión Móvil y Vista Clásica de Edición"
        >
          <Sliders size={13} />
          <span>Vista Clásica</span>
        </button>
      </div>
    </div>
  );
};
