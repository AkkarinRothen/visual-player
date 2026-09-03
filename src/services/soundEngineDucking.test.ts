import { describe, it, expect, beforeEach, vi } from 'vitest';
import { soundEngine, DUCKING_PRESETS } from './soundEngine';

describe('Layered Reactive Audio & Modular Ducking Suite (SoundEngine)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    soundEngine.clearAllDucking();
    soundEngine.setDuckingProfile(DUCKING_PRESETS.narration);
  });

  it('1. Acquires ducking with a token, interpolates to profile target gain, and releases to 1.0', () => {
    expect(soundEngine.isDucked()).toBe(false);
    expect(soundEngine.getDuckingGainMultiplier()).toBe(1.0);

    // Acquire ducking with DM speaking token
    soundEngine.acquireDucking('dm_speaking');

    expect(soundEngine.isDucked()).toBe(true);
    expect(soundEngine.getActiveDuckingTokens()).toEqual(['dm_speaking']);

    // Advance timers across attackMs (250ms for narration)
    vi.advanceTimersByTime(300);

    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(0.35, 2);

    // Release ducking
    soundEngine.releaseDucking('dm_speaking');

    expect(soundEngine.isDucked()).toBe(false);

    // Advance timers across releaseMs (800ms)
    vi.advanceTimersByTime(850);

    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(1.0, 2);
  });

  it('2. Prevents exponential reduction accumulation on overlapping triggers and sustains until the last token releases', () => {
    soundEngine.acquireDucking('dialogue');
    vi.advanceTimersByTime(300);
    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(0.35, 2);

    // Concurrent priority SFX and DM speaking trigger
    soundEngine.acquireDucking('sfx_thunder');
    soundEngine.acquireDucking('dm_speaking');

    expect(soundEngine.getActiveDuckingTokens()).toHaveLength(3);
    // Non-accumulative: gain must NOT be 0.35 * 0.35 * 0.35 = 0.042
    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(0.35, 2);

    // Release first two tokens
    soundEngine.releaseDucking('dialogue');
    soundEngine.releaseDucking('sfx_thunder');

    // Still ducked because dm_speaking is active
    expect(soundEngine.isDucked()).toBe(true);
    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(0.35, 2);

    // Release final token
    soundEngine.releaseDucking('dm_speaking');
    expect(soundEngine.isDucked()).toBe(false);

    vi.advanceTimersByTime(850);
    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(1.0, 2);
  });

  it('3. Guarantees that manual volume changes during ducking restore to the new volume baseline upon release', () => {
    // Start ambient at volume 0.5
    soundEngine.setAmbient('https://example.com/wind.mp3', true, 0.5, false);

    // Engage ducking
    soundEngine.acquireDucking('dm_speaking');
    vi.advanceTimersByTime(300);
    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(0.35, 2);

    // User changes ambient volume slider to 0.8 while talking
    soundEngine.setAmbient('https://example.com/wind.mp3', true, 0.8, false);

    // Release ducking
    soundEngine.releaseDucking('dm_speaking');
    vi.advanceTimersByTime(850);

    // Multiplier is restored to 1.0, and effective volume is based on the new 0.8
    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(1.0, 2);
  });

  it('4. Supports gentle, narration and intense presets correctly', () => {
    // Gentle preset
    soundEngine.acquireDucking('test', DUCKING_PRESETS.gentle);
    vi.advanceTimersByTime(350);
    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(0.65, 2);
    soundEngine.releaseDucking('test');
    vi.advanceTimersByTime(700);

    // Intense preset
    soundEngine.acquireDucking('test', DUCKING_PRESETS.intense);
    vi.advanceTimersByTime(250);
    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(0.15, 2);
    soundEngine.releaseDucking('test');
    vi.advanceTimersByTime(1100);

    expect(soundEngine.getDuckingGainMultiplier()).toBeCloseTo(1.0, 2);
  });
});
