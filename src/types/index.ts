export type Role = 'lobby' | 'display' | 'master' | 'workshop';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type WeatherType = 'none' | 'rain' | 'storm' | 'snow' | 'fog' | 'embers' | 'fireflies';

export type LightingFilter = 'normal' | 'night' | 'sunset' | 'blood_moon' | 'torch_flicker' | 'mystic_violet';

export type CharacterPosition = 'left' | 'center-left' | 'center-right' | 'right';
export type TacticalTeam = 'allies' | 'enemies' | 'neutral';
export interface TacticalGridConfig {
  enabled: boolean;
  type: 'square' | 'hex';
  columns: number;
  opacity: number;
}

export type CombatCondition =
  | 'poisoned'
  | 'stunned'
  | 'burning'
  | 'blinded'
  | 'paralyzed'
  | 'invisible'
  | 'concentrating'
  | 'blessed'
  | 'cursed'
  | 'frightened'
  | 'prone'
  | 'restrained'
  | 'charmed';

export interface ActiveCombatCondition {
  id: string;
  condition: CombatCondition;
  label: string;
  icon: string;
  color: string;
  description: string;
  isPublic: boolean;
  appliedAtRound?: number;
}

export interface Combatant {
  id: string;
  characterId?: string; // Explicit link to CharacterOnScreen/Character instance ID
  name: string;
  avatarUrl: string;
  initiative: number;
  currentHp: number;
  maxHp: number;
  showHpToPlayers: boolean;
  conditions: CombatCondition[];
  activeConditions?: ActiveCombatCondition[];
  isMonster: boolean;
  isWaveReinforcement?: boolean;
  triggerRound?: number;
  isDeployed?: boolean;
  isSecret?: boolean;
}

export type CombatTrackingMode = 'manual' | 'suggest' | 'auto';

export interface CombatState {
  isActive: boolean;
  round: number;
  currentTurnIndex: number;
  combatants: Combatant[];
  turnTimerSeconds?: number;
  isTimerRunning?: boolean;
  showTurnTimerToPlayers?: boolean;
  encounterName?: string;
  rewardsSummary?: string;
  trackingMode?: CombatTrackingMode;
  suggestedFocusCharacterId?: string | null;
  turnId?: string;
  turnTimerEndsAt?: number | null;
  turnTimerRemainingSeconds?: number;
  turnTimerTotalSeconds?: number;
  autoStartNextTurnTimer?: boolean;
  soundAlertOnExpire?: boolean;
}

export interface EncounterCombatant {
  id: string;
  name: string;
  avatarUrl: string;
  maxHp: number;
  currentHp: number;
  isMonster: boolean;
  showHpToPlayers: boolean;
  initiativeType: 'fixed' | 'roll_d20' | 'manual';
  fixedInitiative?: number;
  initiativeModifier?: number;
  initialConditions?: CombatCondition[];
  isWaveReinforcement?: boolean;
  triggerRound?: number;
}

export interface SavedEncounter {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  difficulty: 'facil' | 'medio' | 'dificil' | 'letal';
  combatants: EncounterCombatant[];
  dmNotes?: string;
  rewardsSummary?: string;
  turnTimerSeconds?: number;
  backgroundSceneId?: string;
}

export interface CharacterExpression {
  name: string;
  avatarUrl: string;
}

export interface VisualStateVariant {
  id: string; // Stable identifier
  name: string; // Human-readable label (e.g. "Abierto", "Cerrado", "Herido", "En llamas")
  assetUrl: string;
  anchor?: 'bottom-center' | 'center';
  offsetPercent?: { x: number; y: number };
  scaleModifier?: number; // Multiplicative factor (default 1.0, non-accumulative)
}

export type TransitionAnimationType = 'instant' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up';

export interface ElementTransitionDirective {
  transitionId: string;
  targetId: string; // instanceId
  targetType: 'character' | 'prop';
  direction: 'enter' | 'exit' | 'move';
  animation: TransitionAnimationType;
  durationMs: number; // 200 - 1200ms (default 500ms)
  targetRevision?: number;
}

export interface Character {
  id: string;
  name: string;
  roleOrTitle: string;
  defaultAvatarUrl: string;
  expressions?: Record<string, string>;
  expressionAnchors?: Record<string, number>; // Anchor calibration (0-50%) per expression key or avatar URL
  visualStates?: VisualStateVariant[];
  bio?: string;
  tags?: string[];
  maxHp?: number;
}

export interface CharacterOnScreen {
  id: string;
  instanceId?: string; // Stable unique ID for screen instance
  characterId?: string;
  name: string;
  privateLabel?: string; // DM-only private instance label (e.g. "Guardia puerta", sanitized from Mesa)
  avatarUrl: string;
  position: CharacterPosition;
  normalizedX?: number; // 0-100% (center-bottom anchor)
  normalizedY?: number; // 0-100% (bottom ground line anchor)
  scale?: number; // 0.5 - 2.0 (default 1.0)
  isFlipped?: boolean; // Horizontal mirror (default false)
  zIndex?: number; // Stacking layer 1-50 (default 1)
  isLocked?: boolean; // Prevent accidental drag
  isSpeaking: boolean;
  presence?: 'on_stage' | 'in_reserve'; // Presence dimension: on screen vs ready in reserve
  isHidden?: boolean; // Visibility dimension: temporarily hidden from players without losing position
  visualAnchorOffsetY?: number; // Visual ground anchor offset 0-50% (compensates bottom transparent padding)
  instanceVariantAnchors?: Record<string, number>; // Per-instance calibration overrides per expression key
  activeExpression?: string;
  visualStateId?: string;
  statusBadge?: string;
  tacticalTeam?: TacticalTeam;
  nameplatePosition?: 'auto' | 'bottom' | 'top' | 'side'; // Adaptive or manual tag position
  revelation?: CharacterRevelationState;
}

