import React, { useEffect, useState, useRef } from 'react';
import type { ConnectionStatus, DisplayState, WeatherStormEvent } from '../../types';
import { peerService } from '../../services/peerService';
import { soundEngine } from '../../services/soundEngine';
import { startTurnRenewalWatcher } from '../../services/iceConfig';
import { getPlatformBridge } from '../../platform';
import { AtmosphereCanvas } from '../canvas/AtmosphereCanvas';
import { InitiativeRibbon } from './InitiativeRibbon';
import { Volume2 } from 'lucide-react';
import { ConnectionDiagnosticModal } from '../common/ConnectionDiagnosticModal';
import { pairingEngine, type PairingPhaseInfo } from '../../services/pairingEngine';
import { displayCommandExecutor } from '../../services/displayCommandExecutor';
import { DisplayPairingOverlay } from './DisplayPairingOverlay';
import { DisplayHUD } from './DisplayHUD';
import { DisplayCharactersLayer } from './DisplayCharactersLayer';
import { CinematicDialogueLayer } from './CinematicDialogueLayer';
import { SceneLightsLayer } from './SceneLightsLayer';
import { ZoneEmittersLayer } from './ZoneEmittersLayer';
import { HandoutDisplayLayer } from './HandoutDisplayLayer';
import { RecapDisplayLayer } from './RecapDisplayLayer';

interface PlayerDisplayProps {
  initialRoomCode?: string;
  onExitToLobby?: () => void;
}

