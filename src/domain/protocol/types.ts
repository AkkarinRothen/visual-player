import type { CombatState, DisplayState, SFXTrack } from '../../types';

export type MessageTier = 'critical' | 'continuous' | 'ephemeral';

export type SyncMessageType =
  | 'HANDSHAKE_HELLO'
  | 'HANDSHAKE_RESULT'
  | 'REQUEST_STATE_SNAPSHOT'
  | 'STATE_SNAPSHOT'
  | 'RECONCILIATION_APPLIED'
  | 'FULL_STATE'
  | 'REQUEST_FULL_STATE'
  | 'PLAY_SFX'
  | 'TRIGGER_LIGHTNING'
  | 'TRIGGER_SHAKE'
  | 'UPDATE_COMBAT'
  | 'END_COMBAT'
  | 'TURN_TIMER_TICK'
  | 'PING'
  | 'PONG'
  | 'ACK_MESSAGE';

export interface AckPayload {
  ackMessageId: string;
  receivedSequence: number;
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
    case 'FULL_STATE':
    case 'UPDATE_COMBAT':
    case 'END_COMBAT':
      return { tier: 'critical', requiresAck: true };

    case 'TURN_TIMER_TICK':
      return { tier: 'continuous', requiresAck: false };

    case 'PLAY_SFX':
    case 'TRIGGER_LIGHTNING':
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
  | undefined;
