import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileFxEdgeDrawer } from './MobileFxEdgeDrawer';

describe('MobileFxEdgeDrawer', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    render(
      <MobileFxEdgeDrawer
        isOpen={false}
        onClose={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBlackout={vi.fn()}
        onToggleBanner={vi.fn()}
      />
    );

    expect(screen.queryByTestId('mobile-fx-drawer')).toBeNull();
  });

  it('renderiza título, botones de rayo, sacudir, blackout, cartel y dados cuando isOpen es true', () => {
    render(
      <MobileFxEdgeDrawer
        isOpen={true}
        onClose={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBlackout={vi.fn()}
        onToggleBanner={vi.fn()}
        isBlackout={true}
        isBannerVisible={true}
      />
    );

    expect(screen.getByTestId('mobile-fx-drawer')).toBeDefined();
    expect(screen.getByText('Efectos en Vivo')).toBeDefined();
    expect(screen.getByText('Rayo')).toBeDefined();
    expect(screen.getByText('Sacudir')).toBeDefined();
    expect(screen.getByText('Luz')).toBeDefined(); // isBlackout is true => shows Luz
    expect(screen.getByText('Cartel')).toBeDefined();
    expect(screen.getByText('Dados Rápidos')).toBeDefined();
    expect(screen.getByText('d20')).toBeDefined();
  });

  it('dispara los callbacks de rayo y sacudir al tocar los botones correspondientes', () => {
    const onTriggerLightning = vi.fn();
    const onTriggerShake = vi.fn();

    render(
      <MobileFxEdgeDrawer
        isOpen={true}
        onClose={vi.fn()}
        onTriggerLightning={onTriggerLightning}
        onTriggerShake={onTriggerShake}
        onToggleBlackout={vi.fn()}
        onToggleBanner={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Rayo'));
    expect(onTriggerLightning).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Sacudir'));
    expect(onTriggerShake).toHaveBeenCalledTimes(1);
  });

  it('permite tirar dados y muestra el resultado en tiempo real', () => {
    render(
      <MobileFxEdgeDrawer
        isOpen={true}
        onClose={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBlackout={vi.fn()}
        onToggleBanner={vi.fn()}
      />
    );

    const d20Btn = screen.getByText('d20');
    fireEvent.click(d20Btn);

    const resultBadge = screen.getByTestId('mobile-dice-result');
    expect(resultBadge).toBeDefined();
    expect(resultBadge.textContent).toContain('d20:');
  });

  it('llama onClose al pulsar el botón de cerrar o el backdrop', () => {
    const onClose = vi.fn();

    render(
      <MobileFxEdgeDrawer
        isOpen={true}
        onClose={onClose}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleBlackout={vi.fn()}
        onToggleBanner={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Cerrar panel de efectos'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
