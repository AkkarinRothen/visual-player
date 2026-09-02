import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConnectionStatus, DisplayState, SyncMessage } from '../types';
import { peerService } from '../services/peerService';
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

  // Store latest callback in a ref to avoid infinite re-render reconnection storms
  const onFullStateRequestedRef = useRef(onFullStateRequested);
  onFullStateRequestedRef.current = onFullStateRequested;

  const hasConnectedRef = useRef<string | null>(null);

  const connectToRoom = useCallback(async (code: string, secret?: string) => {
    if (!code) return;
    try {
      setRoomCode(code);
      hasConnectedRef.current = code;
      if (secret) {
        await acquireServerSessionToken(code, secret, 'master');
      }
      await peerService.connectAsMaster(code);
    } catch (e) {
      console.error('Master connection failed:', e);
    }
  }, []);

  const broadcastFullState = useCallback((state: DisplayState) => {
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

    return () => {
      stopWatcher();
      unsubStatus();
      unsubMsg();
    };
  }, [initialRoomCode, pairingSecret, connectToRoom]);

  return {
    roomCode,
    connectionStatus,
    latencyMs,
    connectToRoom,
    broadcastFullState,
    broadcastMessage,
  };
}
