import React from 'react';
import type {
  Campaign,
  DisplayState,
  Scene,
  SceneVariant,
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
  HistoryEvent,
  DMFavoriteItem,
  Combatant,
} from '../../../types';
import { gameSessionService } from '../../../services/gameSessionService';
import { SessionModeHeader } from './SessionModeHeader';
import { SessionNowNextStrip } from './SessionNowNextStrip';
import { DraftPendingAlert } from './DraftPendingAlert';
import { SessionQuickActionsBar } from './SessionQuickActionsBar';
import { SessionContextualPanel } from './SessionContextualPanel';
import { SessionRecentScenesStrip } from './SessionRecentScenesStrip';
import { SessionActionTimeline } from './SessionActionTimeline';
import { ActiveSceneCard } from './ActiveSceneCard';
import { NextSuggestedSceneCard } from './NextSuggestedSceneCard';
import { CombatContextCard } from './CombatContextCard';
import { CinematicDialogueDock } from '../CinematicDialogueDock';
import { SessionFavoritesBar } from '../SessionFavoritesBar';

export interface SessionClassicConsoleViewProps {
  campaign: Campaign | null;
  liveState: DisplayState;
  activeScene: Scene | null;
  stagedSceneObj: Scene | null;
  sceneToDisplayAsNext: Scene | null;
  isStagedSceneDifferent: boolean;
  operationMode: 'live' | 'staging';
  pendingChangesCount: number;
  publishStatus: ActionExecutionStatus;
  lastQuickAction: string | null;
  recentScenes: Scene[];
  pastEvents: HistoryEvent[];
  panelCombatRemaining: number;
  currentCombatant: Combatant | null;
  lightningConfig?: LightningConfig;
  executingInteractionId?: string | null;
  executedActionLineIds?: Record<string, string>;
  selectedChoiceIds?: Record<string, string>;

  onToggleOperationMode: (mode: 'live' | 'staging') => void;
  onToggleClassicView: () => void;
  handlePublishClick: () => Promise<void> | void;
  onOpenSelectivePublish: () => void;
  onDiscardStaged: () => void;
  onTriggerLightning: () => void;
  onTriggerShake: () => void;
  onToggleBanner: () => void;
  onToggleAmbientAudio: () => void;
  onOpenSoundboard?: () => void;
  onOpenCompositor?: () => void;
  onOpenLightingPresets?: () => void;
  onOpenHandoutViewer?: () => void;
  onOpenBiomeSoundtrack?: () => void;
  onQuickActionTriggered: (label: string) => void;
  onPrevCombatTurn?: () => void;
  onNextCombatTurn?: () => void;
  onSwitchToTab: (tab: 'live' | 'moments' | 'combat' | 'notes' | 'library') => void;
  handlePrepareNext: (scene: Scene) => void;
  onUndo?: () => void;
  onSelectScene: (scene: Scene) => void;
  onOpenHistory?: () => void;
  onToggleAutoStorm?: () => void;
  onToggleDisableFlash?: () => void;
  onToggleDmSpeakingDucked?: () => void;
  onSelectDuckingPreset?: (preset: DuckingPreset) => void;
  onSetCameraTransform?: (transform: CameraTransform) => void;
  onResetCamera?: () => void;
  onUpdateSceneLights?: (lights: SceneLight[]) => void;
  onUpdateZoneEmitters?: (emitters: SceneZoneEmitter[]) => void;
  onSelectSceneVariant?: (variant: SceneVariant) => void;
  onRevealCharacterAppearance?: (characterId: string) => void;
  onRevealCharacterIdentity?: (characterId: string) => void;
  onTriggerInteraction?: (
    interaction: SceneInteraction,
    transition: SceneInteractionTransition
  ) => Promise<void> | void;
  onOpenRevelationJournal?: () => void;
  onOpenCampaignRecap?: () => void;
  onOpenSessionPrepWizard?: () => void;
  onOpenChronicleExport?: () => void;
  onSelectSituation?: (situation: SceneSituation) => void;
  onOpenSaveScenePreset?: () => void;
  onOpenInsertScenePreset?: () => void;
  onToggleCombatTrackingMode?: (mode: CombatTrackingMode) => void;
  onFocusCombatant?: (combatantId: string) => void;
  onToggleCombatTimer?: () => void;
  onAddCombatTimerSeconds?: (seconds: number) => void;
  onResetCombatTimer?: () => void;
  onToggleCombatTimerVisibility?: () => void;
  onPublishDialogue?: (
    dialogue: CinematicDialogue,
    actions?: DialogueLineActions,
    lineId?: string
  ) => Promise<void>;
  onDismissDialogue?: () => Promise<void> | void;
  onCompleteDialogueText?: () => Promise<void> | void;
  onRepeatActions?: (actions: DialogueLineActions, lineId: string) => Promise<void> | void;
  onSelectBranchChoice?: (choice: DialogueBranchChoice) => void;
  onOpenNewConversation?: () => void;
  onOpenEditConversation?: (conversation: SavedConversation) => void;
  onExecuteFavorite: (item: DMFavoriteItem) => Promise<boolean>;
  onOpenManageFavorites: () => void;
}

