import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
import { SessionReadinessModal } from './SessionReadinessModal';
import { GranularTemplateUpdateModal } from './GranularTemplateUpdateModal';
import { StorageAuditModal } from './StorageAuditModal';
import { useGameSession } from '../../../hooks/useGameSession';
import { gameSessionService } from '../../../services/gameSessionService';
import { db, createSessionFromTemplate } from '../../../db';
import type { LibraryTab } from './sessionLibrary/types';
import { SessionLibraryHeader } from './sessionLibrary/SessionLibraryHeader';
import { SessionLibraryFilterBar } from './sessionLibrary/SessionLibraryFilterBar';
import { SessionLibraryList } from './sessionLibrary/SessionLibraryList';
import { SessionLibraryTemplatesSection } from './sessionLibrary/SessionLibraryTemplatesSection';
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

export interface SessionLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  /** Llamado cuando el director decide cargar una sesión (Continuar o Abrir preparación). */
  onLoadSession: (session: GameSession, mode: 'live' | 'staged') => void;
}

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
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay session-library-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="session-library-modal"
        >
          <Dialog.Title className="sr-only">Biblioteca de Sesiones</Dialog.Title>
        <SessionLibraryHeader
          onClose={onClose}
          onOpenFileChosen={handleFileChosen}
          importFileRef={importFileRef}
          onOpenStorageAudit={() => setShowStorageAudit(true)}
          importError={importError}
          onClearImportError={() => setImportError(null)}
          importSuccess={importSuccess}
        />

        <SessionLibraryFilterBar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setActiveMenuId(null);
          }}
          tabCounts={tabCounts}
          newSessionName={newSessionName}
          onChangeNewSessionName={setNewSessionName}
          onCreateNew={handleCreateNew}
          isCreatingNew={isCreatingNew}
          selectedCampaignId={selectedCampaignId}
          onSelectCampaign={(val) => {
            setSelectedCampaignId(val);
            localStorage.setItem('vp_library_campaign_filter', val);
            refreshSessions(val);
          }}
          currentCampaignId={campaignId}
          campaignsList={campaignsList}
          searchQuery={searchQuery}
          onChangeSearchQuery={setSearchQuery}
          onClearSearchQuery={() => setSearchQuery('')}
          availableTags={availableTags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          trashedCount={trashedSessions.length}
          onEmptyTrashClick={() => setShowEmptyTrashConfirm(true)}
        />

        <SessionLibraryList
          isLoading={isLoading}
          activeTab={activeTab}
          sessions={filteredSessions}
          selectedCampaignId={selectedCampaignId}
          campaignMap={campaignMap}
          activeMenuId={activeMenuId}
          onToggleMenu={(id) => setActiveMenuId(activeMenuId === id ? null : id)}
          getBackupStatus={getBackupStatus}
          onLoadLive={(session) => handleLoadSession(session, 'live')}
          onLoadDraft={(session) => handleLoadSession(session, 'staged')}
          onDuplicate={(session) => {
            setDuplicateOptions({ excludeCombatProgress: true, excludeConditions: true, restoreNpcHp: true, newName: `${session.name} (Copia)` });
            setShowDuplicateDialog(session.id);
            setActiveMenuId(null);
          }}
          onSaveTemplate={(session) => {
            setTemplateName(`Plantilla: ${session.name}`);
            setShowTemplateDialog(session.id);
            setActiveMenuId(null);
          }}
          onOpenCheckpoints={(session) => {
            handleOpenCheckpoints(session);
            setActiveMenuId(null);
          }}
          onArchive={(id) => handleArchive(id)}
          onTrash={(id) => handleTrash(id)}
          onRestoreTrash={(id) => handleRestoreFromTrash(id)}
          onExport={(session) => {
            handleOpenExportPreflight(session);
            setActiveMenuId(null);
          }}
          onDelete={(id) => {
            setShowDeleteConfirm(id);
            setActiveMenuId(null);
          }}
          onPrepareNextSession={(session) => handleOpenPrepareNext(session)}
          onCreateForNewGroup={(session) => handleOpenNewGroup(session)}
          onEvaluateReadiness={(session) => setEvaluatingReadinessSession(session)}
        />

        {activeTab !== 'trash' && (
          <SessionLibraryTemplatesSection
            templates={filteredTemplates}
            hasCurrentSession={!!currentSession}
            selectedCampaignId={selectedCampaignId}
            campaignMap={campaignMap}
            onSelectGranularUpdate={(tpl) => setGranularUpdateTemplate(tpl)}
            onUseTemplate={handleUseTemplate}
          />
        )}
        </Dialog.Content>

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

      {showStorageAudit && (
        <StorageAuditModal onClose={() => setShowStorageAudit(false)} />
      )}

      {evaluatingReadinessSession && (
        <SessionReadinessModal
          sessionId={evaluatingReadinessSession.id}
          sessionName={evaluatingReadinessSession.name}
          onClose={() => setEvaluatingReadinessSession(null)}
        />
      )}

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
      </Dialog.Portal>
    </Dialog.Root>
  );
};
