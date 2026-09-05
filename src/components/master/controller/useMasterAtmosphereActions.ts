import { useCallback } from 'react';
import type { DisplayState, LightingFilter, WeatherType } from '../../../types';
import { soundEngine } from '../../../services/soundEngine';

export interface UseMasterAtmosphereActionsParams {
  activeDisplay: DisplayState;
  updateDisplay: (
    updater: (prev: DisplayState) => DisplayState,
    description?: string,
    recordHistory?: boolean
  ) => void;
  broadcastMessage: (message: any) => void;
}

export const useMasterAtmosphereActions = ({
  activeDisplay,
  updateDisplay,
  broadcastMessage,
}: UseMasterAtmosphereActionsParams) => {
  const setWeatherEffect = useCallback(
    (type: WeatherType) => {
      updateDisplay((prev) => ({ ...prev, weather: type }), `Clima: ${type}`);
    },
    [updateDisplay]
  );

  const setWeatherIntensityVal = useCallback(
    (val: number) => {
      updateDisplay(
        (prev) => ({ ...prev, weatherIntensity: val }),
        `Intensidad del Clima: ${Math.round(val * 100)}%`
      );
    },
    [updateDisplay]
  );

  const setLightingPreset = useCallback(
    (filter: LightingFilter) => {
      updateDisplay((prev) => ({ ...prev, lighting: filter }), `Iluminación: ${filter}`);
    },
    [updateDisplay]
  );

  const toggleBlackout = useCallback(() => {
    const next = !activeDisplay.isBlackout;
    updateDisplay((prev) => ({ ...prev, isBlackout: next }), next ? 'Blackout Activado' : 'Blackout Desactivado');
  }, [activeDisplay.isBlackout, updateDisplay]);

  const triggerLightning = useCallback(() => {
    broadcastMessage({ type: 'TRIGGER_LIGHTNING' });
    soundEngine.playSynth('thunder');
  }, [broadcastMessage]);

  const triggerScreenShake = useCallback(() => {
    broadcastMessage({ type: 'TRIGGER_SHAKE' });
  }, [broadcastMessage]);

  const updateBanner = useCallback(() => {
    updateDisplay(
      (prev) => ({ ...prev, locationBanner: { ...prev.locationBanner } }),
      `Actualizado Cartel: ${activeDisplay.locationBanner.text}`
    );
  }, [activeDisplay.locationBanner.text, updateDisplay]);

  const toggleAmbientAudio = useCallback(() => {
    const next = !activeDisplay.ambientPlaying;
    updateDisplay((prev) => ({ ...prev, ambientPlaying: next }), next ? 'Música Iniciada' : 'Música Pausada');
    if (activeDisplay.ambientAudioUrl) {
      soundEngine.setAmbient(activeDisplay.ambientAudioUrl, next, activeDisplay.ambientVolume, true);
    }
  }, [activeDisplay.ambientAudioUrl, activeDisplay.ambientPlaying, activeDisplay.ambientVolume, updateDisplay]);

  const toggleAmbientPlay = toggleAmbientAudio;

  const playSfx = useCallback(
    (sfx: any) => {
      if (sfx.soundType === 'synthesized' && sfx.synthPreset) {
        soundEngine.playSynth(sfx.synthPreset);
      }
      broadcastMessage({
        type: 'PLAY_SFX',
        payload: {
          id: sfx.id,
          name: sfx.name,
          synthPreset: sfx.synthPreset,
          audioUrl: sfx.audioUrl,
          timestamp: Date.now(),
        },
      });
    },
    [broadcastMessage]
  );

  return {
    setWeatherEffect,
    setWeatherIntensityVal,
    setLightingPreset,
    toggleBlackout,
    triggerLightning,
    triggerScreenShake,
    updateBanner,
    toggleAmbientAudio,
    toggleAmbientPlay,
    playSfx,
  };
};
