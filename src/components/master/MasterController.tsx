import React, { useState, useEffect, useCallback } from 'react';
import type {
  Campaign,
  Character,
  CharacterOnScreen,
  CharacterPosition,
  CinematicMacro,
  DisplayState,
  HistoryEvent,
  LightingFilter,
  SavedEncounter,
  Scene,
  SessionCheckpoint,
  WeatherType,
} from '../../types';
import { soundEngine } from '../../services/soundEngine';
import { peerService } from '../../services/peerService';
import { getPlatformBridge } from '../../platform';
import { sessionRecoveryService } from '../../services/sessionRecovery';
import {
  db,
  BUILTIN_SFX,
  DEMO_CAMPAIGN,
  DEMO_SCENES,
  DEMO_CHARACTERS,
  DEMO_MACROS,
  DEMO_ENCOUNTERS,
  initDefaultDataIfNeeded,
  getAllCampaigns,
  createCampaign,
  updateCampaign,
  duplicateCampaign,
  deleteCampaign,
  setActiveCampaignId,
  getCampaignCheckpoints,
  saveCheckpoint,
  deleteCheckpoint,
  getCampaignEncounters,
  saveEncounter,
  deleteEncounter,
} from '../../db';
import { useMasterConnection } from '../../hooks/useMasterConnection';
import { useDisplaySession } from '../../hooks/useDisplaySession';
import { useMacroSequencer } from '../../hooks/useMacroSequencer';
import { accumulateMacroToState } from '../../domain/macros/macroEngine';
import { CombatTab } from './CombatTab';
import { MomentsTab } from './MomentsTab';
import { QuickMomentsDropdown } from './QuickMomentsDropdown';
import { SelectivePublishModal } from './SelectivePublishModal';
import { LiveMiniPreview } from './LiveMiniPreview';
import { FullScreenPreviewModal } from './FullScreenPreviewModal';
import { HistoryModal } from './HistoryModal';
import { CheckpointsModal } from './CheckpointsModal';
import { NetworkDiagnosticsModal } from './NetworkDiagnosticsModal';
import { CampaignPickerModal } from './modals/CampaignPickerModal';
import { SceneEditModal } from './modals/SceneEditModal';
import { CharacterEditModal } from './modals/CharacterEditModal';
import { SummonCharacterModal } from './modals/SummonCharacterModal';
import { MasterQRModal } from './modals/MasterQRModal';
import { TransportStatusChip } from '../common/TransportStatusChip';
import type { TransportStatusState } from '../common/TransportStatusChip';
import {
  Zap,
  Activity,
  AlertTriangle,
  EyeOff,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  Flame,
  Sparkles,
  Sun,
  Moon,
  Sunset,
  Skull,
  UserPlus,
  Mic,
  Volume2,
  VolumeX,
  BookOpen,
  Sliders,
  FolderOpen,
  Plus,
  Trash2,
  Edit,
  Upload,
  Download,
  Dices,
  RefreshCw,
  X,
  LogOut,
  Swords,
  Music,
  FolderSync,
  Send,
  RotateCcw,
  RotateCw,
  Layers,
  Radio,
  History,
  Bookmark,
  CheckCheck,
  WifiOff,
  Tv,
} from 'lucide-react';

interface MasterControllerProps {
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
  const [checkpointsList, setCheckpointsList] = useState<SessionCheckpoint[]>([]);
  const [encountersList, setEncountersList] = useState<SavedEncounter[]>([]);
  const [showCampaignPickerModal, setShowCampaignPickerModal] = useState<boolean>(false);

  // Forms & Edit Modals
  const [showSummonModal, setShowSummonModal] = useState<boolean>(false);
  const [showNewSceneModal, setShowNewSceneModal] = useState<boolean>(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [showNewCharModal, setShowNewCharModal] = useState<boolean>(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [diceLog, setDiceLog] = useState<{ id: string; text: string; time: string }[]>([]);

  // 1. Connection Hook
  const {
    roomCode,
    connectionStatus,
    latencyMs,
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

  // Helper: Create Auto-Checkpoint in Dexie
  const createAutoCheckpoint = useCallback(
    async (triggerName: string, stateToSave: DisplayState) => {
      if (!campaign) return;
      const autoCp: SessionCheckpoint = {
        id: `cp-auto-${Date.now()}`,
        campaignId: campaign.id,
        name: `Auto: ${triggerName}`,
        type: 'auto',
        trigger: triggerName,
        createdAt: Date.now(),
        state: stateToSave,
      };
      await saveCheckpoint(autoCp);
      const updated = await getCampaignCheckpoints(campaign.id);
      setCheckpointsList(updated);
    },
    [campaign]
  );

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
      setEncountersList(encs.length > 0 ? encs : DEMO_ENCOUNTERS);

      if (camp.scenes.length > 0) {
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
    };
    loadData();
  }, [initSessionState]);

  // Platform Bridge: Unlock Orientation & Handle Native Back Button on Modals
  useEffect(() => {
    const bridge = getPlatformBridge();
    bridge.screen.setOrientation('unlocked');

    const unbindBack = bridge.lifecycle.onBackButton(() => {
      // If any modal is open, close it and prevent app exit
      if (showQRModal) { setShowQRModal(false); return true; }
      if (showDiagnosticsModal) { setShowDiagnosticsModal(false); return true; }
      if (showHistoryModal) { setShowHistoryModal(false); return true; }
      if (showCheckpointsModal) { setShowCheckpointsModal(false); return true; }
      if (showQuickMoments) { setShowQuickMoments(false); return true; }
      if (showSummonModal) { setShowSummonModal(false); return true; }
      if (showNewSceneModal) { setShowNewSceneModal(false); return true; }
      if (showNewCharModal) { setShowNewCharModal(false); return true; }
      if (showCampaignPickerModal) { setShowCampaignPickerModal(false); return true; }
      if (showSelectivePublishModal) { setShowSelectivePublishModal(false); return true; }
      if (showFullScreenPreview) { setShowFullScreenPreview(false); return true; }
      return false;
    });

    return () => {
      unbindBack();
    };
  }, [
    showQRModal,
    showDiagnosticsModal,
    showHistoryModal,
    showCheckpointsModal,
    showQuickMoments,
    showSummonModal,
    showNewSceneModal,
    showNewCharModal,
    showCampaignPickerModal,
    showSelectivePublishModal,
    showFullScreenPreview,
  ]);

  // Session Recovery: Save non-sensitive transactional snapshot for crash / process death recovery
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
    await updateCampaign(updatedCamp);
    setCampaign(updatedCamp);
  };

