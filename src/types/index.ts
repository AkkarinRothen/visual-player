export type Role = 'lobby' | 'display' | 'master';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type WeatherType = 'none' | 'rain' | 'storm' | 'snow' | 'fog' | 'embers' | 'fireflies';

export type LightingFilter = 'normal' | 'night' | 'sunset' | 'blood_moon' | 'torch_flicker' | 'mystic_violet';

export type CharacterPosition = 'left' | 'center-left' | 'center-right' | 'right';

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
  | 'frightened';

export interface Combatant {
  id: string;
  name: string;
  avatarUrl: string;
  initiative: number;
  currentHp: number;
  maxHp: number;
  showHpToPlayers: boolean;
  conditions: CombatCondition[];
  isMonster: boolean;
  isWaveReinforcement?: boolean;
  triggerRound?: number;
  isDeployed?: boolean;
}

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

export interface Character {
  id: string;
  name: string;
  roleOrTitle: string;
  defaultAvatarUrl: string;
  expressions?: Record<string, string>;
  bio?: string;
  tags?: string[];
  maxHp?: number;
}

export interface CharacterOnScreen {
  id: string;
  characterId?: string;
  name: string;
  avatarUrl: string;
  position: CharacterPosition;
  isSpeaking: boolean;
  activeExpression?: string;
  statusBadge?: string;
}

export interface Scene {
  id: string;
  name: string;
  backgroundUrl: string;
  locationBanner?: string;
  subtitle?: string;
  weather?: WeatherType;
  weatherIntensity?: number;
  lighting?: LightingFilter;
  dmNotes?: string;
  ambientAudioUrl?: string;
  ambientAudioName?: string;
  suggestedNpcIds?: string[];
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
}

export interface DisplayState {
  currentSceneId?: string;
  sceneName: string;
  backgroundUrl: string;
  characters: CharacterOnScreen[];
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

export type SyncMessage =
  | { type: 'HANDSHAKE_HELLO'; payload: HandshakeHelloPayload }
  | { type: 'FULL_STATE'; payload: DisplayState }
  | { type: 'REQUEST_FULL_STATE' }
  | { type: 'SET_SCENE'; payload: Scene; characters?: CharacterOnScreen[] }
  | { type: 'SET_BACKGROUND'; payload: string }
  | { type: 'UPDATE_CHARACTERS'; payload: CharacterOnScreen[] }
  | { type: 'ADD_CHARACTER'; payload: CharacterOnScreen }
  | { type: 'REMOVE_CHARACTER'; payload: { id: string } }
  | { type: 'SET_SPEAKING'; payload: { id: string; isSpeaking: boolean } }
  | { type: 'SET_CHARACTER_EXPRESSION'; payload: { id: string; avatarUrl: string; expressionName: string } }
  | { type: 'SET_CHARACTER_POSITION'; payload: { id: string; position: CharacterPosition } }
  | { type: 'SET_WEATHER'; payload: { weather: WeatherType; intensity: number } }
  | { type: 'SET_LIGHTING'; payload: LightingFilter }
  | { type: 'TRIGGER_LIGHTNING' }
  | { type: 'TRIGGER_SHAKE'; payload?: { intensity?: number } }
  | { type: 'SET_BLACKOUT'; payload: boolean }
  | { type: 'SET_BANNER'; payload: { text: string; subtitle?: string; visible: boolean } }
  | { type: 'PLAY_SFX'; payload: { id: string; name: string; synthPreset?: string; audioUrl?: string; timestamp: number } }
  | { type: 'SET_AMBIENT'; payload: { url: string; playing: boolean; volume: number; crossfade?: boolean } }
  | { type: 'START_COMBAT'; payload: CombatState }
  | { type: 'UPDATE_COMBAT'; payload: CombatState }
  | { type: 'TURN_TIMER_TICK'; payload: { seconds: number; isRunning: boolean; showToPlayers: boolean } }
  | { type: 'END_COMBAT' }
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; timestamp: number };
