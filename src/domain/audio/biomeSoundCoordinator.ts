import type { BiomeTrackLayer } from '../../types';

export interface AudioTransitionPlan {
  action: 'keep_playing_adjust_volume' | 'crossfade_new_track' | 'start_fresh' | 'maintain';
  url: string;
  volume: number;
  crossfade: boolean;
  crossfadeSeconds: number;
  reason: string;
}

/**
 * Pure transition coordinator between the currently playing audio on the Mesa
 * and the target track layer dictated by a Biome & Situation profile.
 * Guarantees zero unnecessary track restarts or stuttering when ambient layers are shared.
 */
export function resolveAudioTransitionPlan(
  currentAudio: {
    url: string;
    volume: number;
    playing: boolean;
  },
  targetLayer: BiomeTrackLayer
): AudioTransitionPlan {
  const targetUrl = targetLayer.musicUrl || targetLayer.ambientUrl || '';
  const targetVolume = targetLayer.musicVolume ?? targetLayer.ambientVolume ?? 0.6;
  const crossfadeSeconds = targetLayer.crossfadeSeconds ?? 2.0;

  // Case 1: Empty target URL (stop or maintain empty)
  if (!targetUrl) {
    return {
      action: 'maintain',
      url: currentAudio.url,
      volume: currentAudio.volume,
      crossfade: false,
      crossfadeSeconds: 0,
      reason: 'No hay pista configurada para esta situación',
    };
  }

  // Case 2: Exact same audio track is already playing!
  if (currentAudio.playing && currentAudio.url === targetUrl) {
    return {
      action: 'keep_playing_adjust_volume',
      url: targetUrl,
      volume: targetVolume,
      crossfade: false,
      crossfadeSeconds,
      reason: 'Pista idéntica ya sonando: se ajusta volumen suavemente sin reiniciar el audio',
    };
  }

  // Case 3: Currently playing a different track, needs smooth crossfade
  if (currentAudio.playing && currentAudio.url && currentAudio.url !== targetUrl) {
    return {
      action: 'crossfade_new_track',
      url: targetUrl,
      volume: targetVolume,
      crossfade: true,
      crossfadeSeconds,
      reason: `Fundido cruzado de ${crossfadeSeconds}s hacia la nueva pista de ambiente/combate`,
    };
  }

  // Case 4: Audio was paused or stopped, starts freshly
  return {
    action: 'start_fresh',
    url: targetUrl,
    volume: targetVolume,
    crossfade: true,
    crossfadeSeconds,
    reason: 'Inicio suave de la pista para el nuevo perfil',
  };
}
