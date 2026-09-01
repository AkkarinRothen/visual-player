export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceFetchOptions {
  roomId?: string;
  forceRelay?: boolean;
  forceRefresh?: boolean;
}

export const DEFAULT_STUN_SERVERS: IceServerConfig[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

let cachedTurnServers: IceServerConfig[] | null = null;
let cacheExpiresAt: number = 0;
let renewalTimer: number | null = null;
let activeRoomId: string = 'VP-DEMO';
let isSessionActive: boolean = false;

/**
 * Creates an ephemeral base64 session token with anti-replay timestamp.
 */
export function createClientSessionToken(roomId: string = activeRoomId): string {
  const payload = {
    roomId: roomId.toUpperCase().trim(),
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 10),
  };
  return btoa(JSON.stringify(payload));
}

/**
 * Fetches ephemeral TURN credentials from the serverless endpoint using session token authentication.
 */
export async function fetchEphemeralTurnServers(
  roomId: string = activeRoomId,
  forceRefresh: boolean = false
): Promise<IceServerConfig[]> {
  const now = Date.now();
  activeRoomId = roomId;

  if (!forceRefresh && cachedTurnServers && now < cacheExpiresAt) {
    return cachedTurnServers;
  }

  try {
    const token = createClientSessionToken(roomId);
    const response = await fetch('/api/turn-credentials', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Session-Token': token,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.iceServers && Array.isArray(data.iceServers)) {
        cachedTurnServers = data.iceServers;
        const ttlSec = data.ttl || 1800;
        cacheExpiresAt = now + ttlSec * 1000;

        // Schedule proactive renewal at 75% of TTL if session is active
        if (isSessionActive) {
          scheduleProactiveRenewal(roomId, ttlSec * 0.75 * 1000);
        }

        return cachedTurnServers!;
      }
    } else if (response.status === 429) {
      console.warn('[IceConfig] Rate limit reached on TURN credentials endpoint. Using cached or STUN.');
    } else if (response.status === 500) {
      console.log('[IceConfig] TURN service not configured on server. Falling back to STUN direct NAT.');
    }
  } catch (err) {
    console.log('[IceConfig] Serverless TURN endpoint not reachable, operating in STUN direct mode.');
  }

  return [];
}

/**
 * Schedules a background renewal before the current TURN token expires.
 */
function scheduleProactiveRenewal(roomId: string, delayMs: number): void {
  if (renewalTimer) {
    clearTimeout(renewalTimer);
  }

  renewalTimer = window.setTimeout(async () => {
    if (isSessionActive) {
      console.log('[IceConfig] Proactively renewing TURN credentials at 75% TTL...');
      await fetchEphemeralTurnServers(roomId, true);
    }
  }, Math.max(5000, delayMs));
}

/**
 * Starts watching session activity for proactive TURN token renewals and network reconnects.
 */
export function startTurnRenewalWatcher(
  roomId: string = 'VP-DEMO',
  onRenewed?: (servers: IceServerConfig[]) => void
): () => void {
  isSessionActive = true;
  activeRoomId = roomId;

  // Immediate check & schedule
  fetchEphemeralTurnServers(roomId).then((servers) => {
    if (onRenewed && servers.length > 0) {
      onRenewed(servers);
    }
  });

  // Re-fetch on network recovery (e.g. WiFi reconnect or switching to cellular)
  const handleOnline = async () => {
    console.log('[IceConfig] Network online detected, fetching fresh TURN credentials...');
    const refreshed = await fetchEphemeralTurnServers(activeRoomId, true);
    if (onRenewed && refreshed.length > 0) {
      onRenewed(refreshed);
    }
  };

  window.addEventListener('online', handleOnline);

  return () => {
    isSessionActive = false;
    if (renewalTimer) {
      clearTimeout(renewalTimer);
      renewalTimer = null;
    }
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * Builds the complete RTCConfiguration with STUN and TURN fallback.
 */
export async function getIceConfiguration(
  options: IceFetchOptions = {}
): Promise<RTCConfiguration> {
  const { roomId = 'VP-DEMO', forceRelay = false, forceRefresh = false } = options;
  const turnServers = await fetchEphemeralTurnServers(roomId, forceRefresh);

  const iceServers: IceServerConfig[] = [
    ...DEFAULT_STUN_SERVERS,
    ...turnServers,
  ];

  return {
    iceServers: iceServers as RTCIceServer[],
    iceTransportPolicy: forceRelay ? 'relay' : 'all',
    iceCandidatePoolSize: 2,
  };
}
