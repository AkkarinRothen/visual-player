import React, { useEffect, useState, useRef } from 'react';
import type { ConnectionStatus, DisplayState } from '../../types';
import { peerService } from '../../services/peerService';
import { soundEngine } from '../../services/soundEngine';
import { startTurnRenewalWatcher } from '../../services/iceConfig';
import { getPlatformBridge } from '../../platform';
import { AtmosphereCanvas } from '../canvas/AtmosphereCanvas';
import { InitiativeRibbon } from './InitiativeRibbon';
import { Maximize2, Minimize2, Wifi, WifiOff, Volume2, Sparkles, Activity, QrCode, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ConnectionDiagnosticModal } from '../common/ConnectionDiagnosticModal';
import { pairingEngine, type PairingPhaseInfo } from '../../services/pairingEngine';

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
      <div className="characters-container">
        {state.characters.map((char) => (
          <div
            key={char.id}
            className={`character-card ${char.isSpeaking ? 'speaking' : ''}`}
            style={{
              left: `${char.position}%`,
            }}
          >
            <div className="avatar-wrapper">
              <img
                src={char.avatarUrl}
                alt={char.name}
                className="character-avatar"
              />
              {char.isSpeaking && (
                <div className="speaking-indicator">
                  <Sparkles size={16} />
                </div>
              )}
            </div>
            <div className="character-tag">
              <span className="char-name">{char.name}</span>
              {char.activeExpression && (
                <span className="char-expression">({char.activeExpression})</span>
              )}
            </div>
          </div>
        ))}
      </div>

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
      {showPairingOverlay && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.85) 0%, rgba(2, 6, 23, 0.95) 100%)',
          backdropFilter: 'blur(12px)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: 'rgba(23, 23, 23, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
            color: '#f5f5f5',
            position: 'relative',
          }}>
            {/* Top Close / Minimize Button */}
            <button
              onClick={() => setIsOverlayMinimized(true)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '8px',
                color: '#94a3b8',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title="Ocultar QR y ver Escena"
            >
              <EyeOff size={14} />
              <span>Ocultar</span>
            </button>

            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#f59e0b',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <QrCode size={18} />
              <span>Sala de Jugadores Lista</span>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
              {pairingInfo.phase === 'PIN_CHALLENGE_PENDING'
                ? 'Autorización de Master Requerida'
                : 'Conecta el Control del Master (DM)'}
            </h2>

            {/* PIN Challenge Confirmation Card */}
            {pairingInfo.phase === 'PIN_CHALLENGE_PENDING' ? (
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                alignItems: 'center',
              }}>
                <ShieldAlert size={36} className="text-amber-400" />
                <p style={{ fontSize: '13px', color: '#d4d4d4', margin: 0 }}>
                  Un dispositivo está intentando conectarse con el PIN. Confirma que este código coincide con el de tu celular:
                </p>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  color: '#fbbf24',
                  fontFamily: 'monospace',
                  background: 'rgba(0,0,0,0.5)',
                  padding: '8px 24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                }}>
                  {pairingEngine.getActiveChallenge()?.challengeCode || '--- ---'}
                </div>
                <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
                  <button
                    onClick={() => pairingEngine.resetToIdle('Rechazado por el usuario en la Mesa')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#fca5a5',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => {
                      const challenge = pairingEngine.getActiveChallenge();
                      if (challenge) {
                        pairingEngine.verifyPinChallenge(challenge.challengeCode);
                        pairingEngine.advancePhase('CONTROL_READY', 'Aprobado manualmente en la Mesa');
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Aprobar Master
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* QR Code Container */}
                <div style={{
                  background: '#ffffff',
                  padding: '16px',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                  display: 'inline-flex',
                }}>
                  <QRCodeSVG
                    value={typeof window !== 'undefined' ? `${window.location.origin}/?join=${roomCode}&role=master` : roomCode}
                    size={170}
                    level="M"
                  />
                </div>

                {/* Room Code Big Display */}
                <div>
                  <p style={{ fontSize: '12px', color: '#a3a3a3', margin: '0 0 6px 0' }}>O introduce este PIN en tu celular:</p>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    color: '#fbbf24',
                    fontFamily: 'monospace',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '8px 24px',
                    borderRadius: '12px',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                  }}>
                    {roomCode}
                  </div>
                </div>
              </>
            )}

            {/* Pairing Progress Bar */}
            {pairingInfo.phase !== 'IDLE_WAITING' && (
              <div style={{ width: '100%', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#fbbf24', marginBottom: '4px' }}>
                  <span>{pairingInfo.message}</span>
                  <span>{pairingInfo.progressPercent}%</span>
                </div>
                <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pairingInfo.progressPercent}%`,
                    background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            )}

            <p style={{ fontSize: '12px', color: '#737373', margin: 0, lineHeight: 1.4 }}>
              Abre <strong>visual-player.vercel.app</strong> en tu celular, pulsa &quot;Escanear QR&quot; o introduce el PIN para controlar escenas, combates y música.
            </p>
          </div>
        </div>
      )}

      {/* Top HUD Controls */}
      <div className={`display-hud ${showControls ? 'visible' : 'hidden'}`}>
        <div className="hud-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowDiagnosticModal(true)}
            className={`connection-pill ${connectionStatus}`}
            style={{ cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
            title="Abrir Diagnóstico de Conexión"
          >
            {connectionStatus === 'connected' ? (
              <>
                <Wifi size={16} className="text-emerald-400" />
                <span>Master Conectado</span>
                {latencyMs > 0 && (
                  <span className="latency-badge">
                    <Activity size={12} /> {latencyMs}ms
                  </span>
                )}
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <div className="radar-dot"></div>
                <span>Sala: <strong>{roomCode}</strong></span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-amber-400" />
                <span>Esperando Master (PIN: {roomCode})</span>
              </>
            )}
          </button>

          {/* Re-open QR Button if minimized */}
          {isOverlayMinimized && (
            <button
              onClick={() => setIsOverlayMinimized(false)}
              className="hud-btn"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 10px' }}
              title="Mostrar Código QR y PIN"
            >
              <Eye size={14} />
              <span>Ver QR ({roomCode})</span>
            </button>
          )}
        </div>

        <div className="hud-right">
          {onExitToLobby && (
            <button className="hud-btn" onClick={onExitToLobby} title="Volver al Lobby">
              Salir
            </button>
          )}
          <button className="hud-btn icon-btn" onClick={toggleFullscreen} title="Pantalla Completa">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Connection Diagnostic Modal */}
      <ConnectionDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
      />
    </div>
  );
};
