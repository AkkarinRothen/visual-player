import React, { useEffect, useState, useRef } from 'react';
import type { ConnectionStatus, DisplayState } from '../../types';
import { peerService } from '../../services/peerService';
import { soundEngine } from '../../services/soundEngine';
import { startTurnRenewalWatcher } from '../../services/iceConfig';
import { AtmosphereCanvas } from '../canvas/AtmosphereCanvas';
import { InitiativeRibbon } from './InitiativeRibbon';
import { Maximize2, Minimize2, Wifi, WifiOff, Volume2, Sparkles, Activity } from 'lucide-react';

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

  // Core Display State
  const [state, setState] = useState<DisplayState>({
    sceneName: 'Cargando Aventura...',
    backgroundUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    characters: [],
    weather: 'fog',
    weatherIntensity: 0.5,
    lighting: 'torch_flicker',
    locationBanner: {
      text: 'ESPERANDO CONEXIÓN DEL MASTER',
      subtitle: 'Escanea el código QR o ingresa el PIN desde tu celular',
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

  // Initialize WebRTC Display Peer
  useEffect(() => {
    let unmounted = false;
    const stopWatcher = startTurnRenewalWatcher();

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

    return () => {
      unmounted = true;
      stopWatcher();
      unsubStatus();
      unsubMsg();
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

      {/* Top HUD Controls */}
      <div className={`display-hud ${showControls ? 'visible' : 'hidden'}`}>
        <div className="hud-left">
          <div className={`connection-pill ${connectionStatus}`}>
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
          </div>
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
    </div>
  );
};