export interface CharacterRevelationState {
  isAppearanceRevealed: boolean; // False => projected as silhouette/darkened outline
  isIdentityRevealed: boolean;   // False => projected with publicAlias (e.g. "Desconocido")
  silhouetteUrl?: string;        // Specific silhouette asset URL
  publicAlias?: string;          // Public placeholder name e.g. "Figura Encapuchada"
}

export interface SceneOcclusionRegion {
  id: string;
  name: string; // DM private label e.g. "Frente mostrador", "Columna"
  x: number; // 0-100% (left)
  y: number; // 0-100% (bottom)
  width: number; // 0-100%
  height: number; // 0-100%
  zIndex: number; // Shared zIndex with characters and props (default 25)
}

export interface StageWaypoint {
  id: string;
  name: string; // DM private label e.g. "Detrás de la barra", "En la puerta"
  normalizedX: number; // 0-100%
  normalizedY: number; // 0-100%
  targetZIndex?: number; // Optional target layer zIndex
  description?: string;
}

export interface SceneVariant {
  id: string;
  name: string;
  backgroundUrl: string;
  fitMode?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  zoom?: number;
  lighting?: LightingFilter;
  weather?: WeatherType;
  weatherIntensity?: number;
  ambientAudioUrl?: string;
  groundLineY?: number; // Scene-specific visual ground line percentage (0-50%, default 0)
  savedCameraPresets?: { id: string; name: string; camera: CameraTransform }[];
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
}

export interface SceneProp {
  id: string;
  assetId?: string;
  name: string;
  assetUrl: string;
  normalizedX: number; // 0-100%
  normalizedY: number; // 0-100%
  scale: number; // 0.2 to 3.0 (default 1.0)
  rotation?: number; // -180 to 180 degrees
  isFlipped?: boolean;
  opacity?: number; // 0 to 1.0 (default 1.0)
  zIndex: number; // Unified rendering layer with NPCs
  anchor?: 'bottom-center' | 'center';
  isLocked?: boolean;
  visible?: boolean;
  visualStateId?: string;
}

export interface PropAsset {
  id: string;
  name: string;
  category?: 'furniture' | 'nature' | 'structure' | 'item' | 'effects';
  assetUrl: string;
  defaultAnchor?: 'bottom-center' | 'center';
  defaultScale?: number;
  visualStates?: VisualStateVariant[];
  tags?: string[];
}

export interface PresetCharacterVisual {
  id: string;
  characterId?: string;
  name: string;
  avatarUrl: string;
  activeExpression?: string;
  normalizedX: number;
  normalizedY: number;
  scale: number;
  isFlipped?: boolean;
  zIndex: number;
  position?: CharacterPosition;
}

