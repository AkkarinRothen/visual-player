import React, { useState, useEffect, useCallback } from 'react';
import type {
  Campaign,
  Character,
  CharacterOnScreen,
  CharacterPosition,
  CinematicMacro,
  DisplayState,
  Scene,
  SavedEncounter,
  GameSession,
  SavedConversation,
} from '../../types';
import { soundEngine } from '../../services/soundEngine';
import { sessionRecoveryService } from '../../services/sessionRecovery';
import {
  initDefaultDataIfNeeded,
  getAllCampaigns,
  getCampaignCheckpoints,
  getCampaignEncounters,
  saveCheckpoint,
} from '../../db';
import { gameSessionService } from '../../services/gameSessionService';
import { useMasterConnection } from '../../hooks/useMasterConnection';
import { useDisplaySession } from '../../hooks/useDisplaySession';
import { useMacroSequencer } from '../../hooks/useMacroSequencer';
import { accumulateMacroToState } from '../../domain/macros/macroEngine';
import { useEmergencyActions } from '../../hooks/useEmergencyActions';
import { useFavoritesActions } from '../../hooks/useFavoritesActions';
import { sessionCommandBus } from '../../services/sessionCommandBus';
import { peerService } from '../../services/peerService';
import { useStormCoordinator } from './controller/useStormCoordinator';
import { useDirectorHandlers } from './controller/useDirectorHandlers';
import { useSessionSceneHandlers } from './controller/useSessionSceneHandlers';
import { useCombatCoordinator } from './controller/useCombatCoordinator';
import { useCampaignManagement } from './controller/useCampaignManagement';
import { useMasterBackButton } from './controller/useMasterBackButton';
import { useMasterAtmosphereActions } from './controller/useMasterAtmosphereActions';
import { useCheckpointManagement } from './controller/useCheckpointManagement';
import { useVersionTelemetry } from './controller/useVersionTelemetry';
import { PartyModeControl } from './controller/PartyModeControl';
import { MasterHeader } from './controller/MasterHeader';
import { MasterPrimaryModals } from './modals/MasterPrimaryModals';
import { MasterMainTabs } from './controller/MasterMainTabs';
import { SessionPanel } from './SessionPanel';
import { EmergencyDock } from './EmergencyDock';
import { MasterAuxiliaryModals } from './modals/MasterAuxiliaryModals';
import { MasterBottomNav } from './navigation/MasterBottomNav';
import { MobileToolsDrawer } from './navigation/MobileToolsDrawer';
import { ResourcePacksModal } from './modals/ResourcePacksModal';

export interface MasterControllerProps {
  initialRoomCode?: string;
  pairingSecret?: string;
  onExitToLobby?: () => void;
}

