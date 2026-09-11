import type { TacticalGridConfig } from './combat.types';
import type { LightPreset, LightingFilter, SceneSituation, WeatherType } from './atmosphere.types';
import type { CharacterOnScreen, PresetCharacterVisual, VisualStateVariant } from './character.types';
import type { SavedConversation } from './cinematic.types';
import type { CameraTransform } from './display.types';
import type { MissingAssetInfo } from './session.types';

export interface SceneOcclusionRegion {
  id: string;
  name: string; // DM private label e.g. "Frente mostrador", "Columna"
  x: number; // 0-100% (left)
  y: number; // 0-100% (bottom)
  width: number; // 0-100%
  height: number; // 0-100%
  zIndex: number; // Shared zIndex with characters and props (default 25)
}

export interface StageWaypoint {
  id: string;
  name: string; // DM private label e.g. "Detrás de la barra", "En la puerta"
  normalizedX: number; // 0-100%
  normalizedY: number; // 0-100%
  targetZIndex?: number; // Optional target layer zIndex
  description?: string;
}

export interface SceneVariant {
  id: string;
  name: string;
  backgroundUrl: string;
  fitMode?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  zoom?: number;
  lighting?: LightingFilter;
  weather?: WeatherType;
  weatherIntensity?: number;
  ambientAudioUrl?: string;
  groundLineY?: number; // Scene-specific visual ground line percentage (0-50%, default 0)
  savedCameraPresets?: { id: string; name: string; camera: CameraTransform }[];
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
}

export interface SceneProp {
  id: string;
  assetId?: string;
  name: string;
  assetUrl: string;
  normalizedX: number; // 0-100%
  normalizedY: number; // 0-100%
  scale: number; // 0.2 to 3.0 (default 1.0)
  rotation?: number; // -180 to 180 degrees
  isFlipped?: boolean;
  opacity?: number; // 0 to 1.0 (default 1.0)
  zIndex: number; // Unified rendering layer with NPCs
  anchor?: 'bottom-center' | 'center';
  isLocked?: boolean;
  visible?: boolean;
  visualStateId?: string;
}

export interface PropAsset {
  id: string;
  name: string;
  category?: 'furniture' | 'nature' | 'structure' | 'item' | 'effects';
  assetUrl: string;
  defaultAnchor?: 'bottom-center' | 'center';
  defaultScale?: number;
  visualStates?: VisualStateVariant[];
  tags?: string[];
}

export interface SceneLight {
  id: string;
  name: string;
  preset: LightPreset;
  color: string; // hex or rgba e.g. '#ff9933'
  intensity: number; // 0.1 to 1.5 (default 1.0)
  radiusPct: number; // 5% to 60% of stage dimensions (independent of resolution)
  normalizedX: number; // 0 to 100%
  normalizedY: number; // 0 to 100%
  attachedTo?: {
    targetType: 'character' | 'prop';
    targetId: string;
    offsetX: number;
    offsetY: number;
  };
  flicker: boolean;
  visible: boolean;
}

export type ZoneEmitterType = 'fog' | 'smoke' | 'rain' | 'embers';

export interface SceneZoneEmitter {
  id: string;
  type: ZoneEmitterType;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  density: number;
  speed: number;
  direction?: number;
  opacity: number;
  zIndex: number;
  attachedTo?: {
    instanceId: string;
    offsetX?: number;
    offsetY?: number;
  };
  isClipped?: boolean;
  enabled: boolean;
}

export type InteractionScope = 'scene' | 'session' | 'campaign';

export interface SceneInteractionTransition {
  id: string;
  fromState: string;
  toState: string;
  label: string;
  visualStateId?: string;
  lightId?: string;
  emitterId?: string;
  sfxPreset?: string;
  sfxAudioUrl?: string;
  requiredHint?: string;
}

export interface SceneInteraction {
  id: string;
  targetInstanceId: string;
  name: string;
  currentState: string;
  scope: InteractionScope;
  transitions: SceneInteractionTransition[];
}

export type BackgroundType = 'image' | 'video';

export interface SceneVideoConfig {
  videoAssetId?: string;
  videoPosterAssetId?: string;
  videoPosterUrl?: string;
  videoFit?: 'cover' | 'contain';
  videoLoop?: boolean;
  videoMuted?: boolean;
  isCinematic?: boolean;
  durationSeconds?: number;
  videoDurationSeconds?: number;
  videoAutoplay?: boolean;
}

