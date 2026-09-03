import React, { useState, useEffect, useRef } from 'react';
import type { GameSession, GameSessionTemplate, DuplicateSessionOptions } from '../../../types';
import {
  X,
  Plus,
  Library,
  Copy,
  Archive,
  Download,
  Upload,
  FileText,
  Search,
  Clock,
  CheckCircle2,
  PlayCircle,
  BookTemplate,
  Trash2,
  ChevronRight,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { useGameSession } from '../../../hooks/useGameSession';

interface SessionLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  /** Llamado cuando el director decide cargar una sesión (Continuar o Abrir preparación). */
  onLoadSession: (session: GameSession, mode: 'live' | 'staged') => void;
}

type LibraryTab = 'preparing' | 'active' | 'completed' | 'archived';

const TAB_LABELS: Record<LibraryTab, string> = {
  preparing: 'En preparación',
  active: 'En curso',
  completed: 'Finalizadas',
  archived: 'Archivadas',
};

const TAB_STATUS_ICONS: Record<LibraryTab, React.ReactNode> = {
  preparing: <FileText size={14} />,
  active: <PlayCircle size={14} />,
  completed: <CheckCircle2 size={14} />,
  archived: <Archive size={14} />,
};

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days !== 1 ? 's' : ''}`;
}

/**
 * Modal de Biblioteca de Preparaciones y Sesiones Reutilizables.
 *
 * Muestra sesiones agrupadas por estado (En preparación, En curso, Finalizadas, Archivadas).
 * Permite: Continuar, Abrir preparación, Duplicar, Guardar como plantilla,
 * Archivar, Exportar e Importar sesiones.
 */
export const SessionLibraryModal: React.FC<SessionLibraryModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  onLoadSession,
}) => {
  const {
    sessions,
    templates,
    isLoading,
    createNewSession,
    switchSession,
    duplicateCurrentSession,
    archiveSession,
    deleteSession,
    saveAsTemplate,
    exportCurrentSession,
    importFromFile,
    refreshSessions,
  } = useGameSession();

  const [activeTab, setActiveTab] = useState<LibraryTab>('preparing');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [duplicateOptions, setDuplicateOptions] = useState<DuplicateSessionOptions>({
    excludeCombatProgress: true,
    excludeConditions: true,
    newName: '',
  });
  const [templateName, setTemplateName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshSessions(campaignId);
      setSearchQuery('');
      setActiveMenuId(null);
    }
  }, [isOpen, campaignId, refreshSessions]);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    const matchesTab = s.status === activeTab;
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabCounts: Record<LibraryTab, number> = {
    preparing: sessions.filter((s) => s.status === 'preparing').length,
    active: sessions.filter((s) => s.status === 'active').length,
    completed: sessions.filter((s) => s.status === 'completed').length,
    archived: sessions.filter((s) => s.status === 'archived').length,
  };

  const handleLoadSession = async (session: GameSession, mode: 'live' | 'staged') => {
    await switchSession(session.id);
    onLoadSession(session, mode);
    onClose();
  };

  const handleCreateNew = async () => {
    if (!newSessionName.trim()) return;
    setIsCreatingNew(true);
    try {
      await createNewSession(campaignId, newSessionName.trim());
      setNewSessionName('');
      await refreshSessions(campaignId);
    } finally {
      setIsCreatingNew(false);
    }
  };

  const handleDuplicate = async () => {
    if (!showDuplicateDialog) return;
    await switchSession(showDuplicateDialog);
    await duplicateCurrentSession(duplicateOptions);
    setShowDuplicateDialog(null);
    await refreshSessions(campaignId);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    if (!showTemplateDialog) return;
    await switchSession(showTemplateDialog);
    await saveAsTemplate(templateName.trim());
    setShowTemplateDialog(null);
    setTemplateName('');
    await refreshSessions(campaignId);
  };

  const handleExport = async (session: GameSession) => {
    await switchSession(session.id);
    await exportCurrentSession();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(false);
    try {
      await importFromFile(file, 'duplicate');
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
      await refreshSessions(campaignId);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const handleArchive = async (id: string) => {
    await archiveSession(id);
    setActiveMenuId(null);
    await refreshSessions(campaignId);
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setShowDeleteConfirm(null);
    await refreshSessions(campaignId);
  };

  return (
    <div className="modal-overlay session-library-overlay" role="dialog" aria-modal="true" aria-label="Biblioteca de Sesiones">
      <div className="session-library-modal">
        {/* Header */}
        <div className="session-library-header">
          <div className="session-library-title">
            <Library size={20} />
            <h2>Biblioteca de Preparaciones</h2>
          </div>
          <div className="session-library-header-actions">
            {/* Import */}
            <label className="btn-import-session" title="Importar sesión desde archivo .vpp.json">
              <Upload size={14} />
              <span>Importar</span>
              <input
                ref={importFileRef}
                type="file"
                accept=".vpp.json,.json"
                onChange={handleImport}
                className="sr-only"
                aria-label="Seleccionar archivo de sesión para importar"
              />
            </label>
            <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar biblioteca">
              <X size={20} />
            </button>
          </div>
        </div>

        {importError && (
          <div className="session-library-alert error">
            <X size={14} />
            <span>{importError}</span>
          </div>
        )}
        {importSuccess && (
          <div className="session-library-alert success">
            <CheckCircle2 size={14} />
            <span>Sesión importada correctamente</span>
          </div>
        )}

        {/* New Session form */}
        <div className="session-library-new-session">
          <input
            className="session-new-name-input"
            placeholder="Nombre de nueva preparación…"
            value={newSessionName}
            onChange={(e) => setNewSessionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
            maxLength={60}
            aria-label="Nombre de nueva sesión"
          />
          <button
            className="btn-create-session"
            onClick={handleCreateNew}
            disabled={!newSessionName.trim() || isCreatingNew}
            aria-label="Crear nueva sesión"
          >
            <Plus size={14} />
            <span>{isCreatingNew ? 'Creando…' : 'Nueva preparación'}</span>
          </button>
        </div>

        {/* Search */}
        <div className="session-library-search">
          <Search size={14} />
          <input
            className="session-search-input"
            placeholder="Buscar sesiones…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Buscar sesiones"
          />
        </div>

        {/* Tabs */}
        <div className="session-library-tabs" role="tablist">
          {(Object.keys(TAB_LABELS) as LibraryTab[]).map((tab) => (
            <button
              key={tab}
              className={`session-lib-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`tab-panel-${tab}`}
            >
              {TAB_STATUS_ICONS[tab]}
              <span>{TAB_LABELS[tab]}</span>
              {tabCounts[tab] > 0 && (
                <span className="tab-count-badge">{tabCounts[tab]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Session List */}
        <div
          className="session-library-list"
          role="tabpanel"
          id={`tab-panel-${activeTab}`}
          aria-label={TAB_LABELS[activeTab]}
        >
          {isLoading ? (
            <div className="session-library-loading">
              <RefreshCw size={20} className="animate-spin" />
              <span>Cargando sesiones…</span>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="session-library-empty">
              <Library size={32} />
              <p>No hay sesiones en esta categoría</p>
              {activeTab === 'preparing' && (
                <p className="session-library-empty-hint">
                  Crea una nueva preparación con el campo de arriba
                </p>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                activeTab={activeTab}
                isMenuOpen={activeMenuId === session.id}
                onToggleMenu={() => setActiveMenuId(activeMenuId === session.id ? null : session.id)}
                onLoadLive={() => handleLoadSession(session, 'live')}
                onLoadDraft={() => handleLoadSession(session, 'staged')}
                onDuplicate={() => {
                  setDuplicateOptions({ excludeCombatProgress: true, excludeConditions: true, newName: `${session.name} (Copia)` });
                  setShowDuplicateDialog(session.id);
                  setActiveMenuId(null);
                }}
                onSaveTemplate={() => {
                  setTemplateName(`Plantilla: ${session.name}`);
                  setShowTemplateDialog(session.id);
                  setActiveMenuId(null);
                }}
                onArchive={() => handleArchive(session.id)}
                onExport={() => handleExport(session)}
                onDelete={() => {
                  setShowDeleteConfirm(session.id);
                  setActiveMenuId(null);
                }}
              />
            ))
          )}
        </div>

        {/* Templates section */}
        {templates.length > 0 && (
          <div className="session-library-templates">
            <h3 className="session-library-section-title">
              <BookTemplate size={14} />
              Plantillas ({templates.length})
            </h3>
            <div className="session-templates-list">
              {templates.map((tpl) => (
                <div key={tpl.id} className="session-template-card">
                  <span className="template-name">{tpl.name}</span>
                  <span className="template-date">{formatRelativeDate(tpl.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Duplicate Dialog */}
      {showDuplicateDialog && (
        <div className="session-dialog-overlay">
          <div className="session-dialog">
            <h3>Duplicar preparación</h3>
            <input
              className="session-dialog-input"
              value={duplicateOptions.newName ?? ''}
              onChange={(e) => setDuplicateOptions((o) => ({ ...o, newName: e.target.value }))}
              placeholder="Nombre de la copia"
              aria-label="Nombre de la sesión duplicada"
            />
            <label className="session-dialog-checkbox">
              <input
                type="checkbox"
                checked={duplicateOptions.excludeCombatProgress}
                onChange={(e) => setDuplicateOptions((o) => ({ ...o, excludeCombatProgress: e.target.checked }))}
              />
              Excluir progreso de combate (rondas, HPs perdidos, temporizadores)
            </label>
            <label className="session-dialog-checkbox">
              <input
                type="checkbox"
                checked={duplicateOptions.excludeConditions}
                onChange={(e) => setDuplicateOptions((o) => ({ ...o, excludeConditions: e.target.checked }))}
              />
              Excluir condiciones activas (estados de combatientes)
            </label>
            <div className="session-dialog-actions">
              <button className="btn-dialog-cancel" onClick={() => setShowDuplicateDialog(null)}>Cancelar</button>
              <button className="btn-dialog-confirm" onClick={handleDuplicate}>
                <Copy size={14} /> Duplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Dialog */}
      {showTemplateDialog && (
        <div className="session-dialog-overlay">
          <div className="session-dialog">
            <h3>Guardar como plantilla</h3>
            <p className="session-dialog-hint">
              La plantilla excluirá HP perdidos, combate activo y condiciones transitorias.
            </p>
            <input
              className="session-dialog-input"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Nombre de la plantilla"
              aria-label="Nombre de la plantilla"
            />
            <div className="session-dialog-actions">
              <button className="btn-dialog-cancel" onClick={() => setShowTemplateDialog(null)}>Cancelar</button>
              <button className="btn-dialog-confirm" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                <BookTemplate size={14} /> Guardar plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {showDeleteConfirm && (
        <div className="session-dialog-overlay">
          <div className="session-dialog session-dialog-danger">
            <h3>¿Eliminar sesión?</h3>
            <p>Esta acción es permanente. Considera archivarla si quieres conservarla.</p>
            <div className="session-dialog-actions">
              <button className="btn-dialog-cancel" onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
              <button className="btn-dialog-danger" onClick={() => handleDelete(showDeleteConfirm)}>
                <Trash2 size={14} /> Eliminar permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Session Card ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  session: GameSession;
  activeTab: LibraryTab;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onLoadLive: () => void;
  onLoadDraft: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  onArchive: () => void;
  onExport: () => void;
  onDelete: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  activeTab,
  isMenuOpen,
  onToggleMenu,
  onLoadLive,
  onLoadDraft,
  onDuplicate,
  onSaveTemplate,
  onArchive,
  onExport,
  onDelete,
}) => {
  const hasDraft = session.stagedState !== null;
  const hasLive = session.liveState !== null;

  return (
    <div className="session-card" role="article" aria-label={`Sesión: ${session.name}`}>
      <div className="session-card-main">
        <div className="session-card-info">
          <span className="session-card-number">
            {session.sessionNumber ? `#${session.sessionNumber}` : '—'}
          </span>
          <div className="session-card-meta">
            <span className="session-card-name">{session.name}</span>
            <span className="session-card-date">
              <Clock size={11} />
              {formatRelativeDate(session.updatedAt)}
            </span>
            {session.stagedState?.sceneName && (
              <span className="session-card-scene">
                Escena: {session.stagedState.sceneName}
              </span>
            )}
          </div>
        </div>

        <div className="session-card-actions">
          {/* Primary action based on tab */}
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
                {hasDraft && (
                  <button className="ctx-menu-item" role="menuitem" onClick={onSaveTemplate}>
                    <BookTemplate size={13} /> Guardar como plantilla
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
                <button className="ctx-menu-item ctx-menu-item-danger" role="menuitem" onClick={onDelete}>
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
