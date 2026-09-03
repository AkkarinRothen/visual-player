import type { CombatState } from '../../types';

export function getCombatTurnId(combatState: CombatState): string {
  const activeCombatant = combatState.combatants[combatState.currentTurnIndex];
  return `r${combatState.round}-t${combatState.currentTurnIndex}-${activeCombatant?.id || 'none'}`;
}

/**
 * Calculates current remaining seconds with sub-second epoch precision.
 * Works symmetrically on DM Master and Table Display without 1-message-per-second network noise.
 */
export function calculateRemainingTimerSeconds(
  combatState: CombatState,
  now: number = Date.now()
): number {
  if (combatState.isTimerRunning && combatState.turnTimerEndsAt) {
    const diff = combatState.turnTimerEndsAt - now;
    return Math.max(0, Math.ceil(diff / 1000));
  }
  return (
    combatState.turnTimerRemainingSeconds ??
    combatState.turnTimerSeconds ??
    combatState.turnTimerTotalSeconds ??
    60
  );
}

/**
 * Starts or resumes the combat turn timer.
 */
export function startCombatTurnTimer(
  combatState: CombatState,
  durationSeconds?: number,
  now: number = Date.now()
): CombatState {
  const currentRemaining = calculateRemainingTimerSeconds(combatState, now);
  const total = combatState.turnTimerTotalSeconds || 60;
  const seconds =
    durationSeconds !== undefined
      ? durationSeconds
      : currentRemaining > 0
      ? currentRemaining
      : total;

  const endsAt = now + seconds * 1000;
  const turnId = combatState.turnId || getCombatTurnId(combatState);

  return {
    ...combatState,
    turnId,
    isTimerRunning: true,
    turnTimerEndsAt: endsAt,
    turnTimerRemainingSeconds: seconds,
    turnTimerSeconds: seconds,
    turnTimerTotalSeconds: total,
  };
}

/**
 * Pauses the combat turn timer, capturing exact remaining seconds.
 */
export function pauseCombatTurnTimer(
  combatState: CombatState,
  now: number = Date.now()
): CombatState {
  const remaining = calculateRemainingTimerSeconds(combatState, now);

  return {
    ...combatState,
    isTimerRunning: false,
    turnTimerEndsAt: null,
    turnTimerRemainingSeconds: remaining,
    turnTimerSeconds: remaining,
  };
}

/**
 * Adds extra seconds (+30s) to the active or paused timer without resetting the turn.
 */
export function addSecondsToCombatTurnTimer(
  combatState: CombatState,
  additionalSeconds: number = 30,
  now: number = Date.now()
): CombatState {
  const currentRemaining = calculateRemainingTimerSeconds(combatState, now);
  const nextRemaining = currentRemaining + additionalSeconds;

  if (combatState.isTimerRunning) {
    const baseEpoch =
      combatState.turnTimerEndsAt && combatState.turnTimerEndsAt > now
        ? combatState.turnTimerEndsAt
        : now;
    const endsAt = baseEpoch + additionalSeconds * 1000;

    return {
      ...combatState,
      turnTimerEndsAt: endsAt,
      turnTimerRemainingSeconds: nextRemaining,
      turnTimerSeconds: nextRemaining,
    };
  }

  return {
    ...combatState,
    turnTimerRemainingSeconds: nextRemaining,
    turnTimerSeconds: nextRemaining,
  };
}

/**
 * Resets the timer to the baseline duration for the current turn.
 */
export function resetCombatTurnTimer(combatState: CombatState): CombatState {
  const total = combatState.turnTimerTotalSeconds || 60;

  return {
    ...combatState,
    isTimerRunning: false,
    turnTimerEndsAt: null,
    turnTimerRemainingSeconds: total,
    turnTimerSeconds: total,
  };
}

/**
 * Advances turn or round, generating a new turnId and applying the DM auto-start policy.
 */
export function advanceCombatTurnWithTimer(
  combatState: CombatState,
  nextTurnIndex: number,
  nextRound: number,
  now: number = Date.now()
): CombatState {
  const total = combatState.turnTimerTotalSeconds || 60;
  const activeCombatant = combatState.combatants[nextTurnIndex];
  const newTurnId = `r${nextRound}-t${nextTurnIndex}-${activeCombatant?.id || 'none'}`;

  if (combatState.autoStartNextTurnTimer) {
    const endsAt = now + total * 1000;
    return {
      ...combatState,
      round: nextRound,
      currentTurnIndex: nextTurnIndex,
      turnId: newTurnId,
      isTimerRunning: true,
      turnTimerEndsAt: endsAt,
      turnTimerRemainingSeconds: total,
      turnTimerSeconds: total,
    };
  }

  return {
    ...combatState,
    round: nextRound,
    currentTurnIndex: nextTurnIndex,
    turnId: newTurnId,
    isTimerRunning: false,
    turnTimerEndsAt: null,
    turnTimerRemainingSeconds: total,
    turnTimerSeconds: total,
  };
}
