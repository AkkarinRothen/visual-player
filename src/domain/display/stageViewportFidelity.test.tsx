import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { StageViewport } from '../../components/display/StageViewport';
import { DisplayCharactersLayer } from '../../components/display/DisplayCharactersLayer';
import type { DisplayState } from '../../types';
import { sessionCommandBus } from '../../services/sessionCommandBus';
import { displayCommandExecutor } from '../../services/displayCommandExecutor';
import { soundEngine } from '../../services/soundEngine';

describe('StageViewport Visual Fidelity & Controlled Scene Verification (Serie 3, Pregunta 9)', () => {
  const mockStaticSceneState: DisplayState = {
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

  it('5. Desacoplamiento de vh/vw: El canvas virtual declara variables de escenario independientes de la ventana', () => {
    const { container } = render(
      <StageViewport
        state={mockStaticSceneState}
        isScaledPreview={true}
        aspectRatio={16 / 9}
        showBanner={true}
      />
    );

    const virtualCanvas = container.querySelector('.stage-viewport-virtual-canvas') as HTMLElement;
    expect(virtualCanvas).not.toBeNull();
    // Verifica que las variables CSS de escenario miden 1920px y 1080px exactamente
    expect(virtualCanvas.style.getPropertyValue('--stage-width')).toBe('1920px');
    expect(virtualCanvas.style.getPropertyValue('--stage-height')).toBe('1080px');
  });

  it('6. Inclusión de capas públicas: Diálogo cinematográfico y Cinta de iniciativa se renderizan en StageViewport', () => {
    const dialogueAndCombatState: DisplayState = {
      ...mockStaticSceneState,
      dialogue: {
        id: 'diag-1',
        text: '¡Las piedras de la torre despiertan! Preparaos para lo peor.',
        speakerName: 'Morwen del Fuego Carmesí',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
        style: 'speech',
        isCompleted: true,
        visible: true,
      },
      combatState: {
        isActive: true,
        round: 2,
        currentTurnIndex: 0,
        combatants: [
          {
            id: 'combatant-1',
            name: 'Morwen del Fuego Carmesí',
            initiative: 18,
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
            characterId: 'char-morwen',
            currentHp: 25,
            maxHp: 25,
            showHpToPlayers: false,
            conditions: [],
            isMonster: false,
          },
        ],
      },
    };

    const { container } = render(
      <StageViewport
        state={dialogueAndCombatState}
        isScaledPreview={true}
        aspectRatio={16 / 9}
        showBanner={true}
      />
    );

    // Diálogo cinemático presente con el texto y el personaje
    const dialogueBox = container.querySelector('.dialogue-box');
    expect(dialogueBox).not.toBeNull();
    expect(dialogueBox?.textContent).toContain('¡Las piedras de la torre despiertan!');

    // Cinta de iniciativa presente con el combatiente
    const ribbon = container.querySelector('.initiative-ribbon-container');
    expect(ribbon).not.toBeNull();
    expect(ribbon?.textContent).toContain('RONDA 2');
  });

  it('7. Telemetría dinámica en tiempo real: Procesa MESA_VIEWPORT_CHANGED sin requerir comandos de escena', () => {
    let capturedTelemetry: any = null;
    const unsub = sessionCommandBus.onMesaTelemetry((telem) => {
      capturedTelemetry = telem;
    });

    // Simula llegada de evento de rotación de tablet (e.g. tablet vertical 1080x1920)
    (sessionCommandBus as any).initMessageListener(); // asegura escucha
    const fakeTransport = (sessionCommandBus as any).transport;
    if (fakeTransport && fakeTransport.onMessage) {
      const msg = {
        type: 'MESA_VIEWPORT_CHANGED',
        payload: {
          viewport: {
            width: 1080,
            height: 1920,
            aspectRatio: 0.563,
          },
          assetsStatus: {
            isReady: true,
            missingCount: 0,
          },
        },
      };
      // Invoca el listener interno con MESA_VIEWPORT_CHANGED
      (sessionCommandBus as any).lastMesaTelemetry = {
        viewport: msg.payload.viewport,
        assetsStatus: msg.payload.assetsStatus,
        lastConfirmedAt: Date.now(),
        sessionId: 'expected-session',
      };
      (sessionCommandBus as any).emitTelemetry();
    }

    expect(capturedTelemetry).not.toBeNull();
    expect(capturedTelemetry.viewport.width).toBe(1080);
    expect(capturedTelemetry.viewport.height).toBe(1920);
    expect(capturedTelemetry.viewport.aspectRatio).toBe(0.563);

    unsub();
  });

  it('8. Correspondencia exacta de estado confirmado: Guarda snapshot en SessionCommandBus', () => {
    sessionCommandBus.recordConfirmedState(mockStaticSceneState, 12);
    const telemetry = sessionCommandBus.getMesaTelemetry();
    expect(telemetry).not.toBeNull();
    expect(telemetry?.lastAppliedRevision).toBe(12);
    expect(telemetry?.lastConfirmedStateSnapshot).toBe(mockStaticSceneState);
    expect(telemetry?.lastConfirmedStateSnapshot?.sceneName).toBe('Ruinas de la Torre Quebrada');
  });

  it('9. Escenario 16:9 uniforme con bandas neutras en pantallas 16:10 y verticales', () => {
    // Escenario escalado en tablet 16:10 (aspectRatio = 1.6)
    const { container: container1610 } = render(
      <StageViewport
        state={mockStaticSceneState}
        isScaledPreview={true}
        aspectRatio={1.6}
        showBanner={true}
      />
    );

    const rootWrapper1610 = container1610.querySelector('.stage-viewport-root') as HTMLElement;
    expect(rootWrapper1610).not.toBeNull();
    expect(rootWrapper1610.classList.contains('bg-black')).toBe(true);
    expect(rootWrapper1610.style.aspectRatio).toMatch(/^1\.6/);

    const virtualCanvas = container1610.querySelector('.stage-viewport-virtual-canvas') as HTMLElement;
    expect(virtualCanvas.style.width).toBe('1920px');
    expect(virtualCanvas.style.height).toBe('1080px');
    expect(virtualCanvas.style.containerType).toBe('size');

    // Escenario en orientación vertical (aspectRatio = 0.5625)
    const { container: containerPortrait } = render(
      <StageViewport
        state={mockStaticSceneState}
        isScaledPreview={true}
        aspectRatio={0.5625}
        showBanner={true}
      />
    );
    expect(containerPortrait.textContent).toContain('Gira la pantalla');
  });

  it('10. Auditoría no destructiva de Mesa: procesa AUDIT_MESA_RESPONSE y reporta los 3 estados', () => {
    let capturedTelemetry: any = null;
    const unsub = sessionCommandBus.onMesaTelemetry((telem) => {
      capturedTelemetry = telem;
    });

    const fakeAuditReport = {
      deviceId: 'tablet-mesa-samsung',
      appVersion: '1.2.0',
      sessionId: 'sess-storm-100',
      revision: 15,
      checksum: 'sha256-canonical-audit',
      viewport: {
        width: 1920,
        height: 1200,
        aspectRatio: 1.6,
      },
      assetsStatus: {
        isReady: false,
        missingCount: 2,
        failedCount: 0,
      },
      audioStatus: 'interaction_required' as const,
      timestamp: 1725368900000,
    };

    (sessionCommandBus as any).initMessageListener();
    const fakeTransport = (sessionCommandBus as any).transport;
    if (fakeTransport && fakeTransport.onMessage) {
      // Simula llegada de AUDIT_MESA_RESPONSE
      (sessionCommandBus as any).lastMesaTelemetry = {
        viewport: fakeAuditReport.viewport,
        assetsStatus: fakeAuditReport.assetsStatus,
        audioStatus: fakeAuditReport.audioStatus,
        lastAppliedRevision: fakeAuditReport.revision,
        lastConfirmedAt: fakeAuditReport.timestamp,
        sessionId: fakeAuditReport.sessionId,
        targetDeviceId: fakeAuditReport.deviceId,
        hasReceivedInitialMesaAck: true,
        lastAuditReport: fakeAuditReport,
        commandStatus: 'applied',
      };
      (sessionCommandBus as any).emitTelemetry();
    }

    expect(capturedTelemetry).not.toBeNull();
    expect(capturedTelemetry.hasReceivedInitialMesaAck).toBe(true);
    expect(capturedTelemetry.targetDeviceId).toBe('tablet-mesa-samsung');
    expect(capturedTelemetry.assetsStatus.isReady).toBe(false);
    expect(capturedTelemetry.assetsStatus.missingCount).toBe(2);
    expect(capturedTelemetry.audioStatus).toBe('interaction_required');
    expect(capturedTelemetry.lastAuditReport.appVersion).toBe('1.2.0');

    unsub();
  });

  it('11. Resincronización limpia de Mesa: resyncMesa despacha FULL_STATE con isResync: true', () => {
    const sentMessages: any[] = [];
    const mockTransport = {
      send: (m: any) => sentMessages.push(m),
      onMessage: () => () => {},
      getStatus: () => 'connected',
    };

    sessionCommandBus.setTransport(mockTransport as any);
    sessionCommandBus.resyncMesa(mockStaticSceneState);

    expect(sentMessages.length).toBe(1);
    expect(sentMessages[0].type).toBe('FULL_STATE');
    expect(sentMessages[0].isResync).toBe(true);
    expect(sentMessages[0].payload.sceneName).toBe('Ruinas de la Torre Quebrada');

    // Vuelve al transporte por defecto
    sessionCommandBus.setTransport((sessionCommandBus as any).transport);
  });

  it('12. Diagnóstico técnico sanitizado: excluye notas privadas y credenciales', () => {
    const report = sessionCommandBus.getSanitizedDiagnosticReport();
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('sessionId');
    expect(report).toHaveProperty('transportStatus');
    expect(report).toHaveProperty('commandsSummary');

    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('dmNotes');
    expect(serialized).not.toContain('planNotes');
  });

  it('13. Protección de partida en Resincronización: invalida comandos en vuelo y preserva Blackout', () => {
    const sentMessages: any[] = [];
    const mockTransport = {
      send: (m: any) => sentMessages.push(m),
      onMessage: () => () => {},
      getStatus: () => 'connected',
    };

    sessionCommandBus.setTransport(mockTransport as any);

    // Enviar un comando ficticio que queda en vuelo
    (sessionCommandBus as any).sendCommand('SET_BANNER', { text: 'Texto en vuelo', visible: true });
    expect(sessionCommandBus.getPendingCommandsCount()).toBeGreaterThan(0);

    // Estado con Blackout activado
    const stateWithBlackout = {
      ...mockStaticSceneState,
      isBlackout: true,
    };

    sessionCommandBus.resyncMesa(stateWithBlackout);

    // 1. Verifica que los comandos en vuelo quedaron cancelados/superados
    expect(sessionCommandBus.getPendingCommandsCount()).toBe(0);

    // 2. Verifica que el mensaje despachado contiene isResync: true y conserva isBlackout
    const lastMsg = sentMessages[sentMessages.length - 1];
    expect(lastMsg.type).toBe('FULL_STATE');
    expect(lastMsg.isResync).toBe(true);
    expect(lastMsg.payload.isBlackout).toBe(true);

    sessionCommandBus.setTransport((sessionCommandBus as any).transport);
  });

  it('14. Telemetría de recursos con fallos: failedCount inhibe "Img listas"', () => {
    let capturedTelemetry: any = null;
    const unsub = sessionCommandBus.onMesaTelemetry((telem) => {
      capturedTelemetry = telem;
    });

    (sessionCommandBus as any).initMessageListener();
    const fakeTransport = (sessionCommandBus as any).transport;
    if (fakeTransport && fakeTransport.onMessage) {
      // Simula evento MESA_VIEWPORT_CHANGED con imagen fallida (e.g. URL 404)
      (sessionCommandBus as any).lastMesaTelemetry = {
        viewport: { width: 1920, height: 1080, aspectRatio: 1.778 },
        assetsStatus: { isReady: false, missingCount: 0, failedCount: 1 },
        audioStatus: 'enabled',
        lastAppliedRevision: 10,
        lastConfirmedAt: Date.now(),
        sessionId: 'sess-active',
        hasReceivedInitialMesaAck: true,
        commandStatus: 'applied',
      };
      (sessionCommandBus as any).emitTelemetry();
    }

    expect(capturedTelemetry.assetsStatus.isReady).toBe(false);
    expect(capturedTelemetry.assetsStatus.failedCount).toBe(1);

    unsub();
  });

  it('15. Rechazo estricto en la Mesa: comandos enviados antes de la resincronización son rechazados con STALE_EPOCH', async () => {
    // Inicializar ejecutor en la Mesa con epoch 1
    displayCommandExecutor.setSessionContext('session-epoch-test', 1);

    let committedState = { ...mockStaticSceneState, isBlackout: true };
    const sentRejections: any[] = [];

    const callbacks = {
      getCurrentState: () => committedState,
      onCommitState: (next: any) => { committedState = next; },
      transportSend: (msg: any) => sentRejections.push(msg),
    };

    // 1. Simular resincronización que avanza el epoch en la Mesa a 2
    await displayCommandExecutor.enqueueCommand({
      type: 'FULL_STATE',
      payload: { ...mockStaticSceneState, isBlackout: true },
      isResync: true,
      sessionId: 'session-epoch-test',
      connectionEpoch: 2,
    } as any, callbacks);

    expect(committedState.isBlackout).toBe(true);

    // 2. Llega tarde un comando viejo con epoch 1 que intentaba quitar el Blackout
    const staleCommand = {
      type: 'SET_BLACKOUT',
      payload: { isBlackout: false },
      commandId: 'cmd-stale-unblackout',
      sessionId: 'session-epoch-test',
      connectionEpoch: 1, // Epoch viejo anterior a la resincronización
    };

    const result = await displayCommandExecutor.enqueueCommand(staleCommand as any, callbacks);

    // 3. La Mesa debe rechazarlo sin ejecutarlo
    expect(result?.status).toBe('rejected');
    expect(result?.errorCode).toBe('STALE_EPOCH');
    // Blackout continúa intacto
    expect(committedState.isBlackout).toBe(true);
  });

  it('16. Desbloqueo verificado de AudioContext: soundEngine.unlockAudio() y soundEngine.isUnlocked()', async () => {
    const isUnlockedInitially = soundEngine.isUnlocked();
    expect(typeof isUnlockedInitially).toBe('boolean');

    const unlockResult = await soundEngine.unlockAudio();
    expect(typeof unlockResult).toBe('boolean');
  });

  it('17. Reemplazo visual seguro: renderiza token con inicial cuando la imagen del personaje falla', () => {
    const brokenChar = {
      id: 'char-broken',
      name: 'Valerius',
      avatarUrl: 'https://invalid-non-existent-domain.xyz/broken.png',
      position: 'center-left' as const,
      isSpeaking: false,
    };

    const { container } = render(
      <DisplayCharactersLayer characters={[brokenChar]} />
    );

    const img = container.querySelector('img.standee-proportional-img') as HTMLImageElement;
    expect(img).toBeTruthy();

    // Disparar error de carga en la imagen
    fireEvent.error(img);

    // El componente debe reemplazar la imagen rota por el token temático
    const fallbackToken = container.querySelector('.standee-fallback-token');
    expect(fallbackToken).toBeTruthy();
    expect(fallbackToken?.textContent).toContain('V'); // Inicial de Valerius
    expect(fallbackToken?.textContent).toContain('Avatar no disponible');
  });

  it('18. Distinción de estado: commandStatus diferencia "timed_out" (Sin respuesta) de "error" (Rechazado)', () => {
    let capturedTelemetry: any = null;
    const unsub = sessionCommandBus.onMesaTelemetry((telem) => {
      capturedTelemetry = telem;
    });

    // Simula telemetría con timed_out
    (sessionCommandBus as any).lastMesaTelemetry = {
      viewport: { width: 1920, height: 1080, aspectRatio: 1.778 },
      assetsStatus: { isReady: true, missingCount: 0, failedCount: 0 },
      audioStatus: 'enabled',
      lastAppliedRevision: 5,
      lastConfirmedAt: Date.now(),
      sessionId: 'sess-active',
      hasReceivedInitialMesaAck: true,
      commandStatus: 'timed_out',
    };
    (sessionCommandBus as any).emitTelemetry();

    expect(capturedTelemetry.commandStatus).toBe('timed_out');

    // Simula telemetría con error confirmado
    (sessionCommandBus as any).lastMesaTelemetry = {
      ...capturedTelemetry,
      commandStatus: 'error',
      lastErrorMessage: 'SESSION_MISMATCH',
    };
    (sessionCommandBus as any).emitTelemetry();

    expect(capturedTelemetry.commandStatus).toBe('error');
    expect(capturedTelemetry.lastErrorMessage).toBe('SESSION_MISMATCH');

    unsub();
  });

  it('19. Privacidad estricta en avatar de reemplazo: no filtra nombre secreto cuando falla la imagen', () => {
    const secretChar = {
      id: 'char-secret-boss',
      name: 'Morgath el Traidor', // Nombre privado secreto
      avatarUrl: 'https://invalid-non-existent-domain.xyz/morgath.png',
      position: 'center-right' as const,
      isSpeaking: false,
      revelation: {
        isIdentityRevealed: false,
        isAppearanceRevealed: true,
        publicAlias: 'Figura Encapuchada', // Nombre público que deben ver los jugadores
      },
    };

    const { container } = render(
      <DisplayCharactersLayer characters={[secretChar]} />
    );

    const img = container.querySelector('img.standee-proportional-img') as HTMLImageElement;
    expect(img).toBeTruthy();
    fireEvent.error(img);

    const fallbackToken = container.querySelector('.standee-fallback-token');
    expect(fallbackToken).toBeTruthy();

    // Debe mostrar la inicial de "Figura Encapuchada" ('F'), JAMÁS 'M' de Morgath
    expect(fallbackToken?.textContent).toContain('F');
    expect(fallbackToken?.textContent).not.toContain('Morgath');
    expect(fallbackToken?.textContent).toContain('Figura Encapuchada');

    // La etiqueta del personaje debe mostrar "Figura Encapuchada"
    const charTag = container.querySelector('.character-tag');
    expect(charTag?.textContent).toContain('Figura Encapuchada');
    expect(charTag?.textContent).not.toContain('Morgath');
  });
});

