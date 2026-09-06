import type { SceneLight } from './scene.types';

export type WeatherType = 'none' | 'rain' | 'storm' | 'snow' | 'fog' | 'embers' | 'fireflies';

export type LightingFilter = 'normal' | 'night' | 'sunset' | 'blood_moon' | 'torch_flicker' | 'mystic_violet';

export type LightPreset = 'torch' | 'candle' | 'moonlight' | 'magic' | 'custom';

export type LightingApplyMode = 'replace' | 'merge';

export interface SceneLightingPreset {
  id: string;
  name: string;
  description?: string;
  lights: SceneLight[];
  lightingFilter?: LightingFilter;
  transitionDurationMs?: number;
}

export type EnvironmentBiome = 'tavern' | 'forest' | 'dungeon' | 'city' | 'ruins' | 'sea';

export type SceneSituation = 'exploration' | 'tension' | 'combat' | 'rest';

export interface BiomeTrackLayer {
  musicUrl?: string;
  musicVolume?: number;
  ambientUrl?: string;
  ambientVolume?: number;
  crossfadeSeconds?: number;
}

export interface BiomeSoundProfile {
  id: string;
  biome: EnvironmentBiome;
  name: string;
  situations: Record<SceneSituation, BiomeTrackLayer>;
}

export type SoundboardCategory = 'ambient' | 'combat' | 'creature' | 'narrative';

export type PadRetriggerPolicy = 'ignore' | 'restart' | 'overlap';

export interface SoundboardPad {
  id: string;
  label: string;
  category: SoundboardCategory;
  sfxPreset?: string;
  audioUrl?: string;
  icon?: string;
  color?: string;
  volume?: number;
  retriggerPolicy?: PadRetriggerPolicy;
}

export interface SoundboardBank {
  id: string;
  name: string;
  sceneId?: string;
  pads: SoundboardPad[];
}

export type DuckingPreset = 'gentle' | 'narration' | 'intense';

export interface DuckingProfile {
  preset: DuckingPreset;
  musicTargetGain: number;
  ambientTargetGain: number;
  attackMs: number;
  releaseMs: number;
}

export interface LightningConfig {
  enabled: boolean;
  minIntervalMs: number;
  maxIntervalMs: number;
  thunderDelayMs: number;
  disableFlashes?: boolean;
  volume: number;
}

export interface WeatherStormEvent {
  id: string;
  scheduledAt: number;
  expiresAt: number;
  flashIntensity: number;
  thunderDelayMs: number;
  thunderVolume: number;
  disableFlash?: boolean;
}

export interface SFXTrack {
  id: string;
  name: string;
  category: 'combat' | 'magic' | 'environment' | 'mystery' | 'social';
  icon: string;
  soundType?: 'synthesized' | 'custom';
  synthPreset?: string;
  audioUrl?: string;
}
