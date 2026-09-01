import { useState, useEffect, useCallback } from 'react';
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

  const connectToRoom = useCallback(async (code: string, secret?: string) => {
    try {
      setRoomCode(code);
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
    const activeCode = roomCode || initialRoomCode || 'VP-DEMO';
    const stopWatcher = startTurnRenewalWatcher(activeCode);

    if (initialRoomCode) {
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
        onFullStateRequested?.();
      }
    });

    return () => {
      stopWatcher();
      unsubStatus();
      unsubMsg();
    };
  }, [initialRoomCode, connectToRoom, onFullStateRequested]);

  return {
    roomCode,
    connectionStatus,
    latencyMs,
    connectToRoom,
    broadcastFullState,
    broadcastMessage,
  };
}
