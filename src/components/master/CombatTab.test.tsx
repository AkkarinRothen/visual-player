import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CombatTab } from './CombatTab';
import type { CombatState, Combatant } from '../../types';

describe('CombatTab Component Suite', () => {
  const initialCombatState: CombatState = {
    isActive: false,
    round: 0,
    currentTurnIndex: 0,
    combatants: [],
  };

  it('1. Renderiza el estado vacío cuando no hay combatientes', () => {
    render(
      <CombatTab
        combatState={initialCombatState}
        campaign={null}
        currentScene={null}
        onUpdateCombatState={vi.fn()}
      />
    );

    expect(screen.getByText('Iniciar Combate')).toBeDefined();
    expect(screen.getByText('No hay combatientes activos en el encuentro.')).toBeDefined();
    expect(screen.getByText('📚 Encuentros Guardados')).toBeDefined();
  });

  it('2. Inicia combate emitiendo nuevo estado activo con ronda 1', () => {
    const onUpdateCombatState = vi.fn();
    render(
      <CombatTab
        combatState={initialCombatState}
        campaign={null}
        currentScene={null}
        onUpdateCombatState={onUpdateCombatState}
      />
    );

    const startBtn = screen.getByText('Iniciar Combate');
    fireEvent.click(startBtn);

    expect(onUpdateCombatState).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        round: 1,
        currentTurnIndex: 0,
      })
    );
  });

  it('3. Renderiza combatientes desplegados y permite modificar HP', () => {
    const testCombatant: Combatant = {
      id: 'cbt-1',
      name: 'Orco Guerrero',
      avatarUrl: 'https://example.com/orc.png',
      initiative: 15,
      currentHp: 25,
      maxHp: 30,
      showHpToPlayers: false,
      conditions: [],
      isMonster: true,
      isDeployed: true,
    };

    const activeState: CombatState = {
      isActive: true,
      round: 1,
      currentTurnIndex: 0,
      combatants: [testCombatant],
    };

    const onUpdateCombatState = vi.fn();

    render(
      <CombatTab
        combatState={activeState}
        campaign={null}
        currentScene={null}
        onUpdateCombatState={onUpdateCombatState}
      />
    );

    expect(screen.getByText('Orco Guerrero')).toBeDefined();
    expect(screen.getByText('25 / 30 HP')).toBeDefined();
    expect(screen.getByText('Finalizar Combate')).toBeDefined();

    // Click -5 HP
    const minus5Btn = screen.getByText('-5');
    fireEvent.click(minus5Btn);

    expect(onUpdateCombatState).toHaveBeenCalledWith(
      expect.objectContaining({
        combatants: [
          expect.objectContaining({
            id: 'cbt-1',
            currentHp: 20,
          }),
        ],
      })
    );
  });
});