export interface SceneCompositionPreset {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  campaignId?: string;
  sceneId?: string;
  variantId?: string;
  backgroundUrl?: string;
  characters: PresetCharacterVisual[];
  props: SceneProp[];
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
  lights?: SceneLight[];
  emitters?: SceneZoneEmitter[];
  interactions?: SceneInteraction[];
  ambientAudioUrl?: string;
  ambientAudioName?: string;
  ambientVolume?: number;
  linkedConversationId?: string;
  linkedConversation?: SavedConversation;
  lighting?: LightingFilter;
  weather?: WeatherType;
  weatherIntensity?: number;
  focalPoint?: { x: number; y: number };
  fitMode?: 'cover' | 'contain';
  zoom?: number;
  tags?: string[];
  schemaVersion?: number;
  tacticalGrid?: TacticalGridConfig;
  isDeleted?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export type DialogueStyle = 'speech' | 'narration' | 'whisper' | 'shout';

export interface CinematicDialogue {
  id: string; // Unique dialogue intervention ID
  speakerInstanceId?: string; // Reference to CharacterOnScreen id
  speakerName?: string; // Public alias (e.g. "Grom", "Voz Misteriosa", or undefined for pure narration)
  text: string;
  avatarUrl?: string; // Optional portrait avatar
  activeExpression?: string;
  style: DialogueStyle;
  visible: boolean;
  autoFocusSpeaker?: boolean; // Highlight speaker NPC while active
  fontSize?: 'small' | 'medium' | 'large';
  isCompleted?: boolean; // True when typewriter text is fully revealed
}

export type DialogueCameraAction = 'none' | 'general' | 'speaker' | 'group' | 'custom';

export interface DialogueLineActions {
  expression?: string;
  cameraPreset?: DialogueCameraAction;
  customCamera?: CameraTransform;
  momentId?: string; // Reference to Macro/Moment in campaign.macros
}

export interface DialogueBranchChoice {
  id: string;
  label: string; // Private DM decision text (e.g. "Si aceptan el pacto")
  targetLineId: string; // Target line ID in the conversation
  conditionNote?: string; // Private DM condition note (e.g. "Requiere Persuasión DC 13")
}

export interface DialogueLine {
  id: string;
  speakerCharacterId?: string;
  speakerName?: string;
  text: string;
  avatarUrl?: string;
  style?: DialogueStyle;
  activeExpression?: string;
  autoFocusSpeaker?: boolean;
  dmNotes?: string; // Private DM notes, strictly excluded from players
  actions?: DialogueLineActions;
  choices?: DialogueBranchChoice[]; // Private branching choices for the DM
}

export interface SavedConversation {
  id: string;
  title: string;
  description?: string;
  sceneId?: string;
  lines: DialogueLine[];
  createdAt: number;
  updatedAt?: number;
}

export interface ConversationSession {
  conversationId?: string;
  currentLineIndex: number;
  lines: DialogueLine[];
  isPaused?: boolean;
  executedActionLineIds?: Record<string, string>; // Maps lineId -> executionAttemptId
  selectedChoiceIds?: Record<string, string>; // Maps lineId -> selected choiceId
}

export interface CameraTransform {
  focalPoint: { x: number; y: number }; // 0-100%
  zoom: number; // 1.0 to 2.5
}

export interface CameraTransitionDirective {
  transitionId: string;
  durationMs: number;
}

export type LightPreset = 'torch' | 'candle' | 'moonlight' | 'magic' | 'custom';

export interface SceneLight {
  id: string;
  name: string;
  preset: LightPreset;
  color: string; // hex or rgba e.g. '#ff9933'
  intensity: number; // 0.1 to 1.5 (default 1.0)
  radiusPct: number; // 5% to 60% of stage dimensions (independent of resolution)
  normalizedX: number; // 0 to 100%
  normalizedY: number; // 0 to 100%
  attachedTo?: {
    targetType: 'character' | 'prop';
    targetId: string;
    offsetX: number;
    offsetY: number;
  };
  flicker: boolean;
  visible: boolean;
}

export type ZoneEmitterType = 'fog' | 'smoke' | 'rain' | 'embers';

export interface SceneZoneEmitter {
  id: string;
  type: ZoneEmitterType;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  density: number;
  speed: number;
  direction?: number;
  opacity: number;
  zIndex: number;
  attachedTo?: {
    instanceId: string;
    offsetX?: number;
    offsetY?: number;
  };
  isClipped?: boolean;
  enabled: boolean;
}

export type InteractionScope = 'scene' | 'session' | 'campaign';

export interface SceneInteractionTransition {
  id: string;
  fromState: string;
  toState: string;
  label: string;
  visualStateId?: string;
  lightId?: string;
  emitterId?: string;
  sfxPreset?: string;
  sfxAudioUrl?: string;
  requiredHint?: string;
}

export interface SceneInteraction {
  id: string;
  targetInstanceId: string;
  name: string;
  currentState: string;
  scope: InteractionScope;
  transitions: SceneInteractionTransition[];
}

export type BackgroundType = 'image' | 'video';

export interface SceneVideoConfig {
  videoAssetId?: string;
  videoPosterAssetId?: string;
  videoPosterUrl?: string;
  videoFit?: 'cover' | 'contain';
  videoLoop?: boolean;
  videoMuted?: boolean;
  isCinematic?: boolean;
  durationSeconds?: number;
  videoDurationSeconds?: number;
  videoAutoplay?: boolean;
}

export interface VideoPlaybackState {
  playbackId: string;
  videoAssetId: string;
  status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';
  currentTimeMs: number;
  durationMs: number;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  updatedAt: number;
  errorMessage?: string;
}

export interface Scene {
  id: string;
  name: string;
  backgroundUrl: string;
  backgroundType?: BackgroundType;
  videoConfig?: SceneVideoConfig;
  videoAssetId?: string;
  videoPosterAssetId?: string;
  videoPosterUrl?: string;
  videoFit?: 'cover' | 'contain';
  videoLoop?: boolean;
  videoMuted?: boolean;
  isCinematic?: boolean;
  durationSeconds?: number;
  activeVariantId?: string;
  variants?: SceneVariant[];
  defaultCamera?: CameraTransform;
  props?: SceneProp[];
  lights?: SceneLight[];
  emitters?: SceneZoneEmitter[];
  interactions?: SceneInteraction[];
  fitMode?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  zoom?: number;
  locationBanner?: string;
  subtitle?: string;
  weather?: WeatherType;
  weatherIntensity?: number;
  lighting?: LightingFilter;
  dmNotes?: string;
  ambientAudioUrl?: string;
  ambientAudioName?: string;
  suggestedNpcIds?: string[];
  biomeProfileId?: string;
  currentSituation?: SceneSituation;
  activeLightingPresetId?: string;
  groundLineY?: number; // Visual ground line level (0-50%, default 0)
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
  activeCharacters?: CharacterOnScreen[];
}

export interface SFXTrack {
  id: string;
  name: string;
  category: 'combat' | 'magic' | 'environment' | 'mystery' | 'social';
  icon: string;
  soundType?: 'synthesized' | 'custom';
  synthPreset?: string;
  audioUrl?: string;
}

// Macro & Step Definitions
export interface MacroStep {
  id: string;
  delayMs: number;
  actionLabel?: string;
  sceneId?: string;
  backgroundUrl?: string;
  weather?: WeatherType;
  weatherIntensity?: number;
  lighting?: LightingFilter;
  charactersToAdd?: CharacterOnScreen[];
  charactersToRemove?: string[];
  speakerId?: string;
  locationBanner?: { text: string; subtitle?: string; visible: boolean };
  ambientAudioUrl?: string;
  ambientAudioName?: string;
  ambientPlaying?: boolean;
  ambientVolume?: number;
  sfxPreset?: string;
  sfxAudioUrl?: string;
  lightning?: boolean;
  shake?: boolean;
  blackout?: boolean;
}

export interface CinematicMacro {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: MacroStep[];
  charactersToAdd?: CharacterOnScreen[];
  restorePreviousStateOnEnd?: boolean;
}

export type DMFavoriteType = 'scene' | 'macro' | 'sfx' | 'combatCommand' | 'checkpoint';

export type ActionExecutionStatus = 'idle' | 'sending' | 'ack' | 'rejected' | 'offline';

export interface DMFavoriteItem {
  id: string;
  type: DMFavoriteType;
  label: string;
  icon?: string;
  color?: string;
  targetId?: string; // Scene ID, Macro ID, SFX ID, etc.
  params?: Record<string, unknown>;
}

export type KnowledgeType = 'npc_identity' | 'npc_appearance' | 'clue' | 'secret';

export interface CampaignKnowledgeEntry {
  id: string;
  type: KnowledgeType;
  title: string;
  description: string;
  targetId?: string;
  revealedAt: number;
  source: 'auto_interaction' | 'manual_dm';
  sessionId?: string;
  dmPrivateNotes?: string;
  isCorrected?: boolean;
  correctionReason?: string;
}

export interface CampaignWorldStateEntry {
  id: string; // targetInstanceId
  targetName: string;
  state: string;
  scope: 'session' | 'campaign';
  lastModifiedAt: number;
  sessionId?: string;
  notes?: string;
}

export interface SessionPrepDraft {
  id: string;
  campaignId: string;
  createdAt: number;
  updatedAt: number;
  selectedSceneId: string;
  suggestedReason: string;
  worldChoices: Record<string, 'keep' | 'reset'>; // instanceId -> 'keep' | 'reset'
  resetTemporaryWeather: boolean;
  resetTemporaryCombat: boolean;
  dmSessionGoals?: string;
  status: 'draft' | 'ready' | 'applied';
}

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt?: number;
  scenes: Scene[];
  characters: Character[];
  customSfx?: SFXTrack[];
  macros?: CinematicMacro[];
  encounters?: SavedEncounter[];
  favorites?: DMFavoriteItem[];
  propAssets?: PropAsset[];
  savedCompositions?: SceneCompositionPreset[];
  savedConversations?: SavedConversation[];
  interactionStates?: Record<string, string>; // Maps instanceId -> currentState (persists choices)
  knowledgeEntries?: CampaignKnowledgeEntry[];
  worldStateEntries?: CampaignWorldStateEntry[];
  nextSessionNotes?: string;
  sessionPrepDraft?: SessionPrepDraft;
  savedHandouts?: HandoutState[];
  savedRecap?: CampaignRecap;
  soundboardBanks?: SoundboardBank[];
  biomeProfiles?: BiomeSoundProfile[];
  lightingPresets?: SceneLightingPreset[];
}

