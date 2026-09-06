import type { DisplayState } from './display.types';

export type Role = 'lobby' | 'display' | 'master' | 'workshop';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ActionExecutionStatus = 'idle' | 'sending' | 'ack' | 'rejected' | 'offline';

export type DMFavoriteType = 'scene' | 'macro' | 'sfx' | 'combatCommand' | 'checkpoint';

export interface DMFavoriteItem {
  id: string;
  type: DMFavoriteType;
  label: string;
  icon?: string;
  color?: string;
  targetId?: string; // Scene ID, Macro ID, SFX ID, etc.
  params?: Record<string, unknown>;
  sceneId?: string; // ID de la escena a la que está vinculado específicamente este favorito
  contextTags?: string[]; // Etiquetas temáticas para emparejamiento contextual
  isDynamicSuggestion?: boolean; // Indica si fue generado dinámicamente según el contexto de la escena actual
}

// History & Checkpoint Interfaces
export interface HistoryEvent {
  id: string;
  timestamp: number;
  description: string;
  mode: 'live' | 'staging';
  stateSnapshot: DisplayState;
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

/** Estado del guardado automático del borrador (Staging). */
export type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';
