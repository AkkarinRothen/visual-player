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
import { SceneInteractionsToolbar } from './sessionPanel/SceneInteractionsToolbar';
import { CombatContextCard } from './sessionPanel/CombatContextCard';
import {
  Layers,
  Sparkles,
  Image as ImageIcon,
  Users,
  CloudRain,
  CloudLightning,
  EyeOff,
  Sun,
  Volume2,
  VolumeX,
  Music,
  Zap,
  Activity,
  Send,
  Play,
  Sliders,
  CheckCheck,
  AlertTriangle,
  Camera,
  Maximize2,
  Flame,
  Eye,
  BookOpen,
  Wand2,
  Mic,
  FileText,
  Film,
} from 'lucide-react';
import { SessionFavoritesBar } from './SessionFavoritesBar';
import { CinematicDialogueDock } from './CinematicDialogueDock';
import { calculateGroupFraming } from '../../domain/display/cameraFraming';
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
  onDismissDialogue?: () => Promise<void>;
  onCompleteDialogueText?: () => Promise<void>;
  onRepeatActions?: (actions: DialogueLineActions, lineId: string) => Promise<void>;
  executedActionLineIds?: Record<string, string>;
  // Camera & Framing shortcuts
  onSetCameraTransform?: (camera: CameraTransform, durationMs?: number) => Promise<void>;
  onResetCamera?: () => Promise<void>;
  // Conversation Editor shortcuts
  onOpenNewConversation?: () => void;
  onOpenEditConversation?: (conversation: SavedConversation) => void;
  // Scene Lights shortcuts
  onUpdateSceneLights?: (lights: SceneLight[]) => Promise<void>;
  // Zone Emitters shortcuts
  onUpdateZoneEmitters?: (emitters: SceneZoneEmitter[]) => Promise<void>;
  // Progressive Revelations
  onRevealCharacterAppearance?: (instanceId: string) => Promise<void>;
  onRevealCharacterIdentity?: (instanceId: string) => Promise<void>;
  // Branching shortcuts
  onSelectBranchChoice?: (choice: DialogueBranchChoice) => void;
  selectedChoiceIds?: Record<string, string>;
  // Scene Interactions
  onTriggerInteraction?: (
    interaction: SceneInteraction,
    transition: SceneInteractionTransition
  ) => Promise<void>;
  executingInteractionId?: string | null;
  // Campaign Revelation Journal
  onOpenRevelationJournal?: () => void;
  // Session Prep Wizard
  onOpenSessionPrepWizard?: () => void;
  // Cinematic Combat Direction
  onFocusCombatant?: (characterId: string) => Promise<void>;
  onToggleCombatTrackingMode?: (mode: CombatTrackingMode) => Promise<void>;
  // Reactive Audio Ducking
  onToggleDmSpeakingDucked?: () => void;
  onSelectDuckingPreset?: (preset: DuckingPreset) => void;
  // Handouts & Document Viewer
  onOpenHandoutViewer?: () => void;
  // Opening Cinematic Recap
  onOpenCampaignRecap?: () => void;
  // Soundboard SFX Matrix
  onOpenSoundboard?: () => void;
  // Weather Storm Coordinator
  lightningConfig?: LightningConfig;
  onToggleAutoStorm?: () => void;
  onToggleDisableFlash?: () => void;
  // Biome Soundtrack Selector
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

  const savedSecondsAgo = draftSaveState === 'idle' && savedRelativeTime > 0
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
        <section className="session-card active-scene-card">
          <div className="card-header-bar">
            <div className="flex-align-gap">
              <span className="live-dot animate-pulse" />
              <h2 className="card-title">ESCENA EN MESA</h2>
            </div>
            {liveState.isBlackout && (
              <span className="card-tag blackout-tag">BLACKOUT ACTIVO</span>
            )}
          </div>

          <div className="scene-display-preview">
            <div
              className="scene-preview-bg"
              style={{
                backgroundImage: liveState.backgroundUrl ? `url(${liveState.backgroundUrl})` : 'none',
              }}
            >
              <div className="scene-preview-overlay">
                <span className="scene-name-overlay">{liveState.sceneName || 'Sin Escenario'}</span>
                {liveState.locationBanner.visible && (
                  <span className="scene-banner-sub">
                    Banner: "{liveState.locationBanner.text}"
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Scene Info Chips */}
          <div className="scene-meta-chips-row">
            <span className="scene-chip">
              <Users size={12} />
              <span>{liveState.characters.length} NPCs</span>
            </span>
            <span className="scene-chip">
              <CloudRain size={12} />
              <span>{liveState.weather !== 'none' ? `${liveState.weather} (${Math.round(liveState.weatherIntensity * 100)}%)` : 'Despejado'}</span>
            </span>
            <span className="scene-chip">
              <Sun size={12} />
              <span>{liveState.lighting}</span>
            </span>
            {onOpenLightingPresets && (
              <button
                type="button"
                onClick={onOpenLightingPresets}
                className="scene-chip text-amber-300 hover:text-amber-200 cursor-pointer bg-amber-950/40 border border-amber-800/40"
                title="Abrir Presets de Iluminación y Luces de Escena"
              >
                <Sun size={12} className="text-amber-400" />
                <span>Presets Luz ({liveState.lights?.length || 0})</span>
              </button>
            )}
            {liveState.ambientAudioUrl && (
              <span className={`scene-chip ${liveState.ambientPlaying ? 'audio-playing' : ''}`}>
                <Volume2 size={12} />
                <span>{liveState.ambientPlaying ? 'Sonando' : 'Pausado'}</span>
              </span>
            )}
            {onOpenRevelationJournal && (
              <button
                type="button"
                onClick={onOpenRevelationJournal}
                className="scene-chip text-amber-300 hover:text-amber-200 cursor-pointer bg-amber-950/40 border border-amber-800/40"
                title="Abrir Diario de Revelaciones y Estado de Campaña"
              >
                <BookOpen size={12} className="text-amber-400" />
                <span>Diario ({campaign?.knowledgeEntries?.filter((k) => !k.isCorrected).length || 0})</span>
              </button>
            )}
            {onOpenCampaignRecap && (
              <button
                type="button"
                onClick={onOpenCampaignRecap}
                className={`scene-chip cursor-pointer ${
                  liveState.activeRecap
                    ? 'text-purple-300 hover:text-purple-200 bg-purple-950/60 border border-purple-700/60 font-bold'
                    : 'text-purple-400 hover:text-purple-300 bg-purple-950/30 border border-purple-800/40'
                }`}
                title="Abrir Crónica Cinematográfica de Apertura ('Anteriormente...')"
              >
                <Film size={12} className="text-purple-400" />
                <span>{liveState.activeRecap ? 'Crónica (En Mesa)' : 'Crónica'}</span>
              </button>
            )}
            {onOpenSessionPrepWizard && (
              <button
                type="button"
                onClick={onOpenSessionPrepWizard}
                className="scene-chip text-purple-300 hover:text-purple-200 cursor-pointer bg-purple-950/40 border border-purple-800/40"
                title="Abrir Asistente de Preparación de la Próxima Sesión"
              >
                <Wand2 size={12} className="text-purple-400" />
                <span>Preparar Sesión</span>
              </button>
            )}
            {onOpenHandoutViewer && (
              <button
                type="button"
                onClick={onOpenHandoutViewer}
                className={`scene-chip cursor-pointer ${
                  liveState.activeHandout
                    ? 'text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 border border-emerald-700/60 font-bold'
                    : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/30 border border-emerald-800/40'
                }`}
                title="Abrir Visor de Handouts, Mapas y Documentos con Revelación Táctil"
              >
                <FileText size={12} className="text-emerald-400" />
                <span>
                  {liveState.activeHandout ? 'Handout en Mesa' : 'Documentos'}
                </span>
              </button>
            )}
            {onOpenBiomeSoundtrack && (
              <button
                type="button"
                onClick={onOpenBiomeSoundtrack}
                className="scene-chip text-sky-300 hover:text-sky-200 cursor-pointer bg-sky-950/40 border border-sky-800/40"
                title="Gestor de Banda Sonora por Bioma y Situación"
              >
                <Music size={12} className="text-sky-400" />
                <span>Banda Sonora</span>
              </button>
            )}
            {onOpenChronicleExport && (
              <button
                type="button"
                onClick={onOpenChronicleExport}
                className="scene-chip text-emerald-300 hover:text-emerald-200 cursor-pointer bg-emerald-950/40 border border-emerald-800/40"
                title="Exportar Crónica y Diario de Sesión para Jugadores"
              >
                <FileText size={12} className="text-emerald-400" />
                <span>Exportar Crónica</span>
              </button>
            )}
          </div>

          {/* Tone / Situation Selector Row */}
          {onSelectSituation && (
            <div className="flex items-center gap-1.5 pt-1.5 pb-0.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
                <span>Tono:</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                {(
                  [
                    { id: 'exploration', label: '🧭 Exploración' },
                    { id: 'tension', label: '⚡ Tensión' },
                    { id: 'combat', label: '⚔️ Combate' },
                    { id: 'rest', label: '🏕️ Descanso' },
                  ] as { id: SceneSituation; label: string }[]
                ).map((sit) => {
                  const isCurrent = (liveState.currentSituation || 'exploration') === sit.id;
                  return (
                    <button
                      key={sit.id}
                      type="button"
                      onClick={() => onSelectSituation(sit.id)}
                      className={`px-2 py-0.5 rounded font-medium transition-all ${
                        isCurrent
                          ? 'bg-amber-600 text-white font-bold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sit.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Scene Action Buttons */}
          <div className="scene-quick-actions-row">
            <button
              className={`scene-action-btn ${liveState.locationBanner.visible ? 'active' : ''}`}
              onClick={onToggleBanner}
              title="Mostrar u ocultar título del lugar a los jugadores"
            >
              <ImageIcon size={14} />
              <span>{liveState.locationBanner.visible ? 'Ocultar Cartel' : 'Mostrar Cartel'}</span>
            </button>

            <button
              className="scene-action-btn"
              onClick={onTriggerLightning}
              title="Disparar relámpago inmediato con trueno sincronizado"
            >
              <Zap size={14} className="text-sky-400" />
              <span>Rayo</span>
            </button>

            {onToggleAutoStorm && (
              <button
                className={`scene-action-btn ${lightningConfig?.enabled ? 'active !bg-sky-950/60 !border-sky-500/70 !text-sky-300' : ''}`}
                onClick={onToggleAutoStorm}
                title="Activar/Pausar cadencia automática de relámpagos estocásticos según el clima"
              >
                <CloudLightning
                  size={14}
                  className={lightningConfig?.enabled ? 'text-sky-400 animate-pulse' : 'text-slate-400'}
                />
                <span>{lightningConfig?.enabled ? 'Tormenta Activa' : 'Auto-Tormenta'}</span>
              </button>
            )}

            {lightningConfig?.enabled && onToggleDisableFlash && (
              <button
                className={`scene-action-btn ${lightningConfig?.disableFlashes ? 'active !bg-amber-950/50 !text-amber-300' : ''}`}
                onClick={onToggleDisableFlash}
                title="Modo fotosensible: suprime destellos brillantes en pantalla manteniendo el sonido del trueno"
              >
                <EyeOff size={14} className={lightningConfig?.disableFlashes ? 'text-amber-400' : 'text-slate-400'} />
                <span>{lightningConfig?.disableFlashes ? 'Sin Destellos' : 'Con Destellos'}</span>
              </button>
            )}

            <button
              className="scene-action-btn"
              onClick={onTriggerShake}
              title="Temblor visual de pantalla"
            >
              <Activity size={14} className="text-amber-400" />
              <span>Temblor</span>
            </button>

            {liveState.ambientAudioUrl && (
              <button
                className={`scene-action-btn ${liveState.ambientPlaying ? 'playing' : ''}`}
                onClick={onToggleAmbientAudio}
                title="Pausar / Reanudar música ambiental de la escena"
              >
                {liveState.ambientPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{liveState.ambientPlaying ? 'Pausar Música' : 'Sonar Música'}</span>
              </button>
            )}

            {onToggleDmSpeakingDucked && (
              <button
                className={`scene-action-btn ${
                  liveState.isDmSpeakingDucked
                    ? 'active !bg-amber-950/60 !border-amber-500/80 !text-amber-300'
                    : ''
                }`}
                onClick={onToggleDmSpeakingDucked}
                title="Atenuación inteligente de fondo ('ducking') para hablar/narrar con claridad sin distorsión"
              >
                <Mic
                  size={14}
                  className={
                    liveState.isDmSpeakingDucked
                      ? 'text-amber-400 animate-pulse'
                      : 'text-slate-400'
                  }
                />
                <span>{liveState.isDmSpeakingDucked ? 'Hablando (Ducked)' : 'Hablar'}</span>
              </button>
            )}

            {onSelectDuckingPreset && (
              <select
                value={liveState.duckingProfile?.preset || 'narration'}
                onChange={(e) => onSelectDuckingPreset(e.target.value as DuckingPreset)}
                className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-1 text-[11px] cursor-pointer"
                title="Perfil de atenuación ('ducking') de audio"
              >
                <option value="gentle">Atenuación Suave (-35%)</option>
                <option value="narration">Narración (-65%)</option>
                <option value="intense">Atenuación Intensa (-85%)</option>
              </select>
            )}

            {onOpenCompositor && (
              <button
                className="scene-action-btn compositor-btn"
                onClick={onOpenCompositor}
                title="Abrir Compositor Táctil de Personajes"
              >
                <Sliders size={14} className="text-purple-400" />
                <span>Compositor</span>
              </button>
            )}

            {onOpenSoundboard && (
              <button
                className="scene-action-btn"
                onClick={onOpenSoundboard}
                title="Abrir Soundboard: Matriz rápida de efectos de sonido táctiles"
              >
                <Volume2 size={14} className="text-amber-400" />
                <span>SFX Pad</span>
              </button>
            )}
          </div>

          {/* Camera Framing Quick Actions */}
          {onSetCameraTransform && (
            <div className="camera-framing-row flex items-center gap-1.5 pt-2 pb-1 border-t border-slate-800/80 overflow-x-auto text-[11px]">
              <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                <Camera size={12} className="text-amber-400" />
                <span>Cámara:</span>
              </span>

              <button
                type="button"
                className={`px-2 py-0.5 rounded font-semibold shrink-0 ${
                  (liveState.camera?.zoom ?? 1) <= 1.05
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                onClick={() =>
                  onResetCamera
                    ? onResetCamera()
                    : onSetCameraTransform({ focalPoint: { x: 50, y: 50 }, zoom: 1.0 })
                }
                title="Plano General (1.0x)"
              >
                Plano General
              </button>

              {liveState.characters.length > 0 && (
                <button
                  type="button"
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold shrink-0"
                  onClick={() => {
                    const speaking =
                      liveState.characters.find((c) => c.isSpeaking) || liveState.characters[0];
                    if (speaking) {
                      const targetX = speaking.normalizedX ?? 50;
                      const targetY = Math.max(25, (speaking.normalizedY ?? 50) - 15);
                      onSetCameraTransform({ focalPoint: { x: targetX, y: targetY }, zoom: 1.45 });
                    }
                  }}
                  title="Encuadrar al personaje que habla"
                >
                  Encuadrar Hablante
                </button>
              )}

              {liveState.characters.length >= 2 && (
                <button
                  type="button"
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold shrink-0"
                  onClick={() => {
                    const framing = calculateGroupFraming(liveState.characters, {
                      hasActiveDialogue: !!liveState.dialogue?.visible,
                      hasActiveInitiative: !!liveState.combatState?.isActive,
                      hasActiveBanner: !!liveState.locationBanner?.visible,
                    });
                    onSetCameraTransform(framing.camera);
                  }}
                  title="Encuadrar grupo completo calculando caja envolvente y safe areas de diálogos e iniciativa"
                >
                  Encuadrar Grupo
                </button>
              )}

              {(liveState.camera?.zoom ?? 1) > 1.05 && (
                <button
                  type="button"
                  className="px-2 py-0.5 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-semibold shrink-0 flex items-center gap-0.5"
                  onClick={() =>
                    onResetCamera
                      ? onResetCamera()
                      : onSetCameraTransform({ focalPoint: { x: 50, y: 50 }, zoom: 1.0 })
                  }
                  title="Restablecer cámara a posición original"
                >
                  <Maximize2 size={10} />
                  <span>Restablecer</span>
                </button>
              )}

              {/* Quick Scene Lights Toggle */}
              {liveState.lights && liveState.lights.length > 0 && onUpdateSceneLights && (
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded font-semibold shrink-0 flex items-center gap-1 ${
                    liveState.lights.some((l) => l.visible)
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                  onClick={() => {
                    const anyVisible = liveState.lights?.some((l) => l.visible);
                    const updated = (liveState.lights || []).map((l) => ({
                      ...l,
                      visible: !anyVisible,
                    }));
                    onUpdateSceneLights(updated);
                  }}
                  title="Encender o apagar luces localizadas de la escena"
                >
                  <Flame
                    size={11}
                    className={
                      liveState.lights.some((l) => l.visible) ? 'text-amber-400 animate-pulse' : ''
                    }
                  />
                  <span>Luces ({liveState.lights.filter((l) => l.visible).length})</span>
                </button>
              )}

              {/* Quick Zone Emitters Toggle */}
              {liveState.emitters && liveState.emitters.length > 0 && onUpdateZoneEmitters && (
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded font-semibold shrink-0 flex items-center gap-1 ${
                    liveState.emitters.some((e) => e.enabled)
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                  onClick={() => {
                    const anyEnabled = liveState.emitters?.some((e) => e.enabled);
                    const updated = (liveState.emitters || []).map((e) => ({
                      ...e,
                      enabled: !anyEnabled,
                    }));
                    onUpdateZoneEmitters(updated);
                  }}
                  title="Activar o desactivar emisores atmosféricos de la escena"
                >
                  <CloudRain
                    size={11}
                    className={
                      liveState.emitters.some((e) => e.enabled) ? 'text-sky-400 animate-pulse' : ''
                    }
                  />
                  <span>Ambiente ({liveState.emitters.filter((e) => e.enabled).length})</span>
                </button>
              )}
            </div>
          )}

          {/* Quick Scene Variants Chips */}
          {activeScene?.variants && activeScene.variants.length > 0 && (
            <div className="scene-variants-row">
              <span className="variants-tag">Variantes:</span>
              <div className="variants-chips-scroll">
                {activeScene.variants.map((v) => {
                  const isActive =
                    liveState.activeVariantId === v.id ||
                    (!liveState.activeVariantId && liveState.backgroundUrl === v.backgroundUrl);
                  return (
                    <button
                      key={v.id}
                      className={`variant-pill ${isActive ? 'active-variant' : ''}`}
                      onClick={() => onSelectSceneVariant?.(v)}
                      title={`Cambiar a variante "${v.name}"`}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progressive Disclosure / Revelations of Characters */}
          {liveState.characters.some(
            (c) =>
              c.revelation &&
              (!c.revelation.isAppearanceRevealed || !c.revelation.isIdentityRevealed)
          ) && (
            <div className="scene-revelations-row flex items-center gap-2 overflow-x-auto py-1.5 px-2 bg-slate-950/70 border border-purple-900/40 rounded-lg text-xs mt-2">
              <span className="text-[10px] text-purple-300 font-bold flex items-center gap-1 shrink-0">
                <Eye size={12} className="text-purple-400" />
                <span>Revelaciones:</span>
              </span>
              {liveState.characters
                .filter(
                  (c) =>
                    c.revelation &&
                    (!c.revelation.isAppearanceRevealed || !c.revelation.isIdentityRevealed)
                )
                .map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-1.5 bg-slate-900/90 border border-purple-800/30 rounded-lg p-1 shrink-0"
                  >
                    <span className="text-slate-300 text-[11px] font-semibold max-w-[100px] truncate">
                      {char.revelation?.isIdentityRevealed
                        ? char.name
                        : char.revelation?.publicAlias || 'Desconocido'}
                    </span>
                    {!char.revelation?.isAppearanceRevealed && onRevealCharacterAppearance && (
                      <button
                        type="button"
                        onClick={() => onRevealCharacterAppearance(char.id)}
                        className="px-1.5 py-0.5 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-700/50 text-purple-200 text-[10px] font-bold flex items-center gap-1"
                        title="Revelar rostro a los jugadores en la Mesa"
                      >
                        <Eye size={10} />
                        <span>Rostro</span>
                      </button>
                    )}
                    {!char.revelation?.isIdentityRevealed && onRevealCharacterIdentity && (
                      <button
                        type="button"
                        onClick={() => onRevealCharacterIdentity(char.id)}
                        className="px-1.5 py-0.5 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-700/50 text-amber-200 text-[10px] font-bold flex items-center gap-1"
                        title="Revelar nombre e identidad real a los jugadores"
                      >
                        <span>Nombre</span>
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* 3.6 SCENE INTERACTIONS TOOLBAR (1-TOUCH DECLARATIVE ACTIONS) */}
          <SceneInteractionsToolbar
            interactions={liveState.interactions}
            executingInteractionId={executingInteractionId}
            onTriggerInteraction={onTriggerInteraction}
          />
        </section>

        {/* CARD B: SIGUIENTE ESCENA / PREPARACIÓN */}
        <section className="session-card next-scene-card">
          <div className="card-header-bar">
            <div className="flex-align-gap">
              <Layers size={15} className="text-indigo-400" />
              <h2 className="card-title">
                {isStagedSceneDifferent ? 'PREPARADA EN BORRADOR' : 'SIGUIENTE ESCENA'}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {onOpenSaveScenePreset && (
                <button
                  type="button"
                  onClick={onOpenSaveScenePreset}
                  title="Guardar composición de escena actual como Preset reutilizable"
                  style={{
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.35)',
                    color: '#c4b5fd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={12} />
                  <span>Guardar Preset</span>
                </button>
              )}
              {onOpenInsertScenePreset && (
                <button
                  type="button"
                  onClick={onOpenInsertScenePreset}
                  title="Insertar Preset de Escena en la preparación"
                  style={{
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    background: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.35)',
                    color: '#93c5fd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Layers size={12} />
                  <span>Insertar Preset...</span>
                </button>
              )}
              {isStagedSceneDifferent && (
                <span className="card-tag staging-tag">STAGING LISTO</span>
              )}
            </div>
          </div>

          {sceneToDisplayAsNext ? (
            <div className="next-scene-content">
              <div
                className="next-scene-preview"
                style={{
                  backgroundImage: sceneToDisplayAsNext.backgroundUrl
                    ? `url(${sceneToDisplayAsNext.backgroundUrl})`
                    : 'none',
                }}
              >
                <div className="next-scene-preview-overlay">
                  <strong className="next-scene-name">{sceneToDisplayAsNext.name}</strong>
                  {sceneToDisplayAsNext.subtitle && (
                    <span className="next-scene-sub">{sceneToDisplayAsNext.subtitle}</span>
                  )}
                </div>
              </div>

              <div className="next-scene-controls">
                {isStagedSceneDifferent ? (
                  <button
                    className="btn-send-to-table"
                    onClick={handlePublishClick}
                    disabled={publishStatus === 'sending'}
                  >
                    {publishStatus === 'sending' ? (
                      <span>Publicando...</span>
                    ) : publishStatus === 'ack' ? (
                      <>
                        <CheckCheck size={16} className="text-emerald-300" />
                        <span>¡Escena en Mesa!</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Llevar a la Mesa (ACK)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    className="btn-prepare-staging"
                    onClick={() => handlePrepareNext(sceneToDisplayAsNext)}
                    title="Cargar escena en modo preparación sin afectar a los jugadores"
                  >
                    <Layers size={15} />
                    <span>Preparar en Staging</span>
                  </button>
                )}

                <button
                  className="btn-direct-live"
                  onClick={() => onSelectScene(sceneToDisplayAsNext)}
                  title="Publicar directamente en vivo sin pasar por borrador"
                >
                  <Play size={14} />
                  <span>Publicar Directo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-next-scene-box">
              <ImageIcon size={32} className="text-slate-600 mb-2" />
              <p>No hay más escenas en la campaña.</p>
              <button
                className="btn-browse-scenes"
                onClick={() => onSwitchToTab('library')}
              >
                Explorar Biblioteca
              </button>
            </div>
          )}
        </section>

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
          onFocusCombatant={onFocusCombatant && currentCombatant ? () => onFocusCombatant(currentCombatant.characterId || currentCombatant.id) : undefined}
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
        <section className="session-dialogue-dock-section" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
          <CinematicDialogueDock
            characters={liveState.characters}
            activeDialogue={liveState.dialogue}
            savedConversations={gameSessionService.getActiveConversations(campaign?.savedConversations || [])}
            macros={gameSessionService.getActiveMacros(campaign?.macros || [])}
            onPublishDialogue={onPublishDialogue}
            onDismissDialogue={onDismissDialogue}
            onCompleteDialogueText={onCompleteDialogueText}
            onOpenNewConversation={onOpenNewConversation}
            onOpenEditConversation={onOpenEditConversation}
            onRepeatActions={onRepeatActions}
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
      {confirmOverwriteStaging && (
        <div className="modal-overlay" onClick={() => setConfirmOverwriteStaging(null)}>
          <div className="modal-content overwrite-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex-align-gap">
                <AlertTriangle size={20} className="text-amber-400" />
                <h2>¿Sobrescribir Borrador en Preparación?</h2>
              </div>
            </div>
            <p className="confirm-body-text">
              Actualmente tienes <strong>{pendingChangesCount} cambio(s)</strong> sin publicar en el
              modo Preparación.
              <br />
              Si cargas "{confirmOverwriteStaging.name}", se reemplazarán esos cambios.
            </p>
            <div className="modal-footer flex-justify-between">
              <button
                className="btn-secondary"
                onClick={() => setConfirmOverwriteStaging(null)}
              >
                Cancelar
              </button>
              <div className="flex-align-gap">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    onPublishAllStaged();
                    handleConfirmOverwrite();
                  }}
                >
                  Publicar Primero y Cargar
                </button>
                <button className="btn-danger" onClick={handleConfirmOverwrite}>
                  Reemplazar Borrador
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
