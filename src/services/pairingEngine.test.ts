import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PairingEngineService, PIN_CHALLENGE_TTL_MS } from './pairingEngine';

describe('Transactional Pairing Engine & 6-Digit PIN Challenge Suite', () => {
  let engine: PairingEngineService;

  beforeEach(() => {
    engine = new PairingEngineService();
  });

  it('1. Executes full 6-phase transactional pairing to CONTROL_READY', () => {
    expect(engine.getPhase()).toBe('IDLE_WAITING');
    expect(engine.isControlReady()).toBe(false);

    // Phase 1: WebRTC DataChannel connects
    engine.advancePhase('TRANSPORT_CONNECTED');
    expect(engine.getPhase()).toBe('TRANSPORT_CONNECTED');

    // Phase 2: QR with 128-bit secret authenticates
    engine.advancePhase('AUTHENTICATED');
    expect(engine.getPhase()).toBe('AUTHENTICATED');

    // Phase 3: MasterLease granted
    engine.advancePhase('LEASE_GRANTED');
    expect(engine.getPhase()).toBe('LEASE_GRANTED');

    // Phase 4: Initial state negotiated
    engine.advancePhase('INITIAL_STATE_NEGOTIATED');
    expect(engine.getPhase()).toBe('INITIAL_STATE_NEGOTIATED');

    // Phase 5: Snapshot applied
    engine.advancePhase('SNAPSHOT_APPLIED');
    expect(engine.getPhase()).toBe('SNAPSHOT_APPLIED');

    // Phase 6: Mutual confirmation -> CONTROL_READY
    engine.advancePhase('CONTROL_READY');
    expect(engine.getPhase()).toBe('CONTROL_READY');
    expect(engine.isControlReady()).toBe(true);
  });

  it('2. Issues 6-digit PIN challenge and verifies valid response', () => {
    const challenge = engine.generatePinChallenge('dev-phone-123');

    expect(challenge.challengeCode.length).toBe(7); // e.g. "123 456" with space
    expect(challenge.attemptsRemaining).toBe(3);
    expect(engine.getPhase()).toBe('PIN_CHALLENGE_PENDING');

    // Verify valid challenge code
    const res = engine.verifyPinChallenge(challenge.challengeCode);
    expect(res.success).toBe(true);
    expect(engine.getPhase()).toBe('AUTHENTICATED');
  });

  it('3. Rejects invalid PIN challenges and resets after 3 failed attempts', () => {
    engine.generatePinChallenge('dev-phone-123');

    // Attempt 1: Wrong code
    const res1 = engine.verifyPinChallenge('000 000');
    expect(res1.success).toBe(false);
    expect(res1.error).toContain('Intentos restantes: 2');
    expect(engine.getPhase()).toBe('PIN_CHALLENGE_PENDING');

    // Attempt 2: Wrong code
    const res2 = engine.verifyPinChallenge('111 111');
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('Intentos restantes: 1');

    // Attempt 3: Wrong code -> Exhausted
    const res3 = engine.verifyPinChallenge('222 222');
    expect(res3.success).toBe(false);
    expect(res3.error).toContain('Límite de intentos superado');
    expect(engine.getPhase()).toBe('IDLE_WAITING');
  });

  it('4. Expires PIN challenge after TTL and cleans up state', () => {
    engine.generatePinChallenge('dev-phone-123');

    // Advance time past 60s
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + PIN_CHALLENGE_TTL_MS + 1000);

    const res = engine.verifyPinChallenge('999 999');
    expect(res.success).toBe(false);
    expect(res.error).toContain('expiró');
    expect(engine.getActiveChallenge()).toBeNull();

    vi.restoreAllMocks();
  });

  it('5. Idempotent: advancing past CONTROL_READY remains locked in CONTROL_READY', () => {
    engine.advancePhase('CONTROL_READY');
    expect(engine.isControlReady()).toBe(true);

    engine.advancePhase('TRANSPORT_CONNECTED');
    expect(engine.getPhase()).toBe('CONTROL_READY'); // Stays in CONTROL_READY
  });
});
