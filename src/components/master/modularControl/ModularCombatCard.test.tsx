import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ModularCombatCard } from './ModularCombatCard';
import type { CombatState, Combatant } from '../../../types';

const mockCombatant: Combatant = {
  id: 'comb-1',
  name: 'Valeros',
  avatarUrl: 'https://example.com/valeros.png',
  initiative: 18,
  currentHp: 20,
  maxHp: 30,
  showHpToPlayers: true,
  conditions: ['blessed'],
  isMonster: false,
};

const mockActiveCombatState: CombatState = {
  isActive: true,
  round: 2,
  currentTurnIndex: 0,
  combatants: [mockCombatant],
};

const mockInactiveCombatState: CombatState = {
  isActive: false,
  round: 1,
  currentTurnIndex: 0,
  combatants: [],
};

describe('ModularCombatCard Suite', () => {
  it('1. Renderiza estado inactivo con opción de Iniciar Combate', () => {
    const onStartCombat = vi.fn();
    render(
      <ModularCombatCard
        combatState={mockInactiveCombatState}
        onStartCombat={onStartCombat}
      />
    );

    expect(screen.getByText('Combate')).toBeDefined();
    expect(screen.getByText(/No hay ningún combate activo/i)).toBeDefined();

    const startBtn = screen.getByText('Iniciar Combate');
    fireEvent.click(startBtn);
    expect(onStartCombat).toHaveBeenCalledTimes(1);
  });

  it('2. Renderiza combate activo con combatiente actual, ronda y HP', () => {
    render(
      <ModularCombatCard
        combatState={mockActiveCombatState}
      />
    );

    expect(screen.getByText(/Combate en curso/i)).toBeDefined();
    expect(screen.getByText('(Ronda 2)')).toBeDefined();
    expect(screen.getByText('Valeros')).toBeDefined();
    expect(screen.getByText(/Iniciativa 18/i)).toBeDefined();
    expect(screen.getByText('20 / 30 HP')).toBeDefined();
  });

  it('3. Los botones rápidos de impacto aplican daño y curación correctamente', () => {
    const onUpdateCombatantHp = vi.fn();

    render(
      <ModularCombatCard
        combatState={mockActiveCombatState}
        onUpdateCombatantHp={onUpdateCombatantHp}
      />
    );

    // Click -5 damage
    const minus5Btn = screen.getByText('-5');
    fireEvent.click(minus5Btn);
    expect(onUpdateCombatantHp).toHaveBeenCalledWith('comb-1', 15);

    // Click +5 heal
    const plus5Btn = screen.getByText('+5');
    fireEvent.click(plus5Btn);
    expect(onUpdateCombatantHp).toHaveBeenCalledWith('comb-1', 25);
  });

  it('4. Tocar un estado alterado llama a onToggleCombatantCondition', () => {
    const onToggleCondition = vi.fn();

    render(
      <ModularCombatCard
        combatState={mockActiveCombatState}
        onToggleCombatantCondition={onToggleCondition}
      />
    );

    // Click "En Llamas"
    const burningPill = screen.getByTitle('En Llamas');
    fireEvent.click(burningPill);
    expect(onToggleCondition).toHaveBeenCalledWith('comb-1', 'burning');
  });

  it('5. El botón de enfocar en mesa dispara onFocusCombatant', () => {
    const onFocusCombatant = vi.fn();

    render(
      <ModularCombatCard
        combatState={mockActiveCombatState}
        onFocusCombatant={onFocusCombatant}
      />
    );

    const focusBtn = screen.getByLabelText('Enfocar combatiente en mesa');
    fireEvent.click(focusBtn);
    expect(onFocusCombatant).toHaveBeenCalledWith('comb-1');
  });

  it('6. El botón de siguiente turno avanza el turno de combate', () => {
    const onNextTurn = vi.fn();

    render(
      <ModularCombatCard
        combatState={mockActiveCombatState}
        onNextCombatTurn={onNextTurn}
      />
    );

    const nextBtn = screen.getByLabelText('Siguiente turno');
    fireEvent.click(nextBtn);
    expect(onNextTurn).toHaveBeenCalledTimes(1);
  });
});
