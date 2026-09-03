import React from 'react';
import type { GameSession } from '../../../../types';
import type { BackupStatus } from '../../../../services/gameSessionService';
import type { LibraryTab } from './types';
import { formatRelativeDate } from './types';
import {
  Clock,
  PlayCircle,
  FileText,
  ChevronRight,
  MoreVertical,
  Copy,
  BookTemplate,
  Bookmark,
  Download,
  Archive,
  Trash2,
  RotateCcw,
  Check,
  AlertTriangle,
  HardDrive,
  FastForward,
  Users,
  Sparkles,
} from 'lucide-react';

export interface SessionCardProps {
  session: GameSession;
  activeTab: LibraryTab;
  backupStatus: BackupStatus;
  campaignTitle?: string;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onLoadLive: () => void;
  onLoadDraft: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  onOpenCheckpoints: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onRestoreTrash: () => void;
  onExport: () => void;
  onDelete: () => void;
  onPrepareNextSession?: () => void;
  onCreateForNewGroup?: () => void;
  onEvaluateReadiness?: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  activeTab,
  backupStatus,
  campaignTitle,
  isMenuOpen,
  onToggleMenu,
  onLoadLive,
  onLoadDraft,
  onDuplicate,
  onSaveTemplate,
  onOpenCheckpoints,
  onArchive,
  onTrash,
  onRestoreTrash,
  onExport,
  onDelete,
  onPrepareNextSession,
  onCreateForNewGroup,
  onEvaluateReadiness,
}) => {
  const hasDraft = session.stagedState !== null;
  const hasLive = session.liveState !== null;
  const thumbUrl = session.stagedState?.backgroundUrl || session.frozenScenes?.[0]?.backgroundUrl;

  return (
    <div className="session-card" role="article" aria-label={`Sesión: ${session.name}`}>
      <div className="session-card-main">
        {/* Miniature thumbnail */}
        <div className="session-card-thumb-col" aria-hidden="true">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="session-card-thumb" />
          ) : (
            <div className="session-card-thumb-placeholder">
              <span className="session-card-number">
                {session.sessionNumber ? `#${session.sessionNumber}` : '—'}
              </span>
            </div>
          )}
        </div>

        <div className="session-card-info">
          <div className="session-card-meta">
            <div className="session-card-title-row">
              <span className="session-card-name">{session.name}</span>
              {session.groupName && (
                <span className="session-card-group-badge" title={`Grupo de juego: ${session.groupName}`}>
                  👥 {session.groupName}
                </span>
              )}
              {campaignTitle && (
                <span className="session-card-campaign-badge" title={`Campaña: ${campaignTitle}`}>
                  {campaignTitle}
                </span>
              )}
              {/* Backup status badge */}
              {backupStatus === 'synced' && (
                <span
                  className={`badge-backup synced ${session.lastExportIsComplete === false ? 'partial' : ''}`}
                  title={
                    session.lastExportIsComplete === false
                      ? "Respaldado con recursos externos (requiere internet para elementos remotos)"
                      : "Copia externa 100% autocontenida al día (uso sin internet garantizado)"
                  }
                >
                  <Check size={10} /> {session.lastExportIsComplete === false ? 'Respaldado (parcial)' : 'Respaldado'}
                </span>
              )}
              {backupStatus === 'dirty' && (
                <span className="badge-backup dirty" title="Hay cambios posteriores sin exportar">
                  <AlertTriangle size={10} /> Sin respaldar
                </span>
              )}
              {backupStatus === 'never_exported' && (
                <span className="badge-backup local" title="Guardado solo localmente en este dispositivo. No hay archivo .vpp.json">
                  <HardDrive size={10} /> Solo local
                </span>
              )}
            </div>
            <div className="session-card-subrow">
              <span className="session-card-date">
                <Clock size={11} />
                {formatRelativeDate(session.updatedAt)}
              </span>
              {session.stagedState?.sceneName && (
                <span className="session-card-scene">
                  Escena: {session.stagedState.sceneName}
                </span>
              )}
              {session.tags && session.tags.length > 0 && (
                <div className="session-card-tags">
                  {session.tags.map((t) => (
                    <span key={t} className="session-card-tag-pill">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="session-card-actions">
          {activeTab === 'trash' ? (
            <>
              <button
                className="btn-session-continue"
                onClick={onRestoreTrash}
                title="Restaurar de la papelera a su estado original"
              >
                <RotateCcw size={14} />
                <span>Restaurar</span>
              </button>
              <button
                className="btn-trash-delete-perm"
                onClick={onDelete}
                title="Eliminar permanentemente de la base de datos"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <>
              {(activeTab === 'active' || activeTab === 'completed') && hasLive && (
                <button
                  className="btn-session-continue"
                  onClick={onLoadLive}
                  title="Continuar: restaura el último estado publicado"
                >
                  <PlayCircle size={14} />
                  <span>Continuar</span>
                </button>
              )}
              {hasDraft && (
                <button
                  className="btn-session-draft"
                  onClick={onLoadDraft}
                  title="Abrir preparación: carga el borrador sin publicarlo a la Mesa"
                >
                  <FileText size={14} />
                  <span>Preparación</span>
                  <ChevronRight size={12} />
                </button>
              )}

              {/* Context menu */}
              <div className="session-card-menu-wrapper">
                <button
                  className="btn-session-menu"
                  onClick={onToggleMenu}
                  title="Más acciones"
                  aria-label="Abrir menú de acciones"
                  aria-expanded={isMenuOpen}
                >
                  <MoreVertical size={15} />
                </button>
                {isMenuOpen && (
                  <div className="session-context-menu" role="menu">
                    <button className="ctx-menu-item" role="menuitem" onClick={onDuplicate}>
                      <Copy size={13} /> Duplicar preparación
                    </button>
                    {onPrepareNextSession && (
                      <button className="ctx-menu-item" role="menuitem" onClick={onPrepareNextSession} title="Prepara la siguiente sesión conservando revelaciones y mundo">
                        <FastForward size={13} /> Siguiente entrega (mismo grupo)
                      </button>
                    )}
                    {onCreateForNewGroup && (
                      <button className="ctx-menu-item" role="menuitem" onClick={onCreateForNewGroup} title="Crea una línea de partida para una mesa diferente">
                        <Users size={13} /> Jugar con otro grupo
                      </button>
                    )}
                    {hasDraft && (
                      <button className="ctx-menu-item" role="menuitem" onClick={onSaveTemplate}>
                        <BookTemplate size={13} /> Guardar como plantilla
                      </button>
                    )}
                    <button className="ctx-menu-item" role="menuitem" onClick={onOpenCheckpoints}>
                      <Bookmark size={13} /> Puntos de control
                    </button>
                    {onEvaluateReadiness && (
                      <button className="ctx-menu-item" role="menuitem" onClick={onEvaluateReadiness} title="Evaluar si la preparación está lista para jugar sin conexión">
                        <Sparkles size={13} /> Lista para jugar...
                      </button>
                    )}
                    <button className="ctx-menu-item" role="menuitem" onClick={onExport}>
                      <Download size={13} /> Exportar (.vpp.json)
                    </button>
                    <div className="ctx-menu-separator" />
                    {activeTab !== 'archived' && (
                      <button className="ctx-menu-item ctx-menu-item-warn" role="menuitem" onClick={onArchive}>
                        <Archive size={13} /> Archivar
                      </button>
                    )}
                    <button className="ctx-menu-item ctx-menu-item-danger" role="menuitem" onClick={onTrash}>
                      <Trash2 size={13} /> Enviar a papelera
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
