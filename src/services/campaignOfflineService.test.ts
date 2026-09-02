import { describe, it, expect, beforeEach } from 'vitest';
import { campaignOfflineService } from './campaignOfflineService';

describe('Campaign Offline Storage & Asset Caching Suite', () => {
  beforeEach(async () => {
    await campaignOfflineService.clearCache();
  });

  it('1. Computes deterministic SHA-256 checksum for campaign scenes', async () => {
    const campaign = {
      id: 'camp-123',
      title: 'La Mina Perdida',
      scenes: [
        { name: 'Entrada', backgroundUrl: 'https://images.unsplash.com/photo-test-1' },
        { name: 'Cámara Principal', backgroundUrl: 'https://images.unsplash.com/photo-test-2' },
      ],
    };

    const checksum1 = await campaignOfflineService.computeCampaignChecksum(campaign);
    const checksum2 = await campaignOfflineService.computeCampaignChecksum(campaign);

    expect(checksum1).toBe(checksum2);
    expect(checksum1.startsWith('sha256:')).toBe(true);
    expect(checksum1.length).toBe(71); // 'sha256:' (7 chars) + 64 hex chars = 71 chars
  });

  it('2. Fallback to original URL when asset is not yet cached locally', async () => {
    const url = 'https://images.unsplash.com/photo-uncached-123';
    const isCached = await campaignOfflineService.isCached(url);
    expect(isCached).toBe(false);

    const resolved = await campaignOfflineService.getAssetUrl(url);
    expect(resolved).toBe(url);
  });

  it('3. Pre-caches data URLs and serves them instantly', async () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const cached = await campaignOfflineService.cacheAsset(dataUrl, 'Pixel Test', 'image');
    expect(cached).toBe(true);

    const isCached = await campaignOfflineService.isCached(dataUrl);
    // data: URLs are treated as natively available
    expect(isCached).toBe(false); // not stored in DB because it's inline data URL

    const resolved = await campaignOfflineService.getAssetUrl(dataUrl);
    expect(resolved).toBe(dataUrl);
  });
});
