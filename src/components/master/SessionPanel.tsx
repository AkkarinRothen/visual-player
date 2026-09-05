import React, { useState, useEffect, useRef } from 'react';
import {
  AudioLines,
  ArrowLeft,
  ArrowRight,
  Camera,
  Eye,
  Flame,
  ImagePlus,
  MoreHorizontal,
  MonitorPlay,
  Moon,
  Radio,
  RefreshCcw,
  History,
  Sparkles,
  Swords,
  Volume2,
  Zap,
  LayoutGrid,
  Sliders,
} from 'lucide-react';
import type {
  Campaign,
  DisplayState,
  DMFavoriteItem,
  Scene,
  SceneVariant,
  ConnectionStatus,
  ActionExecutionStatus,
  CinematicDialogue,
  CameraTransform,
  SavedConversation,
  SceneLight,
  DialogueLineActions,
  DialogueBranchChoice,
  SceneZoneEmitter,
  SceneInteraction,
  SceneInteractionTransition,
  CombatTrackingMode,
  DuckingPreset,
  LightningConfig,
  SceneSituation,
  DraftSaveState,
  HistoryEvent,
  CharacterOnScreen,
} from '../../types';
import { gameSessionService, type BackupStatus } from '../../services/gameSessionService';
import { SessionIdentityHeader } from './sessionPanel/SessionIdentityHeader';
import { SessionModeHeader } from './sessionPanel/SessionModeHeader';
import { DraftPendingAlert } from './sessionPanel/DraftPendingAlert';
import { ActiveSceneCard } from './sessionPanel/ActiveSceneCard';
import { NextSuggestedSceneCard } from './sessionPanel/NextSuggestedSceneCard';
import { CombatContextCard } from './sessionPanel/CombatContextCard';
import { OverwriteStagingModal } from './sessionPanel/OverwriteStagingModal';
import { SessionFavoritesBar } from './SessionFavoritesBar';
import { CinematicDialogueDock } from './CinematicDialogueDock';
import { calculateRemainingTimerSeconds } from '../../domain/combat/combatTimerCoordinator';
import { LiveModularControlPanel } from './modularControl/LiveModularControlPanel';
import { ComposerDialogueQuickModal } from './composer/ComposerDialogueQuickModal';

