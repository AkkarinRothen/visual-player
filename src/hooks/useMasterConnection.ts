import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConnectionStatus, DisplayState, SyncMessage } from '../types';
import { peerService } from '../services/peerService';
import { sessionCommandBus, type MesaTelemetryInfo } from '../services/sessionCommandBus';
import { acquireServerSessionToken, startTurnRenewalWatcher } from '../services/iceConfig';

interface UseMasterConnectionOptions {
  initialRoomCode?: string;
  pairingSecret?: string;
  onFullStateRequested?: () => void;
}

export function useMasterConnection(options: UseMasterConnectionOptions = {}) {
  const { initialRoomCode, pairingSecret, onFullStateRequested } = options;
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode || '');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [mesaTelemetry, setMesaTelemetry] = useState<MesaTelemetryInfo | null>(() =>
    sessionCommandBus.getMesaTelemetry()
  );

  // Store latest callback in a ref to avoid infinite re-render reconnection storms
  const onFullStateRequestedRef = useRef(onFullStateRequested);
  onFullStateRequestedRef.current = onFullStateRequested;

  const hasConnectedRef = useRef<string | null>(null);

  const connectToRoom = useCallback(async (code: string, secret?: string) => {
    if (!code) return;
    try {
      setRoomCode(code);
      hasConnectedRef.current = code;
      sessionCommandBus.setSessionId(code);
      if (secret) {
        await acquireServerSessionToken(code, secret, 'master');
      }
      await peerService.connectAsMaster(code);
    } catch (e) {
      console.error('Master connection failed:', e);
    }
  }, []);

  const [pendingCommandsCount, setPendingCommandsCount] = useState<number>(0);

  const broadcastFullState = useCallback((state: DisplayState) => {
    sessionCommandBus.recordConfirmedState(state);
    peerService.send({
      type: 'FULL_STATE',
      payload: state,
    });
  }, []);

  const broadcastMessage = useCallback((msg: SyncMessage) => {
    peerService.send(msg);
  }, []);

  useEffect(() => {
    const activeCode = initialRoomCode || roomCode || 'VP-DEMO';
    sessionCommandBus.setSessionId(activeCode);
    const stopWatcher = startTurnRenewalWatcher(activeCode);

    if (initialRoomCode && hasConnectedRef.current !== initialRoomCode) {
      connectToRoom(initialRoomCode, pairingSecret);
    }

    const unsubStatus = peerService.onStatusChange((status, _, lat) => {
      setConnectionStatus(status);
      if (lat !== undefined) {
        setLatencyMs(lat);
      }
    });

    const unsubMsg = peerService.onMessage((msg) => {
      if (msg.type === 'REQUEST_FULL_STATE') {
        onFullStateRequestedRef.current?.();
      }
    });

    const unsubTelemetry = sessionCommandBus.onMesaTelemetry((telem) => {
      setMesaTelemetry(telem ? { ...telem } : null);
      setPendingCommandsCount(sessionCommandBus.getPendingCommandsCount());
    });

    const pendingInterval = setInterval(() => {
      setPendingCommandsCount(sessionCommandBus.getPendingCommandsCount());
    }, 300);

    return () => {
      clearInterval(pendingInterval);
      stopWatcher();
      unsubStatus();
      unsubMsg();
      unsubTelemetry();
      sessionCommandBus.cancelPendingCommands('Desconectado de la sala');
    };
  }, [initialRoomCode, pairingSecret, connectToRoom, roomCode]);

  return {
    roomCode,
    connectionStatus,
    latencyMs,
    mesaTelemetry,
    pendingCommandsCount,
    connectToRoom,
    broadcastFullState,
    broadcastMessage,
  };
}
