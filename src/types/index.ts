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

export type SyncMessage =
  | { type: 'HANDSHAKE_HELLO'; payload: HandshakeHelloPayload }
  | { type: 'LEASE_ACQUIRE'; payload: { masterDeviceId: string; connectionEpoch: number } }
  | { type: 'LEASE_GRANTED'; payload: { lease: MasterLease } }
  | { type: 'LEASE_RENEW'; payload: { leaseId: string; connectionEpoch: number } }
  | { type: 'LEASE_REVOKED'; payload: { reason: string; newMasterDeviceId?: string } }
  | { type: 'LEASE_REJECTED'; payload: { reason: string; activeLeaseId: string } }
  | { type: 'PREPARE_HANDOFF'; payload: { handoffToken: string; expiresAt: number; stateChecksum: string; sessionRevision: number } }
  | { type: 'ACCEPT_HANDOFF'; payload: { handoffToken: string; newMasterDeviceId: string } }
  | { type: 'COMMIT_HANDOFF'; payload: { handoffToken: string; newLease: MasterLease } }
  | { type: 'ROLLBACK_HANDOFF'; payload: { reason: string } }
  | { type: 'FULL_STATE'; payload: DisplayState; leaseId?: string }
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
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; timestamp: number };
