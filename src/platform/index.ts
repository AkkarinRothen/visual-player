import { Capacitor } from '@capacitor/core';
import type { PlatformBridge } from './types';
import { createWebPlatformBridge } from './webPlatform';
import { createAndroidPlatformBridge } from './androidPlatform';

let activeBridge: PlatformBridge | null = null;

export function getPlatformBridge(): PlatformBridge {
  if (!activeBridge) {
    const isNative = Capacitor.isNativePlatform();
    if (isNative && Capacitor.getPlatform() === 'android') {
      activeBridge = createAndroidPlatformBridge();
    } else {
      activeBridge = createWebPlatformBridge();
    }
  }
  return activeBridge;
}

export function setPlatformBridge(bridge: PlatformBridge | null): void {
  activeBridge = bridge;
}

export * from './types';
