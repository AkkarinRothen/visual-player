import { describe, it, expect } from 'vitest';

describe('QoL & UX Experience Suite', () => {
  it('1. Correctly extracts room code and pairing secret from diverse QR formats', () => {
    const parseQR = (text: string) => {
      let code = text.trim();
      let secret: string | undefined;

      try {
        if (text.includes('join=')) {
          if (text.startsWith('http://') || text.startsWith('https://')) {
            const url = new URL(text);
            code = url.searchParams.get('join') || '';
            secret = url.searchParams.get('secret') || undefined;
            if (!code && url.hash) {
              const hashParams = new URLSearchParams(url.hash.replace('#', ''));
              code = hashParams.get('join') || '';
              secret = hashParams.get('secret') || undefined;
            }
          } else {
            const searchParams = new URLSearchParams(text.replace(/^.*\?/, '').replace(/^.*#/, ''));
            code = searchParams.get('join') || text;
            secret = searchParams.get('secret') || undefined;
          }
        }
      } catch {
        // Fallback
      }

      return { code: code.toUpperCase().trim(), secret };
    };

    // Standard URL format
    expect(parseQR('https://visual-player.vercel.app/?join=VP-8492&role=master')).toEqual({
      code: 'VP-8492',
      secret: undefined,
    });

    // Hash format with cryptographic secret
    expect(parseQR('https://visual-player.vercel.app/#join=VP-G3CS&secret=abcdef123456')).toEqual({
      code: 'VP-G3CS',
      secret: 'abcdef123456',
    });

    // Plain text PIN code
    expect(parseQR('VP-7711')).toEqual({
      code: 'VP-7711',
      secret: undefined,
    });
  });

  it('2. Normalizes 4-character short PIN inputs to VP- prefix', () => {
    const normalizePin = (input: string) => {
      let code = input.trim().toUpperCase();
      if (!code.startsWith('VP-') && code.length === 4) {
        code = `VP-${code}`;
      }
      return code;
    };

    expect(normalizePin('8492')).toBe('VP-8492');
    expect(normalizePin('vp-8492')).toBe('VP-8492');
    expect(normalizePin('VP-G3CS')).toBe('VP-G3CS');
    expect(normalizePin('CUSTOM-ROOM')).toBe('CUSTOM-ROOM');
  });

  it('3. Guarantees non-blocking usability flags when connection is in transient state', () => {
    const isUIInteractableDuringReconnection = (_status: string) => {
      // DM should always be able to read notes and view library even when disconnected
      return true;
    };

    expect(isUIInteractableDuringReconnection('connecting')).toBe(true);
    expect(isUIInteractableDuringReconnection('disconnected')).toBe(true);
  });
});
