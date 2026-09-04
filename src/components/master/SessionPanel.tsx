import React, { useState, useEffect, useRef } from 'react';
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
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
  campaign,
  liveState,
  stagedState,
  operationMode,
  pendingChangesCount,
  connectionStatus: _connectionStatus,
  latencyMs: _latencyMs,
  roomCode: _roomCode,
  onSelectScene,
  onPrepareSceneInStaging,
  backupStatus,
  lastExportIsComplete,
  onPublishAllStaged,
  onOpenSelectivePublish,
  onDiscardStaged,
  onToggleOperationMode,
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
}) => {
  const [publishStatus, setPublishStatus] = useState<ActionExecutionStatus>('idle');
  const [confirmOverwriteStaging, setConfirmOverwriteStaging] = useState<Scene | null>(null);

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

      {/* 1. TOP STATUS & NAVIGATION BAR */}
      <SessionModeHeader
        operationMode={operationMode}
        onToggleOperationMode={onToggleOperationMode}
        pendingChangesCount={pendingChangesCount}
        onToggleClassicView={onToggleClassicView}
      />

      {/* 2. DRAFT / PENDING CHANGES NOTIFICATION BAR */}
      <DraftPendingAlert
        pendingChangesCount={pendingChangesCount}
        publishStatus={publishStatus as any}
        onPublishClick={handlePublishClick}
        onOpenSelectivePublish={onOpenSelectivePublish}
        onDiscardStaged={onDiscardStaged}
      />

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