export type LightingApplyMode = 'replace' | 'merge';

export interface SceneLightingPreset {
  id: string;
  name: string;
  description?: string;
  lights: SceneLight[];
  lightingFilter?: LightingFilter;
  transitionDurationMs?: number;
}

export interface PublicKnowledgeItem {
  id: string;
  title: string;
  category: string;
  summary: string;
}

export interface PublicChronicleDraft {
  title: string;
  campaignTitle: string;
  sessionDateLabel: string;
  generatedAt: number;
  synopsis: string;
  keyMilestones: string[];
  publicKnowledgeEntries: PublicKnowledgeItem[];
  activeQuestsOrObjectives: string[];
  dmClosingNotes?: string;
}

export type EnvironmentBiome = 'tavern' | 'forest' | 'dungeon' | 'city' | 'ruins' | 'sea';
export type SceneSituation = 'exploration' | 'tension' | 'combat' | 'rest';

export interface BiomeTrackLayer {
  musicUrl?: string;
  musicVolume?: number;
  ambientUrl?: string;
  ambientVolume?: number;
  crossfadeSeconds?: number;
}

export interface BiomeSoundProfile {
  id: string;
  biome: EnvironmentBiome;
  name: string;
  situations: Record<SceneSituation, BiomeTrackLayer>;
}

export type SoundboardCategory = 'ambient' | 'combat' | 'creature' | 'narrative';
export type PadRetriggerPolicy = 'ignore' | 'restart' | 'overlap';

export interface SoundboardPad {
  id: string;
  label: string;
  category: SoundboardCategory;
  sfxPreset?: string;
  audioUrl?: string;
  icon?: string;
  color?: string;
  volume?: number;
  retriggerPolicy?: PadRetriggerPolicy;
}

export interface SoundboardBank {
  id: string;
  name: string;
  sceneId?: string;
  pads: SoundboardPad[];
}

export interface RecapSlide {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
  caption?: string;
  durationSeconds?: number;
}

