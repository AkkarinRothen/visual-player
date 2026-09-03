import React, { useState, useEffect } from 'react';
import {
  VolumeX,
  Volume2,
  EyeOff,
  Eye,
  XOctagon,
  BookmarkPlus,
  AlertTriangle,
  Check,
  Radio,
  Loader2,
} from 'lucide-react';
import type { ConnectionStatus } from '../../types';
import type { CommandReceipt } from '../../services/commandReceiptStore';

interface EmergencyDockProps {
  isBlackout: boolean;
  onToggleBlackout: () => void;
  isMuted?: boolean;
  onToggleMuteTotal: () => void;
  hasRunningMacro: boolean;
  runningMacroName?: string;
  onCancelMacro: () => void;
  onCreateQuickCheckpoint: () => void;
  connectionStatus: ConnectionStatus;
  lastCheckpointTime?: number;
  checkpointReceipt?: CommandReceipt | null;
  muteReceipt?: CommandReceipt | null;
  blackoutReceipt?: CommandReceipt | null;
}

export const EmergencyDock: React.FC<EmergencyDockProps> = ({
  isBlackout,
  onToggleBlackout,
  isMuted = false,
  onToggleMuteTotal,
  hasRunningMacro,
  runningMacroName,
  onCancelMacro,
  onCreateQuickCheckpoint,
  connectionStatus,
  checkpointReceipt,
  muteReceipt,
}) => {
  // Safe 2-touch activation for Blackout
  const [blackoutArmed, setBlackoutArmed] = useState<boolean>(false);

  // Auto-disarm blackout after 3.5 seconds
  useEffect(() => {
    if (!blackoutArmed) return;
    const t = setTimeout(() => {
      setBlackoutArmed(false);
    }, 3500);
    return () => clearTimeout(t);
  }, [blackoutArmed]);

  const handleBlackoutClick = () => {
    if (isBlackout) {
      onToggleBlackout();
      setBlackoutArmed(false);
    } else {
      if (!blackoutArmed) {
        setBlackoutArmed(true);
      } else {
        onToggleBlackout();
        setBlackoutArmed(false);
      }
    }
  };

  const isConnected = connectionStatus === 'connected';
  const isSavingCheckpoint =
    checkpointReceipt?.status === 'queued' || checkpointReceipt?.status === 'sent';
  const isCheckpointSaved = checkpointReceipt?.status === 'saved';

  return (
    <aside
      className="emergency-dock-container"
      role="region"
      aria-label="Controles de Emergencia del DM"
    >
      <div className="emergency-dock-inner">
        {/* MUTE TOTAL */}
        <button
          className={`emergency-btn mute-btn ${isMuted ? 'active-mute' : ''}`}
          onClick={onToggleMuteTotal}
          aria-label={isMuted ? 'Restaurar Audio Maestro' : 'Silencio Total de Emergencia'}
          title={isMuted ? 'Reactivar audio' : 'Silenciar todo el audio inmediatamente'}
        >
          {isMuted ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <span className="emergency-label">{isMuted ? 'Reactivar' : 'Mute Total'}</span>
          {muteReceipt?.status === 'applied' && <span className="dock-status-dot ack" title="Confirmado por la Mesa (ACK)" />}
          {muteReceipt?.status === 'rejected' && <span className="dock-status-dot rejected" title="Rechazado por la Mesa" />}
        </button>

        {/* CANCEL MOMENTO / MACRO */}
        {hasRunningMacro && (
          <button
            className="emergency-btn cancel-macro-btn animate-pulse"
            onClick={onCancelMacro}
            aria-label={`Cancelar Momento en ejecución: ${runningMacroName || 'Momento'}`}
            title="Detener secuencia inmediatamente y restaurar estado anterior"
          >
            <XOctagon size={20} className="text-red-400" />
            <span className="emergency-label">Parar Momento</span>
          </button>
        )}

        {/* BLACKOUT CON CONFIRMACIÓN DE 2 TOQUES */}
        <button
          className={`emergency-btn blackout-btn ${
            isBlackout
              ? 'blackout-active'
              : blackoutArmed
              ? 'blackout-armed animate-bounce'
              : ''
          }`}
          onClick={handleBlackoutClick}
          aria-label={
            isBlackout
              ? 'Encender Pantalla (Quitar Blackout)'
              : blackoutArmed
              ? 'Confirmar Blackout Inmediato'
              : 'Preparar Blackout'
          }
          title={
            isBlackout
              ? 'Quitar Blackout y revelar pantalla'
              : blackoutArmed
              ? 'Toca de nuevo para activar Blackout'
              : 'Blackout (requiere doble toque de seguridad)'
          }
        >
          {isBlackout ? (
            <>
              <Eye size={20} />
              <span className="emergency-label">Encender</span>
            </>
          ) : blackoutArmed ? (
            <>
              <AlertTriangle size={20} className="text-amber-300" />
              <span className="emergency-label font-bold">¿Confirmar?</span>
            </>
          ) : (
            <>
              <EyeOff size={20} />
              <span className="emergency-label">Blackout</span>
            </>
          )}
        </button>

        {/* CHECKPOINT RÁPIDO (OPERACIÓN LOCAL - MUESTRA GUARDADO LOCAL) */}
        <button
          className={`emergency-btn checkpoint-btn ${isCheckpointSaved ? 'checkpoint-saved' : ''}`}
          onClick={onCreateQuickCheckpoint}
          disabled={isSavingCheckpoint}
          aria-label="Crear Checkpoint de Respaldo Rápido"
          title="Guardar estado actual en la base de datos local (Dexie)"
        >
          {isSavingCheckpoint ? (
            <>
              <Loader2 size={20} className="animate-spin text-amber-400" />
              <span className="emergency-label text-amber-300">Guardando...</span>
            </>
          ) : isCheckpointSaved ? (
            <>
              <Check size={20} className="text-emerald-400" />
              <span className="emergency-label text-emerald-300">Guardado local</span>
            </>
          ) : (
            <>
              <BookmarkPlus size={20} />
              <span className="emergency-label">Checkpoint</span>
            </>
          )}
        </button>

        {/* INDICADOR DE RED RESUMIDO */}
        <div
          className={`emergency-net-chip ${isConnected ? 'online' : 'offline'}`}
          title={`Estado de red: ${connectionStatus}`}
        >
          <Radio size={12} className={isConnected ? 'animate-pulse text-emerald-400' : 'text-rose-400'} />
          <span className="net-text">{isConnected ? 'Mesa OK' : 'Sin Mesa'}</span>
        </div>
      </div>
    </aside>
  );
};
