export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceFetchOptions {
  forceRelay?: boolean;
}

export const DEFAULT_STUN_SERVERS: IceServerConfig[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

let cachedTurnServers: IceServerConfig[] | null = null;
let cacheExpiresAt: number = 0;

/**
 * Fetches ephemeral TURN credentials from the serverless endpoint if available.
 */
export async function fetchEphemeralTurnServers(): Promise<IceServerConfig[]> {
  const now = Date.now();
  if (cachedTurnServers && now < cacheExpiresAt) {
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
        // Cache for 30 minutes (TTL)
        cacheExpiresAt = now + (data.ttl ? data.ttl * 1000 : 1800000);
        return cachedTurnServers!;
      }
    }
  } catch (err) {
    // Gracefully handle offline or local development without serverless API
    console.log('[IceConfig] Serverless TURN endpoint not reached, using standard STUN configuration.');
  }

  return [];
}

/**
 * Builds the complete RTCConfiguration with STUN and TURN fallback.
 */
export async function getIceConfiguration(
  options: IceFetchOptions = {}
): Promise<RTCConfiguration> {
  const { forceRelay = false } = options;
  const turnServers = await fetchEphemeralTurnServers();

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