export interface CampaignRecap {
  id: string;
  title: string;
  slides: RecapSlide[];
  currentSlideIndex: number;
}

export interface RevealedRegionRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RevealedRegionCircle {
  id: string;
  cx: number;
  cy: number;
  r: number;
}

export interface HandoutPage {
  id: string;
  pageNumber: number;
  title?: string;
  imageUrl: string;
  revealedRects: RevealedRegionRect[];
  revealedCircles?: RevealedRegionCircle[];
  isFullyRevealed: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
}

export interface HandoutState {
  id: string;
  title: string;
  imageUrl?: string;
  revealedRects?: RevealedRegionRect[];
  revealedCircles?: RevealedRegionCircle[];
  isFullyRevealed?: boolean;
  zoom?: number;
  panOffset?: { x: number; y: number };
  isConfidential?: boolean;
  pages?: HandoutPage[];
  activePageIndex?: number;
}

export type DuckingPreset = 'gentle' | 'narration' | 'intense';

export interface DuckingProfile {
  preset: DuckingPreset;
  musicTargetGain: number;
  ambientTargetGain: number;
  attackMs: number;
  releaseMs: number;
}

export interface LightningConfig {
  enabled: boolean;
  minIntervalMs: number;
  maxIntervalMs: number;
  thunderDelayMs: number;
  disableFlashes?: boolean;
  volume: number;
}

export interface WeatherStormEvent {
  id: string;
  scheduledAt: number;
  expiresAt: number;
  flashIntensity: number;
  thunderDelayMs: number;
  thunderVolume: number;
  disableFlash?: boolean;
}

export interface DisplayState {
  currentSceneId?: string;
  sceneName: string;
  backgroundUrl: string;
  activeVariantId?: string;
  fitMode?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  zoom?: number;
  characters: CharacterOnScreen[];
  props?: SceneProp[];
  weather: WeatherType;
  weatherIntensity: number;
  lighting: LightingFilter;
  locationBanner: {
    text: string;
    subtitle?: string;
    visible: boolean;
  };
  isBlackout: boolean;
  shakeTrigger: number;
  lightningTrigger: number;
  ambientAudioUrl: string;
  ambientPlaying: boolean;
  ambientVolume: number;
  lastSfx: {
    id: string;
    type: string;
    synthPreset?: string;
    audioUrl?: string;
    timestamp: number;
  } | null;
  combatState: CombatState;
  activeTransitions?: ElementTransitionDirective[];
  dialogue?: CinematicDialogue | null;
  camera?: CameraTransform;
  cameraTransition?: CameraTransitionDirective;
  lights?: SceneLight[];
  emitters?: SceneZoneEmitter[];
  interactions?: SceneInteraction[];
  isDmSpeakingDucked?: boolean;
  duckingProfile?: DuckingProfile;
  activeHandout?: HandoutState | null;
  activeRecap?: CampaignRecap | null;
  lightningConfig?: LightningConfig;
  currentSituation?: SceneSituation;
  activeBiomeId?: string;
  nameDisplayMode?: 'always' | 'speaker_only' | 'hidden';
  groundLineY?: number; // Scene-specific ground line level (default 0)
  manualCameraOverride?: boolean; // True when DM manually framed camera, suspending auto-focus
  savedCameraPresets?: { id: string; name: string; camera: CameraTransform }[];
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
  backgroundType?: BackgroundType;
  videoConfig?: SceneVideoConfig;
  videoPlayback?: VideoPlaybackState | null;
  tacticalGrid?: TacticalGridConfig;
}

// History & Checkpoint Interfaces
export interface HistoryEvent {
  id: string;
  timestamp: number;
  description: string;
  mode: 'live' | 'staging';
  stateSnapshot: DisplayState;
}

export interface SessionCheckpoint {
  id: string;
  campaignId: string;
  sessionId?: string;
  name: string;
  type: 'manual' | 'auto';
  trigger: string;
  createdAt: number;
  state: DisplayState;
  previewThumbnailUrl?: string;
}

// Selective Publish & Diff Inspector Types
export type PublishCategoryKey =
  | 'background'
  | 'characters'
  | 'weather'
  | 'lighting'
  | 'locationBanner'
  | 'ambientAudio'
  | 'blackout';

export interface CategoryDiff {
  key: PublishCategoryKey;
  label: string;
  icon: string;
  hasChanged: boolean;
  liveSummary: string;
  stagedSummary: string;
  technicalError?: string;
}

export interface DependencyWarning {
  id: string;
  type: 'technical_blocker' | 'narrative_warning';
  title: string;
  description: string;
  recommendedCategoryKeys: PublishCategoryKey[];
}

export interface HandshakeCapabilities {
  isHardwareKeystore: boolean;
  hasWakeLock: boolean;
  isImmersiveSupported: boolean;
}

export interface HandshakeHelloPayload {
  deviceRole: 'master' | 'display';
  platform: 'android' | 'web';
  appVersion: string;
  protocolVersion: number;
  sessionId: string;
  connectionEpoch: number;
  sessionRevision: number;
  stateChecksum: string;
  capabilities: HandshakeCapabilities;
}

export interface MasterLease {
  leaseId: string;
  sessionId: string;
  masterDeviceId: string;
  connectionEpoch: number;
  acquiredAt: number;
  expiresAt: number;
  status: 'active' | 'transferring' | 'revoked' | 'expired';
}

