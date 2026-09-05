import React, { useEffect, useState, useRef } from 'react';
import type { ConnectionStatus, DisplayState, WeatherStormEvent } from '../../types';
import type { DisplayAssetsStatus } from '../../domain/protocol/types';
import { peerService } from '../../services/peerService';
import { soundEngine } from '../../services/soundEngine';
import { startTurnRenewalWatcher } from '../../services/iceConfig';
import { getPlatformBridge } from '../../platform';
import { StageViewport } from './StageViewport';
import { Volume2 } from 'lucide-react';
import { ConnectionDiagnosticModal } from '../common/ConnectionDiagnosticModal';
import { pairingEngine, type PairingPhaseInfo } from '../../services/pairingEngine';
import { displayCommandExecutor } from '../../services/displayCommandExecutor';
import { DisplayPairingOverlay } from './DisplayPairingOverlay';
import { DisplayHUD } from './DisplayHUD';
import { HandoutDisplayLayer } from './HandoutDisplayLayer';
import { RecapDisplayLayer } from './RecapDisplayLayer';
import { APP_VERSION, BUILD_ID, PROTOCOL_VERSION, APP_CAPABILITIES } from '../../version';
import { videoChunkSyncService } from '../../services/videoChunkSyncService';
import { db } from '../../db';

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

  // Real assets loading tracker (Preguntas 4 y 5)
  const [assetsStatus, setAssetsStatus] = useState<DisplayAssetsStatus>({
    isReady: true,
    missingCount: 0,
    failedCount: 0,
  });
  const assetsStatusRef = useRef<DisplayAssetsStatus>(assetsStatus);
  assetsStatusRef.current = assetsStatus;

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

    const unsubMsg = peerService.onMessage((msg: any) => {
      if (msg && msg.type === 'AUDIT_MESA_REQUEST') {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
        const isAudioUnlocked = typeof (soundEngine as any).isUnlocked === 'function' ? (soundEngine as any).isUnlocked() : true;
        peerService.send({
          type: 'AUDIT_MESA_RESPONSE',
          payload: {
            deviceId: peerService.getMyId() || 'mesa-display',
            appVersion: APP_VERSION,
            buildId: BUILD_ID,
            protocolVersion: PROTOCOL_VERSION,
            capabilities: APP_CAPABILITIES,
            sessionId: initialRoomCode || 'mesa-session',
            revision: displayCommandExecutor.getCurrentRevision(),
            checksum: displayCommandExecutor.getLastChecksum(),
            viewport: {
              width: w,
              height: h,
              aspectRatio: h > 0 ? Number((w / h).toFixed(3)) : 1.778,
            },
            assetsStatus: assetsStatusRef.current,
            audioStatus: isAudioUnlocked ? 'enabled' : 'interaction_required',
            timestamp: Date.now(),
          },
        });
        return;
      }
      if (msg && msg.type === 'VIDEO_CHUNK_TRANSFER') {
        videoChunkSyncService.receiveChunk(msg.payload).then((progress) => {
          if (progress.isComplete && progress.dataUrl) {
            setState((prev) => ({
              ...prev,
              videoConfig: prev.videoConfig ? { ...prev.videoConfig } : undefined,
            }));
          }
        }).catch((err) => {
          console.warn('[PlayerDisplay] Error receiving video chunk:', err);
        });
        return;
      }
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

  const loadGenerationRef = useRef<number>(0);

  // Track image downloads and broken resources reactively (Preguntas 4, 5 y 9)
  useEffect(() => {
    loadGenerationRef.current++;
    const currentGeneration = loadGenerationRef.current;

    const urls: string[] = [];
    if (state.backgroundUrl) urls.push(state.backgroundUrl);
    state.characters.forEach((c) => {
      if (c.avatarUrl) urls.push(c.avatarUrl);
      if ((c as any).expressionUrl) urls.push((c as any).expressionUrl);
    });
    state.props?.forEach((p) => {
      if (p.assetUrl) urls.push(p.assetUrl);
    });
    if (state.activeHandout?.imageUrl) {
      urls.push(state.activeHandout.imageUrl);
    }
    if (state.dialogue?.avatarUrl) {
      urls.push(state.dialogue.avatarUrl);
    }

    if (urls.length === 0) {
      const readyStatus: DisplayAssetsStatus = { isReady: true, missingCount: 0, failedCount: 0 };
      setAssetsStatus(readyStatus);
      return;
    }

    let isCancelled = false;
    let pending = 0;
    let failed = 0;

    const checkAndBroadcast = () => {
      // Isolation guarantee (Pregunta 5): discard completions from older scenes/epochs
      if (isCancelled || currentGeneration !== loadGenerationRef.current) return;
      const updated: DisplayAssetsStatus = {
        isReady: pending === 0 && failed === 0,
        missingCount: pending,
        failedCount: failed,
      };
      setAssetsStatus(updated);

      // Immediately notify Master so that GM indicators update WITHOUT needing another command!
      const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
      const isAudioUnlocked = typeof (soundEngine as any).isUnlocked === 'function' ? (soundEngine as any).isUnlocked() : true;
      peerService.send({
        type: 'MESA_VIEWPORT_CHANGED',
        payload: {
          viewport: {
            width: w,
            height: h,
            aspectRatio: h > 0 ? Number((w / h).toFixed(3)) : 16 / 9,
          },
          assetsStatus: updated,
          audioStatus: isAudioUnlocked ? 'enabled' : 'interaction_required',
        },
      });
    };

    urls.forEach((url) => {
      if (typeof window === 'undefined' || typeof window.Image === 'undefined') return;
      const img = new window.Image();
      img.src = url;
      if (!img.complete) {
        pending++;
        img.onload = () => {
          pending = Math.max(0, pending - 1);
          checkAndBroadcast();
        };
        img.onerror = () => {
          pending = Math.max(0, pending - 1);
          failed++;
          checkAndBroadcast();
        };
      } else if (img.naturalWidth === 0) {
        failed++;
      }
    });

    const initialStatus = {
      isReady: pending === 0 && failed === 0,
      missingCount: pending,
      failedCount: failed,
    };
    setAssetsStatus(initialStatus);

    return () => {
      isCancelled = true;
    };
  }, [state.backgroundUrl, state.characters, state.props]);

  // Consulta automática de fragmentos de video al Master si no existen en IndexedDB local
  useEffect(() => {
    const assetId = state.videoConfig?.videoAssetId;
    if (!assetId) return;

    db.assets.get(assetId).then((found) => {
      if (!found || !found.dataUrl) {
        peerService.send({
          type: 'VIDEO_AVAILABILITY_QUERY',
          payload: {
            assetId,
            sha256: (state.videoConfig as any)?.sha256,
          },
        });
      }
    }).catch(() => {});
  }, [state.videoConfig?.videoAssetId]);

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
      getViewportInfo: () => {
        const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
        const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
        return {
          width: w,
          height: h,
          aspectRatio: h > 0 ? Number((w / h).toFixed(3)) : 16 / 9,
        };
      },
      getAssetsStatus: () => assetsStatusRef.current,
      getAudioStatus: () => {
        const isUnlocked = typeof (soundEngine as any).isUnlocked === 'function' ? (soundEngine as any).isUnlocked() : true;
        return isUnlocked ? 'enabled' : 'interaction_required';
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

  // Real-time viewport telemetry on orientation or window resize (even without new scene commands)
  useEffect(() => {
    let resizeTimer: number;
    const handleResizeOrOrientation = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (typeof window === 'undefined') return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const isAudioUnlocked = typeof (soundEngine as any).isUnlocked === 'function' ? (soundEngine as any).isUnlocked() : true;
        peerService.send({
          type: 'MESA_VIEWPORT_CHANGED',
          payload: {
            viewport: {
              width: w,
              height: h,
              aspectRatio: h > 0 ? Number((w / h).toFixed(3)) : 16 / 9,
            },
            assetsStatus: assetsStatusRef.current,
            audioStatus: isAudioUnlocked ? 'enabled' : 'interaction_required',
          },
        });
      }, 150);
    };

    window.addEventListener('resize', handleResizeOrOrientation);
    window.addEventListener('orientationchange', handleResizeOrOrientation);
    document.addEventListener('fullscreenchange', handleResizeOrOrientation);
    document.addEventListener('visibilitychange', handleResizeOrOrientation);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResizeOrOrientation);
      window.removeEventListener('orientationchange', handleResizeOrOrientation);
      document.removeEventListener('fullscreenchange', handleResizeOrOrientation);
      document.removeEventListener('visibilitychange', handleResizeOrOrientation);
    };
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Error attempting exit fullscreen:', err);
      });
      setIsFullscreen(false);
    }
  };

  // Handle user activity to show HUD
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      window.clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  // Audio unlock banner and physical interaction handler (Pregunta 7: intento frente a resultado confirmado)
  const unlockAudio = async () => {
    const isRunning = await soundEngine.unlockAudio();
    if (isRunning) {
      setAudioUnlocked(true);
      // Broadcast confirmed enabled state to Master
      const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
      peerService.send({
        type: 'MESA_VIEWPORT_CHANGED',
        payload: {
          viewport: {
            width: w,
            height: h,
            aspectRatio: h > 0 ? Number((w / h).toFixed(3)) : 16 / 9,
          },
          assetsStatus: assetsStatusRef.current,
          audioStatus: 'enabled',
        },
      });
    } else {
      console.warn('[PlayerDisplay] Audio touch gesture did not transition AudioContext to running');
    }
  };

  return (
    <div
      className={`player-display-root ${state.isBlackout ? 'blackout' : ''}`}
      onMouseMove={handleMouseMove}
      onClick={unlockAudio}
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* ─── UNIFIED STAGE VIEWPORT (BACKGROUND, CAMERA, CHARACTERS, ATMOSPHERE, BANNER, DIALOGUE, COMBAT) ─── */}
      <StageViewport
        state={state}
        prevBg={prevBg}
        isCrossfading={isCrossfading}
        showBanner={true}
      />

      {/* Handout, Document & Map Projection Layer */}
      <HandoutDisplayLayer handout={state.activeHandout} />

      {/* Opening Cinematic Recap Layer ("Anteriormente en la campaña...") */}
      <RecapDisplayLayer recap={state.activeRecap} />

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
