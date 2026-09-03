import type { LightningConfig, WeatherStormEvent } from '../../types';

export const DEFAULT_LIGHTNING_CONFIG: LightningConfig = {
  enabled: false,
  minIntervalMs: 7000,
  maxIntervalMs: 20000,
  thunderDelayMs: 600,
  disableFlashes: false,
  volume: 0.8,
};

/**
 * Creates a synchronized storm lightning event with an exact expiration time.
 * If delivery to the display is delayed past expiresAt (e.g. after a reconnect),
 * the event is dropped to prevent rapid multi-burst audio shocks.
 */
export function createWeatherStormEvent(
  config: Partial<LightningConfig> = {},
  weatherIntensity: number = 0.8
): WeatherStormEvent {
  const now = Date.now();
  const intensity = Math.max(0.1, Math.min(1.0, weatherIntensity));

  // In higher intensity storms, lightning strikes closer (smaller sound delay)
  const baseDelay = config.thunderDelayMs ?? 600;
  const distanceJitter = Math.floor(Math.random() * 400 * (1.1 - intensity));
  const thunderDelayMs = Math.max(150, baseDelay + distanceJitter);

  const flashIntensity = Math.min(1.0, 0.4 + intensity * 0.6);
  const thunderVolume = Math.min(1.0, 0.5 + intensity * 0.5);

  return {
    id: `storm-bolt-${now}-${Math.random().toString(36).substring(2, 6)}`,
    scheduledAt: now,
    expiresAt: now + 5000, // Valid for at most 5 seconds
    flashIntensity,
    thunderDelayMs,
    thunderVolume,
    disableFlash: Boolean(config.disableFlashes),
  };
}

/**
 * Computes a natural, randomized interval between storm bolts based on weather intensity.
 */
export function computeNextStormInterval(
  config: LightningConfig,
  weatherIntensity: number = 0.8
): number {
  const intensity = Math.max(0.1, Math.min(1.0, weatherIntensity));
  const minInterval = config.minIntervalMs || 7000;
  const maxInterval = config.maxIntervalMs || 20000;

  // Higher intensity storms have shorter pauses between strikes
  const adjustedMax = minInterval + (maxInterval - minInterval) * (1.2 - intensity * 0.5);
  const range = Math.max(1000, adjustedMax - minInterval);
  const randomOffset = Math.floor(Math.random() * range);

  return Math.round(minInterval + randomOffset);
}

/**
 * Validates if an incoming storm event is still within its live execution window.
 */
export function isStormEventExpired(
  event: WeatherStormEvent,
  now: number = Date.now()
): boolean {
  return now > event.expiresAt;
}