export interface HandoffToken {
  token: string;
  sessionId: string;
  fromMasterDeviceId: string;
  toMasterDeviceId?: string;
  createdAt: number;
  expiresAt: number;
  stateChecksum: string;
  sessionRevision: number;
}

export type PairingPhase =
  | 'IDLE_WAITING'
  | 'TRANSPORT_CONNECTED'
  | 'PIN_CHALLENGE_PENDING'
  | 'AUTHENTICATED'
  | 'LEASE_GRANTED'
  | 'INITIAL_STATE_NEGOTIATED'
  | 'SNAPSHOT_APPLIED'
  | 'CONTROL_READY'
  | 'FAILED';

export interface PinChallenge {
  challengeCode: string;
  expiresAt: number;
  attemptsRemaining: number;
  requestedDeviceId: string;
}

export type SyncMessage =
  | { type: 'HANDSHAKE_HELLO'; payload: HandshakeHelloPayload }
  | { type: 'PAIRING_PROGRESS'; payload: { phase: PairingPhase; progressPercent: number; message: string } }
  | { type: 'PIN_CHALLENGE_REQUEST'; payload: { requestedDeviceId: string } }
  | { type: 'PIN_CHALLENGE_ISSUED'; payload: { challengeCode: string; expiresAt: number } }
  | { type: 'PIN_CHALLENGE_RESPONSE'; payload: { challengeCode: string } }
  | { type: 'PIN_CHALLENGE_APPROVED'; payload: { sessionSecret: string } }
  | { type: 'CONTROL_READY_CONFIRM'; payload: { confirmed: boolean; sessionRevision: number; checksum: string } }
  | { type: 'LEASE_ACQUIRE'; payload: { masterDeviceId: string; connectionEpoch: number } }
  | { type: 'LEASE_GRANTED'; payload: { lease: MasterLease } }
  | { type: 'LEASE_RENEW'; payload: { leaseId: string; connectionEpoch: number } }
  | { type: 'LEASE_REVOKED'; payload: { reason: string; newMasterDeviceId?: string } }
  | { type: 'LEASE_REJECTED'; payload: { reason: string; activeLeaseId: string } }
  | { type: 'PREPARE_HANDOFF'; payload: { handoffToken: string; expiresAt: number; stateChecksum: string; sessionRevision: number } }
  | { type: 'ACCEPT_HANDOFF'; payload: { handoffToken: string; newMasterDeviceId: string } }
  | { type: 'COMMIT_HANDOFF'; payload: { handoffToken: string; newLease: MasterLease } }
  | { type: 'ROLLBACK_HANDOFF'; payload: { reason: string } }
  | { type: 'FULL_STATE'; payload: DisplayState; leaseId?: string; isResync?: boolean }
  | { type: 'REQUEST_FULL_STATE' }
  | { type: 'SET_SCENE'; payload: Scene; characters?: CharacterOnScreen[]; leaseId?: string }
  | { type: 'SET_BACKGROUND'; payload: string; leaseId?: string }
  | { type: 'UPDATE_CHARACTERS'; payload: CharacterOnScreen[]; leaseId?: string }
  | { type: 'ADD_CHARACTER'; payload: CharacterOnScreen; leaseId?: string }
  | { type: 'REMOVE_CHARACTER'; payload: { id: string }; leaseId?: string }
  | { type: 'SET_SPEAKING'; payload: { id: string; isSpeaking: boolean }; leaseId?: string }
  | { type: 'SET_CHARACTER_EXPRESSION'; payload: { id: string; avatarUrl: string; expressionName: string }; leaseId?: string }
  | { type: 'SET_CHARACTER_POSITION'; payload: { id: string; position: CharacterPosition }; leaseId?: string }
  | { type: 'SET_WEATHER'; payload: { weather: WeatherType; intensity: number }; leaseId?: string }
  | { type: 'SET_LIGHTING'; payload: LightingFilter; leaseId?: string }
  | { type: 'TRIGGER_LIGHTNING'; leaseId?: string }
  | { type: 'TRIGGER_SHAKE'; payload?: { intensity?: number }; leaseId?: string }
  | { type: 'SET_BLACKOUT'; payload: boolean; leaseId?: string }
  | { type: 'SET_BANNER'; payload: { text: string; subtitle?: string; visible: boolean }; leaseId?: string }
  | { type: 'PLAY_SFX'; payload: { id: string; name: string; synthPreset?: string; audioUrl?: string; timestamp: number }; leaseId?: string }
  | { type: 'SET_AMBIENT'; payload: { url: string; playing: boolean; volume: number; crossfade?: boolean }; leaseId?: string }
  | { type: 'START_COMBAT'; payload: CombatState; leaseId?: string }
  | { type: 'UPDATE_COMBAT'; payload: CombatState; leaseId?: string }
  | { type: 'TURN_TIMER_TICK'; payload: { seconds: number; isRunning: boolean; showToPlayers: boolean } }
  | { type: 'END_COMBAT'; leaseId?: string }
  | { type: 'SYNC_TEST_PROBE'; payload: { probeId: string; timestamp: number; clientChecksum: string; sessionRevision: number } }
  | { type: 'SYNC_TEST_ACK'; payload: { probeId: string; displayChecksum: string; sessionRevision: number; matched: boolean; rttMs: number } }
  | { type: 'MESA_VIEWPORT_CHANGED'; payload: { viewport: { width: number; height: number; aspectRatio: number }; assetsStatus?: { isReady: boolean; missingCount: number; failedCount?: number }; audioStatus?: import('../domain/protocol/types').DisplayAudioStatus } }
  | { type: 'AUDIT_MESA_REQUEST'; payload: { timestamp: number } }
  | { type: 'AUDIT_MESA_RESPONSE'; payload: import('../domain/protocol/types').AuditMesaReport }
  | { type: 'VIDEO_AVAILABILITY_QUERY'; payload: import('../domain/protocol/types').VideoAvailabilityQueryPayload }
  | { type: 'VIDEO_AVAILABILITY_RESPONSE'; payload: import('../domain/protocol/types').VideoAvailabilityResponsePayload }
  | { type: 'VIDEO_CHUNK_TRANSFER'; payload: import('../domain/protocol/types').VideoChunkTransferPayload }
  | { type: 'VIDEO_PLAYBACK_COMMAND'; payload: import('../domain/protocol/types').VideoPlaybackCommandPayload }
  | { type: 'VIDEO_PLAYBACK_TELEMETRY'; payload: import('../domain/protocol/types').VideoPlaybackTelemetryPayload }
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; timestamp: number };