export interface VideoPlaybackState {
  playbackId: string;
  videoAssetId: string;
  status: 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'finished' | 'error';
  currentTimeMs: number;
  durationMs: number;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  updatedAt: number;
  errorMessage?: string;
}

export interface SceneCompositionPreset {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  campaignId?: string;
  sceneId?: string;
  variantId?: string;
  backgroundUrl?: string;
  characters: PresetCharacterVisual[];
  props: SceneProp[];
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
  lights?: SceneLight[];
  emitters?: SceneZoneEmitter[];
  interactions?: SceneInteraction[];
  ambientAudioUrl?: string;
  ambientAudioName?: string;
  ambientVolume?: number;
  linkedConversationId?: string;
  linkedConversation?: SavedConversation;
  lighting?: LightingFilter;
  weather?: WeatherType;
  weatherIntensity?: number;
  focalPoint?: { x: number; y: number };
  fitMode?: 'cover' | 'contain';
  zoom?: number;
  tags?: string[];
  schemaVersion?: number;
  tacticalGrid?: TacticalGridConfig;
  isDeleted?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface Scene {
  id: string;
  name: string;
  backgroundUrl: string;
  backgroundType?: BackgroundType;
  videoConfig?: SceneVideoConfig;
  videoAssetId?: string;
  videoPosterAssetId?: string;
  videoPosterUrl?: string;
  videoFit?: 'cover' | 'contain';
  videoLoop?: boolean;
  videoMuted?: boolean;
  isCinematic?: boolean;
  durationSeconds?: number;
  activeVariantId?: string;
  variants?: SceneVariant[];
  defaultCamera?: CameraTransform;
  props?: SceneProp[];
  lights?: SceneLight[];
  emitters?: SceneZoneEmitter[];
  interactions?: SceneInteraction[];
  fitMode?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  zoom?: number;
  locationBanner?: string;
  subtitle?: string;
  weather?: WeatherType;
  weatherIntensity?: number;
  lighting?: LightingFilter;
  dmNotes?: string;
  ambientAudioUrl?: string;
  ambientAudioName?: string;
  suggestedNpcIds?: string[];
  biomeProfileId?: string;
  currentSituation?: SceneSituation;
  activeLightingPresetId?: string;
  groundLineY?: number; // Visual ground line level (0-50%, default 0)
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
  activeCharacters?: CharacterOnScreen[];
}

export interface RevealedRegionRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RevealedRegionCircle {
  id: string;
  cx: number;
  cy: number;
  r: number;
}

export type HandoutType = 'image' | 'map' | 'document';
export type HandoutTheme = 'parchment' | 'dark' | 'scroll' | 'royal';
export type HandoutTypography = 'medieval' | 'serif' | 'classic' | 'typewriter';

export interface HandoutPage {
  id: string;
  pageNumber: number;
  title?: string;
  subtitle?: string;
  type?: HandoutType;
  imageUrl: string;
  textContent?: string;
  theme?: HandoutTheme;
  typography?: HandoutTypography;
  authorSeal?: string;
  revealedRects: RevealedRegionRect[];
  revealedCircles?: RevealedRegionCircle[];
  isFullyRevealed: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
}

export interface HandoutState {
  id: string;
  title: string;
  subtitle?: string;
  type?: HandoutType;
  imageUrl?: string;
  textContent?: string;
  theme?: HandoutTheme;
  typography?: HandoutTypography;
  authorSeal?: string;
  revealedRects?: RevealedRegionRect[];
  revealedCircles?: RevealedRegionCircle[];
  isFullyRevealed?: boolean;
  zoom?: number;
  panOffset?: { x: number; y: number };
  isConfidential?: boolean;
  pages?: HandoutPage[];
  activePageIndex?: number;
  createdAt?: number;
}

export interface PresetDependencyReport {
  totalAssets: number;
  includedCount: number;
  alreadyAvailableCount: number;
  missing: MissingAssetInfo[];
  isFullySelfContained: boolean;
  characterResolutions: Array<{
    presetCharacterId: string;
    name: string;
    matchedCampaignCharacterId?: string;
    matchType: 'exact_id' | 'name_match' | 'none';
  }>;
  conversationResolution?: {
    presetConversationId?: string;
    title?: string;
    matchedCampaignConversationId?: string;
    matchType: 'exact_id' | 'title_match' | 'none';
  };
}

export interface InstantiatePresetOptions {
  mode?: 'append_scene' | 'replace_staged';
  characterResolution?: 'reuse_existing' | 'create_copy';
  conversationResolution?: 'reuse_existing' | 'create_copy';
}
