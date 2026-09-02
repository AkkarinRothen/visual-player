import type {
  PlatformBridge,
  IScreenBridge,
  ISecureStorageBridge,
  INetworkBridge,
  ILifecycleBridge,
  IDeepLinkBridge,
  ScreenOrientationMode,
  NetworkStatusInfo,
  NetworkStatusCallback,
  LegacyNetworkStatusCallback,
  BackButtonCallback,
  DeepLinkCallback,
} from './types';

class WebScreenBridge implements IScreenBridge {
  private wakeLockSentinel: WakeLockSentinel | null = null;
  private shouldKeepAwake = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && this.shouldKeepAwake) {
          await this.acquireWakeLock();
        }
      });
    }
  }

  private async acquireWakeLock(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await navigator.wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
        return true;
      } catch (err) {
        console.warn('[WebScreenBridge] Wake Lock request failed:', err);
      }
    }
    return false;
  }

  public async setKeepAwake(enable: boolean): Promise<boolean> {
    this.shouldKeepAwake = enable;
    if (enable) {
      return await this.acquireWakeLock();
    } else {
      if (this.wakeLockSentinel) {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
      return true;
    }
  }

  public async setOrientation(mode: ScreenOrientationMode): Promise<void> {
    if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
      try {
        if (mode === 'landscape') {
          await (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> }).lock('landscape');
        } else if (mode === 'portrait') {
          await (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> }).lock('portrait');
        } else {
          screen.orientation.unlock();
        }
      } catch {
        // Browser may reject orientation lock without user gesture / fullscreen
      }
    }
  }

  public async setImmersive(enable: boolean): Promise<void> {
    if (typeof document === 'undefined') return;
    try {
      if (enable && !document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (!enable && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore user gesture rejection in web
    }
  }

  public isWakeLockActive(): boolean {
    return this.wakeLockSentinel !== null;
  }
}

class WebSecureStorageBridge implements ISecureStorageBridge {
  public async get(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(`vp_sec_${key}`);
  }

  public async set(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(`vp_sec_${key}`, value);
  }

  public async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(`vp_sec_${key}`);
  }
}

class WebLifecycleBridge implements ILifecycleBridge {
  public onNetworkChange(callback: LegacyNetworkStatusCallback): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = () => callback(true, 'wifi');
    const handleOffline = () => callback(false, 'none');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  public onAppResume(callback: () => void): () => void {
    if (typeof document === 'undefined') return () => {};

    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        callback();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }

  public onAppPause(callback: () => void): () => void {
    if (typeof document === 'undefined') return () => {};

    const handleVis = () => {
      if (document.visibilityState === 'hidden') {
        callback();
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }

  public onBackButton(callback: BackButtonCallback): () => void {
    if (typeof window === 'undefined') return () => {};

    const handlePopState = (e: PopStateEvent) => {
      const handled = callback();
      if (handled) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }
}

class WebNetworkBridge implements INetworkBridge {
  private networkEpoch = `web-epoch-${Date.now()}`;

  public async getStatus(): Promise<NetworkStatusInfo> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const conn = typeof navigator !== 'undefined' && 'connection' in navigator ? (navigator as any).connection : null;

    let transport: any = 'unknown';
    if (conn && conn.type) {
      transport = conn.type;
    } else if (conn && conn.effectiveType) {
      transport = conn.effectiveType.includes('2g') || conn.effectiveType.includes('3g') || conn.effectiveType.includes('4g') ? 'cellular' : 'wifi';
    }

    return {
      connected: isOnline,
      networkEpoch: this.networkEpoch,
      transport: isOnline ? transport : 'none',
      validated: isOnline,
      isMetered: conn ? Boolean(conn.saveData) : false,
      isCaptivePortal: false,
      hasInternet: isOnline,
    };
  }

  public onNetworkChange(callback: NetworkStatusCallback): () => void {
    if (typeof window === 'undefined') return () => {};

    const notify = async () => {
      this.networkEpoch = `web-epoch-${Date.now()}`;
      const status = await this.getStatus();
      callback(status);
    };

    window.addEventListener('online', notify);
    window.addEventListener('offline', notify);

    const conn = 'connection' in navigator ? (navigator as any).connection : null;
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', notify);
    }

    return () => {
      window.removeEventListener('online', notify);
      window.removeEventListener('offline', notify);
      if (conn && typeof conn.removeEventListener === 'function') {
        conn.removeEventListener('change', notify);
      }
    };
  }
}

class WebDeepLinkBridge implements IDeepLinkBridge {
  public onDeepLink(callback: DeepLinkCallback): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleHash = () => {
      if (window.location.hash) {
        callback(window.location.href);
      }
    };

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }
}

export function createWebPlatformBridge(): PlatformBridge {
  return {
    isNative: false,
    platformName: 'web',
    screen: new WebScreenBridge(),
    storage: new WebSecureStorageBridge(),
    network: new WebNetworkBridge(),
    lifecycle: new WebLifecycleBridge(),
    deepLink: new WebDeepLinkBridge(),
  };
}
