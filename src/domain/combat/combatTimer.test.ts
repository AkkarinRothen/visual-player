import { describe, it, expect } from 'vitest';
import type { CombatState } from '../../types';
import {
  getCombatTurnId,
  calculateRemainingTimerSeconds,
  startCombatTurnTimer,
  pauseCombatTurnTimer,
  addSecondsToCombatTurnTimer,
  resetCombatTurnTimer,
  advanceCombatTurnWithTimer,
} from './combatTimerCoordinator';

describe('Cinematic Combat Turn Timer Suite (Zero Network Flooding)', () => {
  const baseCombatState: CombatState = {
    isActive: true,
    round: 1,
    currentTurnIndex: 0,
    turnTimerTotalSeconds: 60,
    turnTimerSeconds: 60,
    turnTimerRemainingSeconds: 60,
    isTimerRunning: false,
    showTurnTimerToPlayers: true,
    combatants: [
      {
        id: 'c-fighter',
        name: 'Guerrero Valiente',
        avatarUrl: 'https://example.com/fighter.png',
        initiative: 18,
        currentHp: 30,
        maxHp: 30,
        showHpToPlayers: true,
        conditions: [],
        isMonster: false,
        isDeployed: true,
      },
      {
        id: 'c-goblin',
        name: 'Goblin Chamán',
        avatarUrl: 'https://example.com/goblin.png',
        initiative: 12,
        currentHp: 15,
        maxHp: 15,
        showHpToPlayers: false,
        conditions: [],
        isMonster: true,
        isDeployed: true,
      },
    ],
  };

  it('1. Generates stable turnId for combat tracking', () => {
    const turnId = getCombatTurnId(baseCombatState);
    expect(turnId).toBe('r1-t0-c-fighter');
  });

  it('2. Starts and pauses timer with exact sub-second epoch precision', () => {
    const now = 1000000;
    // Start timer with 60 seconds
    const running = startCombatTurnTimer(baseCombatState, 60, now);
    expect(running.isTimerRunning).toBe(true);
    expect(running.turnTimerEndsAt).toBe(now + 60000);
    expect(running.turnId).toBe('r1-t0-c-fighter');

    // 25.5 seconds elapse
    const midNow = now + 25500;
    const remaining = calculateRemainingTimerSeconds(running, midNow);
    expect(remaining).toBe(35); // Math.ceil(34.5) = 35

    // Pause timer at midNow
    const paused = pauseCombatTurnTimer(running, midNow);
    expect(paused.isTimerRunning).toBe(false);
    expect(paused.turnTimerEndsAt).toBeNull();
    expect(paused.turnTimerRemainingSeconds).toBe(35);

    // 10 seconds later while paused, remaining time stays unchanged
    const laterNow = midNow + 10000;
    expect(calculateRemainingTimerSeconds(paused, laterNow)).toBe(35);
  });

  it('3. Adds seconds (+30s) gracefully to both running and paused timers', () => {
    const now = 2000000;
    const running = startCombatTurnTimer(baseCombatState, 40, now);

    // Add +30s while running
    const extendedRunning = addSecondsToCombatTurnTimer(running, 30, now);
    expect(extendedRunning.turnTimerEndsAt).toBe(now + 70000);
    expect(calculateRemainingTimerSeconds(extendedRunning, now)).toBe(70);

    // Pause and add +30s
    const paused = pauseCombatTurnTimer(extendedRunning, now + 10000); // 60s remaining
    expect(paused.turnTimerRemainingSeconds).toBe(60);

    const extendedPaused = addSecondsToCombatTurnTimer(paused, 30, now + 10000);
    expect(extendedPaused.turnTimerRemainingSeconds).toBe(90);
    expect(calculateRemainingTimerSeconds(extendedPaused, now + 50000)).toBe(90);
  });

  it('4. Resets timer back to configured baseline duration', () => {
    const now = 3000000;
    const running = startCombatTurnTimer(baseCombatState, 15, now);
    const reset = resetCombatTurnTimer(running);

    expect(reset.isTimerRunning).toBe(false);
    expect(reset.turnTimerEndsAt).toBeNull();
    expect(reset.turnTimerRemainingSeconds).toBe(60);
    expect(calculateRemainingTimerSeconds(reset)).toBe(60);
  });

  it('5. Advances turn with new turnId and respects auto-start policy', () => {
    const now = 4000000;
    // Default policy: autoStartNextTurnTimer is falsy -> remains paused for new turn
    const nextTurnDefault = advanceCombatTurnWithTimer(baseCombatState, 1, 1, now);
    expect(nextTurnDefault.currentTurnIndex).toBe(1);
    expect(nextTurnDefault.turnId).toBe('r1-t1-c-goblin');
    expect(nextTurnDefault.isTimerRunning).toBe(false);
    expect(nextTurnDefault.turnTimerRemainingSeconds).toBe(60);

    // Opt-in policy: autoStartNextTurnTimer is true -> immediately starts timer
    const stateWithAutoStart: CombatState = {
      ...baseCombatState,
      autoStartNextTurnTimer: true,
    };

    const nextTurnAuto = advanceCombatTurnWithTimer(stateWithAutoStart, 1, 1, now);
    expect(nextTurnAuto.turnId).toBe('r1-t1-c-goblin');
    expect(nextTurnAuto.isTimerRunning).toBe(true);
    expect(nextTurnAuto.turnTimerEndsAt).toBe(now + 60000);
  });

  it('6. Reconnection scenario: computes accurate remaining time without restarting or drifting', () => {
    const startEpoch = 5000000;
    // Master started a 90s timer at startEpoch
    const masterState: CombatState = {
      ...baseCombatState,
      turnTimerTotalSeconds: 90,
      turnTimerSeconds: 90,
      turnTimerEndsAt: startEpoch + 90000,
      isTimerRunning: true,
      turnId: 'r1-t0-c-fighter',
    };

    // Table display connects 42.1 seconds later
    const tableConnectEpoch = startEpoch + 42100;
    const tableRemaining = calculateRemainingTimerSeconds(masterState, tableConnectEpoch);
    expect(tableRemaining).toBe(48); // Math.ceil((90000 - 42100)/1000) = 48s

    // Clamps to 0 when time expires (never negative)
    const expiredEpoch = startEpoch + 95000;
    expect(calculateRemainingTimerSeconds(masterState, expiredEpoch)).toBe(0);
  });
});