export const SessionClassicConsoleView: React.FC<SessionClassicConsoleViewProps> = ({
  campaign,
  liveState,
  activeScene,
  stagedSceneObj,
  sceneToDisplayAsNext,
  isStagedSceneDifferent,
  operationMode,
  pendingChangesCount,
  publishStatus,
  lastQuickAction,
  recentScenes,
  pastEvents,
  panelCombatRemaining,
  currentCombatant,
  lightningConfig,
  executingInteractionId,
  executedActionLineIds,
  selectedChoiceIds,

  onToggleOperationMode,
  onToggleClassicView,
  handlePublishClick,
  onOpenSelectivePublish,
  onDiscardStaged,
  onTriggerLightning,
  onTriggerShake,
  onToggleBanner,
  onToggleAmbientAudio,
  onOpenSoundboard,
  onOpenCompositor,
  onOpenLightingPresets,
  onOpenHandoutViewer,
  onOpenBiomeSoundtrack,
  onQuickActionTriggered,
  onPrevCombatTurn,
  onNextCombatTurn,
  onSwitchToTab,
  handlePrepareNext,
  onUndo,
  onSelectScene,
  onOpenHistory,
  onToggleAutoStorm,
  onToggleDisableFlash,
  onToggleDmSpeakingDucked,
  onSelectDuckingPreset,
  onSetCameraTransform,
  onResetCamera,
  onUpdateSceneLights,
  onUpdateZoneEmitters,
  onSelectSceneVariant,
  onRevealCharacterAppearance,
  onRevealCharacterIdentity,
  onTriggerInteraction,
  onOpenRevelationJournal,
  onOpenCampaignRecap,
  onOpenSessionPrepWizard,
  onOpenChronicleExport,
  onSelectSituation,
  onOpenSaveScenePreset,
  onOpenInsertScenePreset,
  onToggleCombatTrackingMode,
  onFocusCombatant,
  onToggleCombatTimer,
  onAddCombatTimerSeconds,
  onResetCombatTimer,
  onToggleCombatTimerVisibility,
  onPublishDialogue,
  onDismissDialogue,
  onCompleteDialogueText,
  onRepeatActions,
  onSelectBranchChoice,
  onOpenNewConversation,
  onOpenEditConversation,
  onExecuteFavorite,
  onOpenManageFavorites,
}) => {
  const combat = liveState.combatState;
  const isCombatActive = combat?.isActive;

  return (
    <>
      {/* 1. TOP STATUS & NAVIGATION BAR */}
      <SessionModeHeader
        operationMode={operationMode}
        onToggleOperationMode={onToggleOperationMode}
        pendingChangesCount={pendingChangesCount}
        onToggleClassicView={onToggleClassicView}
      />

      {/* 1.5 AHORA Y DESPUÉS (NOW & NEXT STRIP) */}
      <SessionNowNextStrip
        activeScene={activeScene}
        liveState={liveState}
        stagedSceneObj={stagedSceneObj}
        pendingChangesCount={pendingChangesCount}
        isStagedSceneDifferent={isStagedSceneDifferent}
        publishStatus={publishStatus}
        onPublishClick={handlePublishClick}
        onDiscardStaged={onDiscardStaged}
      />

      {/* 2. DRAFT / PENDING CHANGES NOTIFICATION BAR */}
      <DraftPendingAlert
        pendingChangesCount={pendingChangesCount}
        publishStatus={publishStatus as any}
        onPublishClick={handlePublishClick}
        onOpenSelectivePublish={onOpenSelectivePublish}
        onDiscardStaged={onDiscardStaged}
      />

      {/* 2.5 QUICK ACTIONS BAR */}
      <SessionQuickActionsBar
        operationMode={operationMode}
        onTriggerLightning={onTriggerLightning}
        onTriggerShake={onTriggerShake}
        onToggleBanner={onToggleBanner}
        onToggleAmbientAudio={onToggleAmbientAudio}
        onOpenSoundboard={onOpenSoundboard}
        onOpenCompositor={onOpenCompositor}
        onOpenLightingPresets={onOpenLightingPresets}
        onOpenHandoutViewer={onOpenHandoutViewer}
        onOpenBiomeSoundtrack={onOpenBiomeSoundtrack}
        onQuickActionTriggered={onQuickActionTriggered}
      />

      {/* 2.75 CONTEXTUAL CONTROL PANEL */}
      <SessionContextualPanel
        isCombatActive={isCombatActive}
        combat={combat}
        currentCombatant={currentCombatant}
        activeScene={activeScene}
        sceneToDisplayAsNext={sceneToDisplayAsNext}
        onPrevCombatTurn={onPrevCombatTurn}
        onNextCombatTurn={onNextCombatTurn}
        onSwitchToTab={onSwitchToTab}
        onPrepareNext={handlePrepareNext}
      />

      {/* RECENT SCENES STRIP */}
      <SessionRecentScenesStrip
        recentScenes={recentScenes}
        currentSceneId={liveState.currentSceneId}
        lastQuickAction={lastQuickAction}
        onUndo={onUndo}
        onSelectScene={onSelectScene}
      />

      {/* ACTION TIMELINE */}
      <SessionActionTimeline pastEvents={pastEvents} onOpenHistory={onOpenHistory} />

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
          handlePublishClick={async () => {
            await handlePublishClick();
          }}
          handlePrepareNext={handlePrepareNext}
          onSelectScene={onSelectScene}
          onSwitchToTab={onSwitchToTab}
        />

        {/* CARD C: WIDGET CONTEXTUAL DE COMBATE */}
        {combat && (
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
        )}
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
  );
};
