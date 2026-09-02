import React, { useEffect, useState, useRef } from 'react';
import type { ConnectionStatus, DisplayState } from '../../types';
import { peerService } from '../../services/peerService';
import { soundEngine } from '../../services/soundEngine';
import { startTurnRenewalWatcher } from '../../services/iceConfig';
import { getPlatformBridge } from '../../platform';
import { AtmosphereCanvas } from '../canvas/AtmosphereCanvas';
import { InitiativeRibbon } from './InitiativeRibbon';
import { Volume2 } from 'lucide-react';
import { ConnectionDiagnosticModal } from '../common/ConnectionDiagnosticModal';
import { pairingEngine, type PairingPhaseInfo } from '../../services/pairingEngine';
import { DisplayPairingOverlay } from './DisplayPairingOverlay';
import { DisplayHUD } from './DisplayHUD';
import { DisplayCharactersLayer } from './DisplayCharactersLayer';

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
    const stopWatcher = startTurnRenewalWatcher(roomCode || initialRoomCode || 'VP-DEMO');

    const setupPeer = async () => {
      try {
        const code = await peerService.initDisplay(initialRoomCode);
        if (!unmounted) {
          setRoomCode(code);
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

  // Handle incoming messages from Master Remote
  const handleIncomingMessage = (msg: any) => {
    switch (msg.type) {
      case 'FULL_STATE':
        setState(msg.payload);
        triggerBgTransition(msg.payload.backgroundUrl);
        if (msg.payload.ambientAudioUrl) {
          soundEngine.setAmbient(
            msg.payload.ambientAudioUrl,
            msg.payload.ambientPlaying,
            msg.payload.ambientVolume,
            true
          );
        }
        break;

      case 'SET_SCENE':
        setState((prev) => ({
          ...prev,
          currentSceneId: msg.payload.id,
          sceneName: msg.payload.name,
          backgroundUrl: msg.payload.backgroundUrl,
          weather: msg.payload.weather || 'none',
          weatherIntensity: msg.payload.weatherIntensity ?? 0.5,
          lighting: msg.payload.lighting || 'normal',
          locationBanner: {
            text: msg.payload.locationBanner || msg.payload.name,
            subtitle: msg.payload.subtitle || '',
            visible: true,
          },
          characters: msg.characters !== undefined ? msg.characters : prev.characters,
        }));
        triggerBgTransition(msg.payload.backgroundUrl);

        if (msg.payload.ambientAudioUrl) {
          soundEngine.setAmbient(msg.payload.ambientAudioUrl, true, 0.5, true);
        }
        break;

      case 'SET_BACKGROUND':
        triggerBgTransition(msg.payload);
        setState((prev) => ({ ...prev, backgroundUrl: msg.payload }));
        break;

      case 'UPDATE_CHARACTERS':
        setState((prev) => ({ ...prev, characters: msg.payload }));
        break;

      case 'ADD_CHARACTER':
        setState((prev) => {
          const exists = prev.characters.some((c) => c.id === msg.payload.id);
          if (exists) {
            return {
              ...prev,
              characters: prev.characters.map((c) => (c.id === msg.payload.id ? msg.payload : c)),
            };
          }
          return { ...prev, characters: [...prev.characters, msg.payload] };
        });
        break;

      case 'REMOVE_CHARACTER':
        setState((prev) => ({
          ...prev,
          characters: prev.characters.filter((c) => c.id !== msg.payload.id),
        }));
        break;

      case 'SET_SPEAKING':
        setState((prev) => ({
          ...prev,
          characters: prev.characters.map((c) =>
            c.id === msg.payload.id
              ? { ...c, isSpeaking: msg.payload.isSpeaking }
              : { ...c, isSpeaking: false }
          ),
        }));
        break;

      case 'SET_CHARACTER_EXPRESSION':
        setState((prev) => ({
          ...prev,
          characters: prev.characters.map((c) =>
            c.id === msg.payload.id
              ? { ...c, avatarUrl: msg.payload.avatarUrl, activeExpression: msg.payload.expressionName }
              : c
          ),
        }));
        break;

      case 'SET_CHARACTER_POSITION':
        setState((prev) => ({
          ...prev,
          characters: prev.characters.map((c) =>
            c.id === msg.payload.id ? { ...c, position: msg.payload.position } : c
          ),
        }));
        break;

      case 'SET_WEATHER':
        setState((prev) => ({
          ...prev,
          weather: msg.payload.weather,
          weatherIntensity: msg.payload.intensity,
        }));
        break;

      case 'SET_LIGHTING':
        setState((prev) => ({ ...prev, lighting: msg.payload }));
        break;

      case 'TRIGGER_LIGHTNING':
        setState((prev) => ({ ...prev, lightningTrigger: Date.now() }));
        soundEngine.playSynth('thunder');
        break;

      case 'TRIGGER_SHAKE':
        setState((prev) => ({ ...prev, shakeTrigger: Date.now() }));
        break;

      case 'SET_BLACKOUT':
        setState((prev) => ({ ...prev, isBlackout: msg.payload }));
        break;

      case 'SET_BANNER':
        setState((prev) => ({ ...prev, locationBanner: msg.payload }));
        break;

      case 'START_COMBAT':
      case 'UPDATE_COMBAT':
        setState((prev) => ({
          ...prev,
          combatState: msg.payload,
        }));
        break;

      case 'END_COMBAT':
        setState((prev) => ({
          ...prev,
          combatState: {
            isActive: false,
            round: 1,
            currentTurnIndex: 0,
            combatants: [],
            turnTimerSeconds: 60,
            showTurnTimerToPlayers: true,
          },
        }));
        break;

      case 'NEXT_TURN':
      case 'PREV_TURN':
        setState((prev) => ({
          ...prev,
          combatState: {
            ...prev.combatState,
            currentTurnIndex: msg.payload.currentTurnIndex,
            round: msg.payload.round,
          },
        }));
        break;

      case 'PLAY_SFX':
        soundEngine.playTrack(msg.payload);
        setState((prev) => ({ ...prev, lastSfx: msg.payload }));
        break;

      case 'PLAY_SYNTH':
        soundEngine.playSynth(msg.payload);
        break;

      case 'SET_AMBIENT':
        soundEngine.setAmbient(
          msg.payload.url,
          msg.payload.playing,
          msg.payload.volume,
          msg.payload.crossfade
        );
        setState((prev) => ({
          ...prev,
          ambientAudioUrl: msg.payload.url,
          ambientPlaying: msg.payload.playing,
          ambientVolume: msg.payload.volume,
        }));
        break;

      default:
        console.warn('Unknown message received by Display:', msg);
    }
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

  return (
    <div
      className={`player-display-root ${state.isBlackout ? 'blackout' : ''}`}
      onMouseMove={handleMouseMove}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Background Layers for Smooth Crossfade */}
      {prevBg && (
        <div
          className="display-bg prev-bg"
          style={{ backgroundImage: `url(${prevBg})` }}
        />
      )}
      <div
        className={`display-bg active-bg ${isCrossfading ? 'fade-in' : ''}`}
        style={{ backgroundImage: `url(${activeBg})` }}
      />

      {/* Atmospheric Effects Canvas */}
      <AtmosphereCanvas
        weather={state.weather}
        intensity={state.weatherIntensity}
        lighting={state.lighting}
        shakeTrigger={state.shakeTrigger}
        lightningTrigger={state.lightningTrigger}
      />

      {/* Location / Scene Title Banner */}
      {state.locationBanner.visible && (
        <div className="location-banner">
          <h1 className="banner-title">{state.locationBanner.text}</h1>
          {state.locationBanner.subtitle && (
            <p className="banner-subtitle">{state.locationBanner.subtitle}</p>
          )}
        </div>
      )}

      {/* Active Characters Projection Layer */}
      <DisplayCharactersLayer characters={state.characters} />

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
