import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveSceneCard } from './ActiveSceneCard';
import type { DisplayState, Scene, Campaign } from '../../../types';

describe('ActiveSceneCard Suite', () => {
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
        isSpeaking: true,
      },
    ],
    weather: 'rain',
    weatherIntensity: 0.5,
    lighting: 'sunset',
    locationBanner: { text: 'Bosque Sombrío', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: 'https://example.com/rain.mp3',
    ambientPlaying: true,
    ambientVolume: 0.8,
    lastSfx: null,
    combatState: {
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
    },
    camera: {
      focalPoint: { x: 50, y: 50 },
      zoom: 1.0,
    },
    lights: [
      {
        id: 'l-1',
        name: 'Antorcha',
        preset: 'torch',
        normalizedX: 50,
        normalizedY: 50,
        color: '#ff8800',
        intensity: 0.8,
        radiusPct: 20,
        flicker: false,
        visible: true,
      },
    ],
    emitters: [
      {
        id: 'e-1',
        type: 'fog',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        density: 0.5,
        speed: 1,
        opacity: 0.5,
        zIndex: 1,
        enabled: true,
      },
    ],
  };

  const mockScene: Scene = {
    id: 'sc-1',
    name: 'Bosque Sombrío',
    backgroundUrl: 'https://example.com/forest.jpg',
    weather: 'rain',
    lighting: 'sunset',
    variants: [
      {
        id: 'var-night',
        name: 'Noche',
        backgroundUrl: 'https://example.com/forest-night.jpg',
      },
    ],
  };

  const mockCampaign: Campaign = {
    id: 'camp-1',
    title: 'Campaña de Prueba',
    createdAt: Date.now(),
    scenes: [mockScene],
    characters: [],
  };

  it('renders active scene preview, meta chips, and quick action buttons', () => {
    const handleToggleBanner = vi.fn();
    const handleTriggerLightning = vi.fn();
    const handleTriggerShake = vi.fn();
    const handleToggleAmbientAudio = vi.fn();

    render(
      <ActiveSceneCard
        liveState={mockState}
        activeScene={mockScene}
        campaign={mockCampaign}
        onToggleBanner={handleToggleBanner}
        onTriggerLightning={handleTriggerLightning}
        onTriggerShake={handleTriggerShake}
        onToggleAmbientAudio={handleToggleAmbientAudio}
      />
    );

    expect(screen.getByText('ESCENA EN MESA')).toBeDefined();
    expect(screen.getByText('Bosque Sombrío')).toBeDefined();
    expect(screen.getByText('1 NPCs')).toBeDefined();
    expect(screen.getByText('rain (50%)')).toBeDefined();
    expect(screen.getByText('Ocultar Cartel')).toBeDefined();
    expect(screen.getByText('Rayo')).toBeDefined();
    expect(screen.getByText('Temblor')).toBeDefined();
    expect(screen.getByText('Pausar Música')).toBeDefined();

    // Trigger actions
    fireEvent.click(screen.getByText('Ocultar Cartel'));
    expect(handleToggleBanner).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Rayo'));
    expect(handleTriggerLightning).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Temblor'));
    expect(handleTriggerShake).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Pausar Música'));
    expect(handleToggleAmbientAudio).toHaveBeenCalledTimes(1);
  });

  it('allows triggering camera framing presets', () => {
    const handleSetCameraTransform = vi.fn();

    render(
      <ActiveSceneCard
        liveState={mockState}
        activeScene={mockScene}
        campaign={mockCampaign}
        onToggleBanner={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onSetCameraTransform={handleSetCameraTransform}
      />
    );

    expect(screen.getByText('Cámara:')).toBeDefined();
    expect(screen.getByText('Plano General')).toBeDefined();
    expect(screen.getByText('Encuadrar Hablante')).toBeDefined();

    fireEvent.click(screen.getByText('Encuadrar Hablante'));
    expect(handleSetCameraTransform).toHaveBeenCalledTimes(1);
  });

  it('renders scene variants and allows selecting them', () => {
    const handleSelectVariant = vi.fn();

    render(
      <ActiveSceneCard
        liveState={mockState}
        activeScene={mockScene}
        campaign={mockCampaign}
        onToggleBanner={vi.fn()}
        onTriggerLightning={vi.fn()}
        onTriggerShake={vi.fn()}
        onToggleAmbientAudio={vi.fn()}
        onSelectSceneVariant={handleSelectVariant}
      />
    );

    expect(screen.getByText('Variantes:')).toBeDefined();
    const variantBtn = screen.getByText('Noche');
    expect(variantBtn).toBeDefined();

    fireEvent.click(variantBtn);
    expect(handleSelectVariant).toHaveBeenCalledTimes(1);
  });
});
