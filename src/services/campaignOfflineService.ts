import { db, type StoredAsset } from '../db';
import { computeStateChecksum } from './sessionRecovery';

export interface CacheProgressInfo {
  total: number;
  cached: number;
  failed: number;
  currentAsset?: string;
}

export class CampaignOfflineService {
  private memoryFallbackAssets: Map<string, StoredAsset> = new Map();

  /**
   * Pre-caches image and audio assets for offline gameplay with resilient fallback.
   */
  public async cacheAsset(url: string, name: string, type: 'image' | 'audio'): Promise<boolean> {
    if (!url || url.startsWith('data:')) return true;

    try {
      // Check if already in Dexie or memory store
      if (this.memoryFallbackAssets.has(url)) return true;

      try {
        const existing = await db.assets.get(url);
        if (existing) return true;
      } catch {
        // Dexie may be unavailable in test environments
      }

      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) return false;

      const blob = await response.blob();
      const reader = new FileReader();

      return new Promise<boolean>((resolve) => {
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          const asset: StoredAsset = {
            id: url,
            name,
            type,
            dataUrl,
            createdAt: Date.now(),
          };

          this.memoryFallbackAssets.set(url, asset);

          try {
            await db.assets.put(asset);
          } catch {
            // Memory fallback stored
          }
          resolve(true);
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('[CampaignOffline] Failed to cache asset:', url, err);
      return false;
    }
  }

  /**
   * Retrieves the offline data URL for an asset, falling back to original URL.
   */
  public async getAssetUrl(originalUrl: string): Promise<string> {
    if (!originalUrl || originalUrl.startsWith('data:')) return originalUrl;

    if (this.memoryFallbackAssets.has(originalUrl)) {
      return this.memoryFallbackAssets.get(originalUrl)!.dataUrl;
    }

    try {
      const stored = await db.assets.get(originalUrl);
      if (stored && stored.dataUrl) {
        return stored.dataUrl;
      }
    } catch {
      // Fallback
    }
    return originalUrl;
  }

  /**
   * Validates if an asset is cached locally in Dexie or memory.
   */
  public async isCached(url: string): Promise<boolean> {
    if (!url) return false;
    if (this.memoryFallbackAssets.has(url)) return true;

    try {
      const stored = await db.assets.get(url);
      return Boolean(stored && stored.dataUrl);
    } catch {
      return false;
    }
  }

  /**
   * Pre-caches all background URLs and character avatars for a campaign.
   */
  public async cacheCampaignScenes(
    scenes: Array<{ name: string; backgroundUrl: string }>,
    onProgress?: (info: CacheProgressInfo) => void
  ): Promise<CacheProgressInfo> {
    const total = scenes.length;
    let cached = 0;
    let failed = 0;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (onProgress) {
        onProgress({ total, cached, failed, currentAsset: scene.name });
      }

      const success = await this.cacheAsset(scene.backgroundUrl, scene.name, 'image');
      if (success) {
        cached++;
      } else {
        failed++;
      }
    }

    const finalInfo = { total, cached, failed };
    if (onProgress) onProgress(finalInfo);
    return finalInfo;
  }

  /**
   * Computes a deterministic SHA-256 fingerprint for campaign offline integrity.
   */
  public async computeCampaignChecksum(campaignData: any): Promise<string> {
    return await computeStateChecksum(campaignData);
  }

  /**
   * Clears cached offline assets.
   */
  public async clearCache(): Promise<void> {
    this.memoryFallbackAssets.clear();
    try {
      await db.assets.clear();
    } catch {
      // IndexedDB may be unavailable in test environments
    }
  }
}

export const campaignOfflineService = new CampaignOfflineService();
