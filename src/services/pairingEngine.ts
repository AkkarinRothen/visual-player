import type { PairingPhase, PinChallenge } from '../types';
import { connectionDiagnostics } from './connectionDiagnostics';

export const PHASE_TIMEOUT_MS = 10_000; // 10 seconds per phase
export const GLOBAL_PAIRING_TIMEOUT_MS = 45_000; // 45 seconds total timeout
export const PIN_CHALLENGE_TTL_MS = 60_000; // 60 seconds to approve PIN challenge

export interface PairingPhaseInfo {
  phase: PairingPhase;
  progressPercent: number;
  message: string;
}

export const PAIRING_PHASES_META: Record<PairingPhase, { progress: number; label: string }> = {
  IDLE_WAITING: { progress: 0, label: 'Esperando conexión del Master...' },
  TRANSPORT_CONNECTED: { progress: 15, label: 'Transporte WebRTC conectado' },
  PIN_CHALLENGE_PENDING: { progress: 25, label: 'Esperando confirmación de PIN en la Mesa...' },
  AUTHENTICATED: { progress: 40, label: 'Credenciales criptográficas autenticadas' },
  LEASE_GRANTED: { progress: 60, label: 'Autoridad de Master otorgada' },
  INITIAL_STATE_NEGOTIATED: { progress: 75, label: 'Revisión y checksum sincronizados' },
  SNAPSHOT_APPLIED: { progress: 90, label: 'Estado de partida aplicado' },
  CONTROL_READY: { progress: 100, label: '¡Emparejamiento completo y control listo!' },
  FAILED: { progress: 0, label: 'Emparejamiento interrumpido' },
};

export class PairingEngineService {
  private currentPhase: PairingPhase = 'IDLE_WAITING';
  private activeChallenge: PinChallenge | null = null;
  private listeners: Set<(info: PairingPhaseInfo) => void> = new Set();
  private phaseTimer: number | null = null;
  private globalTimer: number | null = null;
  private failureReason?: string;

  public getPhase(): PairingPhase {
    return this.currentPhase;
  }

  public isControlReady(): boolean {
    return this.currentPhase === 'CONTROL_READY';
  }

  public getActiveChallenge(): PinChallenge | null {
    if (this.activeChallenge && Date.now() > this.activeChallenge.expiresAt) {
      this.activeChallenge = null;
    }
    return this.activeChallenge;
  }

  public onPhaseChange(listener: (info: PairingPhaseInfo) => void): () => void {
    this.listeners.add(listener);
    listener(this.getPhaseInfo());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const info = this.getPhaseInfo();
    this.listeners.forEach((fn) => fn(info));
  }

  public getPhaseInfo(): PairingPhaseInfo {
    const meta = PAIRING_PHASES_META[this.currentPhase] || { progress: 0, label: this.currentPhase };
    return {
      phase: this.currentPhase,
      progressPercent: meta.progress,
      message: this.failureReason || meta.label,
    };
  }

  /**
   * Generates a 6-digit challenge code for manual PIN authorization.
   */
  public generatePinChallenge(requestedDeviceId: string): PinChallenge {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    this.activeChallenge = {
      challengeCode: `${code.slice(0, 3)} ${code.slice(3, 6)}`,
      expiresAt: Date.now() + PIN_CHALLENGE_TTL_MS,
      attemptsRemaining: 3,
      requestedDeviceId,
    };

    connectionDiagnostics.logEvent('lease', 'PIN_CHALLENGE_GENERATED', {
      deviceId: requestedDeviceId,
      expiresInSec: 60,
    });

    this.advancePhase('PIN_CHALLENGE_PENDING', 'Aprobación de PIN requerida en la Mesa');
    return this.activeChallenge;
  }

  /**
   * Verifies the 6-digit challenge code entered by the DM.
   */
  public verifyPinChallenge(inputCode: string): { success: boolean; error?: string } {
    if (!this.activeChallenge) {
      return { success: false, error: 'No hay desafío de PIN activo o ha expirado.' };
    }

    if (Date.now() > this.activeChallenge.expiresAt) {
      this.activeChallenge = null;
      this.resetToIdle('El desafío de PIN expiró.');
      return { success: false, error: 'El desafío de PIN expiró.' };
    }

    const cleanInput = inputCode.replace(/\s+/g, '');
    const cleanExpected = this.activeChallenge.challengeCode.replace(/\s+/g, '');

    if (cleanInput === cleanExpected) {
      this.activeChallenge = null;
      this.advancePhase('AUTHENTICATED', 'PIN manual aprobado');
      return { success: true };
    }

    this.activeChallenge.attemptsRemaining--;
    if (this.activeChallenge.attemptsRemaining <= 0) {
      this.activeChallenge = null;
      this.resetToIdle('Límite de 3 intentos de PIN superado.');
      return { success: false, error: 'Límite de intentos superado. Solicita una nueva conexión.' };
    }

    return {
      success: false,
      error: `Código incorrecto. Intentos restantes: ${this.activeChallenge.attemptsRemaining}`,
    };
  }

  /**
   * Idempotently advances the pairing phase and refreshes the phase watchdog timer.
   */
  public advancePhase(nextPhase: PairingPhase, reason?: string): void {
    if (this.currentPhase === 'CONTROL_READY' && nextPhase !== 'IDLE_WAITING') {
      return; // Already completed
    }

    this.currentPhase = nextPhase;
    this.failureReason = undefined;
    connectionDiagnostics.logEvent('handshake', `PAIRING_${nextPhase}`, { reason });

    this.clearPhaseTimer();

    if (nextPhase === 'CONTROL_READY') {
      this.clearGlobalTimer();
    } else if (nextPhase !== 'IDLE_WAITING' && nextPhase !== 'FAILED') {
      this.startPhaseTimer();
      if (!this.globalTimer) {
        this.startGlobalTimer();
      }
    }

    this.notify();
  }

  public resetToIdle(reason?: string): void {
    this.clearPhaseTimer();
    this.clearGlobalTimer();
    this.currentPhase = 'IDLE_WAITING';
    this.activeChallenge = null;
    this.failureReason = reason;
    connectionDiagnostics.logEvent('handshake', 'PAIRING_RESET', { reason });
    this.notify();
  }

  private startPhaseTimer(): void {
    this.phaseTimer = window.setTimeout(() => {
      console.warn(`[PairingEngine] Phase ${this.currentPhase} timed out after ${PHASE_TIMEOUT_MS}ms.`);
      this.resetToIdle(`Tiempo de espera agotado en fase: ${this.currentPhase}`);
    }, PHASE_TIMEOUT_MS);
  }

  private clearPhaseTimer(): void {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  private startGlobalTimer(): void {
    this.globalTimer = window.setTimeout(() => {
      console.warn(`[PairingEngine] Global pairing timed out after ${GLOBAL_PAIRING_TIMEOUT_MS}ms.`);
      this.resetToIdle('Tiempo total de emparejamiento agotado (45s).');
    }, GLOBAL_PAIRING_TIMEOUT_MS);
  }

  private clearGlobalTimer(): void {
    if (this.globalTimer) {
      clearTimeout(this.globalTimer);
      this.globalTimer = null;
    }
  }
}

export const pairingEngine = new PairingEngineService();
