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

export class MockScreenBridge implements IScreenBridge {
  public wakeLockActive = false;
  public currentOrientation: ScreenOrientationMode = 'unlocked';
  public immersiveActive = false;

  public async setKeepAwake(enable: boolean): Promise<boolean> {
    this.wakeLockActive = enable;
    return true;
  }

  public async setOrientation(mode: ScreenOrientationMode): Promise<void> {
    this.currentOrientation = mode;
  }

  public async setImmersive(enable: boolean): Promise<void> {
    this.immersiveActive = enable;
  }

  public isWakeLockActive(): boolean {
    return this.wakeLockActive;
  }
}

export class MockSecureStorageBridge implements ISecureStorageBridge {
  private store = new Map<string, string>();

  public async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  public async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  public async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async getSecurityInfo(): Promise<{ isHardwareBacked: boolean; securityLevel: string; keyAlias: string }> {
    return {
      isHardwareBacked: true,
      securityLevel: 'TEE',
      keyAlias: 'vp_keystore_v1_aes',
    };
  }

  public clear(): void {
    this.store.clear();
  }
}

export class MockLifecycleBridge implements ILifecycleBridge {
  public networkListeners = new Set<LegacyNetworkStatusCallback>();
  public resumeListeners = new Set<() => void>();
  public pauseListeners = new Set<() => void>();
  public backButtonListeners = new Set<BackButtonCallback>();

  public onNetworkChange(callback: LegacyNetworkStatusCallback): () => void {
    this.networkListeners.add(callback);
    return () => this.networkListeners.delete(callback);
  }

  public onAppResume(callback: () => void): () => void {
    this.resumeListeners.add(callback);
    return () => this.resumeListeners.delete(callback);
  }

  public onAppPause(callback: () => void): () => void {
    this.pauseListeners.add(callback);
    return () => this.pauseListeners.delete(callback);
  }

  public onBackButton(callback: BackButtonCallback): () => void {
    this.backButtonListeners.add(callback);
    return () => this.backButtonListeners.delete(callback);
  }

  public triggerNetworkChange(connected: boolean, type: string = 'wifi'): void {
    this.networkListeners.forEach((cb) => cb(connected, type));
  }

  public triggerBackButton(): boolean {
    let handled = false;
    this.backButtonListeners.forEach((cb) => {
      if (cb()) handled = true;
    });
    return handled;
  }
}

export class MockNetworkBridge implements INetworkBridge {
  public listeners = new Set<NetworkStatusCallback>();
  public currentStatus: NetworkStatusInfo = {
    connected: true,
    networkEpoch: 'mock-epoch-1',
    transport: 'wifi',
    validated: true,
    isMetered: false,
    isCaptivePortal: false,
    hasInternet: true,
  };

  public async getStatus(): Promise<NetworkStatusInfo> {
    return { ...this.currentStatus };
  }

  public onNetworkChange(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public triggerNetworkChange(status: Partial<NetworkStatusInfo>): void {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.listeners.forEach((cb) => cb({ ...this.currentStatus }));
  }
}

export class MockDeepLinkBridge implements IDeepLinkBridge {
  public listeners = new Set<DeepLinkCallback>();

  public onDeepLink(callback: DeepLinkCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  public triggerDeepLink(url: string): void {
    this.listeners.forEach((cb) => cb(url));
  }
}

export function createMockPlatformBridge(): PlatformBridge & {
  mockScreen: MockScreenBridge;
  mockStorage: MockSecureStorageBridge;
  mockNetwork: MockNetworkBridge;
  mockLifecycle: MockLifecycleBridge;
  mockDeepLink: MockDeepLinkBridge;
} {
  const mockScreen = new MockScreenBridge();
  const mockStorage = new MockSecureStorageBridge();
  const mockNetwork = new MockNetworkBridge();
  const mockLifecycle = new MockLifecycleBridge();
  const mockDeepLink = new MockDeepLinkBridge();

  return {
    isNative: false,
    platformName: 'mock',
    screen: mockScreen,
    storage: mockStorage,
    network: mockNetwork,
    lifecycle: mockLifecycle,
    deepLink: mockDeepLink,
    mockScreen,
    mockStorage,
    mockNetwork,
    mockLifecycle,
    mockDeepLink,
  };
}
