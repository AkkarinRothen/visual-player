import { registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';
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

// Custom Native Android Plugins
interface VisualPlayerScreenPlugin {
  keepAwake(options: { enable: boolean }): Promise<{ isAwake: boolean }>;
  setImmersive(options: { enable: boolean }): Promise<{ isImmersive: boolean }>;
}

interface VisualPlayerKeystorePlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<{ success: boolean }>;
  remove(options: { key: string }): Promise<{ success: boolean }>;
}

const NativeScreen = registerPlugin<VisualPlayerScreenPlugin>('VisualPlayerScreen');
const NativeKeystore = registerPlugin<VisualPlayerKeystorePlugin>('VisualPlayerKeystore');

class AndroidScreenBridge implements IScreenBridge {
  private isAwake = false;

  public async setKeepAwake(enable: boolean): Promise<boolean> {
    this.isAwake = enable;
    try {
      const res = await NativeScreen.keepAwake({ enable });
      return res.isAwake;
    } catch {
      // Fallback in web/emulator testing
      return enable;
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
      await NativeScreen.setImmersive({ enable });
    } catch (err) {
      console.warn('[AndroidScreenBridge] Native immersive toggle failed:', err);
    }
  }

  public isWakeLockActive(): boolean {
    return this.isAwake;
  }
}

class AndroidSecureStorageBridge implements ISecureStorageBridge {
  public async get(key: string): Promise<string | null> {
    try {
      const res = await NativeKeystore.get({ key });
      return res.value;
    } catch {
      if (typeof window !== 'undefined') {
        return window.sessionStorage.getItem(`vp_and_${key}`);
      }
      return null;
    }
  }

  public async set(key: string, value: string): Promise<void> {
    try {
      await NativeKeystore.set({ key, value });
    } catch {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(`vp_and_${key}`, value);
      }
    }
  }

  public async remove(key: string): Promise<void> {
    try {
      await NativeKeystore.remove({ key });
    } catch {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(`vp_and_${key}`);
      }
    }
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
