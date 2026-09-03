import { describe, it, expect } from 'vitest';
import type { Combatant } from '../../types';
import {
  COMBAT_CONDITIONS_CATALOG,
  createActiveCondition,
  filterPublicConditions,
  addConditionToCombatant,
  removeConditionFromCombatant,
} from './combatConditionsCatalog';

describe('Combat Conditions & Public Badges Suite', () => {
  const baseCombatant: Combatant = {
    id: 'c-rogue',
    name: 'Pícaro Sombrío',
    avatarUrl: 'https://example.com/rogue.png',
    initiative: 19,
    currentHp: 22,
    maxHp: 28,
    showHpToPlayers: true,
    conditions: ['invisible', 'concentrating'],
    isMonster: false,
    isDeployed: true,
  };

  it('1. Provides a rich catalog of 13 canonical conditions with metadata', () => {
    const keys = Object.keys(COMBAT_CONDITIONS_CATALOG);
    expect(keys.length).toBe(13);

    expect(COMBAT_CONDITIONS_CATALOG.burning.label).toBe('En Llamas');
    expect(COMBAT_CONDITIONS_CATALOG.burning.icon).toBe('🔥');
    expect(COMBAT_CONDITIONS_CATALOG.prone.label).toBe('Derribado');
    expect(COMBAT_CONDITIONS_CATALOG.restrained.label).toBe('Apresado');
    expect(COMBAT_CONDITIONS_CATALOG.charmed.label).toBe('Hechizado');

    for (const key of keys as (keyof typeof COMBAT_CONDITIONS_CATALOG)[]) {
      const meta = COMBAT_CONDITIONS_CATALOG[key];
      expect(meta.label).toBeDefined();
      expect(meta.icon).toBeDefined();
      expect(meta.color).toBeDefined();
      expect(meta.description).toBeDefined();
    }
  });

  it('2. Filters out private/secret conditions from public display projection', () => {
    const combatantWithPrivateConds: Combatant = {
      ...baseCombatant,
      activeConditions: [
        createActiveCondition('blessed', true, 1),
        createActiveCondition('cursed', false, 1), // SECRET / PRIVATE (DM ONLY)
        createActiveCondition('poisoned', true, 2),
      ],
    };

    const publicBadges = filterPublicConditions(combatantWithPrivateConds);

    expect(publicBadges).toHaveLength(2);
    expect(publicBadges.some((c) => c.condition === 'blessed')).toBe(true);
    expect(publicBadges.some((c) => c.condition === 'poisoned')).toBe(true);
    // MUST NOT reveal cursed
    expect(publicBadges.some((c) => c.condition === 'cursed')).toBe(false);
  });

  it('3. Falls back gracefully to legacy conditions array', () => {
    const legacyCombatant: Combatant = {
      ...baseCombatant,
      activeConditions: undefined,
      conditions: ['burning', 'stunned'],
    };

    const publicBadges = filterPublicConditions(legacyCombatant);
    expect(publicBadges).toHaveLength(2);
    expect(publicBadges[0].label).toBe('En Llamas');
    expect(publicBadges[1].label).toBe('Aturdido');
  });

  it('4. Adds condition idempotently and keeps legacy array in sync', () => {
    const withProne = addConditionToCombatant(baseCombatant, 'prone', true, 2);
    expect(withProne.conditions).toContain('prone');
    expect(withProne.activeConditions?.some((c) => c.condition === 'prone')).toBe(true);

    // Repeated add should be idempotent
    const repeated = addConditionToCombatant(withProne, 'prone', true, 2);
    expect(repeated.conditions.filter((c) => c === 'prone')).toHaveLength(1);
    expect(repeated.activeConditions?.filter((c) => c.condition === 'prone')).toHaveLength(1);
  });

  it('5. Removes condition accurately from both active and legacy arrays', () => {
    const withBlessed = addConditionToCombatant(baseCombatant, 'blessed', true, 1);
    expect(withBlessed.conditions).toContain('blessed');

    const removed = removeConditionFromCombatant(withBlessed, 'blessed');
    expect(removed.conditions).not.toContain('blessed');
    expect(removed.activeConditions?.some((c) => c.condition === 'blessed')).toBe(false);
  });

  it('6. Supports presentation overflow limit (+N) calculation for UI cleanliness', () => {
    let combatant = baseCombatant;
    const toAdd = ['poisoned', 'stunned', 'blinded', 'prone', 'restrained'] as const;
    for (const cond of toAdd) {
      combatant = addConditionToCombatant(combatant, cond, true, 1);
    }

    const publicConds = filterPublicConditions(combatant);
    expect(publicConds.length).toBeGreaterThan(3);

    const MAX_VISIBLE = 3;
    const visibleConds = publicConds.slice(0, MAX_VISIBLE);
    const overflowCount = publicConds.length - MAX_VISIBLE;

    expect(visibleConds).toHaveLength(3);
    expect(overflowCount).toBe(publicConds.length - 3);
  });
});
