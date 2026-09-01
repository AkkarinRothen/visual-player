export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceFetchOptions {
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
let isSessionActive: boolean = false;

/**
 * Fetches ephemeral TURN credentials from the serverless endpoint if available.
 */
export async function fetchEphemeralTurnServers(forceRefresh: boolean = false): Promise<IceServerConfig[]> {
  const now = Date.now();
  if (!forceRefresh && cachedTurnServers && now < cacheExpiresAt) {
    return cachedTurnServers;
  }

  try {
    const response = await fetch('/api/turn-credentials', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.iceServers && Array.isArray(data.iceServers)) {
        cachedTurnServers = data.iceServers;
        const ttlSec = data.ttl || 1800;
        cacheExpiresAt = now + ttlSec * 1000;

        // Schedule proactive renewal at 75% of TTL if session is active
        if (isSessionActive) {
          scheduleProactiveRenewal(ttlSec * 0.75 * 1000);
        }

        return cachedTurnServers!;
      }
    }
  } catch (err) {
    console.log('[IceConfig] Serverless TURN endpoint not reached, using standard STUN configuration.');
  }

  return [];
}

/**
 * Schedules a background renewal before the current TURN token expires.
 */
function scheduleProactiveRenewal(delayMs: number): void {
  if (renewalTimer) {
    clearTimeout(renewalTimer);
  }

  renewalTimer = window.setTimeout(async () => {
    if (isSessionActive) {
      console.log('[IceConfig] Proactively renewing TURN credentials at 75% TTL...');
      await fetchEphemeralTurnServers(true);
    }
  }, Math.max(5000, delayMs));
}

/**
 * Starts watching session activity for proactive TURN token renewals and network reconnects.
 */
export function startTurnRenewalWatcher(onRenewed?: (servers: IceServerConfig[]) => void): () => void {
  isSessionActive = true;

  // Immediate check & schedule
  fetchEphemeralTurnServers().then((servers) => {
    if (onRenewed && servers.length > 0) {
      onRenewed(servers);
    }
  });

  // Re-fetch on network recovery (e.g. WiFi reconnect or switching to cellular)
  const handleOnline = async () => {
    console.log('[IceConfig] Network online detected, fetching fresh TURN credentials...');
    const refreshed = await fetchEphemeralTurnServers(true);
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
  const { forceRelay = false, forceRefresh = false } = options;
  const turnServers = await fetchEphemeralTurnServers(forceRefresh);

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
