import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';

/**
 * Serverless API handler to issue ephemeral TURN credentials (HMAC-SHA1 standard for Coturn/Metered/Twilio).
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const ttlSeconds = 1800; // 30 minutes
  const expiryTimestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiryTimestamp}:visual-player-session`;

  const turnSecret = process.env.TURN_SECRET;
  let credential = '';

  if (turnSecret) {
    const hmac = crypto.createHmac('sha1', turnSecret);
    hmac.update(username);
    credential = hmac.digest('base64');
  } else {
    // Development fallback
    credential = 'visual-player-turn-dev-credential';
  }

  const turnDomain = process.env.TURN_DOMAIN || 'turn.visualplayer.app';

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: [
        `turn:${turnDomain}:3478?transport=udp`,
        `turn:${turnDomain}:3478?transport=tcp`,
        `turns:${turnDomain}:5349?transport=tcp`,
      ],
      username,
      credential,
    },
  ];

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(
    JSON.stringify({
      iceServers,
      ttl: ttlSeconds,
      timestamp: Date.now(),
    })
  );
}