  // Checkpoints Management
  const handleSaveManualCheckpoint = async (name: string) => {
    if (!campaign) return;
    const cp: SessionCheckpoint = {
      id: `cp-manual-${Date.now()}`,
      campaignId: campaign.id,
      name,
      type: 'manual',
      trigger: 'Manual',
      createdAt: Date.now(),
      state: activeDisplay,
    };
    await saveCheckpoint(cp);
    const updated = await getCampaignCheckpoints(campaign.id);
    setCheckpointsList(updated);
    soundEngine.playSynth('church_bell');
  };

  const handleRestoreCheckpoint = async (checkpoint: SessionCheckpoint) => {
    await createAutoCheckpoint(`Seguridad: Antes de restaurar "${checkpoint.name}"`, liveState);
    restoreSnapshot(checkpoint.state, `Restaurado Checkpoint: ${checkpoint.name}`);
    soundEngine.playSynth('fanfare_victory');
  };

  const handleDeleteCheckpoint = async (id: string) => {
    if (!campaign) return;
    await deleteCheckpoint(id);
    const updated = await getCampaignCheckpoints(campaign.id);
    setCheckpointsList(updated);
  };

  // Restore state from History Modal
  const handleRestoreFromHistory = (evt: HistoryEvent) => {
    restoreSnapshot(evt.stateSnapshot, `Restaurado a: ${evt.description}`);
  };

  // Switch Active Campaign
  const handleSwitchCampaign = async (selected: Campaign) => {
    setCampaign(selected);
    await setActiveCampaignId(selected.id);
    const cps = await getCampaignCheckpoints(selected.id);
    setCheckpointsList(cps);
    const encs = await getCampaignEncounters(selected.id);
    setEncountersList(encs);
    if (selected.scenes.length > 0) {
      selectScene(selected.scenes[0]);
    }
    setShowCampaignPickerModal(false);
  };

