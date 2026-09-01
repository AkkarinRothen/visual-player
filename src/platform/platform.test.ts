import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockPlatformBridge,
} from './mockPlatform';
import { createWebPlatformBridge } from './webPlatform';
import { getPlatformBridge, setPlatformBridge } from './index';

describe('Platform Bridge & Native Adaptations Suite', () => {
  beforeEach(() => {
    setPlatformBridge(null);
  });

  describe('1. Mock Platform Spies & Deterministic Lifecycle', () => {
    it('handles screen keep awake, orientation, and immersive mode', async () => {
      const mock = createMockPlatformBridge();
      setPlatformBridge(mock);

      const bridge = getPlatformBridge();
      expect(bridge.screen.isWakeLockActive()).toBe(false);

      await bridge.screen.setKeepAwake(true);
      expect(bridge.screen.isWakeLockActive()).toBe(true);

      await bridge.screen.setOrientation('landscape');
      expect(mock.mockScreen.currentOrientation).toBe('landscape');

      await bridge.screen.setImmersive(true);
      expect(mock.mockScreen.immersiveActive).toBe(true);

      await bridge.screen.setKeepAwake(false);
      expect(bridge.screen.isWakeLockActive()).toBe(false);
    });

    it('manages secure storage values in platform bridge', async () => {
      const mock = createMockPlatformBridge();
      setPlatformBridge(mock);

      const bridge = getPlatformBridge();
      expect(await bridge.storage.get('session_key')).toBeNull();

      await bridge.storage.set('session_key', 'test-token-val');
      expect(await bridge.storage.get('session_key')).toBe('test-token-val');

      await bridge.storage.remove('session_key');
      expect(await bridge.storage.get('session_key')).toBeNull();
    });

    it('dispatches network change events to registered listeners', () => {
      const mock = createMockPlatformBridge();
      setPlatformBridge(mock);

      let isConnected = false;
      let connType = '';

      const unsubscribe = mock.lifecycle.onNetworkChange((connected, type) => {
        isConnected = connected;
        connType = type;
      });

      mock.mockLifecycle.triggerNetworkChange(true, 'wifi');
      expect(isConnected).toBe(true);
      expect(connType).toBe('wifi');

      mock.mockLifecycle.triggerNetworkChange(false, 'none');
      expect(isConnected).toBe(false);

      unsubscribe();
    });

    it('intercepts back button presses when handlers return true', () => {
      const mock = createMockPlatformBridge();
      setPlatformBridge(mock);

      let modalClosed = false;
      const unbind = mock.lifecycle.onBackButton(() => {
        modalClosed = true;
        return true; // handled
      });

      const handled = mock.mockLifecycle.triggerBackButton();
      expect(handled).toBe(true);
      expect(modalClosed).toBe(true);

      unbind();
    });
  });

  describe('2. Web Platform Fallbacks', () => {
    it('creates web platform bridge with non-native flag in browser environment', () => {
      const web = createWebPlatformBridge();
      expect(web.isNative).toBe(false);
      expect(web.platformName).toBe('web');
      expect(web.screen).toBeDefined();
      expect(web.storage).toBeDefined();
      expect(web.lifecycle).toBeDefined();
      expect(web.deepLink).toBeDefined();
    });
  });
});
