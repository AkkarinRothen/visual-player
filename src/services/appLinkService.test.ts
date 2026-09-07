import { describe, expect, it } from 'vitest';
import { parseAppJoinUrl } from './appLinkService';

describe('parseAppJoinUrl', () => {
  it('parses query links and normalizes the room code', () => {
    expect(parseAppJoinUrl('visualplayer://join?join=vp-ab12&secret=top-secret')).toEqual({
      roomCode: 'VP-AB12',
      pairingSecret: 'top-secret',
    });
  });

  it('parses hash links used by the QR flow', () => {
    expect(parseAppJoinUrl('https://visual-player.app/#join=VP-CD34&secret=hash-secret')).toEqual({
      roomCode: 'VP-CD34',
      pairingSecret: 'hash-secret',
    });
  });

  it('ignores unrelated or malformed links', () => {
    expect(parseAppJoinUrl('visualplayer://settings')).toBeNull();
    expect(parseAppJoinUrl('not a url')).toBeNull();
  });
});