export const PlayerDisplay: React.FC<PlayerDisplayProps> = ({ initialRoomCode, onExitToLobby }) => {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode || '');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);
  const [pairingInfo, setPairingInfo] = useState<PairingPhaseInfo>(pairingEngine.getPhaseInfo());
  const [isOverlayMinimized, setIsOverlayMinimized] = useState<boolean>(false);
  const hasPlayedChimeRef = useRef<boolean>(false);

  const pairingAuthorizationInProgress =
    pairingInfo.phase !== 'IDLE_WAITING' && pairingInfo.phase !== 'CONTROL_READY';
  const showPairingOverlay = Boolean(roomCode) &&
    (connectionStatus !== 'connected' || pairingAuthorizationInProgress) &&
    !isOverlayMinimized;

  // Auto-minimize overlay and play subtle success chime on CONTROL_READY or connected
  useEffect(() => {
    if (connectionStatus === 'connected' || pairingInfo.phase === 'CONTROL_READY') {
      if (!hasPlayedChimeRef.current) {
        hasPlayedChimeRef.current = true;
        try {
          soundEngine.playSynth('magic_spell');
        } catch {
          // Ignore
        }
      }
      const timer = window.setTimeout(() => {
        setIsOverlayMinimized(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      hasPlayedChimeRef.current = false;
    }
  }, [connectionStatus, pairingInfo.phase]);

  // Core Display State
  const [state, setState] = useState<DisplayState>({
    sceneName: 'Cargando Aventura...',
    backgroundUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    characters: [],
    weather: 'none',
    weatherIntensity: 0.5,
    lighting: 'normal',
    locationBanner: {
      text: 'Visual Player',
      subtitle: 'Conectando con el Master...',
      visible: true,
    },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: false,
      round: 1,
      currentTurnIndex: 0,
      combatants: [],
      turnTimerSeconds: 60,
      showTurnTimerToPlayers: true,
    },
  });
  const stateRef = useRef<DisplayState>(state);
  stateRef.current = state;

  // Background Crossfade handling
  const [activeBg, setActiveBg] = useState<string>(state.backgroundUrl);
  const [prevBg, setPrevBg] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState<boolean>(false);
  const hideControlsTimeout = useRef<number | null>(null);

  // 1. Platform Bridge: Keep Awake, Landscape Lock, Immersive Mode for Players Display
  useEffect(() => {
    const bridge = getPlatformBridge();
    bridge.screen.setKeepAwake(true);
    bridge.screen.setOrientation('landscape');
    bridge.screen.setImmersive(true);

    return () => {
      bridge.screen.setKeepAwake(false);
      bridge.screen.setOrientation('unlocked');
      bridge.screen.setImmersive(false);
    };
  }, []);

  // 2. Initialize WebRTC Display Peer
  useEffect(() => {
    let unmounted = false;
    const activeCode = roomCode || initialRoomCode || 'VP-DEMO';
    displayCommandExecutor.setSessionContext(activeCode, 1);
    const stopWatcher = startTurnRenewalWatcher(activeCode);

    const setupPeer = async () => {
      try {
        const code = await peerService.initDisplay(initialRoomCode);
        if (!unmounted) {
          setRoomCode(code);
          displayCommandExecutor.setSessionContext(code, 1);
        }
      } catch (err) {
        console.error('Failed to init display peer:', err);
      }
    };

    setupPeer();

    const unsubStatus = peerService.onStatusChange((status, _, lat) => {
      setConnectionStatus(status);
      if (lat !== undefined) {
        setLatencyMs(lat);
      }
    });

    const unsubMsg = peerService.onMessage((msg) => {
      handleIncomingMessage(msg as any);
    });

    const unsubPairing = pairingEngine.onPhaseChange((info) => {
      setPairingInfo(info);
    });

    return () => {
      unmounted = true;
      stopWatcher();
      unsubStatus();
      unsubMsg();
      unsubPairing();
      displayCommandExecutor.reset();
    };
  }, [initialRoomCode]);

  // Background crossfade helper
  const triggerBgTransition = (newBgUrl: string) => {
    if (newBgUrl === activeBg) return;
    setPrevBg(activeBg);
    setActiveBg(newBgUrl);
    setIsCrossfading(true);
    setTimeout(() => {
      setIsCrossfading(false);
      setPrevBg(null);
    }, 1000);
  };

  // Handle incoming messages from Master Remote via sequential transactional executor
  const handleIncomingMessage = (msg: any) => {
    displayCommandExecutor.enqueueCommand(msg, {
      getCurrentState: () => stateRef.current,
      onCommitState: (next) => {
        stateRef.current = next;
        setState(next);
      },
      transportSend: (outMsg) => {
        peerService.send(outMsg as any);
      },
      onSideEffect: (eff) => {
        if (eff.type === 'trigger_bg_transition') {
          triggerBgTransition(eff.payload.backgroundUrl);
        } else if (eff.type === 'set_ambient') {
          soundEngine.setAmbient(
            eff.payload.url,
            eff.payload.playing,
            eff.payload.volume,
            eff.payload.crossfade
          );
        } else if (eff.type === 'play_synth') {
          soundEngine.playSynth(eff.payload.preset);
        } else if (eff.type === 'stop_sfx') {
          soundEngine.stopAllSfx();
        } else if (eff.type === 'storm_lightning') {
          const event = eff.payload as WeatherStormEvent;
          if (event && event.expiresAt && Date.now() > event.expiresAt) {
            return; // Anti-burst guarantee: skip expired lightning strike
          }
          const delay = event?.thunderDelayMs ?? 600;
          setTimeout(() => {
            soundEngine.playSynth('thunder');
          }, delay);
        }
      },
    });
  };

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Activity detection for auto-hiding controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  // Audio unlock banner
  const unlockAudio = () => {
    soundEngine.unlockAudio();
    setAudioUnlocked(true);
  };

  // Camera transform calculations
  const cameraFocal = state.camera?.focalPoint || state.focalPoint || { x: 50, y: 50 };
  const cameraZoom = state.camera?.zoom ?? state.zoom ?? 1.0;
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cameraDurationMs = isReducedMotion ? 0 : state.cameraTransition?.durationMs ?? 800;

  return (
    <div
      className={`player-display-root ${state.isBlackout ? 'blackout' : ''}`}
      onMouseMove={handleMouseMove}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* ─── STAGE CAMERA VIEWPORT (WORLD SPACE: BACKGROUND, WEATHER, CHARACTERS, PROPS) ─── */}
      <div
        className="stage-camera-viewport"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          transformOrigin: `${cameraFocal.x}% ${cameraFocal.y}%`,
          transform: cameraZoom > 1.001 ? `scale(${cameraZoom})` : 'none',
          transition:
            cameraDurationMs > 0
              ? `transform ${cameraDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1), transform-origin ${cameraDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`
              : 'none',
        }}
      >
        {/* Background Layers for Smooth Crossfade */}
        {prevBg && (
          <div
            className="display-bg prev-bg"
            style={{
              backgroundImage: `url(${prevBg})`,
              backgroundPosition: '50% 50%',
              backgroundSize: state.fitMode === 'contain' ? 'contain' : 'cover',
              backgroundRepeat: 'no-repeat',
            }}
          />
        )}
        <div
          className={`display-bg active-bg ${isCrossfading ? 'fade-in' : ''}`}
          style={{
            backgroundImage: `url(${activeBg})`,
            backgroundPosition: '50% 50%',
            backgroundSize: state.fitMode === 'contain' ? 'contain' : 'cover',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Atmospheric Effects Canvas */}
        <AtmosphereCanvas
          weather={state.weather}
          intensity={state.weatherIntensity}
          lighting={state.lighting}
          shakeTrigger={state.shakeTrigger}
          lightningTrigger={state.lightningTrigger}
        />

        {/* Active Characters & Props Projection Layer */}
        <DisplayCharactersLayer
          characters={state.characters}
          props={state.props || []}
          activeTransitions={state.activeTransitions}
          combatState={state.combatState}
        />

        {/* Localized Scene Lights Layer */}
        <SceneLightsLayer
          lights={state.lights}
          characters={state.characters}
          props={state.props || []}
        />

        {/* Localized Atmospheric Zone Emitters (Fog, Smoke, Window Rain, Embers) */}
        <ZoneEmittersLayer
          emitters={state.emitters}
          characters={state.characters}
          props={state.props || []}
        />
      </div>

      {/* ─── HUD & SCREEN SPACE (FIXED OVERLAYS: BANNER, DIALOGUE, INITIATIVE) ─── */}
      {/* Location / Scene Title Banner */}
      {state.locationBanner.visible && (
        <div className="location-banner">
          <h1 className="banner-title">{state.locationBanner.text}</h1>
          {state.locationBanner.subtitle && (
            <p className="banner-subtitle">{state.locationBanner.subtitle}</p>
          )}
        </div>
      )}

      {/* Handout, Document & Map Projection Layer */}
      <HandoutDisplayLayer handout={state.activeHandout} />

      {/* Opening Cinematic Recap Layer ("Anteriormente en la campaña...") */}
      <RecapDisplayLayer recap={state.activeRecap} />

      {/* Cinematic Dialogue & Narration Projection Layer */}
      <CinematicDialogueLayer dialogue={state.dialogue} />

      {/* Combat Initiative Ribbon Overlay */}
      {state.combatState?.isActive && (
        <InitiativeRibbon combatState={state.combatState} />
      )}

      {/* Audio Unlock Dialog */}
      {!audioUnlocked && (
        <div className="audio-unlock-overlay" onClick={unlockAudio}>
          <button className="audio-unlock-btn">
            <Volume2 size={24} />
            <span>Haz clic para habilitar sonido en la mesa</span>
          </button>
        </div>
      )}

      {/* QR Code & Room PIN Pairing Overlay for PC/TV Display */}
      <DisplayPairingOverlay
        isVisible={showPairingOverlay}
        roomCode={roomCode}
        pairingInfo={pairingInfo}
        onMinimize={() => setIsOverlayMinimized(true)}
      />

      {/* Top HUD Controls */}
      <DisplayHUD
        showControls={showControls}
        connectionStatus={connectionStatus}
        latencyMs={latencyMs}
        roomCode={roomCode}
        isOverlayMinimized={isOverlayMinimized}
        isFullscreen={isFullscreen}
        onOpenDiagnostic={() => setShowDiagnosticModal(true)}
        onRestoreOverlay={() => setIsOverlayMinimized(false)}
        onToggleFullscreen={toggleFullscreen}
        onExitToLobby={onExitToLobby}
      />

      {/* Connection Diagnostic Modal */}
      <ConnectionDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
      />
    </div>
  );
};
