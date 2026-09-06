import React, { useState, useEffect, useRef } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { LayoutGrid, Sliders, Zap } from 'lucide-react';
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
import { SessionClassicConsoleView } from './sessionPanel/SessionClassicConsoleView';
import { OverwriteStagingModal } from './sessionPanel/OverwriteStagingModal';
import { calculateRemainingTimerSeconds } from '../../domain/combat/combatTimerCoordinator';
import { LiveModularControlPanel } from './modularControl/LiveModularControlPanel';
import { ComposerDialogueQuickModal } from './composer/ComposerDialogueQuickModal';
import { LiveQuickSessionView } from './LiveQuickSessionView';

export interface SessionPanelProps {
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
  /** Abre el gestor de paquetes de recursos (.vppack). */
  onOpenResourcePacks?: () => void;
  onOpenSaveScenePreset?: () => void;
  onOpenInsertScenePreset?: () => void;
  onSaveInitialBaseline?: () => void;
  onEvaluateReadiness?: () => void;
  /** Estado del respaldo externo de la sesión. */
  backupStatus?: BackupStatus;
  lastExportIsComplete?: boolean;
  initialViewMode?: 'quick' | 'modular' | 'console';
  hasRunningMacro?: boolean;
  runningMacroName?: string;
  onCancelMacro?: () => void;
  isMuted?: boolean;
  onToggleMuteTotal?: () => void;
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
  onToggleBlackout,
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
  onOpenResourcePacks,
  onOpenSaveScenePreset,
  onOpenInsertScenePreset,
  onSaveInitialBaseline,
  onEvaluateReadiness,
  onUpdateCombatantHp,
  onToggleCombatantCondition,
  onStartCombat,
  onEndCombat,
  hasRunningMacro = false,
  runningMacroName,
  onCancelMacro,
  isMuted = false,
  onToggleMuteTotal,
}) => {
  const [publishStatus, setPublishStatus] = useState<ActionExecutionStatus>('idle');
  const [confirmOverwriteStaging, setConfirmOverwriteStaging] = useState<Scene | null>(null);
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

  const [controlViewMode, setControlViewMode] = useState<'quick' | 'modular' | 'console'>(() => {
    if (initialViewMode) return initialViewMode;
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      return 'quick';
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
        onOpenResourcePacks={onOpenResourcePacks}
        onSaveInitialBaseline={onSaveInitialBaseline}
        onEvaluateReadiness={onEvaluateReadiness}
      />

      {/* SELECTOR DE VISTA DE SESIÓN (HOY JUEGO / PANEL MODULAR / CONSOLA CLÁSICA) */}
      <Tabs.Root
        className="session-view-tabs-root"
        value={controlViewMode}
        onValueChange={(value) => setControlViewMode(value as 'quick' | 'modular' | 'console')}
      >
        <Tabs.List className="session-view-mode-selector" aria-label="Modo de vista de control">
          <Tabs.Trigger
            type="button"
            className="session-view-tab"
            value="quick"
            onClick={() => setControlViewMode('quick')}
          >
            <Zap size={15} />
            <span>Hoy juego</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            type="button"
            className="session-view-tab"
            value="modular"
            onClick={() => setControlViewMode('modular')}
          >
            <LayoutGrid size={15} />
            <span>Panel Modular</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            type="button"
            className="session-view-tab"
            value="console"
            onClick={() => setControlViewMode('console')}
          >
            <Sliders size={15} />
            <span>Consola Clásica</span>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>

      {controlViewMode === 'quick' ? (
        <LiveQuickSessionView
          campaign={campaign}
          liveState={liveState}
          stagedState={stagedState}
          pendingChangesCount={pendingChangesCount}
          isConnected={connectionStatus === 'connected'}
          onSelectScene={onSelectScene}
          onPrepareSceneInStaging={onPrepareSceneInStaging}
          onPublishAllStaged={handlePublishClick}
          onDiscardStaged={onDiscardStaged}
          onTriggerLightning={onTriggerLightning}
          onTriggerShake={onTriggerShake}
          onToggleBlackout={onToggleBlackout}
          onToggleBanner={onToggleBanner}
          onToggleAmbientAudio={onToggleAmbientAudio}
          onExecuteFavorite={onExecuteFavorite}
          onOpenManageFavorites={onOpenManageFavorites}
          onStartCombat={onStartCombat || (() => onSwitchToTab('combat'))}
          onEndCombat={onEndCombat || (() => {})}
          onNextCombatTurn={onNextCombatTurn || (() => {})}
          onPrevCombatTurn={onPrevCombatTurn || (() => {})}
          onOpenCombatTab={() => onSwitchToTab('combat')}
          hasRunningMacro={hasRunningMacro}
          runningMacroName={runningMacroName}
          onCancelMacro={onCancelMacro}
          isMuted={isMuted}
          onToggleMuteTotal={onToggleMuteTotal}
        />
      ) : controlViewMode === 'modular' ? (
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
            onTriggerLightning={onTriggerLightning}
            onTriggerShake={onTriggerShake}
            onToggleBlackout={onToggleBlackout}
            onToggleBanner={onToggleBanner}
            favorites={campaign?.favorites || []}
            onExecuteFavorite={onExecuteFavorite}
            onOpenNotes={() => onSwitchToTab('notes')}
            onOpenRevelationJournal={onOpenRevelationJournal}
            onOpenManageFavorites={onOpenManageFavorites}
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
        <SessionClassicConsoleView
          campaign={campaign}
          liveState={liveState}
          activeScene={activeScene}
          stagedSceneObj={stagedSceneObj}
          sceneToDisplayAsNext={sceneToDisplayAsNext}
          isStagedSceneDifferent={Boolean(isStagedSceneDifferent)}
          operationMode={operationMode}
          pendingChangesCount={pendingChangesCount}
          publishStatus={publishStatus}
          lastQuickAction={lastQuickAction}
          recentScenes={recentScenes}
          pastEvents={pastEvents}
          panelCombatRemaining={panelCombatRemaining}
          currentCombatant={currentCombatant}
          lightningConfig={lightningConfig}
          executingInteractionId={executingInteractionId}
          executedActionLineIds={executedActionLineIds}
          selectedChoiceIds={selectedChoiceIds}
          onToggleOperationMode={onToggleOperationMode}
          onToggleClassicView={onToggleClassicView}
          handlePublishClick={handlePublishClick}
          onOpenSelectivePublish={onOpenSelectivePublish}
          onDiscardStaged={onDiscardStaged}
          onTriggerLightning={onTriggerLightning}
          onTriggerShake={onTriggerShake}
          onToggleBanner={onToggleBanner}
          onToggleAmbientAudio={onToggleAmbientAudio}
          onOpenSoundboard={onOpenSoundboard}
          onOpenCompositor={onOpenCompositor}
          onOpenLightingPresets={onOpenLightingPresets}
          onOpenHandoutViewer={onOpenHandoutViewer}
          onOpenBiomeSoundtrack={onOpenBiomeSoundtrack}
          onQuickActionTriggered={(label) => setLastQuickAction(label)}
          onPrevCombatTurn={onPrevCombatTurn}
          onNextCombatTurn={onNextCombatTurn}
          onSwitchToTab={onSwitchToTab}
          handlePrepareNext={handlePrepareNext}
          onUndo={onUndo}
          onSelectScene={onSelectScene}
          onOpenHistory={onOpenHistory}
          onToggleAutoStorm={onToggleAutoStorm}
          onToggleDisableFlash={onToggleDisableFlash}
          onToggleDmSpeakingDucked={onToggleDmSpeakingDucked}
          onSelectDuckingPreset={onSelectDuckingPreset}
          onSetCameraTransform={onSetCameraTransform}
          onResetCamera={onResetCamera}
          onUpdateSceneLights={onUpdateSceneLights}
          onUpdateZoneEmitters={onUpdateZoneEmitters}
          onSelectSceneVariant={onSelectSceneVariant}
          onRevealCharacterAppearance={onRevealCharacterAppearance}
          onRevealCharacterIdentity={onRevealCharacterIdentity}
          onTriggerInteraction={onTriggerInteraction}
          onOpenRevelationJournal={onOpenRevelationJournal}
          onOpenCampaignRecap={onOpenCampaignRecap}
          onOpenSessionPrepWizard={onOpenSessionPrepWizard}
          onOpenChronicleExport={onOpenChronicleExport}
          onSelectSituation={onSelectSituation}
          onOpenSaveScenePreset={onOpenSaveScenePreset}
          onOpenInsertScenePreset={onOpenInsertScenePreset}
          onToggleCombatTrackingMode={onToggleCombatTrackingMode}
          onFocusCombatant={onFocusCombatant}
          onToggleCombatTimer={onToggleCombatTimer}
          onAddCombatTimerSeconds={onAddCombatTimerSeconds}
          onResetCombatTimer={onResetCombatTimer}
          onToggleCombatTimerVisibility={onToggleCombatTimerVisibility}
          onPublishDialogue={onPublishDialogue}
          onDismissDialogue={onDismissDialogue}
          onCompleteDialogueText={onCompleteDialogueText}
          onRepeatActions={onRepeatActions}
          onSelectBranchChoice={onSelectBranchChoice}
          onOpenNewConversation={onOpenNewConversation}
          onOpenEditConversation={onOpenEditConversation}
          onExecuteFavorite={onExecuteFavorite}
          onOpenManageFavorites={onOpenManageFavorites}
        />
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
