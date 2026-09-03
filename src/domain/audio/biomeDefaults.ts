import type { BiomeSoundProfile, BiomeTrackLayer, SceneSituation } from '../../types';

export const DEFAULT_BIOME_PROFILES: BiomeSoundProfile[] = [
  {
    id: 'biome-tavern',
    biome: 'tavern',
    name: 'Taberna y Posada',
    situations: {
      exploration: {
        ambientUrl: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3',
        ambientVolume: 0.6,
        musicUrl: 'https://example.com/audio/tavern-lute.mp3',
        musicVolume: 0.6,
        crossfadeSeconds: 2.0,
      },
      tension: {
        ambientUrl: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3',
        ambientVolume: 0.35,
        musicUrl: 'https://example.com/audio/tavern-suspense.mp3',
        musicVolume: 0.7,
        crossfadeSeconds: 1.8,
      },
      combat: {
        ambientUrl: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3',
        ambientVolume: 0.5,
        musicUrl: 'https://example.com/audio/tavern-brawl.mp3',
        musicVolume: 0.85,
        crossfadeSeconds: 1.2,
      },
      rest: {
        ambientUrl: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3',
        ambientVolume: 0.4,
        musicUrl: 'https://example.com/audio/tavern-hearth.mp3',
        musicVolume: 0.45,
        crossfadeSeconds: 3.0,
      },
    },
  },
  {
    id: 'biome-forest',
    biome: 'forest',
    name: 'Bosque Ancestral',
    situations: {
      exploration: {
        ambientUrl: 'https://example.com/audio/forest-birds.mp3',
        ambientVolume: 0.65,
        musicUrl: 'https://example.com/audio/forest-peace.mp3',
        musicVolume: 0.55,
        crossfadeSeconds: 2.5,
      },
      tension: {
        ambientUrl: 'https://example.com/audio/forest-wind-creak.mp3',
        ambientVolume: 0.6,
        musicUrl: 'https://example.com/audio/forest-stalker.mp3',
        musicVolume: 0.7,
        crossfadeSeconds: 2.0,
      },
      combat: {
        ambientUrl: 'https://example.com/audio/forest-wind-creak.mp3',
        ambientVolume: 0.45,
        musicUrl: 'https://example.com/audio/forest-hunt.mp3',
        musicVolume: 0.85,
        crossfadeSeconds: 1.2,
      },
      rest: {
        ambientUrl: 'https://example.com/audio/forest-crickets.mp3',
        ambientVolume: 0.5,
        musicUrl: 'https://example.com/audio/forest-camp.mp3',
        musicVolume: 0.4,
        crossfadeSeconds: 3.0,
      },
    },
  },
  {
    id: 'biome-dungeon',
    biome: 'dungeon',
    name: 'Mazmorra y Cripta',
    situations: {
      exploration: {
        ambientUrl: 'https://example.com/audio/dungeon-drip.mp3',
        ambientVolume: 0.7,
        musicUrl: 'https://example.com/audio/dungeon-ambience.mp3',
        musicVolume: 0.5,
        crossfadeSeconds: 2.5,
      },
      tension: {
        ambientUrl: 'https://example.com/audio/dungeon-drip.mp3',
        ambientVolume: 0.6,
        musicUrl: 'https://example.com/audio/dungeon-shadows.mp3',
        musicVolume: 0.75,
        crossfadeSeconds: 1.8,
      },
      combat: {
        ambientUrl: 'https://example.com/audio/dungeon-drip.mp3',
        ambientVolume: 0.4,
        musicUrl: 'https://example.com/audio/dungeon-battle.mp3',
        musicVolume: 0.85,
        crossfadeSeconds: 1.0,
      },
      rest: {
        ambientUrl: 'https://example.com/audio/dungeon-drip.mp3',
        ambientVolume: 0.5,
        musicUrl: 'https://example.com/audio/dungeon-safe-zone.mp3',
        musicVolume: 0.45,
        crossfadeSeconds: 3.0,
      },
    },
  },
  {
    id: 'biome-city',
    biome: 'city',
    name: 'Ciudad y Mercado',
    situations: {
      exploration: {
        ambientUrl: 'https://example.com/audio/city-crowd.mp3',
        ambientVolume: 0.6,
        musicUrl: 'https://example.com/audio/city-bustle.mp3',
        musicVolume: 0.55,
        crossfadeSeconds: 2.0,
      },
      tension: {
        ambientUrl: 'https://example.com/audio/city-night-rain.mp3',
        ambientVolume: 0.5,
        musicUrl: 'https://example.com/audio/city-alley-chase.mp3',
        musicVolume: 0.7,
        crossfadeSeconds: 1.8,
      },
      combat: {
        ambientUrl: 'https://example.com/audio/city-alarms.mp3',
        ambientVolume: 0.5,
        musicUrl: 'https://example.com/audio/city-skirmish.mp3',
        musicVolume: 0.8,
        crossfadeSeconds: 1.2,
      },
      rest: {
        ambientUrl: 'https://example.com/audio/city-night-calm.mp3',
        ambientVolume: 0.45,
        musicUrl: 'https://example.com/audio/city-inn.mp3',
        musicVolume: 0.4,
        crossfadeSeconds: 2.5,
      },
    },
  },
  {
    id: 'biome-ruins',
    biome: 'ruins',
    name: 'Ruinas Arcanas',
    situations: {
      exploration: {
        ambientUrl: 'https://example.com/audio/ruins-wind.mp3',
        ambientVolume: 0.65,
        musicUrl: 'https://example.com/audio/ruins-mystery.mp3',
        musicVolume: 0.6,
        crossfadeSeconds: 2.5,
      },
      tension: {
        ambientUrl: 'https://example.com/audio/ruins-wind.mp3',
        ambientVolume: 0.6,
        musicUrl: 'https://example.com/audio/ruins-curse.mp3',
        musicVolume: 0.75,
        crossfadeSeconds: 2.0,
      },
      combat: {
        ambientUrl: 'https://example.com/audio/ruins-wind.mp3',
        ambientVolume: 0.4,
        musicUrl: 'https://example.com/audio/ruins-guardian.mp3',
        musicVolume: 0.85,
        crossfadeSeconds: 1.0,
      },
      rest: {
        ambientUrl: 'https://example.com/audio/ruins-wind.mp3',
        ambientVolume: 0.5,
        musicUrl: 'https://example.com/audio/ruins-sanctuary.mp3',
        musicVolume: 0.45,
        crossfadeSeconds: 3.0,
      },
    },
  },
  {
    id: 'biome-sea',
    biome: 'sea',
    name: 'Alta Mar y Costa',
    situations: {
      exploration: {
        ambientUrl: 'https://example.com/audio/sea-waves.mp3',
        ambientVolume: 0.7,
        musicUrl: 'https://example.com/audio/sea-voyage.mp3',
        musicVolume: 0.6,
        crossfadeSeconds: 2.5,
      },
      tension: {
        ambientUrl: 'https://example.com/audio/sea-storm-swells.mp3',
        ambientVolume: 0.75,
        musicUrl: 'https://example.com/audio/sea-kraken-approach.mp3',
        musicVolume: 0.75,
        crossfadeSeconds: 2.0,
      },
      combat: {
        ambientUrl: 'https://example.com/audio/sea-storm-swells.mp3',
        ambientVolume: 0.6,
        musicUrl: 'https://example.com/audio/sea-boarding-battle.mp3',
        musicVolume: 0.85,
        crossfadeSeconds: 1.2,
      },
      rest: {
        ambientUrl: 'https://example.com/audio/sea-gentle-tide.mp3',
        ambientVolume: 0.5,
        musicUrl: 'https://example.com/audio/sea-harbor-light.mp3',
        musicVolume: 0.45,
        crossfadeSeconds: 3.0,
      },
    },
  },
];

export function getDefaultBiomeProfiles(): BiomeSoundProfile[] {
  return JSON.parse(JSON.stringify(DEFAULT_BIOME_PROFILES));
}

export function findBiomeProfile(
  profiles: BiomeSoundProfile[] | undefined,
  profileIdOrBiome: string
): BiomeSoundProfile | undefined {
  if (!profiles || profiles.length === 0) {
    return DEFAULT_BIOME_PROFILES.find(
      (p) => p.id === profileIdOrBiome || p.biome === profileIdOrBiome
    );
  }
  return (
    profiles.find((p) => p.id === profileIdOrBiome || p.biome === profileIdOrBiome) ||
    DEFAULT_BIOME_PROFILES.find(
      (p) => p.id === profileIdOrBiome || p.biome === profileIdOrBiome
    )
  );
}

export function resolveBiomeTrackLayer(
  profile: BiomeSoundProfile,
  situation: SceneSituation = 'exploration'
): BiomeTrackLayer {
  return profile.situations[situation] || profile.situations.exploration;
}
