import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SceneCompositorModal } from './SceneCompositorModal';
import type { DisplayState, Campaign } from '../../../types';

vi.mock('../compositor/CompositorStage', () => ({
  CompositorStage: () => <div data-testid="compositor-stage-mock">Stage Mock</div>,
}));

vi.mock('../compositor/CompositorSidebar', () => ({
  CompositorSidebar: () => <div data-testid="compositor-sidebar-mock">Sidebar Mock</div>,
}));

describe('SceneCompositorModal Suite', () => {
  const mockState: DisplayState = {
    currentSceneId: 'sc-1',
    sceneName: 'Bosque Sombrío',
    backgroundUrl: 'https://example.com/forest.jpg',
    characters: [
      {
        id: 'c-1',
        name: 'Elfo Explorador',
        avatarUrl: 'https://example.com/elf.png',
        position: 'center-left',
        normalizedX: 40,
        normalizedY: 0,
        isSpeaking: false,
      },
    ],
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: { text: 'Bosque Sombrío', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
    },
  };

  const mockCampaign: Campaign = {
    id: 'camp-1',
    title: 'Aventuras',
    createdAt: Date.now(),
    scenes: [],
    characters: [],
  };

  it('1. Renderiza el encabezado con el título "Control de mesa", badge de modo y botón de cierre', () => {
    const onClose = vi.fn();
    render(
      <SceneCompositorModal
        initialState={mockState}
        campaign={mockCampaign}
        operationMode="staging"
        onSaveState={vi.fn()}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Control de mesa')).toBeDefined();
    expect(screen.getByText('Preparación')).toBeDefined();
    expect(screen.getByLabelText('Cerrar compositor')).toBeDefined();

    const closeBtn = screen.getByLabelText('Cerrar compositor');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('2. Permite alternar la guía de aspecto entre 16:9, 16:10 y 4:3', () => {
    render(
      <SceneCompositorModal
        initialState={mockState}
        campaign={mockCampaign}
        operationMode="live"
        onSaveState={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('En vivo')).toBeDefined();
    const btn43 = screen.getByRole('button', { name: '4:3' });
    fireEvent.click(btn43);

    expect(btn43.className).toContain('bg-amber-500');
  });

  it('3. Invoca onSaveState al pulsar el botón de guardar/listo', async () => {
    const onSaveState = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <SceneCompositorModal
        initialState={mockState}
        campaign={mockCampaign}
        operationMode="staging"
        onSaveState={onSaveState}
        onClose={onClose}
      />
    );

    const saveBtn = screen.getByText('Guardar en Borrador');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(onSaveState).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      false,
      undefined,
      mockState.backgroundUrl,
      expect.any(Object)
    );
  });
});
