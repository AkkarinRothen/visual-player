import type { DisplayState } from '../types';

export type ExitType = 'unexpected_termination' | 'clean_exit';

export interface RecoverySnapshot {
  version: 1;
  savedAt: number;
  role: 'master' | 'display';
  roomId: string;
  campaignId?: string;
  activeSceneId?: string;
  sessionRevision: number;
  combatActive: boolean;
  hasStagedChanges: boolean;
  exitType: ExitType;
  lastSceneName?: string;
}

export const RECOVERY_STORAGE_KEY = 'vp_session_recovery_snapshot';
export const MAX_RECOVERY_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours max validity

/**
 * Service to manage crash resilience, Android process death recovery, and state reconciliation.
 */
class SessionRecoveryService {
  /**
   * Saves an incremental non-sensitive snapshot whenever the user makes progress in a session.
   */
  public saveIncrementalSnapshot(
    data: Omit<RecoverySnapshot, 'version' | 'savedAt' | 'exitType'>
  ): void {
    if (typeof window === 'undefined') return;

    const snapshot: RecoverySnapshot = {
      ...data,
      version: 1,
      savedAt: Date.now(),
      exitType: 'unexpected_termination',
    };

    try {
      window.localStorage.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('[SessionRecovery] Failed to save incremental snapshot:', err);
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
        const snapshot = JSON.parse(raw) as RecoverySnapshot;
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
  public getPendingRecovery(): RecoverySnapshot | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem(RECOVERY_STORAGE_KEY);
      if (!raw) return null;

      const snapshot = JSON.parse(raw) as RecoverySnapshot;
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
}

export const sessionRecoveryService = new SessionRecoveryService();
