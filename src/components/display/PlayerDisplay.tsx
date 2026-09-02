import React, { useEffect, useState, useRef } from 'react';
import type { ConnectionStatus, DisplayState } from '../../types';
import { peerService } from '../../services/peerService';
import { soundEngine } from '../../services/soundEngine';
import { startTurnRenewalWatcher } from '../../services/iceConfig';
import { getPlatformBridge } from '../../platform';
import { AtmosphereCanvas } from '../canvas/AtmosphereCanvas';
import { InitiativeRibbon } from './InitiativeRibbon';
import { Maximize2, Minimize2, Wifi, WifiOff, Volume2, Sparkles, Activity, QrCode, ShieldAlert } from 'lucide-react';
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

      case 'PLAY_SFX':
        if (msg.payload.synthPreset) {
          soundEngine.playSynth(msg.payload.synthPreset);
        } else if (msg.payload.audioUrl) {
          soundEngine.playAudioUrl(msg.payload.audioUrl);
        }
        break;

      case 'SET_AMBIENT':
        setState((prev) => ({
          ...prev,
          ambientAudioUrl: msg.payload.url,
          ambientPlaying: msg.payload.playing,
          ambientVolume: msg.payload.volume,
        }));
        soundEngine.setAmbient(
          msg.payload.url,
          msg.payload.playing,
          msg.payload.volume,
          msg.payload.crossfade ?? true
        );
        break;

      case 'START_COMBAT':
      case 'UPDATE_COMBAT':
        setState((prev) => ({
          ...prev,
          combatState: msg.payload,
        }));
        break;

      case 'TURN_TIMER_TICK':
        setState((prev) => ({
          ...prev,
          combatState: {
            ...prev.combatState,
            turnTimerSeconds: msg.payload.seconds,
            isTimerRunning: msg.payload.isRunning,
            showTurnTimerToPlayers: msg.payload.showToPlayers,
          },
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
          },
        }));
        break;
    }
  };

  const triggerBgTransition = (newUrl: string) => {
    if (newUrl === activeBg) return;
    setPrevBg(activeBg);
    setActiveBg(newUrl);
    setIsCrossfading(true);
    setTimeout(() => {
      setIsCrossfading(false);
      setPrevBg(null);
    }, 900);
  };

  // Auto-hide controls when cursor is idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const unlockAudio = () => {
    soundEngine.playSynth('magic_spell');
    setAudioUnlocked(true);
  };

  // Group characters by position slot
  const renderCharacterSlot = (pos: 'left' | 'center-left' | 'center-right' | 'right') => {
    const chars = state.characters.filter((c) => c.position === pos);
    if (chars.length === 0) return null;

    return (
      <div key={pos} className={`character-slot slot-${pos}`}>
        {chars.map((char) => {
          const hasAnySpeaker = state.characters.some((c) => c.isSpeaking);
          const isDimmed = hasAnySpeaker && !char.isSpeaking;

          return (
            <div
              key={char.id}
              className={`character-card ${char.isSpeaking ? 'is-speaking' : ''} ${
                isDimmed ? 'is-dimmed' : ''
              }`}
            >
              {char.isSpeaking && (
                <div className="speaking-aura">
                  <div className="speaking-wave"></div>
                </div>
              )}

              <div className="avatar-frame">
                <img src={char.avatarUrl} alt={char.name} className="avatar-img" />
                {char.activeExpression && char.activeExpression !== 'Neutral' && (
                  <span className="expression-badge">{char.activeExpression}</span>
                )}
              </div>

              <div className="nameplate">
                <span className="character-name">{char.name}</span>
                {char.statusBadge && <span className="status-tag">{char.statusBadge}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`player-display-root ${state.shakeTrigger > 0 ? 'screen-shake' : ''}`}
      key={state.shakeTrigger}
      onMouseMove={handleMouseMove}
    >
      {/* Background Layers with Crossfade */}
      {prevBg && (
        <div
          className="background-layer prev-bg"
          style={{ backgroundImage: `url(${prevBg})` }}
        />
      )}
      <div
        className={`background-layer current-bg ${isCrossfading ? 'crossfading' : ''}`}
        style={{ backgroundImage: `url(${activeBg})` }}
      />

      {/* Atmospheric Particles & Lighting Canvas */}
      <AtmosphereCanvas
        weather={state.weather}
        intensity={state.weatherIntensity}
        lighting={state.lighting}
        lightningTrigger={state.lightningTrigger}
      />

      {/* Initiative & Combat Ribbon (Top) */}
      {state.combatState?.isActive && (
        <InitiativeRibbon combatState={state.combatState} />
      )}

      {/* Cinematic Location Banner (Hidden during combat for clean view) */}
      {!state.combatState?.isActive && state.locationBanner?.visible && state.locationBanner.text && (
        <div className="cinematic-banner-container">
          <div className="cinematic-banner">
            <div className="banner-rune-left">✦</div>
            <div className="banner-content">
              <h1 className="banner-title">{state.locationBanner.text}</h1>
              {state.locationBanner.subtitle && (
                <p className="banner-subtitle">{state.locationBanner.subtitle}</p>
              )}
            </div>
            <div className="banner-rune-right">✦</div>
          </div>
        </div>
      )}

      {/* Character Standees Stage */}
      <div className="character-stage">
        {renderCharacterSlot('left')}
        {renderCharacterSlot('center-left')}
        {renderCharacterSlot('center-right')}
        {renderCharacterSlot('right')}
      </div>

      {/* Blackout Curtain */}
      <div className={`blackout-curtain ${state.isBlackout ? 'active' : ''}`}>
        <div className="blackout-rune">
          <Sparkles size={48} className="spin-slow" />
          <span>Momento de suspenso...</span>
        </div>
      </div>

      {/* Audio Unlock Overlay */}
      {!audioUnlocked && (
        <button className="audio-unlock-btn" onClick={unlockAudio}>
          <Volume2 size={20} />
          <span>Activar Audio de la Sesión</span>
        </button>
      )}

      {/* DM Connection Waiting Overlay (Shows Room Code, QR & Pairing Progress) */}
      {pairingInfo.phase !== 'CONTROL_READY' && roomCode && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.85) 0%, rgba(0, 0, 0, 0.95) 100%)',
          backdropFilter: 'blur(8px)',
          zIndex: 40,
          padding: '24px',
        }}>
          <div style={{
            background: 'rgba(23, 23, 23, 0.95)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
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
          }}>
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
        <div className="hud-left">
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
