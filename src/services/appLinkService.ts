export interface AppJoinLink {
  roomCode: string;
  pairingSecret: string;
}

/** Extracts a Visual Player join link without throwing on unrelated app URLs. */
export function parseAppJoinUrl(url: string): AppJoinLink | null {
  try {
    const parsedUrl = new URL(url);
    const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
    const roomCode = parsedUrl.searchParams.get('join') || hashParams.get('join');
    if (!roomCode?.trim()) return null;

    return {
      roomCode: roomCode.trim().toUpperCase(),
      pairingSecret: parsedUrl.searchParams.get('secret') || hashParams.get('secret') || '',
    };
  } catch {
    return null;
  }
}
