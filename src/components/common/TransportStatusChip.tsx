import React from 'react';
import { Wifi, WifiOff, ArrowLeftRight, RefreshCw, EyeOff, AlertTriangle } from 'lucide-react';

/**
 * TransportStatusChip.tsx
 *
 * Chip compacto de estado de transporte no bloqueante, diferenciado por rol:
 * - Master: chip visible con texto + ícono; abre diagnóstico al tocarlo.
 * - Display (Mesa): solo ícono discreto; banner solo si conexión perdida por varios segundos.
 *
 * Estados:
 * local, internet, switching, syncing, read_only, disconnected
 */

export type TransportStatusState =
  | 'local'
  | 'internet'
  | 'switching'
  | 'syncing'
  | 'read_only'
  | 'disconnected';

interface TransportStatusChipProps {
  status: TransportStatusState;
  /** Para el Master: etiqueta del transporte actual ('Nearby' o 'Internet') */
  transportLabel?: string;
  /** Porcentaje de progreso durante handover o sync (0-100) */
  progress?: number;
  /** Nombre de la fase actual durante handover */
  handoverPhase?: string;
  /** Rol del dispositivo que muestra el chip */
  role: 'display' | 'master';
  /** Latencia en ms (solo visible para master) */
  latencyMs?: number;
  onOpenDiagnostic?: () => void;
}

const STATUS_CONFIG: Record<
  TransportStatusState,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  local: {
    label: 'Local',
    icon: <Wifi size={14} />,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  internet: {
    label: 'Internet',
    icon: <Wifi size={14} />,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  switching: {
    label: 'Cambiando',
    icon: <ArrowLeftRight size={14} />,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  syncing: {
    label: 'Sincronizando',
    icon: <RefreshCw size={14} />,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.3)',
  },
  read_only: {
    label: 'Solo lectura',
    icon: <EyeOff size={14} />,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.4)',
  },
  disconnected: {
    label: 'Desconectado',
    icon: <WifiOff size={14} />,
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
  },
};

export const TransportStatusChip: React.FC<TransportStatusChipProps> = ({
  status,
  transportLabel,
  progress,
  handoverPhase,
  role,
  latencyMs,
  onOpenDiagnostic,
}) => {
  const config = STATUS_CONFIG[status];
  const isMaster = role === 'master';
  const isSwitching = status === 'switching';
  const isSyncing = status === 'syncing';
  const isReadOnly = status === 'read_only';
  const isDisconnected = status === 'disconnected';

  if (!isMaster) {
    // Display (Mesa): solo ícono discreto, sin texto técnico
    if (status === 'local' || status === 'internet') {
      // Fully connected: nearly invisible dot
      return (
        <div
          aria-label={`Conexión: ${config.label}`}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: config.color,
            boxShadow: `0 0 6px ${config.color}`,
            position: 'absolute',
            top: 12,
            right: 12,
            opacity: 0.6,
          }}
        />
      );
    }
    if (isDisconnected || isReadOnly) {
      // Banner for display when connection is lost
      return (
        <div
          role="alert"
          aria-live="assertive"
          aria-label="Conexión perdida con el DM"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(239, 68, 68, 0.9)',
            color: '#fff',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          {isReadOnly ? 'Solo lectura — reconectando...' : 'Conexión perdida con el DM'}
        </div>
      );
    }
    // Transitional states for display: subtle spinner icon
    return (
      <div
        aria-label={config.label}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          color: config.color,
          animation: 'spin 1s linear infinite',
        }}
      >
        <RefreshCw size={14} />
      </div>
    );
  }

  // ─── Master View ────────────────────────────────────────
  const isClickable = !!onOpenDiagnostic;
  const displayLabel = handoverPhase
    ? `Cambiando: ${handoverPhase}`
    : transportLabel
    ? `${config.label} (${transportLabel})`
    : config.label;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <button
        id="transport-status-chip"
        onClick={isClickable ? onOpenDiagnostic : undefined}
        aria-label={`Estado de conexión: ${displayLabel}${latencyMs ? `, latencia ${latencyMs}ms` : ''}`}
        aria-haspopup={isClickable ? 'dialog' : undefined}
        title={isClickable ? 'Abrir diagnóstico de conexión' : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: config.bg,
          border: `1px solid ${config.border}`,
          color: config.color,
          fontSize: '12px',
          fontWeight: 600,
          cursor: isClickable ? 'pointer' : 'default',
          transition: 'all 0.2s',
          userSelect: 'none',
          animation: isSwitching ? 'pulse 1.5s ease-in-out infinite' : undefined,
        }}
      >
        <span style={{ animation: isSyncing || isSwitching ? 'spin 1.2s linear infinite' : undefined }}>
          {config.icon}
        </span>
        <span>{displayLabel}</span>
        {latencyMs !== undefined && latencyMs > 0 && !isSwitching && (
          <span style={{ opacity: 0.7, fontSize: '11px' }}>{latencyMs}ms</span>
        )}
      </button>

      {/* Progress bar during switching or syncing */}
      {(isSwitching || isSyncing) && progress !== undefined && (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso: ${progress}%`}
          style={{
            height: '3px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${config.color}, ${config.color}aa)`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {/* Read-only persistent warning */}
      {isReadOnly && (
        <span
          role="status"
          aria-live="polite"
          style={{ fontSize: '11px', color: '#f59e0b', paddingLeft: '4px' }}
        >
          Reconectando...
        </span>
      )}
    </div>
  );
};
