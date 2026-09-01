import type { DisplayState, HandshakeHelloPayload } from '../types';

export type ExitType = 'unexpected_termination' | 'clean_exit';

export interface FullRecoverySnapshot {
  version: 1;
  savedAt: number;
  role: 'master' | 'display';
  roomId: string;
  sessionId: string;
  connectionEpoch: number;
  sessionRevision: number;
  campaignId?: string;
  activeSceneId?: string;
  liveState: DisplayState;
  stagedState?: DisplayState;
  hasStagedChanges: boolean;
  combatActive: boolean;
  checksum: string;
  exitType: ExitType;
  lastSceneName?: string;
}

export type RecoverySnapshot = FullRecoverySnapshot;

export const RECOVERY_STORAGE_KEY = 'vp_session_recovery_full_v1';
export const MAX_RECOVERY_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours max validity

/**
 * Computes a deterministic canonical checksum over the stable visual/narrative fields of DisplayState.
 * Excludes volatile ephemeral timers or transient flags so comparison across devices is consistent.
 */
export function computeStateChecksum(state?: DisplayState | null): string {
  if (!state) return 'chk_empty';

  const stableData = {
    sceneName: state.sceneName || '',
    backgroundUrl: state.backgroundUrl || '',
    characters: (state.characters || []).map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl,
      position: c.position,
      isSpeaking: c.isSpeaking,
      activeExpression: c.activeExpression,
    })),
    weather: state.weather,
    weatherIntensity: Math.round((state.weatherIntensity || 0) * 100) / 100,
    lighting: state.lighting,
    locationBanner: state.locationBanner
      ? {
          text: state.locationBanner.text,
          subtitle: state.locationBanner.subtitle || '',
          visible: state.locationBanner.visible,
        }
      : null,
    isBlackout: state.isBlackout,
    ambientAudioUrl: state.ambientAudioUrl || '',
    combatActive: state.combatState?.isActive || false,
    combatRound: state.combatState?.round || 0,
    combatTurnIndex: state.combatState?.currentTurnIndex || 0,
    combatantsCount: state.combatState?.combatants?.length || 0,
  };

  const serialized = JSON.stringify(stableData);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'chk_' + Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Reconciliation evaluation result when Master and Display compare handshake metadata.
 */
export interface ReconciliationPlan {
  action: 'SYNCHRONIZED' | 'MASTER_AUTHORITATIVE' | 'DISPLAY_AHEAD_CHECKPOINT';
  targetRevision: number;
  reason: string;
}

/**
 * Service to manage full transactional crash resilience, Android process death recovery, and state reconciliation.
 */
class SessionRecoveryService {
  /**
   * Saves a complete transactional snapshot of both live and staged states.
   */
  public saveIncrementalSnapshot(
    data: Omit<FullRecoverySnapshot, 'version' | 'savedAt' | 'exitType' | 'checksum'>
  ): void {
    if (typeof window === 'undefined') return;

    const checksum = computeStateChecksum(data.liveState);
    const snapshot: FullRecoverySnapshot = {
      ...data,
      version: 1,
      savedAt: Date.now(),
      checksum,
      exitType: 'unexpected_termination',
    };

    try {
      window.localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('[SessionRecovery] Failed to save full snapshot:', err);
    }
  }

  /**
   * Marks that the user voluntarily exited to the lobby (so no crash banner is shown).
   */
  public markCleanExit(): void {
    if (typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (raw) {
        const snapshot = JSON.parse(raw) as FullRecoverySnapshot;
        snapshot.exitType = 'clean_exit';
        snapshot.savedAt = Date.now();
        window.localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
      }
    } catch {
      window.localStorage.removeItem(RECOVERY_STORAGE_KEY);
    }
  }

  /**
   * Checks if an unexpected termination (crash/process death) happened recently and returns the snapshot.
   */
  public getPendingRecovery(): FullRecoverySnapshot | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (!raw) return null;

      const snapshot = JSON.parse(raw) as FullRecoverySnapshot;
      const now = Date.now();

      // Ignore if older than 8 hours or if user voluntarily exited
      if (now - snapshot.savedAt > MAX_RECOVERY_AGE_MS || snapshot.exitType === 'clean_exit') {
        return null;
      }

      return snapshot;
    } catch {
      return null;
    }
  }

  /**
   * Clears the current recovery snapshot.
   */
  public clearRecovery(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(RECOVERY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  /**
   * Sanitizes a display state for safe resumption (pauses audio and cancels active triggers to prevent volume shocks).
   */
  public prepareSafeResumptionState(state: DisplayState): DisplayState {
    return {
      ...state,
      ambientPlaying: false, // Keep paused until Master or Display explicitly activates
      shakeTrigger: 0,
      lightningTrigger: 0,
      lastSfx: null,
    };
  }

  /**
   * Evaluates the reconciliation plan between a Master handshake and a Display handshake.
   */
  public evaluateReconciliation(
    masterHello: HandshakeHelloPayload,
    displayHello: HandshakeHelloPayload
  ): ReconciliationPlan {
    // 1. Identical checksum and revision -> already in sync
    if (
      masterHello.sessionRevision === displayHello.sessionRevision &&
      masterHello.stateChecksum === displayHello.stateChecksum
    ) {
      return {
        action: 'SYNCHRONIZED',
        targetRevision: masterHello.sessionRevision,
        reason: 'Both devices match exact revision and state checksum.',
      };
    }

    // 2. Master has greater or equal revision -> Master is authoritative
    if (masterHello.sessionRevision >= displayHello.sessionRevision) {
      return {
        action: 'MASTER_AUTHORITATIVE',
        targetRevision: masterHello.sessionRevision,
        reason: `Master revision (${masterHello.sessionRevision}) is authoritative over Display (${displayHello.sessionRevision}).`,
      };
    }

    // 3. Display has higher revision (e.g. Master died while Display advanced timers/events)
    return {
      action: 'DISPLAY_AHEAD_CHECKPOINT',
      targetRevision: displayHello.sessionRevision,
      reason: `Display has newer revision (${displayHello.sessionRevision}) than Master (${masterHello.sessionRevision}). Checkpoint required before adopt.`,
    };
  }
}

export const sessionRecoveryService = new SessionRecoveryService();
