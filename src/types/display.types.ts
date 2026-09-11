import type { CombatState, TacticalGridConfig } from './combat.types';
import type { DuckingProfile, LightingFilter, LightningConfig, SceneSituation, WeatherType } from './atmosphere.types';
import type { CharacterOnScreen, ElementTransitionDirective } from './character.types';
import type { BackgroundType, HandoutState, SceneInteraction, SceneLight, SceneOcclusionRegion, SceneProp, SceneVideoConfig, SceneZoneEmitter, StageWaypoint, VideoPlaybackState } from './scene.types';
import type { CampaignRecap, CinematicDialogue } from './cinematic.types';

export interface CameraTransform {
  focalPoint: { x: number; y: number }; // 0-100%
  zoom: number; // 1.0 to 2.5
}

export interface CameraTransitionDirective {
  transitionId: string;
  durationMs: number;
}

export interface DisplayState {
  currentSceneId?: string;
  sceneName: string;
  backgroundUrl: string;
  activeVariantId?: string;
  fitMode?: 'cover' | 'contain';
  focalPoint?: { x: number; y: number };
  zoom?: number;
  characters: CharacterOnScreen[];
  props?: SceneProp[];
  weather: WeatherType;
  weatherIntensity: number;
  lighting: LightingFilter;
  locationBanner: {
    text: string;
    subtitle?: string;
    visible: boolean;
  };
  isBlackout: boolean;
  shakeTrigger: number;
  lightningTrigger: number;
  ambientAudioUrl: string;
  ambientPlaying: boolean;
  ambientVolume: number;
  lastSfx: {
    id: string;
    type: string;
    synthPreset?: string;
    audioUrl?: string;
    timestamp: number;
  } | null;
  combatState: CombatState;
  activeTransitions?: ElementTransitionDirective[];
  dialogue?: CinematicDialogue | null;
  cinematicDialogue?: CinematicDialogue | null;
  camera?: CameraTransform;
  cameraTransition?: CameraTransitionDirective;
  lights?: SceneLight[];
  emitters?: SceneZoneEmitter[];
  interactions?: SceneInteraction[];
  isDmSpeakingDucked?: boolean;
  duckingProfile?: DuckingProfile;
  activeHandout?: HandoutState | null;
  activeRecap?: CampaignRecap | null;
  lightningConfig?: LightningConfig;
  currentSituation?: SceneSituation;
  activeBiomeId?: string;
  nameDisplayMode?: 'always' | 'speaker_only' | 'hidden';
  groundLineY?: number; // Scene-specific ground line level (default 0)
  manualCameraOverride?: boolean; // True when DM manually framed camera, suspending auto-focus
  savedCameraPresets?: { id: string; name: string; camera: CameraTransform }[];
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
  backgroundType?: BackgroundType;
  videoConfig?: SceneVideoConfig;
  videoPlayback?: VideoPlaybackState | null;
  tacticalGrid?: TacticalGridConfig;
}
