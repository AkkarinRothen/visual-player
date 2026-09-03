import type { CombatState, DisplayState, SFXTrack } from '../../types';

export type MessageTier = 'critical' | 'continuous' | 'ephemeral';

export type SyncMessageType =
  | 'HANDSHAKE_HELLO'
  | 'HANDSHAKE_RESULT'
  | 'REQUEST_STATE_SNAPSHOT'
  | 'STATE_SNAPSHOT'
  | 'RECONCILIATION_APPLIED'
  | 'SYNC_TEST_PROBE'
  | 'SYNC_TEST_ACK'
  | 'PAIRING_PROGRESS'
  | 'PIN_CHALLENGE_REQUEST'
  | 'PIN_CHALLENGE_ISSUED'
  | 'PIN_CHALLENGE_RESPONSE'
  | 'PIN_CHALLENGE_APPROVED'
  | 'CONTROL_READY_CONFIRM'
  | 'LEASE_ACQUIRE'
  | 'LEASE_GRANTED'
  | 'LEASE_RENEW'
  | 'LEASE_REVOKED'
  | 'LEASE_REJECTED'
  | 'PREPARE_HANDOFF'
  | 'ACCEPT_HANDOFF'
  | 'COMMIT_HANDOFF'
  | 'ROLLBACK_HANDOFF'
  | 'FULL_STATE'
  | 'REQUEST_FULL_STATE'
  | 'PLAY_SFX'
  | 'STOP_ALL_SFX'
  | 'TRIGGER_LIGHTNING'
  | 'TRIGGER_STORM_LIGHTNING'
  | 'TRIGGER_SHAKE'
  | 'UPDATE_COMBAT'
  | 'END_COMBAT'
  | 'TURN_TIMER_TICK'
  | 'PING'
  | 'PONG'
  | 'ACK_MESSAGE'
  | 'COMMAND_RESULT'
  | 'SET_BLACKOUT'
  | 'SET_SCENE'
  | 'SET_BACKGROUND'
  | 'UPDATE_CHARACTERS'
  | 'ADD_CHARACTER'
  | 'REMOVE_CHARACTER'
  | 'SET_SPEAKING'
  | 'SET_CHARACTER_EXPRESSION'
  | 'SET_CHARACTER_POSITION'
  | 'SET_WEATHER'
  | 'SET_LIGHTING'
  | 'SET_BANNER'
  | 'SET_AMBIENT'
  | 'START_COMBAT'
  | 'UPDATE_CHARACTER_TRANSFORM'
  | 'APPLY_SCENE_VARIANT'
  | 'UPDATE_SCENE_PROPS'
  | 'APPLY_COMPOSITION_PRESET'
  | 'TRIGGER_ELEMENT_TRANSITION'
  | 'SET_ELEMENT_VISUAL_STATE'
  | 'SET_CINEMATIC_DIALOGUE'
  | 'DISMISS_CINEMATIC_DIALOGUE'
  | 'SET_CAMERA_TRANSFORM'
  | 'UPDATE_SCENE_LIGHTS'
  | 'UPDATE_ZONE_EMITTERS'
  | 'UPDATE_SCENE_INTERACTIONS'
  | 'UPDATE_ACTIVE_HANDOUT'
  | 'UPDATE_ACTIVE_RECAP';

export interface AckPayload {
  ackMessageId: string;
  receivedSequence: number;
}

export interface CommandResultPayload {
  commandId: string;
  status: 'applied' | 'rejected';
  revision: number;
  checksum: string;
  appliedAt: number;
  sessionId?: string;
  connectionEpoch?: number;
  targetDeviceId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface TurnTimerTickPayload {
  seconds: number;
  isRunning: boolean;
  showToPlayers: boolean;
}

export interface PingPongPayload {
  clientTime: number;
}

export interface VersionedSyncMessage<T = unknown> {
  protocolVersion: 1;
  messageId: string;
  commandId?: string;
  sessionId?: string;
  connectionEpoch?: number;
  sequenceNumber: number;
  sessionRevision: number;
  sentAt: number;
  tier: MessageTier;
  requiresAck: boolean;
  type: SyncMessageType;
  payload: T;
  isLegacy?: boolean;
}

// Helper to determine default message tier and whether it requires ACK
export function getMessageTierInfo(type: SyncMessageType): {
  tier: MessageTier;
  requiresAck: boolean;
} {
  switch (type) {
    case 'HANDSHAKE_HELLO':
    case 'HANDSHAKE_RESULT':
    case 'REQUEST_STATE_SNAPSHOT':
    case 'STATE_SNAPSHOT':
    case 'RECONCILIATION_APPLIED':
    case 'LEASE_ACQUIRE':
    case 'LEASE_GRANTED':
    case 'LEASE_RENEW':
    case 'LEASE_REVOKED':
    case 'LEASE_REJECTED':
    case 'PREPARE_HANDOFF':
    case 'ACCEPT_HANDOFF':
    case 'COMMIT_HANDOFF':
    case 'ROLLBACK_HANDOFF':
    case 'FULL_STATE':
    case 'UPDATE_COMBAT':
    case 'END_COMBAT':
    case 'COMMAND_RESULT':
    case 'SET_BLACKOUT':
    case 'SET_SCENE':
    case 'SET_BACKGROUND':
    case 'UPDATE_CHARACTERS':
    case 'ADD_CHARACTER':
    case 'REMOVE_CHARACTER':
    case 'SET_SPEAKING':
    case 'SET_CHARACTER_EXPRESSION':
    case 'SET_CHARACTER_POSITION':
    case 'SET_WEATHER':
    case 'SET_LIGHTING':
    case 'SET_BANNER':
    case 'SET_AMBIENT':
    case 'START_COMBAT':
    case 'UPDATE_CHARACTER_TRANSFORM':
    case 'APPLY_SCENE_VARIANT':
    case 'UPDATE_SCENE_PROPS':
    case 'APPLY_COMPOSITION_PRESET':
    case 'TRIGGER_ELEMENT_TRANSITION':
    case 'SET_ELEMENT_VISUAL_STATE':
    case 'SET_CINEMATIC_DIALOGUE':
    case 'DISMISS_CINEMATIC_DIALOGUE':
    case 'SET_CAMERA_TRANSFORM':
    case 'UPDATE_SCENE_LIGHTS':
    case 'UPDATE_ZONE_EMITTERS':
    case 'UPDATE_SCENE_INTERACTIONS':
    case 'UPDATE_ACTIVE_HANDOUT':
    case 'UPDATE_ACTIVE_RECAP':
      return { tier: 'critical', requiresAck: true };

    case 'TURN_TIMER_TICK':
      return { tier: 'continuous', requiresAck: false };

    case 'PLAY_SFX':
    case 'STOP_ALL_SFX':
    case 'TRIGGER_LIGHTNING':
    case 'TRIGGER_STORM_LIGHTNING':
    case 'TRIGGER_SHAKE':
    case 'PING':
    case 'PONG':
    case 'REQUEST_FULL_STATE':
    case 'ACK_MESSAGE':
    default:
      return { tier: 'ephemeral', requiresAck: false };
  }
}

export type AnySyncPayload =
  | DisplayState
  | SFXTrack
  | CombatState
  | TurnTimerTickPayload
  | PingPongPayload
  | AckPayload
  | CommandResultPayload
  | undefined;
