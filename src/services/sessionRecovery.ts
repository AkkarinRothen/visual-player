import { db } from '../db';
import type { DisplayState, HandshakeHelloPayload } from '../types';

export type ExitType = 'unexpected_termination' | 'clean_exit';

export interface FullRecoverySnapshot {
  id: string; // 'active_session'
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

export const RECOVERY_STORAGE_KEY_LEGACY = 'vp_session_recovery_full_v1';
export const MAX_RECOVERY_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours max validity

/**
 * Deterministically sorts object keys recursively for canonical JSON serialization.
 */
function canonicalizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizeObject(obj[key]);
  }
  return result;
}

/**
 * Computes a deterministic canonical SHA-256 checksum over all persistent visual and combat fields of DisplayState.
 * Uses Web Crypto (crypto.subtle.digest) with fallback.
 */
export async function computeStateChecksum(state?: DisplayState | null): Promise<string> {
  if (!state) return 'sha256:empty';

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
      statusBadge: c.statusBadge || '',
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
    ambientVolume: Math.round((state.ambientVolume || 0) * 100) / 100,
    combatState: state.combatState
      ? {
          isActive: state.combatState.isActive,
          round: state.combatState.round,
          currentTurnIndex: state.combatState.currentTurnIndex,
          showTurnTimerToPlayers: state.combatState.showTurnTimerToPlayers ?? true,
          turnTimerSeconds: state.combatState.turnTimerSeconds || 0,
          combatants: (state.combatState.combatants || []).map((cb) => ({
            id: cb.id,
            name: cb.name,
            avatarUrl: cb.avatarUrl || '',
            initiative: cb.initiative,
            currentHp: cb.currentHp,
            maxHp: cb.maxHp,
            showHpToPlayers: cb.showHpToPlayers,
            isMonster: cb.isMonster,
            conditions: [...(cb.conditions || [])].sort(),
          })),
        }
      : null,
  };

  const canonicalJson = JSON.stringify(canonicalizeObject(stableData));

  // 1. Web Crypto API (Standard in modern browsers & Node 19+)
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const data = new TextEncoder().encode(canonicalJson);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      return `sha256:${hex}`;
    } catch {
      // Fallback
    }
  }

  // Fallback 32-bit hash if subtle crypto is unavailable
  let hash = 0;
  for (let i = 0; i < canonicalJson.length; i++) {
    const char = canonicalJson.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sha256:fallback_${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

/**
 * Synchronous version for tests / immediate checks.
 */
export function computeStateChecksumSync(state?: DisplayState | null): string {
  if (!state) return 'sha256:empty';
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
      statusBadge: c.statusBadge || '',
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
    ambientVolume: Math.round((state.ambientVolume || 0) * 100) / 100,
    combatState: state.combatState
      ? {
          isActive: state.combatState.isActive,
          round: state.combatState.round,
          currentTurnIndex: state.combatState.currentTurnIndex,
          showTurnTimerToPlayers: state.combatState.showTurnTimerToPlayers ?? true,
          turnTimerSeconds: state.combatState.turnTimerSeconds || 0,
          combatants: (state.combatState.combatants || []).map((cb) => ({
            id: cb.id,
            name: cb.name,
            avatarUrl: cb.avatarUrl || '',
            initiative: cb.initiative,
            currentHp: cb.currentHp,
            maxHp: cb.maxHp,
            showHpToPlayers: cb.showHpToPlayers,
            isMonster: cb.isMonster,
            conditions: [...(cb.conditions || [])].sort(),
          })),
        }
      : null,
  };

  const canonicalJson = JSON.stringify(canonicalizeObject(stableData));
  let hash = 0;
  for (let i = 0; i < canonicalJson.length; i++) {
    const char = canonicalJson.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sha256:sync_${Math.abs(hash).toString(16).padStart(8, '0')}`;
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
 * Service to manage full transactional crash resilience, Dexie atomic snapshots, and state reconciliation.
 */
class SessionRecoveryService {
  private memoryFallbackSnapshot: FullRecoverySnapshot | null = null;

  /**
   * Saves a complete transactional snapshot of both live and staged states in Dexie with resilient fallback.
   */
  public async saveIncrementalSnapshot(
    data: Omit<FullRecoverySnapshot, 'id' | 'version' | 'savedAt' | 'exitType' | 'checksum'>
  ): Promise<void> {
    const checksum = await computeStateChecksum(data.liveState);
    const snapshot: FullRecoverySnapshot = {
      ...data,
      id: 'active_session',
      version: 1,
      savedAt: Date.now(),
      checksum,
      exitType: 'unexpected_termination',
    };

    this.memoryFallbackSnapshot = snapshot;

    try {
      await db.transaction('rw', db.recoverySnapshots, async () => {
        await db.recoverySnapshots.put(snapshot);
      });
    } catch (err) {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(RECOVERY_STORAGE_KEY_LEGACY, JSON.stringify(snapshot));
        } catch {
          // Keep in memory
        }
      }
    }
  }

  /**
   * Marks that the user voluntarily exited to the lobby (so no crash banner is shown).
   */
  public async markCleanExit(): Promise<void> {
    if (this.memoryFallbackSnapshot) {
      this.memoryFallbackSnapshot.exitType = 'clean_exit';
      this.memoryFallbackSnapshot.savedAt = Date.now();
    }

    try {
      await db.transaction('rw', db.recoverySnapshots, async () => {
        const snapshot = await db.recoverySnapshots.get('active_session');
        if (snapshot) {
          snapshot.exitType = 'clean_exit';
          snapshot.savedAt = Date.now();
          await db.recoverySnapshots.put(snapshot);
        }
      });
    } catch {
      // Fallback
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(RECOVERY_STORAGE_KEY_LEGACY);
        if (raw) {
          const snapshot = JSON.parse(raw) as FullRecoverySnapshot;
          snapshot.exitType = 'clean_exit';
          window.localStorage.setItem(RECOVERY_STORAGE_KEY_LEGACY, JSON.stringify(snapshot));
        }
      } catch {
        window.localStorage.removeItem(RECOVERY_STORAGE_KEY_LEGACY);
      }
    }
  }

  /**
   * Checks if an unexpected termination (crash/process death) happened recently and returns the snapshot.
   */
  public async getPendingRecovery(): Promise<FullRecoverySnapshot | null> {
    const now = Date.now();

    try {
      // 1. Check Dexie
      const snapshot = await db.recoverySnapshots.get('active_session');
      if (snapshot && now - snapshot.savedAt <= MAX_RECOVERY_AGE_MS && snapshot.exitType !== 'clean_exit') {
        return snapshot;
      }
    } catch {
      // Fallback to storage or memory
    }

    // 2. Check localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(RECOVERY_STORAGE_KEY_LEGACY);
        if (raw) {
          const legacy = JSON.parse(raw) as FullRecoverySnapshot;
          if (now - legacy.savedAt <= MAX_RECOVERY_AGE_MS && legacy.exitType !== 'clean_exit') {
            return legacy;
          }
        }
      } catch {
        // Fallback
      }
    }

    // 3. Check memory fallback
    if (
      this.memoryFallbackSnapshot &&
      now - this.memoryFallbackSnapshot.savedAt <= MAX_RECOVERY_AGE_MS &&
      this.memoryFallbackSnapshot.exitType !== 'clean_exit'
    ) {
      return this.memoryFallbackSnapshot;
    }

    return null;
  }

  /**
   * Clears the current recovery snapshot.
   */
  public async clearRecovery(): Promise<void> {
    this.memoryFallbackSnapshot = null;
    try {
      await db.recoverySnapshots.delete('active_session');
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(RECOVERY_STORAGE_KEY_LEGACY);
      } catch {
        // Ignore
      }
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
