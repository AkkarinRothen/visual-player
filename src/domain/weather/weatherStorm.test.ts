import { describe, it, expect } from 'vitest';
import type { DisplayState, LightningConfig, WeatherStormEvent } from '../../types';
import type { VersionedSyncMessage } from '../protocol/types';
import {
  createWeatherStormEvent,
  computeNextStormInterval,
  isStormEventExpired,
  DEFAULT_LIGHTNING_CONFIG,
} from './weatherStormCoordinator';
import { reduceDisplayCommand } from '../display/displayCommandReducer';

describe('Weather Storm Coordinator & Anti-Burst Lightning Suite', () => {
  const initialDisplay: DisplayState = {
    currentSceneId: 'sc-coastal-cliff',
    sceneName: 'Acantilados de la Tormenta',
    backgroundUrl: 'https://example.com/cliffs.jpg',
    characters: [
      {
        id: 'npc-sailor',
        name: 'Marinero Viejo',
        avatarUrl: 'https://example.com/sailor.png',
        position: 'center-left',
        isSpeaking: false,
      },
    ],
    weather: 'storm',
    weatherIntensity: 0.85,
    lighting: 'night',
    locationBanner: { text: 'Costa Brava', visible: true },
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 100,
    ambientAudioUrl: 'https://example.com/sea-storm.mp3',
    ambientPlaying: true,
    ambientVolume: 0.7,
    lastSfx: null,
    combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
  };

  const createMsg = (payload: WeatherStormEvent): VersionedSyncMessage => ({
    protocolVersion: 1,
    messageId: 'm-storm-test',
    commandId: 'cmd-storm-test',
    sequenceNumber: 1,
    sessionRevision: 1,
    sentAt: Date.now(),
    tier: 'ephemeral',
    requiresAck: false,
    type: 'TRIGGER_STORM_LIGHTNING',
    payload,
  });

  it('1. Generates stochastic storm events with distance-based thunder delay and anti-burst expiration', () => {
    const config: LightningConfig = {
      ...DEFAULT_LIGHTNING_CONFIG,
      thunderDelayMs: 400,
      disableFlashes: false,
    };

    const event = createWeatherStormEvent(config, 0.9);
    expect(event.id).toContain('storm-bolt');
    expect(event.scheduledAt).toBeLessThanOrEqual(Date.now());
    expect(event.expiresAt).toBeGreaterThan(event.scheduledAt);
    expect(event.expiresAt - event.scheduledAt).toBe(5000); // 5s expiration window
    expect(event.thunderDelayMs).toBeGreaterThanOrEqual(150);
    expect(event.flashIntensity).toBeGreaterThan(0.5);
    expect(event.disableFlash).toBe(false);
  });

  it('2. Computes natural, randomized intervals and detects expired events', () => {
    const config: LightningConfig = {
      ...DEFAULT_LIGHTNING_CONFIG,
      minIntervalMs: 6000,
      maxIntervalMs: 14000,
    };

    const interval = computeNextStormInterval(config, 0.8);
    expect(interval).toBeGreaterThanOrEqual(6000);

    // Event expiration detection
    const now = Date.now();
    const liveEvent: WeatherStormEvent = {
      id: 'e-live',
      scheduledAt: now - 1000,
      expiresAt: now + 4000,
      flashIntensity: 0.8,
      thunderDelayMs: 500,
      thunderVolume: 0.8,
    };
    expect(isStormEventExpired(liveEvent, now)).toBe(false);

    const expiredEvent: WeatherStormEvent = {
      id: 'e-expired',
      scheduledAt: now - 8000,
      expiresAt: now - 2000,
      flashIntensity: 0.8,
      thunderDelayMs: 500,
      thunderVolume: 0.8,
    };
    expect(isStormEventExpired(expiredEvent, now)).toBe(true);
  });

  it('3. Reduces TRIGGER_STORM_LIGHTNING applying flash and side effect for live strikes', () => {
    const now = Date.now();
    const liveEvent: WeatherStormEvent = {
      id: 'bolt-1',
      scheduledAt: now,
      expiresAt: now + 5000,
      flashIntensity: 0.9,
      thunderDelayMs: 450,
      thunderVolume: 0.85,
      disableFlash: false,
    };

    const result = reduceDisplayCommand(initialDisplay, createMsg(liveEvent));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.nextState.lightningTrigger).toBeGreaterThan(initialDisplay.lightningTrigger);
      expect(result.sideEffects).toEqual([
        { type: 'storm_lightning', payload: liveEvent },
      ]);
      // Verify stage is untouched
      expect(result.nextState.characters).toHaveLength(1);
      expect(result.nextState.ambientPlaying).toBe(true);
    }
  });

  it('4. Discards expired storm events post-reconnect without triggering flash or audio burst', () => {
    const now = Date.now();
    const staleEvent: WeatherStormEvent = {
      id: 'bolt-stale',
      scheduledAt: now - 10000,
      expiresAt: now - 5000, // Expired 5 seconds ago!
      flashIntensity: 1.0,
      thunderDelayMs: 300,
      thunderVolume: 1.0,
    };

    const result = reduceDisplayCommand(initialDisplay, createMsg(staleEvent));
    expect(result.success).toBe(true);
    if (result.success) {
      // Must NOT trigger flash
      expect(result.nextState.lightningTrigger).toBe(initialDisplay.lightningTrigger);
      // Must NOT emit side effect
      expect(result.sideEffects).toBeUndefined();
    }
  });

  it('5. Protects photosensitive users when disableFlash is active', () => {
    const now = Date.now();
    const photosensitiveEvent: WeatherStormEvent = {
      id: 'bolt-accessible',
      scheduledAt: now,
      expiresAt: now + 5000,
      flashIntensity: 0.9,
      thunderDelayMs: 500,
      thunderVolume: 0.8,
      disableFlash: true, // No visual screen flash!
    };

    const result = reduceDisplayCommand(initialDisplay, createMsg(photosensitiveEvent));
    expect(result.success).toBe(true);
    if (result.success) {
      // Lightning flash trigger must not advance
      expect(result.nextState.lightningTrigger).toBe(initialDisplay.lightningTrigger);
      // But audio side effect is still delivered
      expect(result.sideEffects).toHaveLength(1);
      expect(result.sideEffects?.[0].type).toBe('storm_lightning');
    }
  });
});
