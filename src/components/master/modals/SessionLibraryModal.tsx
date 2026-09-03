import React, { useState, useEffect, useRef, useMemo } from 'react';
import type {
  Campaign,
  GameSession,
  GameSessionTemplate,
  DuplicateSessionOptions,
  SessionCheckpoint,
  ExportPreflightReport,
  ImportDiffSummary,
  GameSessionPackage,
  NextSessionOptions,
  NewGroupSessionOptions,
} from '../../../types';
import {
  X,
  Plus,
  Library,
  Upload,
  FileText,
  Search,
  CheckCircle2,
  PlayCircle,
  BookTemplate,
  Trash2,
  Archive,
  RefreshCw,
  AlertTriangle,
  FolderSync,
  Tag,
  GitCompare,
  HardDrive,
} from 'lucide-react';
import { SessionReadinessModal } from './SessionReadinessModal';
import { GranularTemplateUpdateModal } from './GranularTemplateUpdateModal';
import { StorageAuditModal } from './StorageAuditModal';
import { useGameSession } from '../../../hooks/useGameSession';
import { gameSessionService } from '../../../services/gameSessionService';
import { db, createSessionFromTemplate } from '../../../db';
import type { LibraryTab } from './sessionLibrary/types';
import { formatRelativeDate } from './sessionLibrary/types';
import { SessionCard } from './sessionLibrary/SessionCard';
import { PreflightExportDialog } from './sessionLibrary/PreflightExportDialog';
import { DiffReviewDialog } from './sessionLibrary/DiffReviewDialog';
import { SessionCheckpointsDialog } from './sessionLibrary/SessionCheckpointsDialog';
import {
  DuplicateSessionDialog,
  SaveTemplateDialog,
  ConfirmDeleteDialog,
  ConfirmEmptyTrashDialog,
  PrepareNextSessionDialog,
  CreateNewGroupSessionDialog,
} from './sessionLibrary/SessionActionDialogs';

interface SessionLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  /** Llamado cuando el director decide cargar una sesión (Continuar o Abrir preparación). */
  onLoadSession: (session: GameSession, mode: 'live' | 'staged') => void;
}

const TAB_LABELS: Record<LibraryTab, string> = {
  preparing: 'En preparación',
  active: 'En curso',
  completed: 'Finalizadas',
  archived: 'Archivadas',
  trash: 'Papelera',
};

const TAB_STATUS_ICONS: Record<LibraryTab, React.ReactNode> = {
  preparing: <FileText size={14} />,
  active: <PlayCircle size={14} />,
  completed: <CheckCircle2 size={14} />,
  archived: <Archive size={14} />,
  trash: <Trash2 size={14} />,
};

