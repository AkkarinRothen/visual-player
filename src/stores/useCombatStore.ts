import { create } from 'zustand';

export type CombatantFilter = 'all' | 'players' | 'monsters' | 'active';

export interface CombatStoreState {
  selectedCombatantId: string | null;
  activeFilter: CombatantFilter;
  filterCondition: string | null;
  isCombatDrawerOpen: boolean;

  // Actions
  setSelectedCombatantId: (id: string | null) => void;
  setActiveFilter: (filter: CombatantFilter) => void;
  setFilterCondition: (condition: string | null) => void;
  toggleCombatDrawer: (open?: boolean) => void;
  resetCombatFilters: () => void;
}

export const useCombatStore = create<CombatStoreState>((set) => ({
  selectedCombatantId: null,
  activeFilter: 'all',
  filterCondition: null,
  isCombatDrawerOpen: false,

  setSelectedCombatantId: (id) => set({ selectedCombatantId: id }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setFilterCondition: (condition) => set({ filterCondition: condition }),
  toggleCombatDrawer: (open) =>
    set((state) => ({ isCombatDrawerOpen: open !== undefined ? open : !state.isCombatDrawerOpen })),
  resetCombatFilters: () =>
    set({
      selectedCombatantId: null,
      activeFilter: 'all',
      filterCondition: null,
    }),
}));
