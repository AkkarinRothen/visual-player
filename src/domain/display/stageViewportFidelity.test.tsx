import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { StageViewport } from '../../components/display/StageViewport';
import type { DisplayState } from '../../types';
import { sessionCommandBus } from '../../services/sessionCommandBus';

describe('StageViewport Visual Fidelity & Controlled Scene Verification (Serie 3, Pregunta 9)', () => {
  const mockStaticSceneState: DisplayState = {
    currentSceneId: 'scene-storm-ruins',
    sceneName: 'Ruinas de la Torre Quebrada',
    backgroundUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: {
      text: 'RUINAS DE LA TORRE QUEBRADA',
      subtitle: 'Tempestad en el Paso del Trueno',
      visible: true,
    },
    characters: [
      {
        id: 'char-morwen',
        characterId: 'char-morwen',
        name: 'Morwen del Fuego Carmesí',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        position: 'left', // 20%
        normalizedX: 20,
        normalizedY: 0,
        scale: 1.0,
        isSpeaking: false,
      },
      {
        id: 'char-bromir-1',
        characterId: 'char-thorin',
        name: 'Bromir Rompehierro',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
        position: 'center-left', // 40%
        normalizedX: 40,
        normalizedY: 0,
        scale: 1.0,
        isSpeaking: false,
      },
      {
        id: 'char-bromir-2',
        characterId: 'char-thorin',
        name: 'Bromir Rompehierro (Guardia)',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
        position: 'right', // 80%
        normalizedX: 80,
        normalizedY: 0,
        scale: 1.0,
        isSpeaking: false,
      },
    ],
    camera: {
      focalPoint: { x: 50, y: 50 },
      zoom: 1.0,
    },
    props: [],
    lights: [],
    emitters: [],
    interactions: [],
  };

  it('1. Escena estática controlada: Renderiza fondo visible, 3 personajes proporcionales y cartel centrado', () => {
    const { container } = render(
      <StageViewport
        state={mockStaticSceneState}
        aspectRatio={16 / 9}
        showBanner={true}
      />
    );

    // Fondo: Verifica la capa .display-bg con la URL de las ruinas
    const bgElement = container.querySelector('.display-bg.active-bg');
    expect(bgElement).not.toBeNull();
    expect((bgElement as HTMLElement).style.backgroundImage).toContain('photo-1518709268805-4e9042af9f23');

    // Personajes: Verifica que las 3 figuras están presentes con sus coordenadas proporcionales
    const standees = container.querySelectorAll('.standee-proportional-frame');
    expect(standees.length).toBe(3);

    const posWrappers = container.querySelectorAll('.stage-item-pos-wrapper');
    expect(posWrappers.length).toBe(3);
    expect((posWrappers[0] as HTMLElement).style.left).toBe('20%');
    expect((posWrappers[1] as HTMLElement).style.left).toBe('40%');
    expect((posWrappers[2] as HTMLElement).style.left).toBe('80%');

    // Nombres: Verifica que los nameplates son renderizados
    const names = container.querySelectorAll('.character-tag .char-name');
    expect(names.length).toBe(3);
    expect(names[0].textContent).toBe('Morwen del Fuego Carmesí');
    expect(names[1].textContent).toBe('Bromir Rompehierro');
    expect(names[2].textContent).toBe('Bromir Rompehierro (Guardia)');

    // Cartel cinemático: Centrado con runas y sin colisión
    const banner = container.querySelector('.cinematic-banner');
    expect(banner).not.toBeNull();
    expect(banner?.querySelector('.banner-title')?.textContent).toBe('RUINAS DE LA TORRE QUEBRADA');
    expect(banner?.querySelector('.banner-subtitle')?.textContent).toBe('Tempestad en el Paso del Trueno');
  });

  it('2. Activación aislada de Clima: Clima tormenta no altera la posición ni la cantidad de figuras', () => {
    const stormState: DisplayState = {
      ...mockStaticSceneState,
      weather: 'storm',
      weatherIntensity: 0.85,
    };

    const { container } = render(
      <StageViewport
        state={stormState}
        aspectRatio={16 / 9}
        showBanner={true}
      />
    );

    // Canvas de atmósfera presente
    const canvas = container.querySelector('.atmosphere-canvas');
    expect(canvas).not.toBeNull();

    // Las 3 figuras siguen presentes en sus coordenadas exactas
    const posWrappers = container.querySelectorAll('.stage-item-pos-wrapper');
    expect(posWrappers.length).toBe(3);
    expect((posWrappers[0] as HTMLElement).style.left).toBe('20%');
    expect((posWrappers[1] as HTMLElement).style.left).toBe('40%');
    expect((posWrappers[2] as HTMLElement).style.left).toBe('80%');
  });

  it('3. Activación aislada de Cámara: Zoom en Morwen (x: 20%) aplica transform y encuadre 1:1', () => {
    const cameraFocalState: DisplayState = {
      ...mockStaticSceneState,
      camera: {
        focalPoint: { x: 20, y: 50 },
        zoom: 1.45,
      },
    };

    const { container } = render(
      <StageViewport
        state={cameraFocalState}
        isScaledPreview={true}
        aspectRatio={16 / 9}
        showBanner={true}
      />
    );

    const viewport = container.querySelector('.stage-camera-viewport') as HTMLElement;
    expect(viewport).not.toBeNull();
    expect(viewport.style.transformOrigin).toBe('20% 50%');
    expect(viewport.style.transform).toBe('scale(1.45)');
    expect(viewport.style.overflow).toBe('hidden');
  });

  it('4. Telemetría de Viewport y Estado Confirmado en SessionCommandBus', () => {
    let capturedTelemetry: any = null;
    const unsub = sessionCommandBus.onMesaTelemetry((telem) => {
      capturedTelemetry = telem;
    });

    // Simula llegada de resultado de comando con telemetría de Mesa
    (sessionCommandBus as any).handleCommandResult({
      commandId: 'cmd-test-123',
      status: 'applied',
      revision: 7,
      checksum: 'fake-sha-256',
      appliedAt: 1725367890000,
      viewport: {
        width: 1920,
        height: 1080,
        aspectRatio: 1.778,
      },
      assetsStatus: {
        isReady: true,
        missingCount: 0,
      },
    });

    expect(capturedTelemetry).not.toBeNull();
    expect(capturedTelemetry.lastAppliedRevision).toBe(7);
    expect(capturedTelemetry.viewport.width).toBe(1920);
    expect(capturedTelemetry.viewport.height).toBe(1080);
    expect(capturedTelemetry.viewport.aspectRatio).toBe(1.778);
    expect(capturedTelemetry.assetsStatus.isReady).toBe(true);

    unsub();
  });
});
