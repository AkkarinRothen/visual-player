import { App as CapApp } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';
import type {
  PlatformBridge,
  IScreenBridge,
  ISecureStorageBridge,
  ILifecycleBridge,
  IDeepLinkBridge,
  ScreenOrientationMode,
  NetworkStatusCallback,
  BackButtonCallback,
  DeepLinkCallback,
} from './types';

class AndroidScreenBridge implements IScreenBridge {
  private wakeLockSentinel: WakeLockSentinel | null = null;
  private isAwake = false;

  public async setKeepAwake(enable: boolean): Promise<boolean> {
    this.isAwake = enable;
    if (enable) {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          this.wakeLockSentinel = await navigator.wakeLock.request('screen');
          return true;
        } catch {
          // Native WebView handles keep awake via WebSettings / window flags
        }
      }
      return true;
    } else {
      if (this.wakeLockSentinel) {
        await this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
      return true;
    }
  }

  public async setOrientation(mode: ScreenOrientationMode): Promise<void> {
    try {
      if (mode === 'landscape') {
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } else if (mode === 'portrait') {
        await ScreenOrientation.lock({ orientation: 'portrait' });
      } else {
        await ScreenOrientation.unlock();
      }
    } catch (err) {
      console.warn('[AndroidScreenBridge] Screen orientation change failed:', err);
    }
  }

  public async setImmersive(enable: boolean): Promise<void> {
    try {
      if (enable) {
        await StatusBar.hide();
      } else {
        await StatusBar.show();
      }
    } catch (err) {
      console.warn('[AndroidScreenBridge] Immersive toggle failed:', err);
    }
  }

  public isWakeLockActive(): boolean {
    return this.isAwake;
  }
}

class AndroidSecureStorageBridge implements ISecureStorageBridge {
  public async get(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(`vp_and_${key}`);
  }

  public async set(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(`vp_and_${key}`, value);
  }

  public async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(`vp_and_${key}`);
  }
}

class AndroidLifecycleBridge implements ILifecycleBridge {
  public onNetworkChange(callback: NetworkStatusCallback): () => void {
    let handle: { remove: () => void } | null = null;

    Network.addListener('networkStatusChange', (status) => {
      callback(status.connected, status.connectionType);
    }).then((h) => {
      handle = h;
    });

    return () => {
      if (handle) {
        handle.remove();
      }
    };
  }

  public onAppResume(callback: () => void): () => void {
    let handle: { remove: () => void } | null = null;

    CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        callback();
      }
    }).then((h) => {
      handle = h;
    });

    return () => {
      if (handle) {
        handle.remove();
      }
    };
  }

  public onAppPause(callback: () => void): () => void {
    let handle: { remove: () => void } | null = null;

    CapApp.addListener('appStateChange', (state) => {
      if (!state.isActive) {
        callback();
      }
    }).then((h) => {
      handle = h;
    });

    return () => {
      if (handle) {
        handle.remove();
      }
    };
  }

  public onBackButton(callback: BackButtonCallback): () => void {
    let handle: { remove: () => void } | null = null;

    CapApp.addListener('backButton', () => {
      callback();
    }).then((h) => {
      handle = h;
    });

    return () => {
      if (handle) {
        handle.remove();
      }
    };
  }
}

class AndroidDeepLinkBridge implements IDeepLinkBridge {
  public onDeepLink(callback: DeepLinkCallback): () => void {
    let handle: { remove: () => void } | null = null;

    CapApp.addListener('appUrlOpen', (data) => {
      if (data.url) {
        callback(data.url);
      }
    }).then((h) => {
      handle = h;
    });

    return () => {
      if (handle) {
        handle.remove();
      }
    };
  }
}

export function createAndroidPlatformBridge(): PlatformBridge {
  return {
    isNative: true,
    platformName: 'android',
    screen: new AndroidScreenBridge(),
    storage: new AndroidSecureStorageBridge(),
    lifecycle: new AndroidLifecycleBridge(),
    deepLink: new AndroidDeepLinkBridge(),
  };
}
