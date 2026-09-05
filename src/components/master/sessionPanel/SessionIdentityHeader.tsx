import React from 'react';
import type { DraftSaveState } from '../../../types';
import type { BackupStatus } from '../../../services/gameSessionService';
import {
  BookOpen,
  Pencil,
  Check,
  AlertTriangle,
  HardDrive,
  Loader,
  CheckCircle,
  XCircle,
  Library,
  BookmarkPlus,
  Sparkles,
  Package,
} from 'lucide-react';

export interface SessionIdentityHeaderProps {
  sessionName: string;
  isEditingSessionName: boolean;
  sessionNameInputRef: React.RefObject<HTMLInputElement | null>;
  onStartEditSessionName: () => void;
  onChangeSessionName: (name: string) => void;
  onSessionNameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSessionNameBlur: () => void;
  backupStatus?: BackupStatus;
  lastExportIsComplete?: boolean;
  draftSaveState: DraftSaveState;
  savedRelativeTime: number;
  savedSecondsAgo: number;
  onOpenSessionLibrary?: () => void;
  onOpenResourcePacks?: () => void;
  onSaveInitialBaseline?: () => void;
  onEvaluateReadiness?: () => void;
}

export const SessionIdentityHeader: React.FC<SessionIdentityHeaderProps> = ({
  sessionName,
  isEditingSessionName,
  sessionNameInputRef,
  onStartEditSessionName,
  onChangeSessionName,
  onSessionNameKeyDown,
  onSessionNameBlur,
  backupStatus,
  lastExportIsComplete,
  draftSaveState,
  savedRelativeTime,
  savedSecondsAgo,
  onOpenSessionLibrary,
  onOpenResourcePacks,
  onSaveInitialBaseline,
  onEvaluateReadiness,
}) => {
  return (
    <header className="session-identity-header">
      <div className="session-identity-left">
        <span className="session-identity-icon" aria-hidden="true">
          <BookOpen size={16} />
        </span>
        {isEditingSessionName ? (
          <input
            ref={sessionNameInputRef}
            className="session-name-input"
            value={sessionName}
            onChange={(e) => onChangeSessionName(e.target.value)}
            onKeyDown={onSessionNameKeyDown}
            onBlur={onSessionNameBlur}
            maxLength={60}
            aria-label="Nombre de la sesión"
          />
        ) : (
          <button
            className="session-name-label"
            onClick={onStartEditSessionName}
            title="Haz clic para renombrar la sesión"
          >
            {sessionName || 'Sin nombre'}
            <Pencil size={11} className="session-name-edit-icon" />
          </button>
        )}
      </div>
      <div className="session-identity-right">
        {/* Backup status indicator */}
        {backupStatus === 'synced' && (
          <span
            className={`badge-backup synced ${lastExportIsComplete === false ? 'partial' : ''}`}
            title={
              lastExportIsComplete === false
                ? "Copia externa realizada pero requiere internet para algunos recursos"
                : "Copia externa 100% autocontenida al día (funciona sin conexión)"
            }
          >
            <Check size={10} /> {lastExportIsComplete === false ? 'Respaldado (parcial)' : 'Respaldado'}
          </span>
        )}
        {backupStatus === 'dirty' && (
          <span className="badge-backup dirty" title="Hay cambios posteriores sin exportar">
            <AlertTriangle size={10} /> Sin respaldar
          </span>
        )}
        {backupStatus === 'never_exported' && (
          <span className="badge-backup local" title="Guardado únicamente en este navegador">
            <HardDrive size={10} /> Solo local
          </span>
        )}

        {/* Auto-save indicator */}
        <span className={`session-save-indicator session-save-${draftSaveState}`} aria-live="polite">
          {draftSaveState === 'saving' && (
            <><Loader size={11} className="animate-spin" /><span>Guardando…</span></>
          )}
          {draftSaveState === 'saved' && (
            <><CheckCircle size={11} /><span>Guardado</span></>
          )}
          {draftSaveState === 'idle' && savedRelativeTime > 0 && (
            <><CheckCircle size={11} /><span>Guardado{savedSecondsAgo > 5 ? ` (hace ${savedSecondsAgo}s)` : ''}</span></>
          )}
          {draftSaveState === 'error' && (
            <><XCircle size={11} className="text-red-400" /><span className="text-red-400">Error de disco</span></>
          )}
        </span>
        {/* Fijar Configuración Inicial button */}
        {onSaveInitialBaseline && (
          <button
            className="btn-session-library"
            onClick={onSaveInitialBaseline}
            title="Guardar el borrador preparado como Configuración Inicial para nuevos grupos"
            aria-label="Fijar Configuración Inicial"
            style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#34d399' }}
          >
            <BookmarkPlus size={13} />
            <span>Fijar Inicial</span>
          </button>
        )}

        {/* Lista para Jugar button */}
        {onEvaluateReadiness && (
          <button
            className="btn-session-library"
            onClick={onEvaluateReadiness}
            title="Evaluar preparación y verificar activos para juego offline"
            aria-label="Lista para jugar"
            style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
          >
            <Sparkles size={13} />
            <span>Lista para Jugar</span>
          </button>
        )}

        {/* Packs de Recursos Visuales button */}
        {onOpenResourcePacks && (
          <button
            className="btn-session-library"
            onClick={onOpenResourcePacks}
            title="Instalar y gestionar paquetes de recursos (.vppack)"
            aria-label="Packs de Recursos Visuales"
            style={{ background: 'rgba(245, 158, 11, 0.14)', borderColor: 'rgba(245, 158, 11, 0.35)', color: '#fbbf24' }}
          >
            <Package size={13} />
            <span>Packs</span>
          </button>
        )}

        {/* Biblioteca de Sesiones y Partidas button */}
        {onOpenSessionLibrary && (
          <button
            className="btn-session-library"
            onClick={onOpenSessionLibrary}
            title="Biblioteca de Sesiones, Partidas y Preparaciones guardadas"
            aria-label="Biblioteca de Sesiones"
          >
            <Library size={13} />
            <span>Sesiones</span>
          </button>
        )}
      </div>
    </header>
  );
};
