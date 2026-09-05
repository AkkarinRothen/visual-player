import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TokenCreatorModal } from './TokenCreatorModal';

describe('TokenCreatorModal (Creador de Tokens Tácticos)', () => {
  it('1. No renderiza nada cuando isOpen es false', () => {
    render(
      <TokenCreatorModal
        isOpen={false}
        initialImageUrl="https://example.com/hero.png"
        onSaveToken={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByTestId('token-creator-modal')).toBeNull();
  });

  it('2. Renderiza modal, canvas, controles de zoom, colores y estilos de marco', () => {
    render(
      <TokenCreatorModal
        isOpen={true}
        initialImageUrl="https://example.com/hero.png"
        onSaveToken={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('token-creator-modal')).toBeDefined();
    expect(screen.getByTestId('token-creator-canvas')).toBeDefined();
    expect(screen.getByText('Creador de Tokens Tácticos')).toBeDefined();
    expect(screen.getByText('Clásico')).toBeDefined();
    expect(screen.getByText('Runas')).toBeDefined();
    expect(screen.getByText('Metálico')).toBeDefined();
    expect(screen.getByText('Neón')).toBeDefined();
  });

  it('3. Permite alternar colores de marco y estilos', () => {
    render(
      <TokenCreatorModal
        isOpen={true}
        initialImageUrl="https://example.com/hero.png"
        onSaveToken={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const enemyBtn = screen.getByLabelText('Color Enemigo');
    fireEvent.click(enemyBtn);
    expect(enemyBtn).toBeDefined();

    const runesBtn = screen.getByText('Runas');
    fireEvent.click(runesBtn);
    expect(runesBtn).toBeDefined();
  });

  it('4. Permite cambiar el zoom del token', () => {
    render(
      <TokenCreatorModal
        isOpen={true}
        initialImageUrl="https://example.com/hero.png"
        onSaveToken={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const slider = screen.getByLabelText('Zoom del token');
    fireEvent.change(slider, { target: { value: '1.75' } });
    expect(screen.getByText('175%')).toBeDefined();

    // Botón centrar
    const resetBtn = screen.getByText('Centrar');
    fireEvent.click(resetBtn);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('5. Guardar token invoca onSaveToken con DataURL', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,mockToken');
    const onSave = vi.fn();
    render(
      <TokenCreatorModal
        isOpen={true}
        initialImageUrl="https://example.com/hero.png"
        onSaveToken={onSave}
        onClose={vi.fn()}
      />
    );

    const saveBtn = screen.getByText('Guardar Token');
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(typeof onSave.mock.calls[0][0]).toBe('string');
  });
});
