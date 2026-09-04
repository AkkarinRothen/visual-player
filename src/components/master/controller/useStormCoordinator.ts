import { useState, useEffect } from 'react';
import type { LightningConfig, DisplayState } from '../../../types';
import {
  computeNextStormInterval,
  createWeatherStormEvent,
  DEFAULT_LIGHTNING_CONFIG,
} from '../../../domain/weather/weatherStormCoordinator';
import { sessionCommandBus } from '../../../services/sessionCommandBus';

export interface UseStormCoordinatorOptions {
  liveState: DisplayState;
}

export function useStormCoordinator({ liveState }: UseStormCoordinatorOptions) {
  const [lightningConfig, setLightningConfig] = useState<LightningConfig>(DEFAULT_LIGHTNING_CONFIG);

  useEffect(() => {
    if (!lightningConfig.enabled) return;
    if (liveState.weather !== 'storm' && liveState.weather !== 'rain') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;

    const scheduleNextStrike = () => {
      const intervalMs = computeNextStormInterval(lightningConfig, liveState.weatherIntensity);
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        const stormEvent = createWeatherStormEvent(lightningConfig, liveState.weatherIntensity);
        sessionCommandBus.dispatchStormLightning(stormEvent);
        scheduleNextStrike();
      }, intervalMs);
    };

    scheduleNextStrike();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    lightningConfig.enabled,
    lightningConfig.minIntervalMs,
    lightningConfig.maxIntervalMs,
    lightningConfig.disableFlashes,
    liveState.weather,
    liveState.weatherIntensity,
  ]);

  const handleToggleAutoStorm = () => {
    setLightningConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleToggleDisableFlash = () => {
    setLightningConfig((prev) => ({ ...prev, disableFlashes: !prev.disableFlashes }));
  };

  return {
    lightningConfig,
    setLightningConfig,
    handleToggleAutoStorm,
    handleToggleDisableFlash,
  };
}