// ─── Game Session (Biblioteca de Preparaciones) ─────────────────────────────

/** Estado del guardado automático del borrador (Staging). */
export type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Estado del ciclo de vida de una sesión de partida. */
export type GameSessionStatus = 'preparing' | 'active' | 'completed' | 'archived';

/**
 * Entidad GameSession: ciudadana de primera clase en Dexie.
 * Sustituye el snapshot único 'active_session' para el guardado del borrador.
 * NO almacena tokens WebRTC, roomId ni claves de conexión.
 */
export interface GameSession {
  id: string;                         // 'gs-<uuid>'
  campaignId: string;
  name: string;                       // "Sesión 3 - El Paso del Trueno"
  status: GameSessionStatus;
  schemaVersion: 1;
  planNotes: string;                  // Texto libre del director (plan, ideas)
  stagedState: DisplayState | null;   // Borrador (Staging) persistido automáticamente
  liveState: DisplayState | null;     // Último estado publicado a la Mesa
  groupId?: string;                   // Identificador estable de grupo/mesa (p. ej. 'grp-martes')
  groupName?: string;                 // Nombre descriptivo del grupo de juego (p. ej. 'Grupo de los Martes')
  frozenScenes?: Scene[];             // Snapshot congelado de escenas de la preparación
  frozenCharacters?: Character[];     // Snapshot congelado de personajes de la preparación
  frozenConversations?: SavedConversation[]; // Snapshot congelado de conversaciones de la preparación
  frozenHandouts?: HandoutState[];    // Snapshot congelado de documentos/handouts de la preparación
  frozenMacros?: CinematicMacro[];             // Snapshot congelado de macros y momentos de la preparación
  revision: number;                   // Contador incremental de revisiones para anti-race
  lastExportedAt?: number;            // Timestamp de la última exportación completa
  lastExportIsComplete?: boolean;     // Indica si la última exportación fue 100% autocontenida sin faltantes
  lastBackupConfirmedAt?: number;     // Confirmación voluntaria de copia externa segura
  /** Indica si esta sesión es una copia aislada de comprobación de respaldo. */
  isAuditCopy?: boolean;
  /** Indica si la sesión fue migrada desde un formato antiguo sin snapshots. */
  isMigratedFromLegacy?: boolean;
  /** Nota explicativa de la fecha y origen de los snapshots migrados. */
  legacyMigrationNote?: string;
  /** Marca de borrado lógico para recuperación desde papelera. */
  isDeleted?: boolean;                // Soft-delete (Papelera)
  deletedAt?: number;                 // Timestamp de envío a la papelera
  createdAt: number;
  updatedAt: number;
  initialBaselineConfig?: SessionInitialBaseline; // Configuración inicial intencional de la aventura para nuevos grupos
  sessionNumber?: number;             // Número ordinal dentro de la campaña
  tags?: string[];
}

export interface SessionInitialBaseline {
  state: DisplayState;
  savedAt: number;
  version: number;
  label?: string;
  sourceTemplateId?: string;
  sourceTemplateName?: string;
}

export interface NextSessionOptions {
  newName?: string;
  startSceneId?: string;
  preserveCombatProgress?: boolean;
  preserveNpcHpLoss?: boolean;
  preserveConditions?: boolean;
  carryOverPlanNotes?: boolean;
}

export interface NewGroupSessionOptions {
  newName?: string;
  targetGroupName: string;
  targetGroupId?: string;
  resetRevelations?: boolean;
  resetNpcHp?: boolean;
  resetCombat?: boolean;
  resetInteractions?: boolean;
  baselineSource?: 'session_baseline' | 'template' | 'current_draft';
  templateId?: string;
}

/**
 * Plantilla de sesión: borrador sanitizado sin HP perdidos, combate activo,
 * temporizadores ni condiciones transitorias.
 */
