import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StageFormationActionsMenu } from './StageFormationActionsMenu';

describe('StageFormationActionsMenu', () => {
  it('1. Renderiza el botón de formaciones y abre el menú al hacer clic', () => {
    const onBattleRanks = vi.fn();
    const onSnap = vi.fn();
    const onDistribute = vi.fn();
    const onFit = vi.fn();

    render(
      <StageFormationActionsMenu
        onApplyBattleRanks={onBattleRanks}
        onSnapAllToGrid={onSnap}
        onDistributeHorizontally={onDistribute}
        onFitScaleToGrid={onFit}
      />
    );

    const btn = screen.getByRole('button', { name: /formaciones de combate/i });
    expect(btn).toBeTruthy();

    // Menu is closed initially
    expect(screen.queryByText(/fila de batalla \(jrpg\)/i)).toBeNull();

    // Open menu
    fireEvent.click(btn);
    expect(screen.getByText(/fila de batalla \(jrpg\)/i)).toBeTruthy();
    expect(screen.getByText(/alinear a cuadrícula/i)).toBeTruthy();
    expect(screen.getByText(/distribuir en línea/i)).toBeTruthy();
    expect(screen.getByText(/ajustar tamaño a casilla/i)).toBeTruthy();
  });

  it('2. Ejecuta la acción correspondiente y cierra el menú al seleccionar una formación', () => {
    const onBattleRanks = vi.fn();
    const onSnap = vi.fn();
    const onDistribute = vi.fn();
    const onFit = vi.fn();

    render(
      <StageFormationActionsMenu
        onApplyBattleRanks={onBattleRanks}
        onSnapAllToGrid={onSnap}
        onDistributeHorizontally={onDistribute}
        onFitScaleToGrid={onFit}
      />
    );

    // Open
    fireEvent.click(screen.getByRole('button', { name: /formaciones de combate/i }));

    // Click "Fila de Batalla (JRPG)"
    fireEvent.click(screen.getByText(/fila de batalla \(jrpg\)/i));
    expect(onBattleRanks).toHaveBeenCalledTimes(1);

    // Menu should be closed
    expect(screen.queryByText(/fila de batalla \(jrpg\)/i)).toBeNull();
  });

  it('3. Ejecuta acción de alinear a cuadrícula', () => {
    const onSnap = vi.fn();
    render(
      <StageFormationActionsMenu
        onApplyBattleRanks={vi.fn()}
        onSnapAllToGrid={onSnap}
        onDistributeHorizontally={vi.fn()}
        onFitScaleToGrid={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /formaciones de combate/i }));
    fireEvent.click(screen.getByText(/alinear a cuadrícula/i));
    expect(onSnap).toHaveBeenCalledTimes(1);
  });
});