  // Duplicate Campaign
  const handleDuplicateCampaign = async (id: string) => {
    const dup = await duplicateCampaign(id);
    if (dup) {
      const all = await getAllCampaigns();
      setCampaignList(all);
      alert(`¡Campaña "${dup.title}" duplicada con éxito!`);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id: string, title: string) => {
    if (campaignList.length <= 1) {
      alert('Debe existir al menos una campaña.');
      return;
    }
    if (window.confirm(`¿Estás seguro de eliminar permanentemente la campaña "${title}"?`)) {
      await deleteCampaign(id);
      const all = await getAllCampaigns();
      setCampaignList(all);
      if (campaign?.id === id) {
        setCampaign(all[0]);
        selectScene(all[0].scenes[0]);
      }
    }
  };

  const openEditSceneModal = (sc: Scene) => {
    setEditingScene(sc);
    setShowNewSceneModal(true);
  };

  const openEditCharModal = (ch: Character) => {
    setEditingChar(ch);
    setShowNewCharModal(true);
  };

  // Character Management
  const summonCharacter = (char: Character) => {
    const positions: CharacterPosition[] = ['left', 'center-left', 'center-right', 'right'];
    const usedPositions = activeDisplay.characters.map((c) => c.position);
    const availablePos = positions.find((p) => !usedPositions.includes(p)) || 'center-left';

    const newOnScreen: CharacterOnScreen = {
      id: `active-${char.id}-${Date.now()}`,
      characterId: char.id,
      name: char.name,
      avatarUrl: char.defaultAvatarUrl,
      position: availablePos,
      isSpeaking: false,
    };

    updateDisplay(
      (prev) => ({
        ...prev,
        characters: [...prev.characters, newOnScreen],
      }),
      `Invocado ${char.name}`
    );
    setShowSummonModal(false);
  };

  const dismissCharacter = (id: string) => {
    const charName = activeDisplay.characters.find((c) => c.id === id)?.name || 'Personaje';
    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.filter((c) => c.id !== id),
      }),
      `Retirado ${charName}`
    );
  };

  const toggleSpeaking = (id: string) => {
    const char = activeDisplay.characters.find((c) => c.id === id);
    const newSpeaking = !char?.isSpeaking;

    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) => ({
          ...c,
          isSpeaking: c.id === id ? newSpeaking : false,
        })),
      }),
      `${newSpeaking ? 'Foco de voz' : 'Silenciado'}: ${char?.name}`
    );
  };

  const changeCharacterPosition = (id: string, position: CharacterPosition) => {
    const charName = activeDisplay.characters.find((c) => c.id === id)?.name || 'Personaje';
    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) => (c.id === id ? { ...c, position } : c)),
      }),
      `Posición de ${charName} a ${position}`
    );
  };

  const changeCharacterExpression = (id: string, expressionName: string, avatarUrl: string) => {
    const charName = activeDisplay.characters.find((c) => c.id === id)?.name || 'Personaje';
    updateDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) =>
          c.id === id ? { ...c, avatarUrl, activeExpression: expressionName } : c
        ),
      }),
      `Expresión de ${charName}: ${expressionName}`
    );
  };

  // Weather & Atmosphere
  const setWeatherEffect = (type: WeatherType) => {
    updateDisplay((prev) => ({ ...prev, weather: type }), `Clima: ${type}`);
  };

  const setWeatherIntensityVal = (val: number) => {
    updateDisplay((prev) => ({ ...prev, weatherIntensity: val }), `Intensidad del Clima: ${Math.round(val * 100)}%`);
  };

  const setLightingPreset = (filter: LightingFilter) => {
    updateDisplay((prev) => ({ ...prev, lighting: filter }), `Iluminación: ${filter}`);
  };

  // Panic & Direct SFX
  const toggleBlackout = () => {
    const next = !activeDisplay.isBlackout;
    updateDisplay((prev) => ({ ...prev, isBlackout: next }), next ? 'Blackout Activado' : 'Blackout Desactivado');
  };

  const triggerLightning = () => {
    broadcastMessage({ type: 'TRIGGER_LIGHTNING' });
    soundEngine.playSynth('thunder');
  };

  const triggerScreenShake = () => {
    broadcastMessage({ type: 'TRIGGER_SHAKE' });
  };

  const updateBanner = () => {
    updateDisplay(
      (prev) => ({ ...prev, locationBanner: { ...prev.locationBanner } }),
      `Actualizado Cartel: ${activeDisplay.locationBanner.text}`
    );
  };

  // Audio Controls
  const toggleAmbientPlay = () => {
    if (!activeDisplay.ambientAudioUrl) return;
    const next = !activeDisplay.ambientPlaying;
    updateDisplay((prev) => ({ ...prev, ambientPlaying: next }), next ? 'Música Reanudada' : 'Música Pausada');
    if (operationMode === 'live') {
      soundEngine.setAmbient(activeDisplay.ambientAudioUrl, next, activeDisplay.ambientVolume, true);
    }
  };

  const handleAmbientVolumeChange = (vol: number) => {
    updateDisplay((prev) => ({ ...prev, ambientVolume: vol }), `Volumen Música: ${Math.round(vol * 100)}%`);
    if (operationMode === 'live' && activeDisplay.ambientAudioUrl) {
      soundEngine.setAmbient(activeDisplay.ambientAudioUrl, activeDisplay.ambientPlaying, vol, false);
    }
  };

  const playSfx = (sfx: typeof BUILTIN_SFX[0]) => {
    if (sfx.soundType === 'synthesized' && sfx.synthPreset) {
      soundEngine.playSynth(sfx.synthPreset);
    }
    broadcastMessage({
      type: 'PLAY_SFX',
      payload: {
        id: sfx.id,
        name: sfx.name,
        synthPreset: sfx.synthPreset,
        audioUrl: sfx.audioUrl,
        timestamp: Date.now(),
      },
    });
  };

  const rollDice = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const isCrit = sides === 20 && result === 20;
    const isFumble = sides === 20 && result === 1;

    let text = `d${sides}: ${result}`;
    if (isCrit) text += ' (¡CRÍTICO! ⚔️)';
    if (isFumble) text += ' (¡PIFIA! 💀)';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDiceLog((prev) => [{ id: Math.random().toString(), text, time }, ...prev.slice(0, 15)]);
    soundEngine.playSynth('heartbeat');
  };

  const handleResetDemo = async () => {
    if (window.confirm('¿Restaurar la campaña de demostración inicial?')) {
      await db.campaigns.clear();
      await db.scenes.clear();
      await db.characters.clear();
      await db.encounters.clear();
      await db.campaigns.put(DEMO_CAMPAIGN);
      setCampaign(DEMO_CAMPAIGN);
      const all = await getAllCampaigns();
      setCampaignList(all);
      setEncountersList(DEMO_ENCOUNTERS);
      if (DEMO_CAMPAIGN.scenes.length > 0) {
        selectScene(DEMO_CAMPAIGN.scenes[0]);
      }
    }
  };

  const exportCampaignJSON = () => {
    if (!campaign) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(campaign, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${campaign.title.replace(/\s+/g, '_')}_backup.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importCampaignJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string) as Campaign;
          if (parsed.id && parsed.scenes) {
            await db.campaigns.put(parsed);
            setCampaign(parsed);
            const all = await getAllCampaigns();
            setCampaignList(all);
            alert('¡Campaña importada exitosamente!');
          }
        } catch (err) {
          alert('Archivo JSON no válido.');
        }
      };
    }
  };

  const joinUrl = `${window.location.origin}${window.location.pathname}#join=${roomCode}${pairingSecret ? `&secret=${pairingSecret}` : ''}`;

  return (
    <div className="master-controller-root">
      {/* Top Header */}
      <header className="master-header">
        <div className="header-top">
          <div className="brand-group" onClick={() => setShowCampaignPickerModal(true)} style={{ cursor: 'pointer' }}>
            <h1 className="app-title">{campaign?.title || 'Visual Player'}</h1>
            <span className="app-badge">Cambiar</span>
          </div>

          <div className="connection-group" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {/* Quick Moments Button */}
            <button
              className="icon-action-btn moments-btn"
              onClick={() => setShowQuickMoments(true)}
              title="Disparador Rápido de Momentos / Macros"
            >
              <Sparkles size={15} className="text-amber-400" />
            </button>

            {/* Quick Undo / Redo / History / Checkpoint Actions */}
            <button
              className="icon-action-btn"
              onClick={undo}
              disabled={pastEvents.length === 0}
              title={pastEvents.length > 0 ? `Deshacer: ${pastEvents[0].description} (Ctrl+Z)` : 'Deshacer (Ctrl+Z)'}
              style={{ opacity: pastEvents.length === 0 ? 0.4 : 1 }}
            >
              <RotateCcw size={15} />
            </button>

            <button
              className="icon-action-btn"
              onClick={redo}
              disabled={futureEvents.length === 0}
              title={futureEvents.length > 0 ? `Rehacer: ${futureEvents[0].description} (Ctrl+Y)` : 'Rehacer (Ctrl+Y)'}
              style={{ opacity: futureEvents.length === 0 ? 0.4 : 1 }}
            >
              <RotateCw size={15} />
            </button>

            <button
              className="icon-action-btn"
              onClick={() => setShowHistoryModal(true)}
              title="Ver Historial de Acciones"
            >
              <History size={15} />
            </button>

            <button
              className="icon-action-btn"
              onClick={() => setShowCheckpointsModal(true)}
              title="Puntos de Restauración (Checkpoints)"
            >
              <Bookmark size={15} />
            </button>

            <button
              className="icon-action-btn diagnostics-btn"
              onClick={() => setShowDiagnosticsModal(true)}
              title="Diagnóstico de Red & Modo Caos (DEV)"
            >
              <Activity size={15} className={peerService.isChaosActive() ? 'text-rose-400 animate-pulse' : 'text-slate-400'} />
            </button>

            {/* Transport Status Chip - replaces plain status-chip button */}
            {
              (() => {
                const transportStatus: TransportStatusState =
                  connectionStatus === 'connected' ? 'internet'
                  : connectionStatus === 'connecting' ? 'switching'
                  : 'disconnected';
                return (
                  <TransportStatusChip
                    status={transportStatus}
                    transportLabel="Internet"
                    latencyMs={latencyMs > 0 ? latencyMs : undefined}
                    role="master"
                    onOpenDiagnostic={() => setShowDiagnosticsModal(true)}
                  />
                );
              })()
            }
            {onExitToLobby && (
              <button
                className="status-chip"
                onClick={() => {
                  sessionRecoveryService.markCleanExit();
                  onExitToLobby();
                }}
                title="Salir al Lobby"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>

        {/* NON-INVASIVE FLOATING RECONNECTION TOAST */}
        {connectionStatus !== 'connected' && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(239, 68, 68, 0.18))',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#fbbf24',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WifiOff size={14} className="animate-pulse" />
              <span>
                {connectionStatus === 'connecting'
                  ? `Reconectando con la Mesa (${roomCode || '---'})... Los cambios se conservan.`
                  : `Sin conexión con la Mesa (${roomCode || '---'}). Tus notas y fichas siguen disponibles.`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => connectToRoom(roomCode, pairingSecret)}
              style={{
                background: 'rgba(245, 158, 11, 0.25)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '6px',
                color: '#fbbf24',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reconectar
            </button>
          </div>
        )}

        {/* PERSISTENT CHAOS SIMULATION WARNING BANNER (DEV) */}
        {peerService.isChaosActive() && (
          <div className="chaos-warning-header-banner">
            <div className="flex-align-gap">
              <AlertTriangle size={15} className="text-amber-400 animate-bounce" />
              <span>
                <strong>MODO CAOS ACTIVO</strong>: {peerService.getChaosConfig().latencyMs}ms latencia • {Math.round(peerService.getChaosConfig().packetLossRate * 100)}% pérdida
                {peerService.getChaosConfig().isPartitioned && ' • CORTE TOTAL'}
              </span>
            </div>
            <div className="flex-align-gap">
              <button className="btn-chaos-mini" onClick={() => setShowDiagnosticsModal(true)}>
                Ajustar
              </button>
              <button
                className="btn-chaos-mini reset"
                onClick={() => {
                  peerService.resetChaos();
                  alert('Red restablecida a condiciones normales (0ms, 0% pérdida).');
                }}
              >
                Restablecer
              </button>
            </div>
          </div>
        )}

        {/* ACTIVE RUNNING MACRO SEQUENCE BAR */}
        {runningMacro && (
          <div className="running-macro-banner">
            <div className="running-macro-info">
              <Sparkles size={16} className="text-amber-400 animate-spin" />
              <span>
                Momento: <strong>{runningMacro.macro.name}</strong> (Paso {runningMacro.currentStepIndex + 1}/{runningMacro.totalSteps})
              </span>
            </div>
            <div className="running-macro-actions">
              <button
                className="macro-ctrl-btn danger"
                onClick={() => {
                  cancelMacro((backup) => {
                    restoreSnapshot(backup, `Cancelada macro: ${runningMacro.macro.name}`);
                  });
                }}
                title="Cancelar secuencia y restaurar estado anterior"
              >
                <X size={14} />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        )}

        {/* Operation Mode Selector Bar: Live vs Staging */}
        <div className="operation-mode-switcher-bar">
          <div className="mode-switch-group">
            <button
              className={`mode-switch-btn ${operationMode === 'live' ? 'active-live' : ''}`}
              onClick={() => handleToggleOperationMode('live')}
            >
              <Radio size={14} className={operationMode === 'live' ? 'animate-pulse' : ''} />
              <span>⚡ EN VIVO</span>
            </button>

            <button
              className={`mode-switch-btn ${operationMode === 'staging' ? 'active-staging' : ''}`}
              onClick={() => handleToggleOperationMode('staging')}
            >
              <Layers size={14} />
              <span>🛠️ PREPARACIÓN</span>
              {pendingChangesCount > 0 && (
                <span className="pending-badge-count">{pendingChangesCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Live Mini Preview Carousel in Header */}
        <LiveMiniPreview
          liveState={liveState}
          stagedState={stagedState}
          operationMode={operationMode}
          previewTab={previewTab}
          onChangePreviewTab={setPreviewTab}
          onOpenFullScreen={() => setShowFullScreenPreview(true)}
        />

        {/* Floating / Sticky Staging Publish Bar when in Staging Mode with changes */}
        {operationMode === 'staging' && pendingChangesCount > 0 && (
          <div className="staging-publish-sticky-bar">
            <div className="staging-info">
              <span className="staging-badge">BORRADOR</span>
              <span className="staging-count">{pendingChangesCount} cambios preparados</span>
            </div>
            <div className="staging-actions">
              <button
                className="btn-discard-staging"
                onClick={() => {
                  discardStaged();
                  setPreviewTab('live');
                }}
                title="Descartar borrador"
              >
                <RotateCcw size={14} />
                <span>Descartar</span>
              </button>

              <button
                className="btn-review-staging"
                onClick={() => setShowSelectivePublishModal(true)}
                title="Revisar diferencias e incoherencias antes de publicar"
              >
                <CheckCheck size={14} />
                <span>Revisar y Publicar</span>
              </button>

              <button
                className="btn-send-staging"
                onClick={() => {
                  publishAllStaged();
                  setPreviewTab('live');
                }}
                title="Enviar todos los cambios a la Tablet de un golpe"
              >
                <Send size={14} />
                <span>Publicar Todo</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Action Triggers Row */}
        <div className="quick-actions-bar">
          <button
            className={`action-pill ${activeDisplay.isBlackout ? 'blackout-active' : 'blackout-btn'}`}
            onClick={toggleBlackout}
          >
            <EyeOff size={16} />
            <span>{activeDisplay.isBlackout ? 'Encender Pantalla' : 'Blackout (Pánico)'}</span>
          </button>

          <button className="action-pill trigger-lightning-btn" onClick={triggerLightning}>
            <Zap size={16} />
            <span>Rayo</span>
          </button>

          <button className="action-pill trigger-shake-btn" onClick={triggerScreenShake}>
            <Activity size={16} />
            <span>Temblor</span>
          </button>
        </div>

        {/* Navigation Tabs (5 Tabs) */}
        <nav className="tab-navigation five-tabs">
          <button
            className={`nav-tab ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            <Sliders size={16} />
            <span>En Vivo</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'moments' ? 'active' : ''}`}
            onClick={() => setActiveTab('moments')}
          >
            <Sparkles size={16} />
            <span>Momentos</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'combat' ? 'active' : ''}`}
            onClick={() => setActiveTab('combat')}
          >
            <Swords size={16} />
            <span>Combate</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            <BookOpen size={16} />
            <span>Notas DM</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <FolderOpen size={16} />
            <span>Campañas</span>
          </button>
        </nav>
      </header>

      {/* Main Tab Content */}
      <main className="master-content">
        {/* TAB 1: LIVE STAGE */}
        {activeTab === 'live' && (
          <div className="live-panel">
            {/* Quick Moments Shortcuts in Live Panel */}
            {campaign?.macros && campaign.macros.length > 0 && (
              <section className="control-section quick-moments-live-section">
                <div className="section-header">
                  <div className="flex-align-gap">
                    <Sparkles size={16} className="text-amber-400" />
                    <span className="section-title">Momentos Rápidos</span>
                  </div>
                  <button className="link-button" onClick={() => setActiveTab('moments')}>
                    Ver todos ({campaign.macros.length})
                  </button>
                </div>
                <div className="quick-moments-scroll-row">
                  {campaign.macros.map((m) => (
                    <button
                      key={m.id}
                      className="quick-moment-chip"
                      onClick={() => handleExecuteMacro(m)}
                      title={m.description}
                    >
                      <Sparkles size={14} className="text-amber-400" />
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 1. Location Banner Quick Control */}
            <section className="control-section banner-section">
              <div className="section-header">
                <span className="section-title">Cartel de Ubicación en Pantalla</span>
                <button
                  className={`mini-toggle ${activeDisplay.locationBanner.visible ? 'on' : 'off'}`}
                  onClick={() => {
                    const next = !activeDisplay.locationBanner.visible;
                    updateDisplay(
                      (prev) => ({ ...prev, locationBanner: { ...prev.locationBanner, visible: next } }),
                      `Cartel: ${next ? 'Visible' : 'Oculto'}`
                    );
                  }}
                >
                  {activeDisplay.locationBanner.visible ? 'Visible' : 'Oculto'}
                </button>
              </div>
              <div className="banner-inputs">
                <input
                  type="text"
                  placeholder="Título (Ej. RUINAS DE ELDORIA)"
                  value={activeDisplay.locationBanner.text}
                  onChange={(e) =>
                    updateDisplay((prev) => ({
                      ...prev,
                      locationBanner: { ...prev.locationBanner, text: e.target.value },
                    }))
                  }
                  onBlur={updateBanner}
                  className="master-input"
                />
                <input
                  type="text"
                  placeholder="Subtítulo (Ej. Sala del Trono Olvidado)"
                  value={activeDisplay.locationBanner.subtitle || ''}
                  onChange={(e) =>
                    updateDisplay((prev) => ({
                      ...prev,
                      locationBanner: { ...prev.locationBanner, subtitle: e.target.value },
                    }))
                  }
                  onBlur={updateBanner}
                  className="master-input secondary"
                />
              </div>
            </section>

            {/* 2. Scene Switcher Grid */}
            <section className="control-section">
              <div className="section-header">
                <span className="section-title">Cambiar Escenario</span>
                <span className="section-count">{campaign?.scenes.length || 0} escenas</span>
              </div>
              <div className="scenes-carousel">
                {campaign?.scenes.map((sc) => {
                  const isSelected = activeDisplay.currentSceneId === sc.id;
                  return (
                    <button
                      key={sc.id}
                      className={`scene-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectScene(sc)}
                    >
                      <div
                        className="scene-thumb"
                        style={{ backgroundImage: `url(${sc.backgroundUrl})` }}
                      >
                        {isSelected && (
                          <div className="active-badge">
                            {operationMode === 'live' ? 'EN PANTALLA' : 'BORRADOR'}
                          </div>
                        )}
                      </div>
                      <span className="scene-name">{sc.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Ambient Audio Bar for Current Scene */}
            {activeDisplay.ambientAudioUrl && (
              <section className="control-section audio-control-section">
                <div className="section-header">
                  <div className="flex-align-gap">
                    <Music size={16} className="text-amber-400" />
                    <span className="section-title">
                      {currentScene?.ambientAudioName || 'Música Ambiental'}
                    </span>
                  </div>
                  <button
                    className={`mini-toggle ${activeDisplay.ambientPlaying ? 'on' : 'off'}`}
                    onClick={toggleAmbientPlay}
                  >
                    {activeDisplay.ambientPlaying ? 'Reproduciendo' : 'Pausado'}
                  </button>
                </div>
                <div className="audio-slider-row">
                  {activeDisplay.ambientPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={activeDisplay.ambientVolume}
                    onChange={(e) => handleAmbientVolumeChange(parseFloat(e.target.value))}
                    className="master-range"
                  />
                  <span className="slider-label">{Math.round(activeDisplay.ambientVolume * 100)}%</span>
                </div>
              </section>
            )}

            {/* 4. Stage Characters */}
            <section className="control-section">
              <div className="section-header">
                <span className="section-title">Personajes en Escena ({activeDisplay.characters.length})</span>
                <button
                  className="btn-primary-sm"
                  onClick={() => setShowSummonModal(true)}
                >
                  <UserPlus size={14} />
                  <span>Invocar NPC</span>
                </button>
              </div>

              {activeDisplay.characters.length === 0 ? (
                <div className="empty-roster-box">
                  <p>No hay personajes en la pantalla.</p>
                  <button className="btn-secondary-sm" onClick={() => setShowSummonModal(true)}>
                    + Invocar de la Biblioteca
                  </button>
                </div>
              ) : (
                <div className="active-chars-grid">
                  {activeDisplay.characters.map((char) => {
                    const originalChar = campaign?.characters.find((c) => c.id === char.characterId);
                    return (
                      <div
                        key={char.id}
                        className={`active-char-card ${char.isSpeaking ? 'speaking-focus' : ''}`}
                      >
                        <div className="char-card-top">
                          <img src={char.avatarUrl} alt={char.name} className="char-avatar" />
                          <div className="char-meta">
                            <span className="char-title">{char.name}</span>
                            <div className="position-pills">
                              {(['left', 'center-left', 'center-right', 'right'] as CharacterPosition[]).map(
                                (pos) => (
                                  <button
                                    key={pos}
                                    className={`pos-btn ${char.position === pos ? 'pos-active' : ''}`}
                                    onClick={() => changeCharacterPosition(char.id, pos)}
                                  >
                                    {pos === 'left' ? 'Izq' : pos === 'center-left' ? 'C-Izq' : pos === 'center-right' ? 'C-Der' : 'Der'}
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          <button
                            className="dismiss-btn"
                            onClick={() => dismissCharacter(char.id)}
                            title="Quitar de Pantalla"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Speaking Toggle & Expressions */}
                        <div className="char-card-actions">
                          <button
                            className={`speak-btn ${char.isSpeaking ? 'active' : ''}`}
                            onClick={() => toggleSpeaking(char.id)}
                          >
                            <Mic size={14} />
                            <span>{char.isSpeaking ? 'Hablando (En Foco)' : 'Dar Foco de Voz'}</span>
                          </button>

                          {originalChar?.expressions && Object.keys(originalChar.expressions).length > 0 && (
                            <div className="expressions-row">
                              {Object.entries(originalChar.expressions).map(([expName, url]) => (
                                <button
                                  key={expName}
                                  className={`exp-btn ${char.avatarUrl === url ? 'exp-active' : ''}`}
                                  onClick={() => changeCharacterExpression(char.id, expName, url)}
                                >
                                  {expName}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 5. Weather & Atmosphere Controls */}
            <section className="control-section">
              <span className="section-title">Clima y Partículas</span>
              <div className="weather-grid">
                <button
                  className={`weather-btn ${activeDisplay.weather === 'none' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('none')}
                >
                  <Sun size={18} />
                  <span>Despejado</span>
                </button>
                <button
                  className={`weather-btn ${activeDisplay.weather === 'rain' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('rain')}
                >
                  <CloudRain size={18} />
                  <span>Lluvia</span>
                </button>
                <button
                  className={`weather-btn ${activeDisplay.weather === 'storm' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('storm')}
                >
                  <CloudLightning size={18} />
                  <span>Tormenta</span>
                </button>
                <button
                  className={`weather-btn ${activeDisplay.weather === 'snow' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('snow')}
                >
                  <Snowflake size={18} />
                  <span>Nieve</span>
                </button>
                <button
                  className={`weather-btn ${activeDisplay.weather === 'fog' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('fog')}
                >
                  <Wind size={18} />
                  <span>Niebla</span>
                </button>
                <button
                  className={`weather-btn ${activeDisplay.weather === 'embers' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('embers')}
                >
                  <Flame size={18} />
                  <span>Ascuas</span>
                </button>
                <button
                  className={`weather-btn ${activeDisplay.weather === 'fireflies' ? 'active' : ''}`}
                  onClick={() => setWeatherEffect('fireflies')}
                >
                  <Sparkles size={18} />
                  <span>Luciérnagas</span>
                </button>
              </div>

              {activeDisplay.weather !== 'none' && (
                <div className="intensity-slider-row">
                  <span className="slider-label">Intensidad: {Math.round(activeDisplay.weatherIntensity * 100)}%</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={activeDisplay.weatherIntensity}
                    onChange={(e) => setWeatherIntensityVal(parseFloat(e.target.value))}
                    className="master-range"
                  />
                </div>
              )}
            </section>

            {/* 6. Lighting Color Filter */}
            <section className="control-section">
              <span className="section-title">Filtro de Luz e Iluminación</span>
              <div className="lighting-grid">
                <button
                  className={`light-btn ${activeDisplay.lighting === 'normal' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('normal')}
                >
                  <Sun size={16} />
                  <span>Día / Normal</span>
                </button>
                <button
                  className={`light-btn ${activeDisplay.lighting === 'torch_flicker' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('torch_flicker')}
                >
                  <Flame size={16} />
                  <span>Antorchas</span>
                </button>
                <button
                  className={`light-btn ${activeDisplay.lighting === 'night' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('night')}
                >
                  <Moon size={16} />
                  <span>Noche</span>
                </button>
                <button
                  className={`light-btn ${activeDisplay.lighting === 'sunset' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('sunset')}
                >
                  <Sunset size={16} />
                  <span>Atardecer</span>
                </button>
                <button
                  className={`light-btn ${activeDisplay.lighting === 'blood_moon' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('blood_moon')}
                >
                  <Skull size={16} />
                  <span>Luna de Sangre</span>
                </button>
                <button
                  className={`light-btn ${activeDisplay.lighting === 'mystic_violet' ? 'active' : ''}`}
                  onClick={() => setLightingPreset('mystic_violet')}
                >
                  <Sparkles size={16} />
                  <span>Arcano / Místico</span>
                </button>
              </div>
            </section>

            {/* 7. SFX Soundboard */}
            <section className="control-section">
              <span className="section-title">Sonidos FX Instantáneos (SFX)</span>
              <div className="sfx-grid">
                {BUILTIN_SFX.map((sfx) => (
                  <button
                    key={sfx.id}
                    className="sfx-btn"
                    onClick={() => playSfx(sfx)}
                  >
                    <Volume2 size={16} />
                    <span>{sfx.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: MOMENTS / MACROS */}
        {activeTab === 'moments' && (
          <MomentsTab
            campaign={campaign}
            onExecuteMacro={handleExecuteMacro}
            onLoadMacroToStaging={handleLoadMacroToStaging}
            onUpdateMacros={handleUpdateMacros}
          />
        )}

        {/* TAB 3: COMBAT & INITIATIVE TRACKER */}
        {activeTab === 'combat' && (
          <CombatTab
            combatState={activeDisplay.combatState}
            campaign={campaign}
            currentScene={currentScene}
            encounters={encountersList}
            onSaveEncounter={async (saved) => {
              await saveEncounter(saved);
              if (campaign) {
                const updated = await getCampaignEncounters(campaign.id);
                setEncountersList(updated);
              }
            }}
            onDeleteEncounter={async (id) => {
              await deleteEncounter(id);
              if (campaign) {
                const updated = await getCampaignEncounters(campaign.id);
                setEncountersList(updated);
              }
            }}
            onUpdateCombatState={(newState) => {
              if (activeDisplay.combatState.isActive !== newState.isActive) {
                createAutoCheckpoint(
                  newState.isActive ? 'Inicio de Combate' : 'Finalización de Combate',
                  liveState
                );
              }
              updateDisplay(
                (prev) => ({ ...prev, combatState: newState }),
                `Combate: Ronda ${newState.round}, Turno ${newState.currentTurnIndex + 1}`
              );
              if (!newState.isActive) {
                broadcastMessage({ type: 'END_COMBAT' });
              } else {
                broadcastMessage({ type: 'UPDATE_COMBAT', payload: newState });
              }
            }}
          />
        )}

        {/* TAB 4: DM NOTES & DICE */}
        {activeTab === 'notes' && (
          <div className="notes-panel">
            <div className="notes-card">
              <h2 className="notes-header">Notas Secretas: {currentScene?.name || 'Sin Escenario'}</h2>
              <textarea
                className="dm-notes-textarea"
                value={currentScene?.dmNotes || ''}
                placeholder="Escribe notas, estadísticas de monstruos, pistas o diálogos clave para esta escena..."
                onChange={(e) => {
                  if (!currentScene || !campaign) return;
                  const updatedScene = { ...currentScene, dmNotes: e.target.value };
                  const updatedScenes = campaign.scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s));
                  const updatedCamp = { ...campaign, scenes: updatedScenes };
                  setCampaign(updatedCamp);
                  updateCampaign(updatedCamp);
                }}
              />
            </div>

            {/* Quick Dice Roller */}
            <div className="dice-roller-card">
              <div className="section-header">
                <span className="section-title">Lanzador de Dados del Master</span>
                <Dices size={18} />
              </div>
              <div className="dice-buttons">
                {[4, 6, 8, 10, 12, 20, 100].map((d) => (
                  <button key={d} className="die-btn" onClick={() => rollDice(d)}>
                    d{d}
                  </button>
                ))}
              </div>

              {diceLog.length > 0 && (
                <div className="dice-history">
                  {diceLog.map((log) => (
                    <div key={log.id} className="dice-log-entry">
                      <span className="dice-time">{log.time}</span>
                      <span className="dice-result">{log.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LIBRARY & CAMPAIGNS */}
        {activeTab === 'library' && (
          <div className="library-panel">
            <div className="campaign-meta-box">
              <div className="meta-info">
                <div className="flex-between">
                  <h2 className="campaign-title">{campaign?.title}</h2>
                  <button
                    className="btn-secondary-sm"
                    onClick={() => setShowCampaignPickerModal(true)}
                  >
                    <FolderSync size={14} />
                    <span>Cambiar Campaña</span>
                  </button>
                </div>
                <p className="campaign-desc">{campaign?.description || 'Sin descripción'}</p>
              </div>
              <div className="campaign-tools">
                <button className="tool-btn" onClick={exportCampaignJSON} title="Descargar Copia de Seguridad">
                  <Download size={16} />
                  <span>Exportar</span>
                </button>
                <label className="tool-btn file-label" title="Restaurar Copia de Seguridad">
                  <Upload size={16} />
                  <span>Importar</span>
                  <input type="file" accept=".json" onChange={importCampaignJSON} style={{ display: 'none' }} />
                </label>
                <button className="tool-btn danger" onClick={handleResetDemo} title="Cargar Datos de Prueba">
                  <RefreshCw size={16} />
                  <span>Reset Demo</span>
                </button>
              </div>
            </div>

            {/* Scenes Management */}
            <div className="library-section">
              <div className="section-header">
                <span className="section-title">Escenarios de la Campaña ({campaign?.scenes.length || 0})</span>
                <button
                  className="btn-primary-sm"
                  onClick={() => {
                    setEditingScene(null);
                    setShowNewSceneModal(true);
                  }}
                >
                  <Plus size={14} />
                  <span>Nuevo Escenario</span>
                </button>
              </div>
              <div className="library-list">
                {campaign?.scenes.map((sc) => (
                  <div key={sc.id} className="library-item">
                    <img src={sc.backgroundUrl} alt={sc.name} className="item-thumb" />
                    <div className="item-info">
                      <span className="item-title">{sc.name}</span>
                      <span className="item-subtitle">{sc.subtitle || 'Sin subtítulo'}</span>
                    </div>
                    <div className="item-actions">
                      <button
                        className="item-action-btn"
                        onClick={() => openEditSceneModal(sc)}
                        title="Editar Escenario"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="item-delete-btn"
                        onClick={async () => {
                          if (!campaign || campaign.scenes.length <= 1) {
                            alert('Debe quedar al menos un escenario en la campaña.');
                            return;
                          }
                          if (window.confirm(`¿Eliminar el escenario "${sc.name}"?`)) {
                            const updatedScenes = campaign.scenes.filter((s) => s.id !== sc.id);
                            const updatedCamp = { ...campaign, scenes: updatedScenes };
                            await updateCampaign(updatedCamp);
                            setCampaign(updatedCamp);
                          }
                        }}
                        title="Eliminar Escenario"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Characters Management */}
            <div className="library-section">
              <div className="section-header">
                <span className="section-title">Fichas de NPCs y Personajes ({campaign?.characters.length || 0})</span>
                <button
                  className="btn-primary-sm"
                  onClick={() => {
                    setEditingChar(null);
                    setShowNewCharModal(true);
                  }}
                >
                  <Plus size={14} />
                  <span>Nuevo NPC</span>
                </button>
              </div>
              <div className="library-list">
                {campaign?.characters.map((ch) => (
                  <div key={ch.id} className="library-item">
                    <img src={ch.defaultAvatarUrl} alt={ch.name} className="item-thumb circle" />
                    <div className="item-info">
                      <span className="item-title">{ch.name}</span>
                      <span className="item-subtitle">{ch.roleOrTitle}</span>
                    </div>
                    <div className="item-actions">
                      <button
                        className="item-action-btn"
                        onClick={() => openEditCharModal(ch)}
                        title="Editar NPC"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="item-delete-btn"
                        onClick={async () => {
                          if (!campaign) return;
                          if (window.confirm(`¿Eliminar al personaje "${ch.name}"?`)) {
                            const updatedChars = campaign.characters.filter((c) => c.id !== ch.id);
                            const updatedCamp = { ...campaign, characters: updatedChars };
                            await updateCampaign(updatedCamp);
                            setCampaign(updatedCamp);
                          }
                        }}
                        title="Eliminar NPC"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SELECTIVE PUBLISH MODAL */}
      {showSelectivePublishModal && (
        <SelectivePublishModal
          liveState={liveState}
          stagedState={stagedState}
          campaign={campaign}
          onPublishSelective={(keys) => {
            publishSelectiveStaged(keys);
            setPreviewTab('live');
          }}
          onPublishAll={() => {
            publishAllStaged();
            setPreviewTab('live');
          }}
          onClose={() => setShowSelectivePublishModal(false)}
        />
      )}

      {/* FULL SCREEN PREVIEW MODAL */}
      {showFullScreenPreview && (
        <FullScreenPreviewModal
          liveState={liveState}
          stagedState={stagedState}
          operationMode={operationMode}
          previewTab={previewTab}
          hasPendingChanges={pendingChangesCount > 0}
          onChangePreviewTab={setPreviewTab}
          onSendToScreen={() => {
            publishAllStaged();
            setPreviewTab('live');
          }}
          onClose={() => setShowFullScreenPreview(false)}
        />
      )}

      {/* QUICK MOMENTS DROPDOWN */}
      {showQuickMoments && (
        <QuickMomentsDropdown
          macros={campaign?.macros || []}
          onExecuteMacro={handleExecuteMacro}
          onLoadMacroToStaging={handleLoadMacroToStaging}
          onClose={() => setShowQuickMoments(false)}
        />
      )}

      {/* HISTORY MODAL */}
      {showHistoryModal && (
        <HistoryModal
          pastEvents={pastEvents}
          onRestoreEvent={handleRestoreFromHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* CHECKPOINTS MODAL */}
      {showCheckpointsModal && (
        <CheckpointsModal
          checkpoints={checkpointsList}
          onSaveManualCheckpoint={handleSaveManualCheckpoint}
          onRestoreCheckpoint={handleRestoreCheckpoint}
          onDeleteCheckpoint={handleDeleteCheckpoint}
          onClose={() => setShowCheckpointsModal(false)}
        />
      )}

      {/* DIALOG: UNSAVED STAGING CHANGES WHEN SWITCHING TO LIVE */}
      {showUnsavedStagingDialog && (
        <div className="modal-overlay" onClick={() => setShowUnsavedStagingDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cambios Pendientes en Borrador</h2>
            </div>
            <p className="modal-dialog-text">
              Tienes <strong>{pendingChangesCount} cambios preparados</strong> que aún no se han enviado a la pantalla. ¿Qué deseas hacer al volver al modo En Vivo?
            </p>
            <div className="modal-dialog-actions-vertical">
              <button
                className="btn-primary full"
                onClick={() => {
                  publishAllStaged();
                  setOperationMode('live');
                  setShowUnsavedStagingDialog(false);
                }}
              >
                <Send size={16} />
                <span>Publicar y Enviar a Pantalla</span>
              </button>

              <button
                className="btn-secondary full"
                onClick={() => {
                  setOperationMode('live');
                  setShowUnsavedStagingDialog(false);
                }}
              >
                <span>Conservar como Borrador (Sin Publicar)</span>
              </button>

              <button
                className="btn-danger full"
                onClick={() => {
                  discardStaged();
                  setOperationMode('live');
                  setShowUnsavedStagingDialog(false);
                }}
              >
                <Trash2 size={16} />
                <span>Descartar Borrador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CAMPAIGN PICKER & MANAGER */}
      <CampaignPickerModal
        isOpen={showCampaignPickerModal}
        campaigns={campaignList}
        activeCampaignId={campaign?.id}
        onSelectCampaign={handleSwitchCampaign}
        onCreateCampaign={async (title, desc) => {
          const newCamp: Campaign = {
            id: `camp-${Date.now()}`,
            title,
            description: desc,
            scenes: DEMO_SCENES,
            characters: DEMO_CHARACTERS,
            macros: DEMO_MACROS,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await createCampaign(newCamp);
          const list = await getAllCampaigns();
          setCampaignList(list);
          setCampaign(newCamp);
          await setActiveCampaignId(newCamp.id);
          selectScene(newCamp.scenes[0]);
          setShowCampaignPickerModal(false);
        }}
        onDuplicateCampaign={handleDuplicateCampaign}
        onDeleteCampaign={(campId) => handleDeleteCampaign(campId, '')}
        onClose={() => setShowCampaignPickerModal(false)}
      />

      {/* MODAL: EDIT / CREATE SCENE */}
      <SceneEditModal
        isOpen={showNewSceneModal}
        sceneToEdit={editingScene}
        onSave={async (sceneData) => {
          if (!sceneData.name || !sceneData.backgroundUrl || !campaign) return;
          if (editingScene) {
            const updatedScene: Scene = {
              ...editingScene,
              name: sceneData.name,
              backgroundUrl: sceneData.backgroundUrl,
              locationBanner: sceneData.locationBanner || sceneData.name,
              subtitle: sceneData.subtitle || '',
              weather: sceneData.weather || 'none',
              lighting: sceneData.lighting || 'normal',
              ambientAudioUrl: sceneData.ambientAudioUrl || '',
              ambientAudioName: sceneData.ambientAudioName || '',
              dmNotes: sceneData.dmNotes || '',
            };
            const updatedScenes = campaign.scenes.map((s) => (s.id === updatedScene.id ? updatedScene : s));
            const updatedCamp = { ...campaign, scenes: updatedScenes };
            await updateCampaign(updatedCamp);
            setCampaign(updatedCamp);
            if (activeDisplay.currentSceneId === updatedScene.id) {
              selectScene(updatedScene);
            }
          } else {
            const newScene: Scene = {
              id: `scene-${Date.now()}`,
              name: sceneData.name,
              backgroundUrl: sceneData.backgroundUrl,
              locationBanner: sceneData.locationBanner || sceneData.name,
              subtitle: sceneData.subtitle || '',
              weather: sceneData.weather || 'none',
              lighting: sceneData.lighting || 'normal',
              ambientAudioUrl: sceneData.ambientAudioUrl || '',
              ambientAudioName: sceneData.ambientAudioName || '',
              dmNotes: sceneData.dmNotes || '',
            };
            const updatedScenes = [...campaign.scenes, newScene];
            const updatedCamp = { ...campaign, scenes: updatedScenes };
            await updateCampaign(updatedCamp);
            setCampaign(updatedCamp);
          }
          setEditingScene(null);
        }}
        onClose={() => {
          setShowNewSceneModal(false);
          setEditingScene(null);
        }}
      />

      {/* MODAL: EDIT / CREATE CHARACTER */}
      <CharacterEditModal
        isOpen={showNewCharModal}
        charToEdit={editingChar}
        onSave={async (charData) => {
          if (!charData.name || !charData.defaultAvatarUrl || !campaign) return;
          if (editingChar) {
            const updatedChar: Character = {
              ...editingChar,
              name: charData.name,
              roleOrTitle: charData.roleOrTitle || 'Aventurero',
              defaultAvatarUrl: charData.defaultAvatarUrl,
              bio: charData.bio || '',
              maxHp: charData.maxHp || 30,
            };
            const updatedChars = campaign.characters.map((c) => (c.id === updatedChar.id ? updatedChar : c));
            const updatedCamp = { ...campaign, characters: updatedChars };
            await updateCampaign(updatedCamp);
            setCampaign(updatedCamp);
          } else {
            const newChar: Character = {
              id: `char-${Date.now()}`,
              name: charData.name,
              roleOrTitle: charData.roleOrTitle || 'Aventurero',
              defaultAvatarUrl: charData.defaultAvatarUrl,
              bio: charData.bio || '',
              maxHp: charData.maxHp || 30,
            };
            const updatedChars = [...campaign.characters, newChar];
            const updatedCamp = { ...campaign, characters: updatedChars };
            await updateCampaign(updatedCamp);
            setCampaign(updatedCamp);
          }
          setEditingChar(null);
        }}
        onClose={() => {
          setShowNewCharModal(false);
          setEditingChar(null);
        }}
      />

      {/* MODAL: SUMMON NPC */}
      <SummonCharacterModal
        isOpen={showSummonModal}
        characters={campaign?.characters || []}
        onSummon={summonCharacter}
        onClose={() => setShowSummonModal(false)}
      />

      {/* MODAL: QR & CONNECTION */}
      <MasterQRModal
        isOpen={showQRModal}
        joinUrl={joinUrl}
        roomCode={roomCode}
        latencyMs={latencyMs}
        onReconnect={() => connectToRoom(roomCode)}
        onClose={() => setShowQRModal(false)}
      />

      {/* MODAL: NETWORK DIAGNOSTICS & CHAOS */}
      {showDiagnosticsModal && (
        <NetworkDiagnosticsModal
          roomCode={roomCode}
          connectionStatus={connectionStatus}
          latencyMs={latencyMs}
          liveState={liveState}
          onForceResync={() => {
            broadcastFullState(liveState);
            soundEngine.playSynth('magic_spell');
            alert('¡Estado completo (FULL_STATE) transmitido a la Tablet!');
          }}
          onClose={() => setShowDiagnosticsModal(false)}
        />
      )}

      {/* MOBILE ONE-HAND BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-nav" aria-label="Navegación Móvil del Master">
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'live' ? 'active' : ''}`}
          onClick={() => setActiveTab('live')}
        >
          <Tv size={20} />
          <span>En Vivo</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'combat' ? 'active' : ''}`}
          onClick={() => setActiveTab('combat')}
        >
          <Swords size={20} />
          <span>Combate</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'moments' ? 'active' : ''}`}
          onClick={() => setActiveTab('moments')}
        >
          <Sparkles size={20} />
          <span>Momentos</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'notes' || activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <BookOpen size={20} />
          <span>Notas</span>
        </button>
      </nav>
    </div>
  );
};