export const MasterController: React.FC<MasterControllerProps> = ({
  initialRoomCode,
  pairingSecret,
  onExitToLobby,
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'moments' | 'combat' | 'notes' | 'library'>('live');
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'live' | 'staged'>('live');
  const [showFullScreenPreview, setShowFullScreenPreview] = useState<boolean>(false);
  const [showUnsavedStagingDialog, setShowUnsavedStagingDialog] = useState<boolean>(false);
  const [showSelectivePublishModal, setShowSelectivePublishModal] = useState<boolean>(false);

  // Modals & UI State
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showCheckpointsModal, setShowCheckpointsModal] = useState<boolean>(false);
  const [showQuickMoments, setShowQuickMoments] = useState<boolean>(false);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState<boolean>(false);

  // Campaigns & DB State
  const [campaignList, setCampaignList] = useState<Campaign[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [encountersList, setEncountersList] = useState<SavedEncounter[]>([]);
  const [showCampaignPickerModal, setShowCampaignPickerModal] = useState<boolean>(false);

  // Forms & Edit Modals
  const [showSummonModal, setShowSummonModal] = useState<boolean>(false);
  const [showNewSceneModal, setShowNewSceneModal] = useState<boolean>(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [showNewCharModal, setShowNewCharModal] = useState<boolean>(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);

  // Session View & Auxiliary Modals State
  const [sessionViewMode, setSessionViewMode] = useState<'session' | 'classic'>('classic');
  const [showManageFavoritesModal, setShowManageFavoritesModal] = useState<boolean>(false);
  const [showCompositorModal, setShowCompositorModal] = useState<boolean>(false);
  const [showConversationEditor, setShowConversationEditor] = useState<boolean>(false);
  const [editingConversation, setEditingConversation] = useState<SavedConversation | null>(null);
  const [showRevelationJournalModal, setShowRevelationJournalModal] = useState<boolean>(false);
  const [showSessionPrepWizardModal, setShowSessionPrepWizardModal] = useState<boolean>(false);
  const [showHandoutViewerModal, setShowHandoutViewerModal] = useState<boolean>(false);
  const [showCampaignRecapModal, setShowCampaignRecapModal] = useState<boolean>(false);
  const [showSoundboardModal, setShowSoundboardModal] = useState<boolean>(false);
  const [showBiomeSoundtrackModal, setShowBiomeSoundtrackModal] = useState<boolean>(false);
  const [showLightingPresetsModal, setShowLightingPresetsModal] = useState<boolean>(false);
  const [showChronicleExportModal, setShowChronicleExportModal] = useState<boolean>(false);
  const [showSessionLibraryModal, setShowSessionLibraryModal] = useState<boolean>(false);
  const [showScenePresetModal, setShowScenePresetModal] = useState<boolean>(false);
  const [scenePresetMode, setScenePresetMode] = useState<'save' | 'insert'>('save');
  const [showReadinessModal, setShowReadinessModal] = useState<boolean>(false);
  const [showResourcePacksModal, setShowResourcePacksModal] = useState<boolean>(false);
  const [partyMode, setPartyMode] = useState(false);
  const [partyMenuOpen, setPartyMenuOpen] = useState(false);
  const [partyControlsVisible, setPartyControlsVisible] = useState(true);
  const [partyKeepAwake, setPartyKeepAwake] = useState(false);
  const [partyImmersive, setPartyImmersive] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  // 1. Connection Hook
  const {
    roomCode,
    connectionStatus,
    latencyMs,
    mesaTelemetry,
    pendingCommandsCount,
    connectToRoom,
    broadcastFullState,
    broadcastMessage,
  } = useMasterConnection({
    initialRoomCode,
    pairingSecret,
    onFullStateRequested: () => {
      broadcastFullState(liveState);
    },
  });

  // Version & Feature Capability Matrix Evaluation Hook
  const { versionCompatibility } = useVersionTelemetry();

  // 2. Display Session Hook (useReducer)
  const {
    liveState,
    stagedState,
    activeDisplay,
    operationMode,
    pendingChangesCount,
    pastEvents,
    futureEvents,
    sessionRevision,
    initSessionState,
    setStagedStateOnly,
    updateDisplay,
    setOperationMode,
    undo,
    redo,
    publishAllStaged,
    publishSelectiveStaged,
    discardStaged,
    restoreSnapshot,
  } = useDisplaySession({
    onBroadcastState: (state) => {
      broadcastFullState(state);
    },
    onCreateAutoCheckpoint: (triggerName, state) => {
      createAutoCheckpoint(triggerName, state);
    },
  });

  // Checkpoints Management Hook
  const {
    checkpointsList,
    setCheckpointsList,
    createAutoCheckpoint,
    handleSaveManualCheckpoint,
    handleRestoreCheckpoint,
    handleDeleteCheckpoint,
    handleRestoreFromHistory,
  } = useCheckpointManagement({
    campaign,
    activeDisplay,
    liveState,
    restoreSnapshot,
  });

  // Storm Coordinator Hook
  const {
    lightningConfig,
    handleToggleAutoStorm,
    handleToggleDisableFlash,
  } = useStormCoordinator({ liveState });

  // 3. Macro Sequencer Hook
  const { runningMacro, executeMacro, cancelMacro } = useMacroSequencer({
    onBroadcastState: (state) => {
      broadcastFullState(state);
    },
    onCreateAutoCheckpoint: (triggerName, state) => {
      createAutoCheckpoint(triggerName, state);
    },
    onRecordHistoryEvent: (description, snapshot) => {
      updateDisplay(() => snapshot, description, false);
    },
  });

  const currentScene =
    campaign?.scenes.find((s) => s.id === activeDisplay.currentSceneId) || campaign?.scenes[0] || null;

  // Load Initial Campaign & DB Data
  useEffect(() => {
    const loadData = async () => {
      const all = await getAllCampaigns();
      setCampaignList(all);
      const camp = await initDefaultDataIfNeeded();
      setCampaign(camp);
      const checkpoints = await getCampaignCheckpoints(camp.id);
      setCheckpointsList(checkpoints);
      const encs = await getCampaignEncounters(camp.id);
      setEncountersList(encs.length > 0 ? encs : []);

      if (camp.scenes.length > 0) {
        const activeSession = await gameSessionService.loadOrCreateSession(camp.id);
        const persistedDraft = activeSession?.stagedState;

        if (persistedDraft) {
          initSessionState(persistedDraft);
        } else {
          const initialScene = camp.scenes[0];
          const initialState: DisplayState = {
            currentSceneId: initialScene.id,
            sceneName: initialScene.name,
            backgroundUrl: initialScene.backgroundUrl,
            characters: [],
            weather: initialScene.weather || 'none',
            weatherIntensity: initialScene.weatherIntensity ?? 0.5,
            lighting: initialScene.lighting || 'normal',
            locationBanner: {
              text: initialScene.locationBanner || initialScene.name,
              subtitle: initialScene.subtitle || '',
              visible: true,
            },
            isBlackout: false,
            shakeTrigger: 0,
            lightningTrigger: 0,
            ambientAudioUrl: initialScene.ambientAudioUrl || '',
            ambientPlaying: false,
            ambientVolume: 0.5,
            lastSfx: null,
            combatState: {
              isActive: false,
              round: 1,
              currentTurnIndex: 0,
              combatants: [],
              turnTimerSeconds: 60,
              showTurnTimerToPlayers: true,
            },
          };
          initSessionState(initialState);
        }
      }
    };
    loadData();
  }, [initSessionState, setCheckpointsList]);

  // Platform Bridge: Native Back Button with LIFO Stack Hook
  useMasterBackButton({
    showQRModal,
    setShowQRModal,
    showDiagnosticsModal,
    setShowDiagnosticsModal,
    showHistoryModal,
    setShowHistoryModal,
    showCheckpointsModal,
    setShowCheckpointsModal,
    showQuickMoments,
    setShowQuickMoments,
    showSummonModal,
    setShowSummonModal,
    showNewSceneModal,
    setShowNewSceneModal,
    showNewCharModal,
    setShowNewCharModal,
    showCampaignPickerModal,
    setShowCampaignPickerModal,
    showSelectivePublishModal,
    setShowSelectivePublishModal,
    showCompositorModal,
    setShowCompositorModal,
    showConversationEditor,
    setShowConversationEditor,
    showSessionLibraryModal,
    setShowSessionLibraryModal,
    showManageFavoritesModal,
    setShowManageFavoritesModal,
    showRevelationJournalModal,
    setShowRevelationJournalModal,
    showSessionPrepWizardModal,
    setShowSessionPrepWizardModal,
    showHandoutViewerModal,
    setShowHandoutViewerModal,
    showCampaignRecapModal,
    setShowCampaignRecapModal,
    showSoundboardModal,
    setShowSoundboardModal,
    showLightingPresetsModal,
    setShowLightingPresetsModal,
    showChronicleExportModal,
    setShowChronicleExportModal,
    showReadinessModal,
    setShowReadinessModal,
    showFullScreenPreview,
    setShowFullScreenPreview,
    activeTab,
    setActiveTab,
  });

  // Session Recovery & Debounced Draft Save
  useEffect(() => {
    if (roomCode && campaign) {
      sessionRecoveryService.saveIncrementalSnapshot({
        role: 'master',
        roomId: roomCode,
        sessionId: `sess_${roomCode}`,
        connectionEpoch: peerService.getConnectionEpoch(),
        campaignId: campaign.id,
        activeSceneId: activeDisplay.currentSceneId,
        sessionRevision,
        liveState,
        stagedState,
        combatActive: liveState.combatState?.isActive || false,
        hasStagedChanges: pendingChangesCount > 0,
        lastSceneName: activeDisplay.sceneName,
      });
    }
    gameSessionService.saveDraftDebounced(stagedState);
  }, [
    roomCode,
    campaign,
    activeDisplay.currentSceneId,
    activeDisplay.sceneName,
    sessionRevision,
    liveState,
    stagedState,
    pendingChangesCount,
  ]);

  // Mode Toggle with confirmation if pending changes
  const handleToggleOperationMode = (newMode: 'live' | 'staging') => {
    if (newMode === operationMode) return;

    if (operationMode === 'staging' && pendingChangesCount > 0) {
      setShowUnsavedStagingDialog(true);
      return;
    }

    setOperationMode(newMode);
    setPreviewTab(newMode === 'staging' ? 'staged' : 'live');
  };

  // Scene Selection
  const selectScene = (scene: Scene) => {
    let suggestedCharacters: CharacterOnScreen[] = [];
    if (scene.suggestedNpcIds && scene.suggestedNpcIds.length > 0 && campaign) {
      suggestedCharacters = campaign.characters
        .filter((c) => scene.suggestedNpcIds?.includes(c.id))
        .map((c, idx) => {
          const positions: CharacterPosition[] = ['center-left', 'center-right', 'left', 'right'];
          return {
            id: `active-${c.id}-${Date.now()}`,
            characterId: c.id,
            name: c.name,
            avatarUrl: c.defaultAvatarUrl,
            position: positions[idx % positions.length],
            isSpeaking: false,
          };
        });
    }

    if (operationMode === 'live') {
      createAutoCheckpoint(`Cambio de Escena a "${scene.name}"`, liveState);
    }

    updateDisplay(
      (prev) => ({
        ...prev,
        currentSceneId: scene.id,
        sceneName: scene.name,
        backgroundUrl: scene.backgroundUrl,
        weather: scene.weather || 'none',
        weatherIntensity: scene.weatherIntensity ?? 0.5,
        lighting: scene.lighting || 'normal',
        locationBanner: {
          text: scene.locationBanner || scene.name,
          subtitle: scene.subtitle || '',
          visible: true,
        },
        characters: suggestedCharacters.length > 0 ? suggestedCharacters : prev.characters,
        ambientAudioUrl: scene.ambientAudioUrl || prev.ambientAudioUrl,
        ambientPlaying: scene.ambientAudioUrl ? true : prev.ambientPlaying,
        props: scene.props || [],
        occlusionRegions: scene.occlusionRegions || [],
        waypoints: scene.waypoints || [],
        groundLineY: scene.groundLineY ?? prev.groundLineY,
      }),
      `Cambio de Escena a "${scene.name}"`
    );

    if (operationMode === 'live' && scene.ambientAudioUrl) {
      soundEngine.setAmbient(scene.ambientAudioUrl, true, activeDisplay.ambientVolume, true);
    }
  };

  // Macro Execution
  const handleExecuteMacro = (macro: CinematicMacro) => {
    executeMacro(macro, liveState, (updater) => {
      updateDisplay(updater, `Momento: ${macro.name}`, true);
    });
  };

  const handleLoadMacroToStaging = (macro: CinematicMacro) => {
    const accumulated = accumulateMacroToState(macro, stagedState);
    updateDisplay(() => accumulated, `Cargado Borrador: ${macro.name}`, false);
    setOperationMode('staging');
    setPreviewTab('staged');
    soundEngine.playSynth('magic_spell');
  };

  const handleUpdateMacros = async (updatedMacros: CinematicMacro[]) => {
    if (!campaign) return;
    const updatedCamp = { ...campaign, macros: updatedMacros };
    await setCampaign(updatedCamp);
  };

  // Atmospheric / Direct Actions Hook
  const {
    setWeatherEffect,
    setWeatherIntensityVal,
    setLightingPreset,
    toggleBlackout,
    triggerLightning,
    triggerScreenShake,
    updateBanner,
    toggleAmbientAudio,
    toggleAmbientPlay,
    playSfx,
  } = useMasterAtmosphereActions({
    activeDisplay,
    updateDisplay,
    broadcastMessage,
  });

  // Emergency Actions Hook
  const {
    isMuted: isMasterAudioMuted,
    toggleMuteTotal: handleToggleMuteTotal,
    toggleBlackout: handleToggleBlackout,
    cancelRunningMacro: handleCancelRunningMacro,
    createQuickCheckpoint: handleCreateQuickCheckpoint,
    checkpointReceipt,
    muteReceipt,
    blackoutReceipt,
  } = useEmergencyActions({
    isBlackout: activeDisplay.isBlackout,
    updateDisplay,
    runningMacro,
    cancelMacro,
    restoreSnapshot,
    liveState,
    campaignId: campaign?.id || 'camp-default',
    saveCheckpoint,
  });

  // Favorites Actions Hook
  const {
    saveFavorites: handleSaveFavorites,
    executeFavorite: handleExecuteFavorite,
  } = useFavoritesActions({
    campaign,
    updateCampaign: async (c) => {
      setCampaign(c);
    },
    setCampaign,
    selectScene,
    handleExecuteMacro,
    liveState,
    saveCheckpoint,
  });

  const handlePublishAllStagedWithAck = useCallback(async (): Promise<boolean> => {
    publishAllStaged();
    const cmdId = sessionCommandBus.dispatchFullState(stagedState, sessionRevision + 1);
    const receipt = await sessionCommandBus.waitForResult(cmdId, 5000);
    return receipt.status === 'applied';
  }, [publishAllStaged, stagedState, sessionRevision]);

  const handlePrepareSceneInStaging = (scene: Scene) => {
    let suggestedCharacters: CharacterOnScreen[] = [];
    if (scene.suggestedNpcIds && scene.suggestedNpcIds.length > 0 && campaign) {
      suggestedCharacters = campaign.characters
        .filter((c) => scene.suggestedNpcIds?.includes(c.id))
        .map((c, idx) => {
          const positions: CharacterPosition[] = ['center-left', 'center-right', 'left', 'right'];
          return {
            id: `active-${c.id}-${Date.now()}`,
            characterId: c.id,
            name: c.name,
            avatarUrl: c.defaultAvatarUrl,
            position: positions[idx % positions.length],
            isSpeaking: false,
          };
        });
    }

    setOperationMode('staging');
    setPreviewTab('staged');
    updateDisplay(
      (prev) => ({
        ...prev,
        currentSceneId: scene.id,
        sceneName: scene.name,
        backgroundUrl: scene.backgroundUrl,
        weather: scene.weather || 'none',
        weatherIntensity: scene.weatherIntensity ?? 0.5,
        lighting: scene.lighting || 'normal',
        locationBanner: {
          text: scene.locationBanner || scene.name,
          subtitle: scene.subtitle || '',
          visible: true,
        },
        characters: suggestedCharacters.length > 0 ? suggestedCharacters : prev.characters,
        ambientAudioUrl: scene.ambientAudioUrl || prev.ambientAudioUrl,
        ambientPlaying: scene.ambientAudioUrl ? true : prev.ambientPlaying,
        props: scene.props || [],
        occlusionRegions: scene.occlusionRegions || [],
        waypoints: scene.waypoints || [],
        groundLineY: scene.groundLineY ?? prev.groundLineY,
      }),
      `Preparada en Borrador: "${scene.name}"`
    );
  };

  const handleSetCameraTransform = async (camera: any, durationMs: number = 800) => {
    updateDisplay((prev) => ({ ...prev, camera }), `Cámara: Zoom ${camera.zoom.toFixed(1)}x`, true);
    const cmdId = sessionCommandBus.dispatchCameraTransform(camera, durationMs);
    await sessionCommandBus.waitForResult(cmdId, 5000);
  };

  const handleResetCamera = async () => {
    await handleSetCameraTransform({ focalPoint: { x: 50, y: 50 }, zoom: 1.0 }, 600);
  };

  // Director Overlay Handlers Hook
  const {
    handleDirectorUpdateCharacter,
    handleDirectorAddCharacter,
    handleDirectorLiveDragMove,
    handleDirectorUpdateMultiplePositions,
    handleDirectorFocusCamera,
    handleSaveCameraPreset,
    handleDirectorReorderLayers,
    handleDirectorUpdateProp,
    handleDirectorSaveWaypoint,
    handleDirectorDeleteWaypoint,
    handleDirectorSaveOcclusionRegion,
    handleDirectorDeleteOcclusionRegion,
  } = useDirectorHandlers({
    operationMode,
    previewTab,
    liveState,
    sessionRevision,
    currentScene,
    campaign,
    setCampaign,
    updateDisplay,
    handleSetCameraTransform,
  });

  // Combat Coordinator Hook
  const {
    handleNextCombatTurn,
    handlePrevCombatTurn,
    handleToggleCombatTimer,
    handleAddCombatTimerSeconds,
    handleResetCombatTimer,
    handleToggleCombatTimerVisibility,
    handleFocusCombatant,
    handleToggleCombatTrackingMode,
    handleToggleDmSpeakingDucked,
    handleSelectDuckingPreset,
    handleUpdateCombatantHp,
    handleToggleCombatantCondition,
    handleStartCombat,
    handleEndCombat,
  } = useCombatCoordinator({
    liveState,
    updateDisplay,
    handleSetCameraTransform,
  });

  // Session Scene Handlers Hook
  const {
    executedActionLineIds,
    selectedChoiceIds,
    setSelectedChoiceIds,
    executingInteractionId,
    handleSelectSceneVariant,
    handleSelectSituation,
    handleApplySoundtrack,
    handleSaveBiomeProfiles,
    handleApplyLightingPreset,
    handleSaveLightingPreset,
    handleUpdateSceneLights,
    handleUpdateZoneEmitters,
    handleSaveCompositorCharacters,
    handlePreviewCompositorCharacters,
    handleSaveCompositionPreset,
    handleUpdateCampaignCharacter,
    handlePublishDialogue,
    handleRepeatDialogueActions,
    handleDismissDialogue,
    handleCompleteDialogueText,
    handleSaveConversation,
    handleTriggerInteraction,
    handleApplySessionPrepDraft,
    handleSaveSessionPrepDraft,
    handleProjectHandout,
    handleDismissHandout,
    handleProjectRecap,
    handleDismissRecap,
    handleSaveRecap,
    handleRevealCharacterAppearance,
    handleRevealCharacterIdentity,
  } = useSessionSceneHandlers({
    campaign,
    setCampaign,
    liveState,
    activeDisplay,
    sessionRevision,
    updateDisplay,
    setOperationMode,
    handleExecuteMacro,
    handleSetCameraTransform,
    handleResetCamera,
  });

  // Campaign Management Hook
  const {
    diceLog,
    handleSwitchCampaign,
    handleDuplicateCampaign,
    handleDeleteCampaign,
    openEditSceneModal,
    openEditCharModal,
    summonCharacter,
    dismissCharacter,
    dismissCharacters,
    toggleSpeaking,
    changeCharacterPosition,
    changeCharacterExpression,
    rollDice,
    handleResetDemo,
    exportCampaignJSON,
    importCampaignJSON,
  } = useCampaignManagement({
    campaign,
    setCampaign,
    campaignList,
    setCampaignList,
    setCheckpointsList,
    setEncountersList,
    activeDisplay,
    updateDisplay,
    selectScene,
    setShowCampaignPickerModal,
    setShowSummonModal,
    setEditingScene,
    setShowNewSceneModal,
    setEditingChar,
    setShowNewCharModal,
  });

  const handleAmbientVolumeChange = (vol: number) => {
    updateDisplay((prev) => ({ ...prev, ambientVolume: vol }), `Volumen Música: ${Math.round(vol * 100)}%`);
    if (operationMode === 'live' && activeDisplay.ambientAudioUrl) {
      soundEngine.setAmbient(activeDisplay.ambientAudioUrl, activeDisplay.ambientPlaying, vol, false);
    }
  };

  const handleLoadSessionFromLibrary = (loadedSession: GameSession, mode: 'live' | 'staged') => {
    if (mode === 'live' && loadedSession.liveState) {
      initSessionState(loadedSession.liveState);
      broadcastFullState(loadedSession.liveState);
    } else {
      const targetState = loadedSession.stagedState || loadedSession.liveState;
      if (targetState) {
        setStagedStateOnly(targetState);
      }
    }
    setShowSessionLibraryModal(false);
  };

  const handleOpenSaveScenePreset = () => {
    setScenePresetMode('save');
    setShowScenePresetModal(true);
  };

  const handleOpenInsertScenePreset = () => {
    setScenePresetMode('insert');
    setShowScenePresetModal(true);
  };

  const handlePresetInstantiated = (updatedSession: GameSession) => {
    if (updatedSession.stagedState) {
      setStagedStateOnly(updatedSession.stagedState);
    }
  };

  const handleSaveInitialBaseline = async () => {
    const current = gameSessionService.getCurrentSession();
    if (!current) return;
    try {
      await gameSessionService.saveInitialBaseline(
        current.id,
        stagedState,
        `Línea base fijada (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
      );
      alert('Configuración inicial guardada con éxito. Los nuevos grupos comenzarán desde este estado preparado.');
    } catch (err) {
      console.error('Error al guardar línea base inicial:', err);
      alert('Error al guardar configuración inicial.');
    }
  };

  const joinUrl = `${window.location.origin}${window.location.pathname}#join=${roomCode}${pairingSecret ? `&secret=${pairingSecret}` : ''}`;

  return (
    <div className={`master-controller-root ${partyMode ? 'party-mode-active' : ''} ${!partyControlsVisible ? 'party-controls-hidden' : ''}`}>
      {/* HEADER SECTION (Modularized) */}
      <MasterHeader
        campaign={campaign}
        roomCode={roomCode}
        pairingSecret={pairingSecret}
        connectionStatus={connectionStatus}
        latencyMs={latencyMs}
        pastEvents={pastEvents}
        futureEvents={futureEvents}
        undo={undo}
        redo={redo}
        onExitToLobby={onExitToLobby}
        connectToRoom={connectToRoom}
        versionCompatibility={versionCompatibility}
        runningMacro={runningMacro}
        cancelMacro={cancelMacro}
        restoreSnapshot={restoreSnapshot}
        operationMode={operationMode}
        pendingChangesCount={pendingChangesCount}
        onToggleOperationMode={handleToggleOperationMode}
        previewTab={previewTab}
        setPreviewTab={setPreviewTab}
        liveState={liveState}
        stagedState={stagedState}
        activeDisplay={activeDisplay}
        currentScene={currentScene}
        mesaTelemetry={mesaTelemetry}
        pendingCommandsCount={pendingCommandsCount}
        publishAllStaged={publishAllStaged}
        discardStaged={discardStaged}
        toggleBlackout={toggleBlackout}
        triggerLightning={triggerLightning}
        triggerScreenShake={triggerScreenShake}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sessionViewMode={sessionViewMode}
        onOpenCampaignPicker={() => setShowCampaignPickerModal(true)}
        onOpenQuickMoments={() => setShowQuickMoments(true)}
        onOpenHistory={() => setShowHistoryModal(true)}
        onOpenCheckpoints={() => setShowCheckpointsModal(true)}
        onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
        onOpenFullScreenPreview={() => setShowFullScreenPreview(true)}
        onOpenSelectivePublish={() => setShowSelectivePublishModal(true)}
        onSaveCameraPreset={handleSaveCameraPreset}
        onSaveWaypoint={handleDirectorSaveWaypoint}
        onSaveOcclusionRegion={handleDirectorSaveOcclusionRegion}
        onDeleteWaypoint={handleDirectorDeleteWaypoint}
        onDeleteOcclusionRegion={handleDirectorDeleteOcclusionRegion}
        onUpdateCharacter={handleDirectorUpdateCharacter}
        onUpdateProp={handleDirectorUpdateProp}
        onReorderLayers={handleDirectorReorderLayers}
        onUpdateCampaignCharacter={handleUpdateCampaignCharacter}
        onUpdateMultipleCharacterPositions={handleDirectorUpdateMultiplePositions}
        onFocusCamera={handleDirectorFocusCamera}
        onOpenCharacterLibrary={() => setShowSummonModal(true)}
        onRemoveCharacters={dismissCharacters}
        onAddCharacter={handleDirectorAddCharacter}
        onLiveDragMove={handleDirectorLiveDragMove}
      />

      {/* MAIN CONTENT AREA */}
      <main className="master-content">
        {/* TAB 1: LIVE STAGE / SESSION PANEL */}
        {activeTab === 'live' && sessionViewMode === 'session' && (
          <SessionPanel
            campaign={campaign}
            liveState={liveState}
            stagedState={stagedState}
            operationMode={operationMode}
            pendingChangesCount={pendingChangesCount}
            connectionStatus={connectionStatus}
            latencyMs={latencyMs}
            roomCode={roomCode}
            onSelectScene={selectScene}
            onPrepareSceneInStaging={handlePrepareSceneInStaging}
            onPublishAllStaged={handlePublishAllStagedWithAck}
            onOpenSelectivePublish={() => setShowSelectivePublishModal(true)}
            onDiscardStaged={discardStaged}
            onToggleOperationMode={handleToggleOperationMode}
            onUndo={undo}
            pastEvents={pastEvents}
            onOpenHistory={() => setShowHistoryModal(true)}
            onTriggerLightning={triggerLightning}
            onTriggerShake={triggerScreenShake}
            onToggleBlackout={toggleBlackout}
            onToggleBanner={() => {
              const next = !activeDisplay.locationBanner.visible;
              updateDisplay(
                (prev) => ({ ...prev, locationBanner: { ...prev.locationBanner, visible: next } }),
                `Cartel: ${next ? 'Visible' : 'Oculto'}`
              );
            }}
            onToggleAmbientAudio={toggleAmbientAudio}
            onExecuteFavorite={handleExecuteFavorite}
            onOpenManageFavorites={() => setShowManageFavoritesModal(true)}
            onSwitchToTab={(tab) => setActiveTab(tab)}
            onToggleClassicView={() => setSessionViewMode('classic')}
            onOpenCompositor={() => setShowCompositorModal(true)}
            onSelectSceneVariant={handleSelectSceneVariant}
            onNextCombatTurn={handleNextCombatTurn}
            onPrevCombatTurn={handlePrevCombatTurn}
            onUpdateCombatantHp={handleUpdateCombatantHp}
            onToggleCombatantCondition={handleToggleCombatantCondition}
            onStartCombat={handleStartCombat}
            onEndCombat={handleEndCombat}
            onPublishDialogue={handlePublishDialogue}
            onDismissDialogue={handleDismissDialogue}
            onCompleteDialogueText={handleCompleteDialogueText}
            onSetCameraTransform={handleSetCameraTransform}
            onResetCamera={handleResetCamera}
            onOpenNewConversation={() => {
              setEditingConversation(null);
              setShowConversationEditor(true);
            }}
            onOpenEditConversation={(conv) => {
              setEditingConversation(conv);
              setShowConversationEditor(true);
            }}
            onRepeatActions={handleRepeatDialogueActions}
            executedActionLineIds={executedActionLineIds}
            selectedChoiceIds={selectedChoiceIds}
            onSelectBranchChoice={(choice) => {
              setSelectedChoiceIds((prev) => ({ ...prev, [choice.id]: choice.id }));
            }}
            onUpdateSceneLights={handleUpdateSceneLights}
            onUpdateZoneEmitters={handleUpdateZoneEmitters}
            onRevealCharacterAppearance={handleRevealCharacterAppearance}
            onRevealCharacterIdentity={handleRevealCharacterIdentity}
            onTriggerInteraction={handleTriggerInteraction}
            executingInteractionId={executingInteractionId}
            onOpenRevelationJournal={() => setShowRevelationJournalModal(true)}
            onOpenSessionPrepWizard={() => setShowSessionPrepWizardModal(true)}
            onFocusCombatant={handleFocusCombatant}
            onToggleCombatTrackingMode={handleToggleCombatTrackingMode}
            onToggleDmSpeakingDucked={handleToggleDmSpeakingDucked}
            onSelectDuckingPreset={handleSelectDuckingPreset}
            onOpenHandoutViewer={() => setShowHandoutViewerModal(true)}
            onOpenCampaignRecap={() => setShowCampaignRecapModal(true)}
            onOpenSoundboard={() => setShowSoundboardModal(true)}
            lightningConfig={lightningConfig}
            onToggleAutoStorm={handleToggleAutoStorm}
            onToggleDisableFlash={handleToggleDisableFlash}
            onOpenBiomeSoundtrack={() => setShowBiomeSoundtrackModal(true)}
            onSelectSituation={handleSelectSituation}
            onOpenLightingPresets={() => setShowLightingPresetsModal(true)}
            onOpenChronicleExport={() => setShowChronicleExportModal(true)}
            onToggleCombatTimer={handleToggleCombatTimer}
            onAddCombatTimerSeconds={handleAddCombatTimerSeconds}
            onResetCombatTimer={handleResetCombatTimer}
            onToggleCombatTimerVisibility={handleToggleCombatTimerVisibility}
            onOpenSessionLibrary={() => setShowSessionLibraryModal(true)}
            onOpenSaveScenePreset={handleOpenSaveScenePreset}
            onOpenInsertScenePreset={handleOpenInsertScenePreset}
            onSaveInitialBaseline={handleSaveInitialBaseline}
            onEvaluateReadiness={() => setShowReadinessModal(true)}
            backupStatus={gameSessionService.getBackupStatus(gameSessionService.getCurrentSession())}
            lastExportIsComplete={gameSessionService.getCurrentSession()?.lastExportIsComplete}
            onUpdateCharacter={handleDirectorUpdateCharacter}
            onUpdateDisplayField={(field, value, desc) => {
              updateDisplay((prev) => ({ ...prev, [field]: value }), desc);
            }}
            onOpenCharacterLibrary={() => setShowSummonModal(true)}
            onDismissCharacter={dismissCharacter}
            onOpenFullScreenPreview={() => setShowFullScreenPreview(true)}
            canUndo={pastEvents.length > 0}
          />
        )}

        <MasterMainTabs
          activeTab={activeTab}
          sessionViewMode={sessionViewMode}
          setActiveTab={setActiveTab}
          campaign={campaign}
          setCampaign={setCampaign}
          currentScene={currentScene}
          activeDisplay={activeDisplay}
          liveState={liveState}
          operationMode={operationMode}
          updateDisplay={updateDisplay}
          updateBanner={updateBanner}
          selectScene={selectScene}
          toggleAmbientPlay={toggleAmbientPlay}
          handleAmbientVolumeChange={handleAmbientVolumeChange}
          setShowSummonModal={setShowSummonModal}
          onOpenCompositor={() => setShowCompositorModal(true)}
          changeCharacterPosition={changeCharacterPosition}
          dismissCharacter={dismissCharacter}
          toggleSpeaking={toggleSpeaking}
          changeCharacterExpression={changeCharacterExpression}
          setWeatherEffect={setWeatherEffect}
          setWeatherIntensityVal={setWeatherIntensityVal}
          setLightingPreset={setLightingPreset}
          playSfx={playSfx}
          handleExecuteMacro={handleExecuteMacro}
          handleLoadMacroToStaging={handleLoadMacroToStaging}
          handleUpdateMacros={handleUpdateMacros}
          encountersList={encountersList}
          setEncountersList={setEncountersList}
          createAutoCheckpoint={createAutoCheckpoint}
          broadcastMessage={broadcastMessage}
          diceLog={diceLog}
          rollDice={rollDice}
          setShowCampaignPickerModal={setShowCampaignPickerModal}
          exportCampaignJSON={exportCampaignJSON}
          importCampaignJSON={importCampaignJSON}
          handleResetDemo={handleResetDemo}
          setEditingScene={setEditingScene}
          setShowNewSceneModal={setShowNewSceneModal}
          openEditSceneModal={openEditSceneModal}
          setEditingChar={setEditingChar}
          setShowNewCharModal={setShowNewCharModal}
          openEditCharModal={openEditCharModal}
        />
      </main>

      {/* EMERGENCY DOCK (PERMANENT & ACCESSIBLE) */}
      <EmergencyDock
        isBlackout={activeDisplay.isBlackout}
        onToggleBlackout={handleToggleBlackout}
        isMuted={isMasterAudioMuted}
        onToggleMuteTotal={handleToggleMuteTotal}
        hasRunningMacro={!!runningMacro}
        runningMacroName={runningMacro?.macro.name}
        onCancelMacro={handleCancelRunningMacro}
        onCreateQuickCheckpoint={handleCreateQuickCheckpoint}
        connectionStatus={connectionStatus}
        checkpointReceipt={checkpointReceipt}
        muteReceipt={muteReceipt}
        blackoutReceipt={blackoutReceipt}
      />

      {/* PARTY MODE CONTROL (Modularized) */}
      <PartyModeControl
        partyMode={partyMode}
        setPartyMode={setPartyMode}
        partyMenuOpen={partyMenuOpen}
        setPartyMenuOpen={setPartyMenuOpen}
        partyControlsVisible={partyControlsVisible}
        setPartyControlsVisible={setPartyControlsVisible}
        partyKeepAwake={partyKeepAwake}
        setPartyKeepAwake={setPartyKeepAwake}
        partyImmersive={partyImmersive}
        setPartyImmersive={setPartyImmersive}
      />

      {/* PRIMARY MODALS LAYER (Modularized) */}
      <MasterPrimaryModals
        campaign={campaign}
        campaignList={campaignList}
        setCampaign={setCampaign}
        setCampaignList={setCampaignList}
        liveState={liveState}
        stagedState={stagedState}
        activeDisplay={activeDisplay}
        operationMode={operationMode}
        previewTab={previewTab}
        setPreviewTab={setPreviewTab}
        setOperationMode={setOperationMode}
        pendingChangesCount={pendingChangesCount}
        currentScene={currentScene}
        mesaTelemetry={mesaTelemetry}
        pendingCommandsCount={pendingCommandsCount}
        pastEvents={pastEvents}
        checkpointsList={checkpointsList}
        roomCode={roomCode}
        pairingSecret={pairingSecret}
        connectionStatus={connectionStatus}
        latencyMs={latencyMs}
        joinUrl={joinUrl}
        showSelectivePublishModal={showSelectivePublishModal}
        setShowSelectivePublishModal={setShowSelectivePublishModal}
        showFullScreenPreview={showFullScreenPreview}
        setShowFullScreenPreview={setShowFullScreenPreview}
        showDiagnosticsModal={showDiagnosticsModal}
        setShowDiagnosticsModal={setShowDiagnosticsModal}
        showQuickMoments={showQuickMoments}
        setShowQuickMoments={setShowQuickMoments}
        showHistoryModal={showHistoryModal}
        setShowHistoryModal={setShowHistoryModal}
        showCheckpointsModal={showCheckpointsModal}
        setShowCheckpointsModal={setShowCheckpointsModal}
        showUnsavedStagingDialog={showUnsavedStagingDialog}
        setShowUnsavedStagingDialog={setShowUnsavedStagingDialog}
        showCampaignPickerModal={showCampaignPickerModal}
        setShowCampaignPickerModal={setShowCampaignPickerModal}
        showNewSceneModal={showNewSceneModal}
        setShowNewSceneModal={setShowNewSceneModal}
        editingScene={editingScene}
        setEditingScene={setEditingScene}
        showNewCharModal={showNewCharModal}
        setShowNewCharModal={setShowNewCharModal}
        editingChar={editingChar}
        setEditingChar={setEditingChar}
        showSummonModal={showSummonModal}
        setShowSummonModal={setShowSummonModal}
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        publishAllStaged={publishAllStaged}
        publishSelectiveStaged={publishSelectiveStaged}
        discardStaged={discardStaged}
        broadcastFullState={broadcastFullState}
        connectToRoom={connectToRoom}
        handleExecuteMacro={handleExecuteMacro}
        handleLoadMacroToStaging={handleLoadMacroToStaging}
        handleRestoreFromHistory={handleRestoreFromHistory}
        handleSaveManualCheckpoint={handleSaveManualCheckpoint}
        handleRestoreCheckpoint={handleRestoreCheckpoint}
        handleDeleteCheckpoint={handleDeleteCheckpoint}
        handleSwitchCampaign={handleSwitchCampaign}
        handleDuplicateCampaign={handleDuplicateCampaign}
        handleDeleteCampaign={handleDeleteCampaign}
        selectScene={selectScene}
        summonCharacter={summonCharacter}
        undo={undo}
        onSaveCameraPreset={handleSaveCameraPreset}
        onSaveWaypoint={handleDirectorSaveWaypoint}
        onSaveOcclusionRegion={handleDirectorSaveOcclusionRegion}
        onDeleteWaypoint={handleDirectorDeleteWaypoint}
        onDeleteOcclusionRegion={handleDirectorDeleteOcclusionRegion}
        onUpdateCharacter={handleDirectorUpdateCharacter}
        onUpdateProp={handleDirectorUpdateProp}
        onReorderLayers={handleDirectorReorderLayers}
        onUpdateCampaignCharacter={handleUpdateCampaignCharacter}
        onUpdateMultipleCharacterPositions={handleDirectorUpdateMultiplePositions}
        onFocusCamera={handleDirectorFocusCamera}
        onOpenCharacterLibrary={() => setShowSummonModal(true)}
        onRemoveCharacters={dismissCharacters}
        onAddCharacter={handleDirectorAddCharacter}
        onLiveDragMove={handleDirectorLiveDragMove}
      />

      {/* AUXILIARY CREATIVE & SESSION MODALS LAYER */}
      <MasterAuxiliaryModals
        campaign={campaign}
        liveState={liveState}
        stagedState={stagedState}
        operationMode={operationMode}
        showManageFavoritesModal={showManageFavoritesModal}
        onCloseManageFavorites={() => setShowManageFavoritesModal(false)}
        onSaveFavorites={handleSaveFavorites}
        showCompositorModal={showCompositorModal}
        onCloseCompositor={() => setShowCompositorModal(false)}
        onSaveCompositorCharacters={handleSaveCompositorCharacters}
        onPreviewCompositorCharacters={handlePreviewCompositorCharacters}
        onSaveCompositionPreset={handleSaveCompositionPreset}
        showConversationEditor={showConversationEditor}
        editingConversation={editingConversation}
        onCloseConversationEditor={() => {
          setShowConversationEditor(false);
          setEditingConversation(null);
        }}
        onSaveConversation={handleSaveConversation}
        showRevelationJournalModal={showRevelationJournalModal}
        onCloseRevelationJournal={() => setShowRevelationJournalModal(false)}
        setCampaign={setCampaign}
        showSessionPrepWizardModal={showSessionPrepWizardModal}
        onCloseSessionPrepWizard={() => setShowSessionPrepWizardModal(false)}
        onApplySessionPrepDraft={handleApplySessionPrepDraft}
        onSaveSessionPrepDraft={handleSaveSessionPrepDraft}
        showHandoutViewerModal={showHandoutViewerModal}
        onCloseHandoutViewer={() => setShowHandoutViewerModal(false)}
        onProjectHandout={handleProjectHandout}
        onDismissHandout={handleDismissHandout}
        showCampaignRecapModal={showCampaignRecapModal}
        onCloseCampaignRecap={() => setShowCampaignRecapModal(false)}
        onProjectRecap={handleProjectRecap}
        onDismissRecap={handleDismissRecap}
        onSaveRecap={handleSaveRecap}
        showSoundboardModal={showSoundboardModal}
        onCloseSoundboard={() => setShowSoundboardModal(false)}
        showBiomeSoundtrackModal={showBiomeSoundtrackModal}
        onCloseBiomeSoundtrack={() => setShowBiomeSoundtrackModal(false)}
        onApplySoundtrack={handleApplySoundtrack}
        onSaveBiomeProfiles={handleSaveBiomeProfiles}
        showLightingPresetsModal={showLightingPresetsModal}
        onCloseLightingPresets={() => setShowLightingPresetsModal(false)}
        onApplyLightingPreset={handleApplyLightingPreset}
        onSaveLightingPreset={handleSaveLightingPreset}
        showChronicleExportModal={showChronicleExportModal}
        onCloseChronicleExport={() => setShowChronicleExportModal(false)}
        showSessionLibraryModal={showSessionLibraryModal}
        onCloseSessionLibrary={() => setShowSessionLibraryModal(false)}
        onLoadSessionFromLibrary={handleLoadSessionFromLibrary}
        showScenePresetModal={showScenePresetModal}
        scenePresetMode={scenePresetMode}
        onCloseScenePresetModal={() => setShowScenePresetModal(false)}
        onPresetInstantiated={handlePresetInstantiated}
        showReadinessModal={showReadinessModal}
        onCloseReadinessModal={() => setShowReadinessModal(false)}
      />

      {/* MOBILE ONE-HAND BOTTOM NAVIGATION BAR */}
      {mobileToolsOpen && (
        <MobileToolsDrawer
          operationMode={operationMode}
          pendingChangesCount={pendingChangesCount}
          onClose={() => setMobileToolsOpen(false)}
          onToggleOperationMode={handleToggleOperationMode}
          onPublish={() => { void handlePublishAllStagedWithAck(); setMobileToolsOpen(false); }}
          onDiscard={() => { discardStaged(); setMobileToolsOpen(false); }}
          onSelectivePublish={() => { setShowSelectivePublishModal(true); setMobileToolsOpen(false); }}
          onOpenCompositor={() => { setShowCompositorModal(true); setMobileToolsOpen(false); }}
          onOpenFullScreenPreview={() => { setShowFullScreenPreview(true); setMobileToolsOpen(false); }}
          onOpenLighting={() => { setShowLightingPresetsModal(true); setMobileToolsOpen(false); }}
          onOpenSoundboard={() => { setShowSoundboardModal(true); setMobileToolsOpen(false); }}
          onOpenSoundtrack={() => { setShowBiomeSoundtrackModal(true); setMobileToolsOpen(false); }}
          onOpenHandout={() => { setShowHandoutViewerModal(true); setMobileToolsOpen(false); }}
          onOpenDialogue={() => { setEditingConversation(null); setShowConversationEditor(true); setMobileToolsOpen(false); }}
          onOpenPrep={() => { setShowSessionPrepWizardModal(true); setMobileToolsOpen(false); }}
          onOpenRecap={() => { setShowCampaignRecapModal(true); setMobileToolsOpen(false); }}
          onOpenHistory={() => { setShowHistoryModal(true); setMobileToolsOpen(false); }}
          onOpenCheckpoints={() => { setShowCheckpointsModal(true); setMobileToolsOpen(false); }}
          onOpenDiagnostics={() => { setShowDiagnosticsModal(true); setMobileToolsOpen(false); }}
          onOpenSessionLibrary={() => { setShowSessionLibraryModal(true); setMobileToolsOpen(false); }}
          onOpenSavePreset={() => { handleOpenSaveScenePreset(); setMobileToolsOpen(false); }}
          onOpenInsertPreset={() => { handleOpenInsertScenePreset(); setMobileToolsOpen(false); }}
          onOpenPartyMode={() => { setPartyMenuOpen(true); setMobileToolsOpen(false); }}
          onOpenCampaign={() => { setShowCampaignPickerModal(true); setMobileToolsOpen(false); }}
          onOpenResourcePacks={() => { setShowResourcePacksModal(true); setMobileToolsOpen(false); }}
          onSelectTab={(tab) => { setActiveTab(tab); setMobileToolsOpen(false); }}
        />
      )}
      <MasterBottomNav
        activeTab={activeTab}
        sessionViewMode={sessionViewMode}
        onSelectTab={setActiveTab}
        onOpenTools={() => setMobileToolsOpen(true)}
        onOpenScene={() => setShowCompositorModal(true)}
      />

      <ResourcePacksModal
        isOpen={showResourcePacksModal}
        onClose={() => setShowResourcePacksModal(false)}
      />
    </div>
  );
};