export interface GameSessionTemplate {
  id: string;                         // 'tpl-<uuid>'
  name: string;
  description?: string;
  sourceSessionId: string;
  campaignId: string;
  stagedState: DisplayState;
  frozenScenes?: Scene[];
  frozenCharacters?: Character[];
  frozenConversations?: SavedConversation[];
  frozenHandouts?: HandoutState[];
  frozenMacros?: CinematicMacro[];
  version?: number;
  isDeleted?: boolean;
  deletedAt?: number;
  createdAt: number;
}

/** Opciones para duplicar una sesión. */
export interface DuplicateSessionOptions {
  excludeCombatProgress: boolean;     // Por defecto: true
  excludeConditions: boolean;         // Por defecto: true
  restoreNpcHp?: boolean;             // Si false conserva daño en NPCs
  newName?: string;
}

/** Información de un activo que no pudo ser resuelto localmente ni descargado. */
export interface MissingAssetInfo {
  url: string;
  context: string;                   // p.ej. "Fondo de Escena: Caverna", "Avatar: Valeros"
  assetType: 'image' | 'video' | 'audio';
  errorReason?: string;
}

/** Informe de diagnóstico previo a la exportación. */
export interface ExportPreflightReport {
  totalAssets: number;
  readyLocalCount: number;
  downloadedCount: number;
  missing: MissingAssetInfo[];
  canExportOfflineComplete: boolean;
}

/** Resumen de diferencias previo a la importación segura. */
export interface ImportDiffSummary {
  sessionName: string;
  isCompletePackage: boolean;
  scenesCount: number;
  charactersCount: number;
  newScenesCount: number;
  conflictingScenesCount: number;
  missingAssets: MissingAssetInfo[];
}

/**
 * Paquete portable de sesión (.vpp.json) para exportar/importar
 * entre PC y Android con todos los assets incrustados como DataURL.
 */
export interface GameSessionPackage {
  schemaVersion: 1;
  exportedAt: number;
  type: 'game_session_package';
  session: GameSession;
  assets: Array<{
    id: string;
    name: string;
    type: 'image' | 'video' | 'audio';
    dataUrl: string;
  }>;
  campaignSnippet: {
    id: string;
    title: string;
    scenes: Scene[];
    characters?: Character[];
    savedConversations?: SavedConversation[];
    macros?: CinematicMacro[];
    savedHandouts?: HandoutState[];
  };
  isCompleteOfflinePackage: boolean;
  missingAssets?: MissingAssetInfo[];
}

export interface PresetDependencyReport {
  totalAssets: number;
  includedCount: number;
  alreadyAvailableCount: number;
  missing: MissingAssetInfo[];
  isFullySelfContained: boolean;
  characterResolutions: Array<{
    presetCharacterId: string;
    name: string;
    matchedCampaignCharacterId?: string;
    matchType: 'exact_id' | 'name_match' | 'none';
  }>;
  conversationResolution?: {
    presetConversationId?: string;
    title?: string;
    matchedCampaignConversationId?: string;
    matchType: 'exact_id' | 'title_match' | 'none';
  };
}

export interface InstantiatePresetOptions {
  mode?: 'append_scene' | 'replace_staged';
  characterResolution?: 'reuse_existing' | 'create_copy';
  conversationResolution?: 'reuse_existing' | 'create_copy';
}

export interface ReadinessRemediationAction {
  type: 'select_starting_scene' | 'download_missing_assets' | 'fix_character_avatar' | 'repair_dialogue' | 'open_library';
  label: string;
  description: string;
}

export interface SessionReadinessCheckItem {
  id: string;
  title: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  action?: ReadinessRemediationAction;
  actionPayload?: any;
}

export interface SessionReadinessCheck {
  isReady: boolean;
  canPlayOffline: boolean;
  score: number;
  summary: string;
  checks: SessionReadinessCheckItem[];
}

export interface VersionConflictReport {
  hasConflict: boolean;
  conflictType: 'none' | 'local_newer' | 'remote_newer' | 'diverged' | 'diverged_concurrent_branch';
  localRevision: number;
  remoteRevision: number;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  recommendation: 'overwrite' | 'duplicate' | 'keep_local';
  detail: string;
}

export interface TemplateDiffItem {
  id: string;
  type: 'scene' | 'conversation' | 'handout';
  name: string;
  changeType: 'new' | 'modified' | 'identical';
  templateItem: any;
  currentSessionItem?: any;
  description: string;
}

export interface TemplateUpdateDiffReport {
  templateId: string;
  templateName: string;
  templateVersion: number;
  items: TemplateDiffItem[];
  hasModifications: boolean;
}

export interface GranularTemplateUpdateSelection {
  selectedItemIds: string[];
  modifiedResolution: Record<string, 'keep_session' | 'overwrite_with_template' | 'create_copy'>;
}

export interface StorageAuditReport {
  totalAssets: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  inUseCount: number;
  retainedInTrashOrCheckpointsCount: number;
  orphanCount: number;
  orphanAssetIds: string[];
  reclaimableBytes: number;
  reclaimableFormatted: string;
  breakdownByType: {
    images: { count: number; bytes: number };
    audio: { count: number; bytes: number };
  };
}

export interface AuditRestoreReport {
  isSuccess: boolean;
  auditSessionId: string;
  declaredAssetsCount: number;
  restoredAssetsCount: number;
  missingAssetsCount: number;
  isolatedFromLiveTable: boolean;
  details: string;
}


