import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Campaign,
  Character,
  CharacterOnScreen,
  CharacterPosition,
  CinematicMacro,
  ConnectionStatus,
  DisplayState,
  HistoryEvent,
  LightingFilter,
  MacroStep,
  PublishCategoryKey,
  SavedEncounter,
  Scene,
  SessionCheckpoint,
  WeatherType,
} from '../../types';
import { peerService } from '../../services/peerService';
import { soundEngine } from '../../services/soundEngine';
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
import { CombatTab } from './CombatTab';
import { MomentsTab } from './MomentsTab';
import { QuickMomentsDropdown } from './QuickMomentsDropdown';
import { SelectivePublishModal } from './SelectivePublishModal';
import { LiveMiniPreview } from './LiveMiniPreview';
import { FullScreenPreviewModal } from './FullScreenPreviewModal';
import { HistoryModal } from './HistoryModal';
import { CheckpointsModal } from './CheckpointsModal';
import {
  Zap,
  Activity,
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
  Copy,
  Upload,
  Download,
  Dices,
  RefreshCw,
  Check,
  ChevronRight,
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
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface MasterControllerProps {
  initialRoomCode?: string;
  onExitToLobby?: () => void;
}

export const MasterController: React.FC<MasterControllerProps> = ({ initialRoomCode, onExitToLobby }) => {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode || '');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'live' | 'moments' | 'combat' | 'notes' | 'library'>('live');
  const [showQRModal, setShowQRModal] = useState<boolean>(false);

  // Operation Mode: Live vs Staging (Preparación)
  const [operationMode, setOperationMode] = useState<'live' | 'staging'>('live');
  const [previewTab, setPreviewTab] = useState<'live' | 'staged'>('live');
  const [showFullScreenPreview, setShowFullScreenPreview] = useState<boolean>(false);
  const [showUnsavedStagingDialog, setShowUnsavedStagingDialog] = useState<boolean>(false);
  const [showSelectivePublishModal, setShowSelectivePublishModal] = useState<boolean>(false);

  // History & Checkpoints Modals
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showCheckpointsModal, setShowCheckpointsModal] = useState<boolean>(false);
  const [showQuickMoments, setShowQuickMoments] = useState<boolean>(false);
  const [checkpointsList, setCheckpointsList] = useState<SessionCheckpoint[]>([]);
  const [encountersList, setEncountersList] = useState<SavedEncounter[]>([]);

  // History Stacks (Past & Future for Undo/Redo)
  const [pastEvents, setPastEvents] = useState<HistoryEvent[]>([]);
  const [futureEvents, setFutureEvents] = useState<HistoryEvent[]>([]);

  // Macro Sequence Engine State
  const [runningMacro, setRunningMacro] = useState<{
    macro: CinematicMacro;
    currentStepIndex: number;
    totalSteps: number;
    isPaused: boolean;
    backupState: DisplayState;
  } | null>(null);

  const macroTimerRef = useRef<number | null>(null);

  // Campaigns & DB State
  const [campaignList, setCampaignList] = useState<Campaign[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [showCampaignPickerModal, setShowCampaignPickerModal] = useState<boolean>(false);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState<boolean>(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState<string>('');
  const [newCampaignDesc, setNewCampaignDesc] = useState<string>('');

  // Live Display State (Synced with Tablet)
  const [liveState, setLiveState] = useState<DisplayState>({
    sceneName: 'Cargando Aventura...',
    backgroundUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: {
      text: 'TABERNA DEL DRAGÓN DURMIENTE',
      subtitle: 'Valle de Oakhaven',
      visible: true,
    },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
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
  });

  // Staged State (Local draft when in Staging Mode)
  const [stagedState, setStagedState] = useState<DisplayState>(liveState);

  // Active form / current working parameters
  const activeDisplay = operationMode === 'live' ? liveState : stagedState;
  const currentScene = campaign?.scenes.find((s) => s.id === activeDisplay.currentSceneId) || campaign?.scenes[0] || null;

  // Modals & Forms
  const [showSummonModal, setShowSummonModal] = useState<boolean>(false);
  const [showNewSceneModal, setShowNewSceneModal] = useState<boolean>(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [showNewCharModal, setShowNewCharModal] = useState<boolean>(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [diceLog, setDiceLog] = useState<{ id: string; text: string; time: string }[]>([]);

  // Forms
  const [sceneForm, setSceneForm] = useState({
    name: '',
    backgroundUrl: '',
    locationBanner: '',
    subtitle: '',
    weather: 'none' as WeatherType,
    lighting: 'normal' as LightingFilter,
    ambientAudioUrl: '',
    ambientAudioName: '',
    dmNotes: '',
  });

  const [charForm, setCharForm] = useState({
    name: '',
    roleOrTitle: '',
    defaultAvatarUrl: '',
    bio: '',
    maxHp: 30,
  });

  // Calculate Pending Changes
  const calculatePendingChanges = (): number => {
    if (operationMode === 'live') return 0;
    let count = 0;
    if (stagedState.currentSceneId !== liveState.currentSceneId || stagedState.backgroundUrl !== liveState.backgroundUrl) count++;
    if (JSON.stringify(stagedState.characters) !== JSON.stringify(liveState.characters)) count++;
    if (stagedState.weather !== liveState.weather || stagedState.weatherIntensity !== liveState.weatherIntensity) count++;
    if (stagedState.lighting !== liveState.lighting) count++;
    if (
      stagedState.locationBanner.text !== liveState.locationBanner.text ||
      stagedState.locationBanner.subtitle !== liveState.locationBanner.subtitle ||
      stagedState.locationBanner.visible !== liveState.locationBanner.visible
    )
      count++;
    if (
      stagedState.ambientAudioUrl !== liveState.ambientAudioUrl ||
      stagedState.ambientPlaying !== liveState.ambientPlaying ||
      stagedState.ambientVolume !== liveState.ambientVolume
    )
      count++;
    if (stagedState.isBlackout !== liveState.isBlackout) count++;
    return count;
  };

  const pendingChangesCount = calculatePendingChanges();

  // Load campaign & all campaigns from IndexedDB
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
        setLiveState(initialState);
        setStagedState(initialState);
      }
    };
    loadData();
  }, []);

  // Connect to Display Peer & Listen for Status
  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
      connectToRoom(initialRoomCode);
    }

    const unsubStatus = peerService.onStatusChange((status, _, lat) => {
      setConnectionStatus(status);
      if (lat !== undefined) {
        setLatencyMs(lat);
      }
      if (status === 'connected') {
        broadcastFullState(liveState);
      }
    });

    const unsubMsg = peerService.onMessage((msg) => {
      if (msg.type === 'REQUEST_FULL_STATE') {
        broadcastFullState(liveState);
      }
    });

    return () => {
      unsubStatus();
      unsubMsg();
    };
  }, [initialRoomCode, liveState]);

  const connectToRoom = async (code: string) => {
    try {
      await peerService.connectAsMaster(code);
    } catch (e) {
      console.error('Master connection failed:', e);
    }
  };

  const broadcastFullState = (stateToSend: DisplayState) => {
    peerService.send({
      type: 'FULL_STATE',
      payload: stateToSend,
    });
  };

  // Helper: Create Auto-Checkpoint in Dexie
  const createAutoCheckpoint = async (triggerName: string, stateToSave: DisplayState) => {
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
  };

  // State Update Wrapper with History push
  const updateActiveDisplay = (
    updater: (prev: DisplayState) => DisplayState,
    actionDescription: string = 'Modificación de Escena',
    broadcastImmediate: boolean = true
  ) => {
    const currentState = operationMode === 'live' ? liveState : stagedState;
    const nextState = updater(currentState);

    // Push into History
    const historyItem: HistoryEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      description: actionDescription,
      mode: operationMode,
      stateSnapshot: currentState,
    };

    setPastEvents((prev) => [historyItem, ...prev.slice(0, 19)]);
    setFutureEvents([]);

    if (operationMode === 'live') {
      setLiveState(nextState);
      setStagedState(nextState);
      if (broadcastImmediate) {
        broadcastFullState(nextState);
      }
    } else {
      setStagedState(nextState);
      setPreviewTab('staged');
    }
  };

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (pastEvents.length === 0) return;

    const [lastEvent, ...remainingPast] = pastEvents;
    const currentSnapshot = operationMode === 'live' ? liveState : stagedState;

    const redoItem: HistoryEvent = {
      id: `redo-${Date.now()}`,
      timestamp: Date.now(),
      description: `Rehacer: ${lastEvent.description}`,
      mode: operationMode,
      stateSnapshot: currentSnapshot,
    };

    setPastEvents(remainingPast);
    setFutureEvents((prev) => [redoItem, ...prev]);

    if (operationMode === 'live') {
      setLiveState(lastEvent.stateSnapshot);
      setStagedState(lastEvent.stateSnapshot);
      broadcastFullState(lastEvent.stateSnapshot);
      if (lastEvent.stateSnapshot.ambientAudioUrl && lastEvent.stateSnapshot.ambientPlaying) {
        soundEngine.setAmbient(lastEvent.stateSnapshot.ambientAudioUrl, true, lastEvent.stateSnapshot.ambientVolume, true);
      }
    } else {
      setStagedState(lastEvent.stateSnapshot);
      setPreviewTab('staged');
    }
    soundEngine.playSynth('heartbeat');
  }, [pastEvents, operationMode, liveState, stagedState]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (futureEvents.length === 0) return;

    const [nextEvent, ...remainingFuture] = futureEvents;
    const currentSnapshot = operationMode === 'live' ? liveState : stagedState;

    const undoItem: HistoryEvent = {
      id: `undo-${Date.now()}`,
      timestamp: Date.now(),
      description: nextEvent.description,
      mode: operationMode,
      stateSnapshot: currentSnapshot,
    };

    setFutureEvents(remainingFuture);
    setPastEvents((prev) => [undoItem, ...prev]);

    if (operationMode === 'live') {
      setLiveState(nextEvent.stateSnapshot);
      setStagedState(nextEvent.stateSnapshot);
      broadcastFullState(nextEvent.stateSnapshot);
      if (nextEvent.stateSnapshot.ambientAudioUrl && nextEvent.stateSnapshot.ambientPlaying) {
        soundEngine.setAmbient(nextEvent.stateSnapshot.ambientAudioUrl, true, nextEvent.stateSnapshot.ambientVolume, true);
      }
    } else {
      setStagedState(nextEvent.stateSnapshot);
      setPreviewTab('staged');
    }
    soundEngine.playSynth('heartbeat');
  }, [futureEvents, operationMode, liveState, stagedState]);

  // Keyboard shortcuts listener for Undo (Ctrl+Z) & Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Macro Sequencer
  const applyStepToState = (step: MacroStep, baseState: DisplayState): DisplayState => {
    let next = { ...baseState };

    if (step.sceneId) next.currentSceneId = step.sceneId;
    if (step.backgroundUrl) next.backgroundUrl = step.backgroundUrl;
    if (step.weather !== undefined) next.weather = step.weather;
    if (step.weatherIntensity !== undefined) next.weatherIntensity = step.weatherIntensity;
    if (step.lighting !== undefined) next.lighting = step.lighting;
    if (step.blackout !== undefined) next.isBlackout = step.blackout;
    if (step.locationBanner) next.locationBanner = step.locationBanner;

    if (step.charactersToAdd && step.charactersToAdd.length > 0) {
      const existingIds = next.characters.map((c) => c.id);
      const additions = step.charactersToAdd.filter((c) => !existingIds.includes(c.id));
      next.characters = [...next.characters, ...additions];
    }

    if (step.charactersToRemove && step.charactersToRemove.length > 0) {
      next.characters = next.characters.filter((c) => !step.charactersToRemove?.includes(c.id));
    }

    if (step.speakerId) {
      next.characters = next.characters.map((c) => ({
        ...c,
        isSpeaking: c.id === step.speakerId,
      }));
    }

    if (step.ambientAudioUrl !== undefined) {
      next.ambientAudioUrl = step.ambientAudioUrl;
      next.ambientPlaying = step.ambientPlaying ?? true;
      if (step.ambientVolume !== undefined) next.ambientVolume = step.ambientVolume;
    }

    if (step.sfxPreset) {
      soundEngine.playSynth(step.sfxPreset);
      peerService.send({
        type: 'PLAY_SFX',
        payload: {
          id: `sfx-${Date.now()}`,
          name: step.sfxPreset,
          synthPreset: step.sfxPreset,
          timestamp: Date.now(),
        },
      });
    }

    if (step.lightning) {
      next.lightningTrigger = Date.now();
      peerService.send({ type: 'TRIGGER_LIGHTNING' });
    }

    if (step.shake) {
      next.shakeTrigger = Date.now();
      peerService.send({ type: 'TRIGGER_SHAKE' });
    }

    return next;
  };

  const executeMacroStepIndex = (macro: CinematicMacro, stepIdx: number, backup: DisplayState) => {
    if (stepIdx >= macro.steps.length) {
      setRunningMacro(null);
      return;
    }

    const step = macro.steps[stepIdx];
    setRunningMacro({
      macro,
      currentStepIndex: stepIdx,
      totalSteps: macro.steps.length,
      isPaused: false,
      backupState: backup,
    });

    setLiveState((prev) => {
      const next = applyStepToState(step, prev);
      broadcastFullState(next);
      if (next.ambientAudioUrl && next.ambientPlaying) {
        soundEngine.setAmbient(next.ambientAudioUrl, true, next.ambientVolume, true);
      }
      return next;
    });

    if (step.delayMs > 0 && stepIdx + 1 < macro.steps.length) {
      macroTimerRef.current = window.setTimeout(() => {
        executeMacroStepIndex(macro, stepIdx + 1, backup);
      }, step.delayMs);
    } else if (stepIdx + 1 < macro.steps.length) {
      executeMacroStepIndex(macro, stepIdx + 1, backup);
    } else {
      setRunningMacro(null);
    }
  };

  const handleExecuteMacro = (macro: CinematicMacro) => {
    if (macroTimerRef.current) {
      clearTimeout(macroTimerRef.current);
    }

    const backup = { ...liveState };
    createAutoCheckpoint(`Antes de ejecutar Momento: ${macro.name}`, backup);

    const historyItem: HistoryEvent = {
      id: `evt-macro-${Date.now()}`,
      timestamp: Date.now(),
      description: `Momento: ${macro.name}`,
      mode: 'live',
      stateSnapshot: backup,
    };
    setPastEvents((prev) => [historyItem, ...prev.slice(0, 19)]);
    setFutureEvents([]);

    executeMacroStepIndex(macro, 0, backup);
  };

  const handleCancelMacro = () => {
    if (macroTimerRef.current) {
      clearTimeout(macroTimerRef.current);
      macroTimerRef.current = null;
    }
    if (runningMacro) {
      setLiveState(runningMacro.backupState);
      setStagedState(runningMacro.backupState);
      broadcastFullState(runningMacro.backupState);
      if (runningMacro.backupState.ambientAudioUrl && runningMacro.backupState.ambientPlaying) {
        soundEngine.setAmbient(runningMacro.backupState.ambientAudioUrl, true, runningMacro.backupState.ambientVolume, true);
      }
      setRunningMacro(null);
      soundEngine.playSynth('heartbeat');
    }
  };

  const handleLoadMacroToStaging = (macro: CinematicMacro) => {
    let accumulated = { ...stagedState };
    for (const step of macro.steps) {
      accumulated = applyStepToState(step, accumulated);
    }
    setStagedState(accumulated);
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

  // ==========================================
  // SELECTIVE PUBLISHING HANDLER
  // ==========================================
  const handleSelectivePublish = (selectedKeys: PublishCategoryKey[]) => {
    if (selectedKeys.length === 0) return;

    soundEngine.playSynth('magic_spell');
    createAutoCheckpoint(`Publicación Selectiva (${selectedKeys.length} categorías)`, liveState);

    // Build the merged liveState
    const newLive: DisplayState = { ...liveState };

    if (selectedKeys.includes('background')) {
      newLive.currentSceneId = stagedState.currentSceneId;
      newLive.sceneName = stagedState.sceneName;
      newLive.backgroundUrl = stagedState.backgroundUrl;
    }
    if (selectedKeys.includes('characters')) {
      newLive.characters = stagedState.characters;
    }
    if (selectedKeys.includes('weather')) {
      newLive.weather = stagedState.weather;
      newLive.weatherIntensity = stagedState.weatherIntensity;
    }
    if (selectedKeys.includes('lighting')) {
      newLive.lighting = stagedState.lighting;
    }
    if (selectedKeys.includes('locationBanner')) {
      newLive.locationBanner = stagedState.locationBanner;
    }
    if (selectedKeys.includes('ambientAudio')) {
      newLive.ambientAudioUrl = stagedState.ambientAudioUrl;
      newLive.ambientPlaying = stagedState.ambientPlaying;
      newLive.ambientVolume = stagedState.ambientVolume;
    }
    if (selectedKeys.includes('blackout')) {
      newLive.isBlackout = stagedState.isBlackout;
    }

    // Apply & Broadcast
    setLiveState(newLive);
    broadcastFullState(newLive);

    if (selectedKeys.includes('ambientAudio') && newLive.ambientAudioUrl && newLive.ambientPlaying) {
      soundEngine.setAmbient(newLive.ambientAudioUrl, true, newLive.ambientVolume, true);
    }

    // Push into history
    const historyItem: HistoryEvent = {
      id: `evt-publish-selective-${Date.now()}`,
      timestamp: Date.now(),
      description: `Publicación Selectiva: ${selectedKeys.join(', ')}`,
      mode: 'live',
      stateSnapshot: liveState,
    };
    setPastEvents((prev) => [historyItem, ...prev.slice(0, 19)]);
    setFutureEvents([]);

    // Check if any changes remain in stagedState
    const remainingAfterPublish = calculatePendingChanges();
    if (remainingAfterPublish === 0) {
      setPreviewTab('live');
    }
  };

  // Full Publish of all staged changes
  const handleSendStagedToScreen = () => {
    soundEngine.playSynth('magic_spell');
    createAutoCheckpoint(`Publicación Completa: ${stagedState.sceneName}`, liveState);

    const historyItem: HistoryEvent = {
      id: `evt-publish-all-${Date.now()}`,
      timestamp: Date.now(),
      description: `Publicado: ${stagedState.sceneName}`,
      mode: 'live',
      stateSnapshot: liveState,
    };
    setPastEvents((prev) => [historyItem, ...prev.slice(0, 19)]);
    setFutureEvents([]);

    setLiveState(stagedState);
    broadcastFullState(stagedState);
    if (stagedState.ambientAudioUrl && stagedState.ambientPlaying) {
      soundEngine.setAmbient(stagedState.ambientAudioUrl, true, stagedState.ambientVolume, true);
    }
    setPreviewTab('live');
  };

  // Discard Staged changes
  const handleDiscardStaged = () => {
    setStagedState(liveState);
    setPreviewTab('live');
  };

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

    updateActiveDisplay(
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

    setLiveState(checkpoint.state);
    setStagedState(checkpoint.state);
    broadcastFullState(checkpoint.state);

    if (checkpoint.state.ambientAudioUrl && checkpoint.state.ambientPlaying) {
      soundEngine.setAmbient(checkpoint.state.ambientAudioUrl, true, checkpoint.state.ambientVolume, true);
    }
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
    updateActiveDisplay(
      () => evt.stateSnapshot,
      `Restaurado a: ${evt.description}`
    );
  };

  // Switch Active Campaign
  const handleSwitchCampaign = async (selected: Campaign) => {
    setCampaign(selected);
    await setActiveCampaignId(selected.id);
    const cps = await getCampaignCheckpoints(selected.id);
    setCheckpointsList(cps);
    if (selected.scenes.length > 0) {
      selectScene(selected.scenes[0]);
    }
    setShowCampaignPickerModal(false);
  };

  // Create Campaign
  const handleCreateNewCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignTitle) return;

    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      title: newCampaignTitle,
      description: newCampaignDesc,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scenes: [DEMO_SCENES[0]],
      characters: DEMO_CHARACTERS.slice(0, 3),
      customSfx: BUILTIN_SFX,
      macros: DEMO_MACROS,
    };

    await createCampaign(newCamp);
    const all = await getAllCampaigns();
    setCampaignList(all);
    setCampaign(newCamp);
    selectScene(newCamp.scenes[0]);
    setShowNewCampaignModal(false);
    setShowCampaignPickerModal(false);
    setNewCampaignTitle('');
    setNewCampaignDesc('');
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

  // Edit or Create Scene Modal Save
  const handleSaveSceneForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneForm.name || !sceneForm.backgroundUrl || !campaign) return;

    if (editingScene) {
      const updatedScene: Scene = {
        ...editingScene,
        name: sceneForm.name,
        backgroundUrl: sceneForm.backgroundUrl,
        locationBanner: sceneForm.locationBanner || sceneForm.name,
        subtitle: sceneForm.subtitle,
        weather: sceneForm.weather,
        lighting: sceneForm.lighting,
        ambientAudioUrl: sceneForm.ambientAudioUrl,
        ambientAudioName: sceneForm.ambientAudioName,
        dmNotes: sceneForm.dmNotes,
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
        name: sceneForm.name,
        backgroundUrl: sceneForm.backgroundUrl,
        locationBanner: sceneForm.locationBanner || sceneForm.name,
        subtitle: sceneForm.subtitle,
        weather: sceneForm.weather,
        lighting: sceneForm.lighting,
        ambientAudioUrl: sceneForm.ambientAudioUrl,
        ambientAudioName: sceneForm.ambientAudioName,
        dmNotes: sceneForm.dmNotes,
      };

      const updatedScenes = [...campaign.scenes, newScene];
      const updatedCamp = { ...campaign, scenes: updatedScenes };
      await updateCampaign(updatedCamp);
      setCampaign(updatedCamp);
    }

    setShowNewSceneModal(false);
    setEditingScene(null);
  };

  const openEditSceneModal = (sc: Scene) => {
    setEditingScene(sc);
    setSceneForm({
      name: sc.name,
      backgroundUrl: sc.backgroundUrl,
      locationBanner: sc.locationBanner || sc.name,
      subtitle: sc.subtitle || '',
      weather: sc.weather || 'none',
      lighting: sc.lighting || 'normal',
      ambientAudioUrl: sc.ambientAudioUrl || '',
      ambientAudioName: sc.ambientAudioName || '',
      dmNotes: sc.dmNotes || '',
    });
    setShowNewSceneModal(true);
  };

  // Edit or Create Character Modal Save
  const handleSaveCharForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charForm.name || !charForm.defaultAvatarUrl || !campaign) return;

    if (editingChar) {
      const updatedChar: Character = {
        ...editingChar,
        name: charForm.name,
        roleOrTitle: charForm.roleOrTitle || 'Aventurero',
        defaultAvatarUrl: charForm.defaultAvatarUrl,
        bio: charForm.bio,
        maxHp: charForm.maxHp,
      };

      const updatedChars = campaign.characters.map((c) => (c.id === updatedChar.id ? updatedChar : c));
      const updatedCamp = { ...campaign, characters: updatedChars };
      await updateCampaign(updatedCamp);
      setCampaign(updatedCamp);
    } else {
      const newChar: Character = {
        id: `char-${Date.now()}`,
        name: charForm.name,
        roleOrTitle: charForm.roleOrTitle || 'Aventurero',
        defaultAvatarUrl: charForm.defaultAvatarUrl,
        bio: charForm.bio,
        maxHp: charForm.maxHp,
      };

      const updatedChars = [...campaign.characters, newChar];
      const updatedCamp = { ...campaign, characters: updatedChars };
      await updateCampaign(updatedCamp);
      setCampaign(updatedCamp);
    }

    setShowNewCharModal(false);
    setEditingChar(null);
  };

  const openEditCharModal = (ch: Character) => {
    setEditingChar(ch);
    setCharForm({
      name: ch.name,
      roleOrTitle: ch.roleOrTitle,
      defaultAvatarUrl: ch.defaultAvatarUrl,
      bio: ch.bio || '',
      maxHp: ch.maxHp || 30,
    });
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

    updateActiveDisplay(
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
    updateActiveDisplay(
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

    updateActiveDisplay(
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
    updateActiveDisplay(
      (prev) => ({
        ...prev,
        characters: prev.characters.map((c) => (c.id === id ? { ...c, position } : c)),
      }),
      `Posición de ${charName} a ${position}`
    );
  };

  const changeCharacterExpression = (id: string, expressionName: string, avatarUrl: string) => {
    const charName = activeDisplay.characters.find((c) => c.id === id)?.name || 'Personaje';
    updateActiveDisplay(
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
    updateActiveDisplay(
      (prev) => ({
        ...prev,
        weather: type,
      }),
      `Clima: ${type}`
    );
  };

  const setWeatherIntensityVal = (val: number) => {
    updateActiveDisplay(
      (prev) => ({
        ...prev,
        weatherIntensity: val,
      }),
      `Intensidad del Clima: ${Math.round(val * 100)}%`
    );
  };

  const setLightingPreset = (filter: LightingFilter) => {
    updateActiveDisplay(
      (prev) => ({
        ...prev,
        lighting: filter,
      }),
      `Iluminación: ${filter}`
    );
  };

  // Panic & Direct SFX
  const toggleBlackout = () => {
    const next = !activeDisplay.isBlackout;
    updateActiveDisplay(
      (prev) => ({ ...prev, isBlackout: next }),
      next ? 'Blackout Activado' : 'Blackout Desactivado'
    );
  };

  const triggerLightning = () => {
    peerService.send({ type: 'TRIGGER_LIGHTNING' });
    soundEngine.playSynth('thunder');
  };

  const triggerScreenShake = () => {
    peerService.send({ type: 'TRIGGER_SHAKE' });
  };

  const updateBanner = () => {
    updateActiveDisplay(
      (prev) => ({
        ...prev,
        locationBanner: {
          ...prev.locationBanner,
        },
      }),
      `Actualizado Cartel: ${activeDisplay.locationBanner.text}`
    );
  };

  // Audio Controls
  const toggleAmbientPlay = () => {
    if (!activeDisplay.ambientAudioUrl) return;
    const next = !activeDisplay.ambientPlaying;
    updateActiveDisplay(
      (prev) => ({ ...prev, ambientPlaying: next }),
      next ? 'Música Reanudada' : 'Música Pausada'
    );
    if (operationMode === 'live') {
      soundEngine.setAmbient(activeDisplay.ambientAudioUrl, next, activeDisplay.ambientVolume, true);
    }
  };

  const handleAmbientVolumeChange = (vol: number) => {
    updateActiveDisplay(
      (prev) => ({ ...prev, ambientVolume: vol }),
      `Volumen Música: ${Math.round(vol * 100)}%`
    );
    if (operationMode === 'live' && activeDisplay.ambientAudioUrl) {
      soundEngine.setAmbient(activeDisplay.ambientAudioUrl, activeDisplay.ambientPlaying, vol, false);
    }
  };

  const playSfx = (sfx: typeof BUILTIN_SFX[0]) => {
    if (sfx.soundType === 'synthesized' && sfx.synthPreset) {
      soundEngine.playSynth(sfx.synthPreset);
    }
    peerService.send({
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
      await db.campaigns.put(DEMO_CAMPAIGN);
      setCampaign(DEMO_CAMPAIGN);
      const all = await getAllCampaigns();
      setCampaignList(all);
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

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const joinUrl = `${window.location.origin}${window.location.pathname}?join=${roomCode}`;

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
              onClick={handleUndo}
              disabled={pastEvents.length === 0}
              title={
                pastEvents.length > 0
                  ? `Deshacer: ${pastEvents[0].description} (Ctrl+Z)`
                  : 'Deshacer (Ctrl+Z)'
              }
              style={{ opacity: pastEvents.length === 0 ? 0.4 : 1 }}
            >
              <RotateCcw size={15} />
            </button>

            <button
              className="icon-action-btn"
              onClick={handleRedo}
              disabled={futureEvents.length === 0}
              title={
                futureEvents.length > 0
                  ? `Rehacer: ${futureEvents[0].description} (Ctrl+Y)`
                  : 'Rehacer (Ctrl+Y)'
              }
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
              className={`status-chip ${connectionStatus}`}
              onClick={() => setShowQRModal(true)}
              title="Información de Conexión"
            >
              <span className="pulse-indicator"></span>
              {connectionStatus === 'connected' ? (
                <span>
                  Conectado {latencyMs > 0 ? `(${latencyMs}ms)` : `(${roomCode})`}
                </span>
              ) : connectionStatus === 'connecting' ? (
                <span>Conectando...</span>
              ) : (
                <span>PIN: {roomCode || '---'}</span>
              )}
            </button>
            {onExitToLobby && (
              <button className="status-chip" onClick={onExitToLobby} title="Salir al Lobby">
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>

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
                onClick={handleCancelMacro}
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
              <button className="btn-discard-staging" onClick={handleDiscardStaged} title="Descartar borrador">
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
                onClick={handleSendStagedToScreen}
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
                    updateActiveDisplay(
                      (prev) => ({
                        ...prev,
                        locationBanner: { ...prev.locationBanner, visible: next },
                      }),
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
                    updateActiveDisplay((prev) => ({
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
                    updateActiveDisplay((prev) => ({
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
              updateActiveDisplay(
                (prev) => ({ ...prev, combatState: newState }),
                `Combate: Ronda ${newState.round}, Turno ${newState.currentTurnIndex + 1}`
              );
              if (!newState.isActive) {
                peerService.send({ type: 'END_COMBAT' });
              } else {
                peerService.send({ type: 'UPDATE_COMBAT', payload: newState });
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
                    setSceneForm({
                      name: '',
                      backgroundUrl: '',
                      locationBanner: '',
                      subtitle: '',
                      weather: 'none',
                      lighting: 'normal',
                      ambientAudioUrl: '',
                      ambientAudioName: '',
                      dmNotes: '',
                    });
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
                    setCharForm({ name: '', roleOrTitle: '', defaultAvatarUrl: '', bio: '', maxHp: 30 });
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
          onPublishSelective={handleSelectivePublish}
          onPublishAll={handleSendStagedToScreen}
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
          onSendToScreen={handleSendStagedToScreen}
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
                  handleSendStagedToScreen();
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
                  handleDiscardStaged();
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
      {showCampaignPickerModal && (
        <div className="modal-overlay" onClick={() => setShowCampaignPickerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Seleccionar Campaña</h2>
              <button className="modal-close" onClick={() => setShowCampaignPickerModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="campaign-picker-list">
              {campaignList.map((c) => {
                const isCurrent = c.id === campaign?.id;
                return (
                  <div key={c.id} className={`campaign-picker-card ${isCurrent ? 'active' : ''}`}>
                    <div className="picker-card-info" onClick={() => handleSwitchCampaign(c)}>
                      <strong>{c.title}</strong>
                      <span>{c.scenes.length} escenas • {c.characters.length} personajes</span>
                    </div>
                    <div className="picker-actions">
                      <button
                        className="icon-action-btn"
                        onClick={() => handleDuplicateCampaign(c.id)}
                        title="Duplicar Campaña"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        className="icon-action-btn danger"
                        onClick={() => handleDeleteCampaign(c.id, c.title)}
                        title="Eliminar Campaña"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="btn-primary full"
              onClick={() => {
                setShowNewCampaignModal(true);
              }}
            >
              <Plus size={16} />
              <span>Crear Nueva Campaña</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: NEW CAMPAIGN */}
      {showNewCampaignModal && (
        <div className="modal-overlay" onClick={() => setShowNewCampaignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Campaña</h2>
              <button className="modal-close" onClick={() => setShowNewCampaignModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateNewCampaign} className="modal-form">
              <label>Título de la Campaña / Aventura</label>
              <input
                type="text"
                required
                placeholder="Ej. La Maldición de Strahd"
                value={newCampaignTitle}
                onChange={(e) => setNewCampaignTitle(e.target.value)}
                className="master-input"
              />

              <label>Descripción / Apuntes</label>
              <textarea
                placeholder="Ambientación, objetivos..."
                value={newCampaignDesc}
                onChange={(e) => setNewCampaignDesc(e.target.value)}
                className="master-input textarea"
              />

              <button type="submit" className="btn-primary full">
                Crear y Activar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / CREATE SCENE */}
      {showNewSceneModal && (
        <div className="modal-overlay" onClick={() => setShowNewSceneModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingScene ? 'Editar Escenario' : 'Crear Nuevo Escenario'}</h2>
              <button className="modal-close" onClick={() => setShowNewSceneModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSceneForm} className="modal-form">
              <label>Nombre del Escenario</label>
              <input
                type="text"
                required
                placeholder="Ej. Cripta Olvidada"
                value={sceneForm.name}
                onChange={(e) => setSceneForm({ ...sceneForm, name: e.target.value })}
                className="master-input"
              />

              <label>Imagen de Fondo (URL o Subir)</label>
              <div className="input-with-upload">
                <input
                  type="text"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={sceneForm.backgroundUrl}
                  onChange={(e) => setSceneForm({ ...sceneForm, backgroundUrl: e.target.value })}
                  className="master-input"
                />
                <label className="btn-file-upload">
                  <Upload size={16} />
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, (url) => setSceneForm({ ...sceneForm, backgroundUrl: url }))}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <label>Subtítulo de Ubicación</label>
              <input
                type="text"
                placeholder="Ej. Nivel Subterráneo 2"
                value={sceneForm.subtitle}
                onChange={(e) => setSceneForm({ ...sceneForm, subtitle: e.target.value })}
                className="master-input"
              />

              <label>Música o Audio Ambiental (URL de MP3 / WAV)</label>
              <input
                type="text"
                placeholder="https://.../ambient.mp3"
                value={sceneForm.ambientAudioUrl}
                onChange={(e) => setSceneForm({ ...sceneForm, ambientAudioUrl: e.target.value })}
                className="master-input"
              />

              <label>Nombre del Track de Audio</label>
              <input
                type="text"
                placeholder="Ej. Murmullo de Catacumbas"
                value={sceneForm.ambientAudioName}
                onChange={(e) => setSceneForm({ ...sceneForm, ambientAudioName: e.target.value })}
                className="master-input"
              />

              <label>Notas Secretas del DM</label>
              <textarea
                placeholder="Trampas, monstruos, tiradas..."
                value={sceneForm.dmNotes}
                onChange={(e) => setSceneForm({ ...sceneForm, dmNotes: e.target.value })}
                className="master-input textarea"
              />

              <button type="submit" className="btn-primary full">
                {editingScene ? 'Guardar Cambios' : 'Crear Escenario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / CREATE CHARACTER */}
      {showNewCharModal && (
        <div className="modal-overlay" onClick={() => setShowNewCharModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingChar ? 'Editar Personaje / NPC' : 'Crear Nuevo Personaje / NPC'}</h2>
              <button className="modal-close" onClick={() => setShowNewCharModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCharForm} className="modal-form">
              <label>Nombre del Personaje</label>
              <input
                type="text"
                required
                placeholder="Ej. Lord Valerius"
                value={charForm.name}
                onChange={(e) => setCharForm({ ...charForm, name: e.target.value })}
                className="master-input"
              />

              <label>Rol o Título</label>
              <input
                type="text"
                placeholder="Ej. Conde de Ravenloft"
                value={charForm.roleOrTitle}
                onChange={(e) => setCharForm({ ...charForm, roleOrTitle: e.target.value })}
                className="master-input"
              />

              <label>Puntos de Golpe Máximos (HP)</label>
              <input
                type="number"
                value={charForm.maxHp}
                onChange={(e) => setCharForm({ ...charForm, maxHp: parseInt(e.target.value) || 10 })}
                className="master-input"
              />

              <label>Retrato / Avatar (URL o Subir)</label>
              <div className="input-with-upload">
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={charForm.defaultAvatarUrl}
                  onChange={(e) => setCharForm({ ...charForm, defaultAvatarUrl: e.target.value })}
                  className="master-input"
                />
                <label className="btn-file-upload">
                  <Upload size={16} />
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileUpload(e, (url) => setCharForm({ ...charForm, defaultAvatarUrl: url }))}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <label>Biografía / Rasgos</label>
              <textarea
                placeholder="Personalidad, secretos..."
                value={charForm.bio}
                onChange={(e) => setCharForm({ ...charForm, bio: e.target.value })}
                className="master-input textarea"
              />

              <button type="submit" className="btn-primary full">
                {editingChar ? 'Guardar Cambios' : 'Crear Ficha de NPC'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUMMON NPC */}
      {showSummonModal && (
        <div className="modal-overlay" onClick={() => setShowSummonModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invocar Personaje a la Escena</h2>
              <button className="modal-close" onClick={() => setShowSummonModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="summon-roster">
              {campaign?.characters.map((ch) => (
                <div key={ch.id} className="roster-card" onClick={() => summonCharacter(ch)}>
                  <img src={ch.defaultAvatarUrl} alt={ch.name} className="roster-avatar" />
                  <div className="roster-meta">
                    <strong>{ch.name}</strong>
                    <span>{ch.roleOrTitle}</span>
                  </div>
                  <ChevronRight size={18} className="text-amber-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR & CONNECTION */}
      {showQRModal && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Emparejar Dispositivos</h2>
              <button className="modal-close" onClick={() => setShowQRModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="qr-container">
              <div className="qr-card">
                <QRCodeSVG value={joinUrl} size={180} level="M" />
              </div>
              <div className="pin-box">
                <span>PIN de la Sala</span>
                <strong className="pin-code">{roomCode}</strong>
              </div>
              {latencyMs > 0 && (
                <div className="latency-info-pill">
                  <Activity size={14} className="text-emerald-400" />
                  <span>Latencia de red: <strong>{latencyMs}ms</strong></span>
                </div>
              )}
              <p className="qr-instructions">
                Abre la aplicación en tu <strong>Tablet o TV</strong> y selecciona modo "Pantalla", o escanea este QR.
              </p>
              <button
                className="btn-primary full"
                onClick={() => {
                  connectToRoom(roomCode);
                  setShowQRModal(false);
                }}
              >
                <Check size={18} />
                <span>Reconectar Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
