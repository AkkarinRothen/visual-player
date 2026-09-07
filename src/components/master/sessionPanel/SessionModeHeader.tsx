import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
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
        <Tabs.Root
          className="session-mode-tabs-root"
          value={operationMode}
          onValueChange={(value) => onToggleOperationMode(value as 'live' | 'staging')}
        >
          <Tabs.List className="session-mode-badge-group" aria-label="Modo de operación">
            <Tabs.Trigger
              type="button"
              value="live"
              className="session-mode-pill session-mode-pill-live"
              onClick={() => onToggleOperationMode('live')}
              title="Modo En Vivo: los cambios se transmiten inmediatamente"
            >
              <Radio size={13} className={operationMode === 'live' ? 'animate-pulse' : ''} />
              <span>EN VIVO</span>
            </Tabs.Trigger>
            <Tabs.Trigger
              type="button"
              value="staging"
              className="session-mode-pill session-mode-pill-staging"
              onClick={() => onToggleOperationMode('staging')}
              title="Modo Preparación: edita borradores antes de proyectar"
            >
              <Layers size={13} />
              <span>PREPARACIÓN</span>
              {pendingChangesCount > 0 && (
                <span className="pending-bubble">{pendingChangesCount}</span>
              )}
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
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
