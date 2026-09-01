export type ScreenOrientationMode = 'landscape' | 'portrait' | 'unlocked';

export interface IScreenBridge {
  setKeepAwake(enable: boolean): Promise<boolean>;
  setOrientation(mode: ScreenOrientationMode): Promise<void>;
  setImmersive(enable: boolean): Promise<void>;
  isWakeLockActive(): boolean;
}

export interface ISecureStorageBridge {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  getSecurityInfo?(): Promise<{ isHardwareBacked: boolean; securityLevel: string; keyAlias: string }>;
}

export type NetworkStatusCallback = (connected: boolean, connectionType: string) => void;
export type BackButtonCallback = () => boolean; // return true if handled, false to let system handle

export interface ILifecycleBridge {
  onNetworkChange(callback: NetworkStatusCallback): () => void;
  onAppResume(callback: () => void): () => void;
  onAppPause(callback: () => void): () => void;
  onBackButton(callback: BackButtonCallback): () => void;
}

export type DeepLinkCallback = (url: string) => void;

export interface IDeepLinkBridge {
  onDeepLink(callback: DeepLinkCallback): () => void;
}

export interface PlatformBridge {
  isNative: boolean;
  platformName: 'web' | 'android' | 'ios' | 'mock';
  screen: IScreenBridge;
  storage: ISecureStorageBridge;
  lifecycle: ILifecycleBridge;
  deepLink: IDeepLinkBridge;
}
