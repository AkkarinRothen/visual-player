import React from 'react';
import { Wifi, WifiOff, Activity, Eye, Maximize2, Minimize2 } from 'lucide-react';
import type { ConnectionStatus } from '../../types';

interface DisplayHUDProps {
  showControls: boolean;
  connectionStatus: ConnectionStatus;
  latencyMs: number;
  roomCode: string;
  isOverlayMinimized: boolean;
  isFullscreen: boolean;
  onOpenDiagnostic: () => void;
  onRestoreOverlay: () => void;
  onToggleFullscreen: () => void;
  onExitToLobby?: () => void;
}

export const DisplayHUD: React.FC<DisplayHUDProps> = ({
  showControls,
  connectionStatus,
  latencyMs,
  roomCode,
  isOverlayMinimized,
  isFullscreen,
  onOpenDiagnostic,
  onRestoreOverlay,
  onToggleFullscreen,
  onExitToLobby,
}) => {
  return (
    <div className={`display-hud ${showControls ? 'visible' : 'hidden'}`}>
      <div className="hud-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onOpenDiagnostic}
          className={`connection-pill ${connectionStatus}`}
          style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
          title="Abrir Diagnóstico de Conexión"
        >
          {connectionStatus === 'connected' ? (
            <>
              <Wifi size={16} className="text-emerald-400" />
              <span>Master Conectado</span>
              {latencyMs > 0 && (
                <span className="latency-badge">
                  <Activity size={12} /> {latencyMs}ms
                </span>
              )}
            </>
          ) : connectionStatus === 'connecting' ? (
            <>
              <div className="radar-dot"></div>
              <span>Sala: <strong>{roomCode}</strong></span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="text-amber-400" />
              <span>Esperando Master (PIN: {roomCode})</span>
            </>
          )}
        </button>

        {/* Re-open QR Button if minimized */}
        {isOverlayMinimized && (
          <button
            onClick={onRestoreOverlay}
            className="hud-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px' }}
            title="Mostrar Código QR y PIN"
          >
            <Eye size={14} />
            <span>Ver QR ({roomCode})</span>
          </button>
        )}
      </div>

      <div className="hud-right">
        {onExitToLobby && (
          <button className="hud-btn" onClick={onExitToLobby} title="Volver al Lobby">
            Salir
          </button>
        )}
        <button className="hud-btn icon-btn" onClick={onToggleFullscreen} title="Pantalla Completa">
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  );
};