interface SessionPanelProps {
  campaign: Campaign | null;
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';
  pendingChangesCount: number;
  connectionStatus: ConnectionStatus;
  latencyMs: number;
  roomCode: string;
  onSelectScene: (scene: Scene) => void;
  onPrepareSceneInStaging: (scene: Scene) => void;
  onPublishAllStaged: () => Promise<boolean | void> | void;
  onOpenSelectivePublish: () => void;
  onDiscardStaged: () => void;
  onToggleOperationMode: (mode: 'live' | 'staging') => void;
  onUndo?: () => void;
  pastEvents?: HistoryEvent[];
  onOpenHistory?: () => void;
  onTriggerLightning: () => void;
  onTriggerShake: () => void;
  onToggleBlackout: () => void;
  onToggleBanner: () => void;
  onToggleAmbientAudio: () => void;
  onExecuteFavorite: (item: DMFavoriteItem) => Promise<boolean>;
  onOpenManageFavorites: () => void;
  onSwitchToTab: (tab: 'live' | 'moments' | 'combat' | 'notes' | 'library') => void;
  onToggleClassicView: () => void;
  // Compositor & Variants
  onOpenCompositor?: () => void;
  onSelectSceneVariant?: (variant: SceneVariant) => void;
  // Combat shortcuts
  onNextCombatTurn?: () => void;
  onPrevCombatTurn?: () => void;
  // Dialogue shortcuts
  onPublishDialogue?: (
    dialogue: CinematicDialogue,
    actions?: DialogueLineActions,
    lineId?: string
  ) => Promise<void>;
  onDismissDialogue?: () => Promise<void> | void;
  onCompleteDialogueText?: () => Promise<void> | void;
  onRepeatActions?: (actions: DialogueLineActions, lineId: string) => Promise<void> | void;
  executedActionLineIds?: Record<string, string>;
  onSelectBranchChoice?: (choice: DialogueBranchChoice) => void;
  selectedChoiceIds?: Record<string, string>;
  // Camera
  onSetCameraTransform?: (transform: CameraTransform) => void;
  onResetCamera?: () => void;
  // Conversation Editor
  onOpenNewConversation?: () => void;
  onOpenEditConversation?: (conversation: SavedConversation) => void;
  // Dynamic Scene Lights & Atmospheric Zone Emitters
  onUpdateSceneLights?: (lights: SceneLight[]) => void;
  onUpdateZoneEmitters?: (emitters: SceneZoneEmitter[]) => void;
  // Progressive Disclosure
  onRevealCharacterAppearance?: (characterId: string) => void;
  onRevealCharacterIdentity?: (characterId: string) => void;
  // Scene Interactions & Transitions
  onTriggerInteraction?: (
    interaction: SceneInteraction,
    transition: SceneInteractionTransition
  ) => Promise<void> | void;
  executingInteractionId?: string | null;
  // Campaign Journal & Preparations
  onOpenRevelationJournal?: () => void;
  onOpenSessionPrepWizard?: () => void;
  // Dynamic Camera Combat Tracking
  onFocusCombatant?: (combatantId: string) => void;
  onToggleCombatTrackingMode?: (mode: CombatTrackingMode) => void;
  // Intelligent Audio Ducking
  onToggleDmSpeakingDucked?: () => void;
  onSelectDuckingPreset?: (preset: DuckingPreset) => void;
  // Handout Viewer Phase 2
  onOpenHandoutViewer?: () => void;
  // Campaign Recap
  onOpenCampaignRecap?: () => void;
  // Soundboard
  onOpenSoundboard?: () => void;
  // Stochastic Storm
  lightningConfig?: LightningConfig;
  onToggleAutoStorm?: () => void;
  onToggleDisableFlash?: () => void;
  // Biome Soundtracks
  onOpenBiomeSoundtrack?: () => void;
  onSelectSituation?: (situation: SceneSituation) => void;
  // Lighting Presets
  onOpenLightingPresets?: () => void;
  // Session Chronicle Exporter
  onOpenChronicleExport?: () => void;
  // Combat Turn Timer
  onToggleCombatTimer?: () => void;
  onAddCombatTimerSeconds?: (seconds: number) => void;
  onResetCombatTimer?: () => void;
  onToggleCombatTimerVisibility?: () => void;
  /** Abre el modal de Biblioteca de Preparaciones y Sesiones. */
  onOpenSessionLibrary?: () => void;
  onOpenSaveScenePreset?: () => void;
  onOpenInsertScenePreset?: () => void;
  onSaveInitialBaseline?: () => void;
  onEvaluateReadiness?: () => void;
  /** Estado del respaldo externo de la sesión. */
  backupStatus?: BackupStatus;
  lastExportIsComplete?: boolean;
  initialViewMode?: 'modular' | 'console';
  onUpdateCharacter?: (
    id: string,
    updates: Partial<CharacterOnScreen>,
    description: string
  ) => void;
  onUpdateDisplayField?: <K extends keyof DisplayState>(
    field: K,
    value: DisplayState[K],
    description: string
  ) => void;
  onOpenCharacterLibrary?: () => void;
  onDismissCharacter?: (id: string) => void;
  onOpenFullScreenPreview?: () => void;
  canUndo?: boolean;
  onUpdateCombatantHp?: (combatantId: string, newHp: number) => void;
  onToggleCombatantCondition?: (combatantId: string, condition: string) => void;
  onStartCombat?: () => void;
  onEndCombat?: () => void;
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
  campaign,
  liveState,
  stagedState,
  operationMode,
  pendingChangesCount,
  connectionStatus,
  latencyMs: _latencyMs,
  roomCode: _roomCode,
  initialViewMode,
  onUpdateCharacter,
  onUpdateDisplayField,
  onOpenCharacterLibrary,
  onDismissCharacter,
  onOpenFullScreenPreview,
  canUndo,
  onSelectScene,
  onPrepareSceneInStaging,
  backupStatus,
  lastExportIsComplete,
  onPublishAllStaged,
  onOpenSelectivePublish,
  onDiscardStaged,
  onToggleOperationMode,
  onUndo,
  pastEvents = [],
  onOpenHistory,
  onTriggerLightning,
  onTriggerShake,
  onToggleBlackout: _onToggleBlackout,
  onToggleBanner,
  onToggleAmbientAudio,
  onExecuteFavorite,
  onOpenManageFavorites,
  onSwitchToTab,
  onToggleClassicView,
  onOpenCompositor,
  onSelectSceneVariant,
  onNextCombatTurn,
  onPrevCombatTurn,
  onPublishDialogue,
  onDismissDialogue,
  onCompleteDialogueText,
  onRepeatActions,
  executedActionLineIds,
  onSelectBranchChoice,
  selectedChoiceIds,
  onSetCameraTransform,
  onResetCamera,
  onOpenNewConversation,
  onOpenEditConversation,
  onUpdateSceneLights,
  onUpdateZoneEmitters,
  onRevealCharacterAppearance,
  onRevealCharacterIdentity,
  onTriggerInteraction,
  executingInteractionId,
  onOpenRevelationJournal,
  onOpenSessionPrepWizard,
  onFocusCombatant,
  onToggleCombatTrackingMode,
  onToggleDmSpeakingDucked,
  onSelectDuckingPreset,
  onOpenHandoutViewer,
  onOpenCampaignRecap,
  onOpenSoundboard,
  lightningConfig,
  onToggleAutoStorm,
  onToggleDisableFlash,
  onOpenBiomeSoundtrack,
  onSelectSituation,
  onOpenLightingPresets,
  onOpenChronicleExport,
  onToggleCombatTimer,
  onAddCombatTimerSeconds,
  onResetCombatTimer,
  onToggleCombatTimerVisibility,
  onOpenSessionLibrary,
  onOpenSaveScenePreset,
  onOpenInsertScenePreset,
  onSaveInitialBaseline,
  onEvaluateReadiness,
  onUpdateCombatantHp,
  onToggleCombatantCondition,
  onStartCombat,
  onEndCombat,
}) => {
  const [publishStatus, setPublishStatus] = useState<ActionExecutionStatus>('idle');
  const [confirmOverwriteStaging, setConfirmOverwriteStaging] = useState<Scene | null>(null);
  const [quickDrawer, setQuickDrawer] = useState<'more' | null>(null);
  const [recentScenes, setRecentScenes] = useState<Scene[]>([]);
  const [lastQuickAction, setLastQuickAction] = useState<string | null>(null);

  // ─── Session Header State ────────────────────────────────────────────────
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>('idle');
  const [sessionName, setSessionName] = useState<string>('');
  const [isEditingSessionName, setIsEditingSessionName] = useState(false);
  const sessionNameInputRef = useRef<HTMLInputElement>(null);
  const [savedRelativeTime, setSavedRelativeTime] = useState<number>(0);

  // Subscribe to draft save state from gameSessionService
  useEffect(() => {
    const unsubscribe = gameSessionService.subscribe((state) => {
      setDraftSaveState(state);
      if (state === 'saved') setSavedRelativeTime(Date.now());
    });
    // Sync session name
    const session = gameSessionService.getCurrentSession();
    if (session) setSessionName(session.name);
    return unsubscribe;
  }, []);

  // Update relative time label every 10s when saved
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const savedSecondsAgo =
    draftSaveState === 'idle' && savedRelativeTime > 0
      ? Math.floor((nowTs - savedRelativeTime) / 1000)
      : 0;

  const handleSessionNameKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await gameSessionService.renameSession(sessionName);
      setIsEditingSessionName(false);
    } else if (e.key === 'Escape') {
      const session = gameSessionService.getCurrentSession();
      setSessionName(session?.name ?? sessionName);
      setIsEditingSessionName(false);
    }
  };

  const handleSessionNameBlur = async () => {
    await gameSessionService.renameSession(sessionName);
    setIsEditingSessionName(false);
  };

  useEffect(() => {
    if (isEditingSessionName && sessionNameInputRef.current) {
      sessionNameInputRef.current.focus();
      sessionNameInputRef.current.select();
    }
  }, [isEditingSessionName]);

  // Find next scene in campaign relative to live scene
  const allScenes = campaign?.scenes || [];
  const activeScene = allScenes.find((s) => s.id === liveState.currentSceneId) || null;
  const currentSceneIndex = allScenes.findIndex((s) => s.id === liveState.currentSceneId);
  const nextSuggestedScene: Scene | null =
    currentSceneIndex >= 0 && currentSceneIndex < allScenes.length - 1
      ? allScenes[currentSceneIndex + 1]
      : allScenes.length > 0 && currentSceneIndex !== 0
      ? allScenes[0]
      : null;

  // Check if staged state has a different scene
  const isStagedSceneDifferent =
    stagedState.currentSceneId && stagedState.currentSceneId !== liveState.currentSceneId;
  const stagedSceneObj = isStagedSceneDifferent
    ? allScenes.find((s) => s.id === stagedState.currentSceneId) || null
    : null;

  const sceneToDisplayAsNext = stagedSceneObj || nextSuggestedScene;

  useEffect(() => {
    if (!activeScene) return;
    setRecentScenes((current) => [
      activeScene,
      ...current.filter((scene) => scene.id !== activeScene.id),
    ].slice(0, 5));
  }, [activeScene?.id]);

  const runQuickAction = (label: string, action: () => void) => {
    action();
    setLastQuickAction(label);
  };

  const handlePrepareNext = (scene: Scene) => {
    if (pendingChangesCount > 0) {
      setConfirmOverwriteStaging(scene);
    } else {
      onPrepareSceneInStaging(scene);
    }
  };

  const handleConfirmOverwrite = () => {
    if (confirmOverwriteStaging) {
      onPrepareSceneInStaging(confirmOverwriteStaging);
      setConfirmOverwriteStaging(null);
    }
  };

  const handlePublishClick = async () => {
    setPublishStatus('sending');
    try {
      const result = await onPublishAllStaged();
      if (result !== false) {
        setPublishStatus('ack');
        setTimeout(() => setPublishStatus('idle'), 2500);
      } else {
        setPublishStatus('rejected');
        setTimeout(() => setPublishStatus('idle'), 3000);
      }
    } catch {
      setPublishStatus('rejected');
      setTimeout(() => setPublishStatus('idle'), 3000);
    }
  };

  // Active Combat Info
  const combat = liveState.combatState;
  const isCombatActive = combat?.isActive;
  const currentCombatant =
    isCombatActive && combat.combatants.length > 0
      ? combat.combatants[combat.currentTurnIndex] || combat.combatants[0]
      : null;

  // Synchronized combat turn timer (local sub-second calculation)
  const [panelCombatRemaining, setPanelCombatRemaining] = useState<number>(() =>
    combat ? calculateRemainingTimerSeconds(combat) : 60
  );

  const [controlViewMode, setControlViewMode] = useState<'modular' | 'console'>(() => {
    if (initialViewMode) return initialViewMode;
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'modular';
    }
    return 'console';
  });
  const [quickDialogueChar, setQuickDialogueChar] = useState<CharacterOnScreen | null>(null);

  useEffect(() => {
    if (!combat?.isActive) return;
    const updateCountdown = () => {
      setPanelCombatRemaining(calculateRemainingTimerSeconds(combat));
    };
    updateCountdown();
    if (!combat.isTimerRunning) return;
    const interval = window.setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [
    combat?.isActive,
    combat?.isTimerRunning,
    combat?.turnTimerEndsAt,
    combat?.turnTimerRemainingSeconds,
    combat?.turnTimerSeconds,
    combat?.turnTimerTotalSeconds,
    combat?.turnId,
  ]);

  return (
    <div className="session-panel-root" role="main" aria-label="Panel de Sesión del DM">
      <SessionIdentityHeader
        sessionName={sessionName}
        isEditingSessionName={isEditingSessionName}
        sessionNameInputRef={sessionNameInputRef}
        onStartEditSessionName={() => setIsEditingSessionName(true)}
        onChangeSessionName={setSessionName}
        onSessionNameKeyDown={handleSessionNameKeyDown}
        onSessionNameBlur={handleSessionNameBlur}
        backupStatus={backupStatus}
        lastExportIsComplete={lastExportIsComplete}
        draftSaveState={draftSaveState}
        savedRelativeTime={savedRelativeTime}
        savedSecondsAgo={savedSecondsAgo}
        onOpenSessionLibrary={onOpenSessionLibrary}
        onSaveInitialBaseline={onSaveInitialBaseline}
        onEvaluateReadiness={onEvaluateReadiness}
      />

      {/* SELECTOR DE VISTA DE SESIÓN (PANEL MODULAR EN VIVO / CONSOLA CLÁSICA) */}
      <div className="session-view-mode-selector" role="tablist" aria-label="Modo de vista de control">
        <button
          type="button"
          className={`session-view-tab ${controlViewMode === 'modular' ? 'active' : ''}`}
          onClick={() => setControlViewMode('modular')}
          role="tab"
          aria-selected={controlViewMode === 'modular'}
        >
          <LayoutGrid size={15} />
          <span>Panel Modular</span>
        </button>
        <button
          type="button"
          className={`session-view-tab ${controlViewMode === 'console' ? 'active' : ''}`}
          onClick={() => setControlViewMode('console')}
          role="tab"
          aria-selected={controlViewMode === 'console'}
        >
          <Sliders size={15} />
          <span>Consola Clásica</span>
        </button>
      </div>

      {controlViewMode === 'modular' ? (
        <>
          <LiveModularControlPanel
            campaign={campaign}
            liveState={liveState}
            isConnected={connectionStatus === 'connected'}
            onUpdateCharacter={onUpdateCharacter}
            onUpdateDisplayField={onUpdateDisplayField}
            onSelectScene={onSelectScene}
            onOpenScenePicker={() => onSwitchToTab('library')}
            onTriggerTransition={onTriggerShake}
            onOpenCharacterLibrary={onOpenCharacterLibrary || (() => onSwitchToTab('library'))}
            onOpenQuickDialogue={(charId) => {
              const c = liveState.characters.find((char) => char.id === charId);
              if (c) setQuickDialogueChar(c);
            }}
            onDismissCharacter={onDismissCharacter}
            onUndo={onUndo}
            canUndo={canUndo || pastEvents.length > 0}
            onSavePreset={onOpenSaveScenePreset}
            onOpenAtmospherePresets={onOpenLightingPresets}
            onOpenSoundtrack={onOpenBiomeSoundtrack}
            onToggleAmbientAudio={onToggleAmbientAudio}
            onOpenFullScreen={onOpenFullScreenPreview}
            onNextCombatTurn={onNextCombatTurn}
            onPrevCombatTurn={onPrevCombatTurn}
            onUpdateCombatantHp={onUpdateCombatantHp}
            onToggleCombatantCondition={onToggleCombatantCondition}
            onStartCombat={onStartCombat}
            onEndCombat={onEndCombat}
            onFocusCombatant={
              onFocusCombatant && currentCombatant
                ? () => onFocusCombatant(currentCombatant.characterId || currentCombatant.id)
                : undefined
            }
            onOpenCombatTab={() => onSwitchToTab('combat')}
            combatTimerRemaining={panelCombatRemaining}
            isTimerRunning={combat?.isTimerRunning}
            onToggleTimer={onToggleCombatTimer}
          />
          {quickDialogueChar && (
            <ComposerDialogueQuickModal
              isOpen={!!quickDialogueChar}
              onClose={() => setQuickDialogueChar(null)}
              selectedChar={quickDialogueChar}
              onRehearse={(dlg) => onPublishDialogue?.(dlg)}
              onPublish={(dlg) => {
                onPublishDialogue?.(dlg);
                setQuickDialogueChar(null);
              }}
            />
          )}
        </>
      ) : (
        <>
          {/* 1. TOP STATUS & NAVIGATION BAR */}
          <SessionModeHeader
            operationMode={operationMode}
            onToggleOperationMode={onToggleOperationMode}
            pendingChangesCount={pendingChangesCount}
            onToggleClassicView={onToggleClassicView}
          />

          <section className="now-next-strip" aria-label="Estado Ahora y Después">
        <div className="now-next-scene now-next-current">
          <div className="now-next-label"><span className="now-next-dot live" /> Ahora · En Mesa</div>
          <div className="now-next-content">
            {activeScene?.backgroundUrl && <img src={activeScene.backgroundUrl} alt="" aria-hidden="true" />}
            <div>
              <strong>{activeScene?.name || liveState.sceneName || 'Sin escena'}</strong>
              <span>{liveState.characters.length} personaje(s) · estado confirmado</span>
            </div>
          </div>
        </div>

        <div className="now-next-arrow" aria-hidden="true">→</div>

        <div className={`now-next-scene now-next-staged ${isStagedSceneDifferent || pendingChangesCount > 0 ? 'has-pending' : ''}`}>
          <div className="now-next-label"><span className="now-next-dot staged" /> Después · Preparado</div>
          <div className="now-next-content">
            {(stagedSceneObj || (pendingChangesCount > 0 ? activeScene : null))?.backgroundUrl && (
              <img src={(stagedSceneObj || activeScene)!.backgroundUrl} alt="" aria-hidden="true" />
            )}
            <div>
              <strong>{stagedSceneObj?.name || (pendingChangesCount > 0 ? 'Cambios preparados' : 'Sin cambios preparados')}</strong>
              <span>{pendingChangesCount > 0 ? `${pendingChangesCount} cambio(s) pendiente(s)` : 'Listo para preparar'}</span>
            </div>
          </div>
        </div>

        {pendingChangesCount > 0 && (
          <div className="now-next-actions">
            <button type="button" className="now-next-publish" onClick={handlePublishClick} disabled={publishStatus === 'sending'}>
              {publishStatus === 'sending' ? 'Enviando…' : 'Publicar'}
            </button>
            <button type="button" className="now-next-discard" onClick={onDiscardStaged}>Descartar</button>
          </div>
        )}
      </section>

      {/* 2. DRAFT / PENDING CHANGES NOTIFICATION BAR */}
      <DraftPendingAlert
        pendingChangesCount={pendingChangesCount}
        publishStatus={publishStatus as any}
        onPublishClick={handlePublishClick}
        onOpenSelectivePublish={onOpenSelectivePublish}
        onDiscardStaged={onDiscardStaged}
      />

      <section className="live-quick-console" aria-label="Acciones rápidas de la sesión">
        <div className="live-quick-console-header">
          <div className="live-quick-console-title">
            <Radio size={15} />
            <span>Acciones rápidas</span>
            {operationMode === 'staging' && <span className="live-quick-console-mode">Preparación</span>}
          </div>
          <span className="live-quick-console-hint">Un toque durante la partida</span>
        </div>

        <div className="live-quick-actions" role="toolbar" aria-label="Acciones rápidas">
          <button type="button" className="live-quick-action accent" onClick={() => runQuickAction('Relámpago activado', onTriggerLightning)}>
            <Zap size={19} />
            <span>Relámpago</span>
          </button>
          <button type="button" className="live-quick-action" onClick={() => runQuickAction('Sacudida activada', onTriggerShake)}>
            <RefreshCcw size={18} />
            <span>Sacudir</span>
          </button>
          <button type="button" className="live-quick-action" onClick={() => runQuickAction('Cartel alternado', onToggleBanner)}>
            <MonitorPlay size={18} />
            <span>Cartel</span>
          </button>
          <button type="button" className="live-quick-action" onClick={() => runQuickAction('Ambiente alternado', onToggleAmbientAudio)}>
            <AudioLines size={18} />
            <span>Ambiente</span>
          </button>
          <button type="button" className="live-quick-action" onClick={() => onOpenSoundboard && runQuickAction('Panel de sonidos abierto', onOpenSoundboard)} disabled={!onOpenSoundboard}>
            <Volume2 size={18} />
            <span>Sonidos</span>
          </button>
          <button
            type="button"
            className={`live-quick-action more ${quickDrawer === 'more' ? 'active' : ''}`}
            onClick={() => setQuickDrawer('more')}
            aria-expanded={quickDrawer === 'more'}
          >
            <MoreHorizontal size={19} />
            <span>Más</span>
          </button>
          <button type="button" className="live-quick-action scene-edit" onClick={onOpenCompositor} disabled={!onOpenCompositor}>
            <ImagePlus size={18} />
            <span>Editar escena</span>
          </button>
        </div>
      </section>

      <section className={`contextual-control-panel ${isCombatActive ? 'combat-context' : 'scene-context'}`} aria-label="Controles según el contexto">
        <div className="contextual-control-heading">
          <div>
            <span className="contextual-control-eyebrow">Contexto actual</span>
            <strong>{isCombatActive ? 'Combate en curso' : 'Exploración y escena'}</strong>
          </div>
          <span className="contextual-control-status">
            {isCombatActive ? `Ronda ${combat.round}` : activeScene?.name || 'Sin escena'}
          </span>
        </div>

        {isCombatActive ? (
          <div className="contextual-control-body">
            <div className="contextual-current-info">
              <span>Turno actual</span>
              <strong>{currentCombatant?.name || 'Sin combatiente'}</strong>
            </div>
            <div className="contextual-control-actions">
              <button type="button" onClick={onPrevCombatTurn} disabled={!onPrevCombatTurn}>
                <ArrowLeft size={17} />
                <span>Anterior</span>
              </button>
              <button type="button" className="contextual-primary" onClick={onNextCombatTurn} disabled={!onNextCombatTurn}>
                <span>Siguiente turno</span>
                <ArrowRight size={17} />
              </button>
              <button type="button" onClick={() => onSwitchToTab('combat')}>
                <Swords size={17} />
                <span>Ver combate</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="contextual-control-body">
            <div className="contextual-current-info">
              <span>Próximo paso sugerido</span>
              <strong>{sceneToDisplayAsNext?.name || 'Elegí una escena reciente'}</strong>
            </div>
            <div className="contextual-control-actions">
              {sceneToDisplayAsNext && (
                <button type="button" className="contextual-primary" onClick={() => handlePrepareNext(sceneToDisplayAsNext)}>
                  <span>Preparar siguiente</span>
                  <ArrowRight size={17} />
                </button>
              )}
              <button type="button" onClick={() => onSwitchToTab('library')}>
                <Sparkles size={17} />
                <span>Buscar escena</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {quickDrawer === 'more' && (
        <div className="live-quick-drawer-overlay" onClick={() => setQuickDrawer(null)}>
          <section
            className="live-quick-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-quick-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="live-quick-drawer-handle" aria-hidden="true" />
            <div className="live-quick-drawer-header">
              <div>
                <span className="live-quick-drawer-eyebrow">Consola de partida</span>
                <h2 id="live-quick-drawer-title">Más acciones</h2>
              </div>
              <button type="button" className="live-quick-drawer-close" onClick={() => setQuickDrawer(null)} aria-label="Cerrar acciones rápidas">×</button>
            </div>
            <div className="live-quick-drawer-grid">
              <button type="button" onClick={() => { onOpenLightingPresets?.(); setQuickDrawer(null); }}>
                <Moon size={20} /><span>Iluminación</span>
              </button>
              <button type="button" className="live-quick-drawer-feature" onClick={() => { onOpenCompositor?.(); setQuickDrawer(null); }}>
                <Camera size={20} /><span>Cámara y escena</span>
              </button>
              <button type="button" onClick={() => { onOpenHandoutViewer?.(); setQuickDrawer(null); }}>
                <Eye size={20} /><span>Mostrar recurso</span>
              </button>
              <button type="button" onClick={() => { onOpenBiomeSoundtrack?.(); setQuickDrawer(null); }}>
                <Sparkles size={20} /><span>Música ambiental</span>
              </button>
              <button type="button" className="live-quick-drawer-feature" onClick={() => { onOpenCompositor?.(); setQuickDrawer(null); }}>
                <ImagePlus size={20} /><span>Fondo y personajes</span>
              </button>
              <button type="button" onClick={() => { onOpenLightingPresets?.(); setQuickDrawer(null); }}>
                <Flame size={20} /><span>Preset dramático</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {recentScenes.length > 0 && (
        <section className="recent-scenes-strip" aria-label="Escenas usadas recientemente">
          <div className="recent-scenes-heading">
            <span>Escenas recientes</span>
            {lastQuickAction && onUndo && (
              <span className="last-action-feedback" role="status">
                {lastQuickAction}
                <button type="button" onClick={onUndo}>Deshacer</button>
              </span>
            )}
          </div>
          <div className="recent-scenes-scroll">
            {recentScenes.map((scene) => (
              <button
                type="button"
                key={scene.id}
                className={`recent-scene-chip ${scene.id === liveState.currentSceneId ? 'active' : ''}`}
                onClick={() => onSelectScene(scene)}
                title={`Cambiar a ${scene.name}`}
              >
                <img src={scene.backgroundUrl} alt="" aria-hidden="true" />
                <span>{scene.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {pastEvents.length > 0 && (
        <section className="session-action-timeline" aria-label="Últimas acciones del director">
          <div className="session-action-timeline-header">
            <div className="flex-align-gap">
              <History size={15} className="text-amber-400" />
              <span>Últimas acciones</span>
            </div>
            {onOpenHistory && (
              <button type="button" onClick={onOpenHistory}>Ver historial completo</button>
            )}
          </div>
          <div className="session-action-timeline-list">
            {pastEvents.slice(0, 4).map((event) => (
              <div className="session-action-timeline-item" key={event.id}>
                <span className={`timeline-mode-dot ${event.mode}`} />
                <div>
                  <strong>{event.description}</strong>
                  <span>{event.stateSnapshot.sceneName || 'Sin escena'} · {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. MAIN CARDS GRID */}
      <div className="session-cards-grid">
        {/* CARD A: ESCENA ACTIVA EN VIVO */}
        <ActiveSceneCard
          liveState={liveState}
          activeScene={activeScene}
          campaign={campaign}
          onToggleBanner={onToggleBanner}
          onTriggerLightning={onTriggerLightning}
          onTriggerShake={onTriggerShake}
          onToggleAmbientAudio={onToggleAmbientAudio}
          onToggleAutoStorm={onToggleAutoStorm}
          lightningConfig={lightningConfig}
          onToggleDisableFlash={onToggleDisableFlash}
          onToggleDmSpeakingDucked={onToggleDmSpeakingDucked}
          onSelectDuckingPreset={onSelectDuckingPreset}
          onOpenCompositor={onOpenCompositor}
          onOpenSoundboard={onOpenSoundboard}
          onSetCameraTransform={onSetCameraTransform}
          onResetCamera={onResetCamera}
          onUpdateSceneLights={onUpdateSceneLights}
          onUpdateZoneEmitters={onUpdateZoneEmitters}
          onSelectSceneVariant={onSelectSceneVariant}
          onRevealCharacterAppearance={onRevealCharacterAppearance}
          onRevealCharacterIdentity={onRevealCharacterIdentity}
          onTriggerInteraction={onTriggerInteraction}
          executingInteractionId={executingInteractionId}
          onOpenLightingPresets={onOpenLightingPresets}
          onOpenRevelationJournal={onOpenRevelationJournal}
          onOpenCampaignRecap={onOpenCampaignRecap}
          onOpenSessionPrepWizard={onOpenSessionPrepWizard}
          onOpenHandoutViewer={onOpenHandoutViewer}
          onOpenBiomeSoundtrack={onOpenBiomeSoundtrack}
          onOpenChronicleExport={onOpenChronicleExport}
          onSelectSituation={onSelectSituation}
        />

        {/* CARD B: SIGUIENTE ESCENA / PREPARACIÓN */}
        <NextSuggestedSceneCard
          isStagedSceneDifferent={Boolean(isStagedSceneDifferent)}
          sceneToDisplayAsNext={sceneToDisplayAsNext}
          publishStatus={publishStatus}
          onOpenSaveScenePreset={onOpenSaveScenePreset}
          onOpenInsertScenePreset={onOpenInsertScenePreset}
          handlePublishClick={handlePublishClick}
          handlePrepareNext={handlePrepareNext}
          onSelectScene={onSelectScene}
          onSwitchToTab={onSwitchToTab}
        />

        {/* CARD C: WIDGET CONTEXTUAL DE COMBATE */}
        <CombatContextCard
          isCombatActive={isCombatActive}
          round={combat.round}
          currentCombatant={currentCombatant}
          panelCombatRemaining={panelCombatRemaining}
          isTimerRunning={combat.isTimerRunning}
          showTurnTimerToPlayers={combat.showTurnTimerToPlayers}
          trackingMode={liveState.combatState?.trackingMode}
          isCombatantOnStage={liveState.characters.some(
            (c) => c.id === currentCombatant?.characterId || c.id === currentCombatant?.id
          )}
          onSwitchToTab={onSwitchToTab as any}
          onToggleCombatTrackingMode={onToggleCombatTrackingMode}
          onFocusCombatant={
            onFocusCombatant && currentCombatant
              ? () => onFocusCombatant(currentCombatant.characterId || currentCombatant.id)
              : undefined
          }
          onToggleCombatTimer={onToggleCombatTimer}
          onAddCombatTimerSeconds={onAddCombatTimerSeconds}
          onResetCombatTimer={onResetCombatTimer}
          onToggleCombatTimerVisibility={onToggleCombatTimerVisibility}
          onPrevCombatTurn={onPrevCombatTurn || (() => {})}
          onNextCombatTurn={onNextCombatTurn || (() => {})}
        />
      </div>

      {/* 3.5 CINEMATIC DIALOGUE & NARRATION DOCK */}
      {onPublishDialogue && onDismissDialogue && onCompleteDialogueText && (
        <section
          className="session-dialogue-dock-section"
          style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}
        >
          <CinematicDialogueDock
            characters={liveState.characters}
            activeDialogue={liveState.dialogue}
            savedConversations={gameSessionService.getActiveConversations(
              campaign?.savedConversations || []
            )}
            macros={gameSessionService.getActiveMacros(campaign?.macros || [])}
            onPublishDialogue={onPublishDialogue}
            onDismissDialogue={async () => {
              await onDismissDialogue();
            }}
            onCompleteDialogueText={async () => {
              await onCompleteDialogueText();
            }}
            onOpenNewConversation={onOpenNewConversation}
            onOpenEditConversation={onOpenEditConversation}
            onRepeatActions={
              onRepeatActions
                ? async (actions, lineId) => {
                    await onRepeatActions(actions, lineId);
                  }
                : undefined
            }
            executedActionLineIds={executedActionLineIds}
            onSelectBranchChoice={onSelectBranchChoice}
            selectedChoiceIds={selectedChoiceIds}
          />
        </section>
      )}

      {/* 4. DM FAVORITES ACTION BAR */}
      <SessionFavoritesBar
        campaign={campaign}
        favorites={campaign?.favorites || []}
        onExecuteFavorite={onExecuteFavorite}
        onOpenManageFavorites={onOpenManageFavorites}
      />
        </>
      )}

      {/* Confirmation Dialog: Overwrite Staging */}
      <OverwriteStagingModal
        confirmOverwriteStaging={confirmOverwriteStaging}
        pendingChangesCount={pendingChangesCount}
        onCancel={() => setConfirmOverwriteStaging(null)}
        onConfirmOverwrite={handleConfirmOverwrite}
        onPublishFirstAndLoad={() => {
          onPublishAllStaged();
          handleConfirmOverwrite();
        }}
      />
    </div>
  );
};
