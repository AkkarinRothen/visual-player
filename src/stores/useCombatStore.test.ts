import { describe, it, expect, beforeEach } from 'vitest';
import { useCombatStore } from './useCombatStore';

describe('useCombatStore (Zustand Combat UI State)', () => {
  beforeEach(() => {
    useCombatStore.getState().resetCombatFilters();
    useCombatStore.getState().toggleCombatDrawer(false);
  });

  it('initializes with default empty filters and closed drawer', () => {
    const state = useCombatStore.getState();
    expect(state.selectedCombatantId).toBeNull();
    expect(state.activeFilter).toBe('all');
    expect(state.filterCondition).toBeNull();
    expect(state.isCombatDrawerOpen).toBe(false);
  });

  it('selects and deselects active combatant', () => {
    const { setSelectedCombatantId } = useCombatStore.getState();

    setSelectedCombatantId('char-valthazar');
    expect(useCombatStore.getState().selectedCombatantId).toBe('char-valthazar');

    setSelectedCombatantId(null);
    expect(useCombatStore.getState().selectedCombatantId).toBeNull();
  });

  it('toggles and sets combat drawer state explicitly', () => {
    const { toggleCombatDrawer } = useCombatStore.getState();

    toggleCombatDrawer();
    expect(useCombatStore.getState().isCombatDrawerOpen).toBe(true);

    toggleCombatDrawer(false);
    expect(useCombatStore.getState().isCombatDrawerOpen).toBe(false);

    toggleCombatDrawer(true);
    expect(useCombatStore.getState().isCombatDrawerOpen).toBe(true);
  });

  it('updates category filters and resets them cleanly', () => {
    const { setActiveFilter, setFilterCondition, resetCombatFilters } = useCombatStore.getState();

    setActiveFilter('monsters');
    setFilterCondition('envenenado');

    expect(useCombatStore.getState().activeFilter).toBe('monsters');
    expect(useCombatStore.getState().filterCondition).toBe('envenenado');

    resetCombatFilters();

    const resetState = useCombatStore.getState();
    expect(resetState.activeFilter).toBe('all');
    expect(resetState.filterCondition).toBeNull();
    expect(resetState.selectedCombatantId).toBeNull();
  });
});