export const SessionLibraryModal: React.FC<SessionLibraryModalProps> = ({
  isOpen,
  onClose,
  campaignId,
  onLoadSession,
}) => {
  const {
    sessions,
    trashedSessions,
    templates,
    currentSession,
    isLoading,
    createNewSession,
    switchSession,
    duplicateCurrentSession,
    archiveSession,
    trashSession,
    restoreFromTrash,
    emptyTrash,
    deleteSession,
    saveAsTemplate,
    restoreCheckpointAsCopy,
    getBackupStatus,
    refreshSessions,
    prepareNextSession,
    createSessionForNewGroup,
  } = useGameSession();

  const [activeTab, setActiveTab] = useState<LibraryTab>('preparing');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [duplicateOptions, setDuplicateOptions] = useState<DuplicateSessionOptions>({
    excludeCombatProgress: true,
    excludeConditions: true,
    restoreNpcHp: true,
    newName: '',
  });
  const [templateName, setTemplateName] = useState('');
  const [showPrepareNextDialog, setShowPrepareNextDialog] = useState<GameSession | null>(null);
  const [nextSessionOptions, setNextSessionOptions] = useState<NextSessionOptions>({
    newName: '',
    preserveCombatProgress: false,
    preserveNpcHpLoss: true,
    preserveConditions: true,
    carryOverPlanNotes: true,
  });
  const [showNewGroupDialog, setShowNewGroupDialog] = useState<GameSession | null>(null);
  const [newGroupOptions, setNewGroupOptions] = useState<NewGroupSessionOptions>({
    newName: '',
    targetGroupName: '',
    resetRevelations: true,
    resetNpcHp: true,
    resetCombat: true,
  });
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Pre-flight Export state
  const [preflightSession, setPreflightSession] = useState<GameSession | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightProgress, setPreflightProgress] = useState<{ current: number; total: number; context: string } | null>(null);
  const [preflightReport, setPreflightReport] = useState<ExportPreflightReport | null>(null);

  // Modals for Readiness, Granular Template Update & Storage Audit
  const [evaluatingReadinessSession, setEvaluatingReadinessSession] = useState<GameSession | null>(null);
  const [granularUpdateTemplate, setGranularUpdateTemplate] = useState<GameSessionTemplate | null>(null);
  const [showStorageAudit, setShowStorageAudit] = useState(false);

  // Diff Review Import state
  const [pendingImportFile, setPendingImportFile] = useState<{ pkg: GameSessionPackage; diff: ImportDiffSummary } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Session Checkpoints state
  const [checkpointsSession, setCheckpointsSession] = useState<GameSession | null>(null);
  const [sessionCheckpointsList, setSessionCheckpointsList] = useState<SessionCheckpoint[]>([]);
  const [isLoadingCheckpoints, setIsLoadingCheckpoints] = useState(false);

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(() => {
    return localStorage.getItem('vp_library_campaign_filter') || campaignId;
  });
  const [campaignsList, setCampaignsList] = useState<Campaign[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      db.campaigns.toArray().then((camps) => setCampaignsList(camps));
      refreshSessions(selectedCampaignId);
      setActiveMenuId(null);
    }
  }, [isOpen, selectedCampaignId, refreshSessions]);

  const campaignMap = useMemo(() => {
    const map: Record<string, string> = {};
    campaignsList.forEach((c) => {
      map[c.id] = c.title;
    });
    return map;
  }, [campaignsList]);

  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    sessions.forEach((s) => s.tags?.forEach((t) => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [sessions]);

  if (!isOpen) return null;

  const currentList = activeTab === 'trash' ? trashedSessions : sessions;
  const filteredSessions = currentList.filter((s) => {
    const matchesTab = activeTab === 'trash' ? true : s.status === activeTab;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      (s.planNotes && s.planNotes.toLowerCase().includes(q)) ||
      (s.stagedState?.sceneName && s.stagedState.sceneName.toLowerCase().includes(q)) ||
      (s.frozenScenes && s.frozenScenes.some((sc) => sc.name.toLowerCase().includes(q))) ||
      (s.stagedState?.characters && s.stagedState.characters.some((c) => c.name.toLowerCase().includes(q))) ||
      (s.frozenCharacters && s.frozenCharacters.some((c) => c.name.toLowerCase().includes(q)));

    const matchesTag = !selectedTag || (s.tags && s.tags.includes(selectedTag));

    return matchesTab && matchesSearch && matchesTag;
  });

  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    return !q ||
      t.name.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.stagedState?.sceneName && t.stagedState.sceneName.toLowerCase().includes(q));
  });

  const tabCounts: Record<LibraryTab, number> = {
    preparing: sessions.filter((s) => s.status === 'preparing').length,
    active: sessions.filter((s) => s.status === 'active').length,
    completed: sessions.filter((s) => s.status === 'completed').length,
    archived: sessions.filter((s) => s.status === 'archived').length,
    trash: trashedSessions.length,
  };

  const handleLoadSession = async (session: GameSession, mode: 'live' | 'staged') => {
    await switchSession(session.id);
    onLoadSession(session, mode);
    onClose();
  };

  const handleCreateNew = async () => {
    if (!newSessionName.trim() || isCreatingNew) return;
    setIsCreatingNew(true);
    try {
      const targetCampId = selectedCampaignId !== 'all' ? selectedCampaignId : campaignId;
      await createNewSession(targetCampId, newSessionName.trim());
      setNewSessionName('');
      await refreshSessions(selectedCampaignId);
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

  const handleOpenExportPreflight = async (session: GameSession) => {
    setPreflightSession(session);
    setPreflightReport(null);
    setPreflightProgress(null);
    setPreflightLoading(true);
    try {
      const report = await gameSessionService.preflightExport(session.id, (current, total, item) => {
        setPreflightProgress({ current, total, context: item.context });
      });
      setPreflightReport(report);
    } catch (err: any) {
      setImportError(`Error en el diagnóstico de exportación: ${err?.message || err}`);
      setPreflightSession(null);
    } finally {
      setPreflightLoading(false);
    }
  };

  const handleExecuteExport = async (downloadExternal: boolean) => {
    if (!preflightSession) return;
    await gameSessionService.exportSessionPackage(preflightSession.id, downloadExternal);
    setPreflightSession(null);
    await refreshSessions(campaignId);
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const analyzed = await gameSessionService.analyzePackageDiff(file);
      setPendingImportFile(analyzed);
    } catch (err: any) {
      setImportError(err?.message || 'Error al leer el archivo de paquete');
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const handleExecuteImport = async (asIndependentCopy: boolean) => {
    if (!pendingImportFile) return;
    setIsImporting(true);
    try {
      await gameSessionService.importFromPackage(pendingImportFile.pkg, asIndependentCopy);
      setPendingImportFile(null);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
      await refreshSessions(campaignId);
    } catch (err: any) {
      setImportError(err?.message || 'Error al importar paquete');
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenCheckpoints = async (session: GameSession) => {
    setCheckpointsSession(session);
    setIsLoadingCheckpoints(true);
    try {
      const list = await gameSessionService.getSessionCheckpoints(session.id);
      setSessionCheckpointsList(list);
    } finally {
      setIsLoadingCheckpoints(false);
    }
  };

  const handleRestoreCheckpointCopy = async (checkpoint: SessionCheckpoint) => {
    await restoreCheckpointAsCopy(checkpoint.id);
    setCheckpointsSession(null);
    await refreshSessions(selectedCampaignId);
  };

  const handleOpenPrepareNext = (session: GameSession) => {
    const nextNum = (session.sessionNumber || 1) + 1;
    setNextSessionOptions({
      newName: `Sesión ${nextNum}`,
      preserveCombatProgress: false,
      preserveNpcHpLoss: true,
      preserveConditions: true,
      carryOverPlanNotes: true,
    });
    setShowPrepareNextDialog(session);
    setActiveMenuId(null);
  };

  const handleExecutePrepareNext = async () => {
    if (!showPrepareNextDialog) return;
    const nextSession = await prepareNextSession(showPrepareNextDialog.id, nextSessionOptions);
    setShowPrepareNextDialog(null);
    await refreshSessions(selectedCampaignId);
    handleLoadSession(nextSession, 'staged');
  };

  const handleOpenNewGroup = (session: GameSession) => {
    setNewGroupOptions({
      newName: `${session.name} [Nuevo Grupo]`,
      targetGroupName: 'Grupo B',
      resetRevelations: true,
      resetNpcHp: true,
      resetCombat: true,
    });
    setShowNewGroupDialog(session);
    setActiveMenuId(null);
  };

  const handleExecuteNewGroup = async () => {
    if (!showNewGroupDialog) return;
    const newSession = await createSessionForNewGroup(showNewGroupDialog.id, newGroupOptions);
    setShowNewGroupDialog(null);
    await refreshSessions(selectedCampaignId);
    handleLoadSession(newSession, 'staged');
  };

  const handleArchive = async (id: string) => {
    await archiveSession(id);
    setActiveMenuId(null);
    await refreshSessions(selectedCampaignId);
  };

  const handleTrash = async (id: string) => {
    await trashSession(id);
    setActiveMenuId(null);
    await refreshSessions(selectedCampaignId);
  };

  const handleRestoreFromTrash = async (id: string) => {
    await restoreFromTrash(id);
    await refreshSessions(selectedCampaignId);
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setShowEmptyTrashConfirm(false);
    await refreshSessions(selectedCampaignId);
  };

  const handleDeletePermanent = async (id: string) => {
    await deleteSession(id);
    setShowDeleteConfirm(null);
    await refreshSessions(selectedCampaignId);
  };

  const handleUseTemplate = async (template: GameSessionTemplate) => {
    const newSession = await createSessionFromTemplate(template.id, `${template.name} (Sesión)`);
    if (newSession.campaignId !== campaignId) {
      newSession.campaignId = campaignId;
      await db.sessions.put(newSession);
    }
    await refreshSessions(selectedCampaignId);
    handleLoadSession(newSession, 'staged');
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
            <label className="btn-import-session" title="Importar preparación (.vpp.json) con inspección de diferencias">
              <Upload size={14} />
              <span>Importar</span>
              <input
                ref={importFileRef}
                type="file"
                accept=".vpp.json,.json"
                onChange={handleFileChosen}
                className="sr-only"
                aria-label="Seleccionar archivo de sesión para importar"
              />
            </label>
            <button
              className="btn-import-session"
              onClick={() => setShowStorageAudit(true)}
              title="Auditar espacio ocupado y purgar archivos huérfanos"
              style={{ background: 'rgba(255, 255, 255, 0.06)' }}
            >
              <HardDrive size={13} />
              <span>Espacio</span>
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar biblioteca">
              <X size={20} />
            </button>
          </div>
        </div>

        {importError && (
          <div className="session-library-alert error">
            <AlertTriangle size={14} />
            <span>{importError}</span>
            <button className="alert-close" onClick={() => setImportError(null)}><X size={12} /></button>
          </div>
        )}
        {importSuccess && (
          <div className="session-library-alert success">
            <CheckCircle2 size={14} />
            <span>Preparación importada con éxito</span>
          </div>
        )}

        {/* New Session Bar (only on preparing tab) */}
        {activeTab === 'preparing' && (
          <div className="session-library-new-bar">
            <input
              type="text"
              className="session-new-input"
              placeholder="Nombre de la nueva preparación…"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
              maxLength={60}
              aria-label="Nombre de la nueva sesión"
            />
            <button
              className="btn-create-session"
              onClick={handleCreateNew}
              disabled={!newSessionName.trim() || isCreatingNew}
            >
              <Plus size={15} />
              <span>Nueva Preparación</span>
            </button>
          </div>
        )}

        {/* Filter & Search Bar with Campaign Selector */}
        <div className="session-library-filter-row">
          <div className="session-library-campaign-selector" title="Filtrar preparaciones por campaña">
            <FolderSync size={13} className="text-purple-400" />
            <select
              className="session-library-campaign-select"
              value={selectedCampaignId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCampaignId(val);
                localStorage.setItem('vp_library_campaign_filter', val);
                refreshSessions(val);
              }}
              aria-label="Filtrar por campaña"
            >
              <option value="all">Todas las campañas ({campaignsList.length})</option>
              {campaignsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} {c.id === campaignId ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="session-library-search-bar" style={{ flex: 1 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="session-search-input"
              placeholder="Buscar por nombre, notas, escenas o personajes…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar sesión"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tag chips row if tags exist */}
        {availableTags.length > 0 && (
          <div className="session-library-tags-row">
            <Tag size={12} className="text-zinc-400" />
            <button
              className={`tag-chip ${!selectedTag ? 'active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              Todas las etiquetas
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Status Tabs Navigation */}
        <nav className="session-library-tabs" aria-label="Filtrar por estado">
          {(Object.keys(TAB_LABELS) as LibraryTab[]).map((tabKey) => {
            const count = tabCounts[tabKey];
            return (
              <button
                key={tabKey}
                className={`session-tab-btn ${activeTab === tabKey ? 'active' : ''} ${tabKey === 'trash' ? 'tab-trash' : ''}`}
                onClick={() => {
                  setActiveTab(tabKey);
                  setActiveMenuId(null);
                }}
              >
                {TAB_STATUS_ICONS[tabKey]}
                <span>{TAB_LABELS[tabKey]}</span>
                {count > 0 && <span className="tab-count-badge">{count}</span>}
              </button>
            );
          })}
        </nav>

        {/* Trash header action */}
        {activeTab === 'trash' && trashedSessions.length > 0 && (
          <div className="session-trash-banner">
            <span>Sesiones eliminadas (conservadas para evitar pérdidas accidentales).</span>
            <button className="btn-empty-trash" onClick={() => setShowEmptyTrashConfirm(true)}>
              <Trash2 size={13} />
              <span>Vaciar papelera</span>
            </button>
          </div>
        )}

        {/* Session List */}
        <div
          className="session-library-list"
          role="region"
          aria-live="polite"
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
              <p>No hay sesiones en {TAB_LABELS[activeTab].toLowerCase()}</p>
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
                backupStatus={getBackupStatus(session)}
                campaignTitle={selectedCampaignId === 'all' ? campaignMap[session.campaignId] : undefined}
                isMenuOpen={activeMenuId === session.id}
                onToggleMenu={() => setActiveMenuId(activeMenuId === session.id ? null : session.id)}
                onLoadLive={() => handleLoadSession(session, 'live')}
                onLoadDraft={() => handleLoadSession(session, 'staged')}
                onDuplicate={() => {
                  setDuplicateOptions({ excludeCombatProgress: true, excludeConditions: true, restoreNpcHp: true, newName: `${session.name} (Copia)` });
                  setShowDuplicateDialog(session.id);
                  setActiveMenuId(null);
                }}
                onSaveTemplate={() => {
                  setTemplateName(`Plantilla: ${session.name}`);
                  setShowTemplateDialog(session.id);
                  setActiveMenuId(null);
                }}
                onOpenCheckpoints={() => {
                  handleOpenCheckpoints(session);
                  setActiveMenuId(null);
                }}
                onArchive={() => handleArchive(session.id)}
                onTrash={() => handleTrash(session.id)}
                onRestoreTrash={() => handleRestoreFromTrash(session.id)}
                onExport={() => {
                  handleOpenExportPreflight(session);
                  setActiveMenuId(null);
                }}
                onDelete={() => {
                  setShowDeleteConfirm(session.id);
                  setActiveMenuId(null);
                }}
                onPrepareNextSession={activeTab === 'active' || activeTab === 'completed' ? () => handleOpenPrepareNext(session) : undefined}
                onCreateForNewGroup={activeTab === 'active' || activeTab === 'completed' ? () => handleOpenNewGroup(session) : undefined}
                onEvaluateReadiness={() => setEvaluatingReadinessSession(session)}
              />
            ))
          )}
        </div>

        {/* Templates section */}
        {activeTab !== 'trash' && filteredTemplates.length > 0 && (
          <div className="session-library-templates">
            <h3 className="session-library-section-title">
              <BookTemplate size={14} />
              Plantillas Limpias ({filteredTemplates.length})
            </h3>
            <div className="session-templates-list">
              {filteredTemplates.map((tpl) => (
                <div key={tpl.id} className="session-template-card">
                  <div className="template-info">
                    <div className="flex-align-gap">
                      <span className="template-name">{tpl.name}</span>
                      {selectedCampaignId === 'all' && campaignMap[tpl.campaignId] && (
                        <span className="session-card-campaign-badge">
                          {campaignMap[tpl.campaignId]}
                        </span>
                      )}
                    </div>
                    {tpl.description && <span className="template-desc">{tpl.description}</span>}
                    <span className="template-date">{formatRelativeDate(tpl.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {currentSession && (
                      <button
                        className="btn-use-template"
                        onClick={() => setGranularUpdateTemplate(tpl)}
                        title="Comparar diferencias e incorporar selectivamente a tu preparación activa"
                        style={{ background: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.35)', color: '#c4b5fd' }}
                      >
                        <GitCompare size={12} />
                        <span>Actualizar Sesión Activa</span>
                      </button>
                    )}
                    <button
                      className="btn-use-template"
                      onClick={() => handleUseTemplate(tpl)}
                      title="Crear nueva sesión basada en esta plantilla para la campaña actual"
                    >
                      <Plus size={12} />
                      <span>Usar Plantilla</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Dialogs */}
      {preflightSession && (
        <PreflightExportDialog
          session={preflightSession}
          loading={preflightLoading}
          progress={preflightProgress}
          report={preflightReport}
          onClose={() => setPreflightSession(null)}
          onExecuteExport={handleExecuteExport}
          onRetry={() => handleOpenExportPreflight(preflightSession)}
        />
      )}

      {pendingImportFile && (
        <DiffReviewDialog
          pendingImport={pendingImportFile}
          isImporting={isImporting}
          onClose={() => setPendingImportFile(null)}
          onExecuteImport={handleExecuteImport}
        />
      )}

      {/* Storage Audit Dialog */}
      {showStorageAudit && (
        <StorageAuditModal onClose={() => setShowStorageAudit(false)} />
      )}

      {/* Readiness Check Dialog */}
      {evaluatingReadinessSession && (
        <SessionReadinessModal
          sessionId={evaluatingReadinessSession.id}
          sessionName={evaluatingReadinessSession.name}
          onClose={() => setEvaluatingReadinessSession(null)}
        />
      )}

      {/* Granular Template Update Dialog */}
      {granularUpdateTemplate && currentSession && (
        <GranularTemplateUpdateModal
          sessionId={currentSession.id}
          templateId={granularUpdateTemplate.id}
          templateName={granularUpdateTemplate.name}
          onClose={() => setGranularUpdateTemplate(null)}
          onApplied={() => {
            refreshSessions(selectedCampaignId);
            setImportSuccess(true);
          }}
        />
      )}

      {checkpointsSession && (
        <SessionCheckpointsDialog
          session={checkpointsSession}
          checkpoints={sessionCheckpointsList}
          isLoading={isLoadingCheckpoints}
          onClose={() => setCheckpointsSession(null)}
          onRestoreCheckpointCopy={handleRestoreCheckpointCopy}
        />
      )}

      {showDuplicateDialog && (
        <DuplicateSessionDialog
          options={duplicateOptions}
          onChangeOptions={setDuplicateOptions}
          onClose={() => setShowDuplicateDialog(null)}
          onDuplicate={handleDuplicate}
        />
      )}

      {showTemplateDialog && (
        <SaveTemplateDialog
          templateName={templateName}
          onChangeTemplateName={setTemplateName}
          onClose={() => setShowTemplateDialog(null)}
          onSaveTemplate={handleSaveTemplate}
        />
      )}

      {showPrepareNextDialog && (
        <PrepareNextSessionDialog
          currentSessionName={showPrepareNextDialog.name}
          options={nextSessionOptions}
          onChangeOptions={setNextSessionOptions}
          onClose={() => setShowPrepareNextDialog(null)}
          onConfirm={handleExecutePrepareNext}
        />
      )}

      {showNewGroupDialog && (
        <CreateNewGroupSessionDialog
          sourceSessionName={showNewGroupDialog.name}
          initialBaselineConfig={showNewGroupDialog.initialBaselineConfig}
          options={newGroupOptions}
          onChangeOptions={setNewGroupOptions}
          onClose={() => setShowNewGroupDialog(null)}
          onConfirm={handleExecuteNewGroup}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDeleteDialog
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDeletePermanent(showDeleteConfirm)}
        />
      )}

      {showEmptyTrashConfirm && (
        <ConfirmEmptyTrashDialog
          trashedCount={trashedSessions.length}
          onClose={() => setShowEmptyTrashConfirm(false)}
          onConfirm={handleEmptyTrash}
        />
      )}
    </div>
  );
};
