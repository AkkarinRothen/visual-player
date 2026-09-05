import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { StageViewport } from '../../components/display/StageViewport';
import type { DisplayState } from '../../types';

describe('StageViewport Video Background & Fidelity Suite', () => {
  const baseDisplayState: DisplayState = {
    isBlackout: false,
    shakeTrigger: 0,
    lightningTrigger: 0,
    ambientAudioUrl: '',
    ambientPlaying: false,
    ambientVolume: 0.5,
    lastSfx: null,
    combatState: {
      isActive: false,
      round: 0,
      currentTurnIndex: 0,
      combatants: [],
    },
    currentSceneId: 'scene-video-ambient',
    sceneName: 'Cascada Sagrada',
    backgroundUrl: 'https://example.com/waterfall-poster.webp',
    weather: 'none',
    weatherIntensity: 0,
    lighting: 'normal',
    locationBanner: {
      text: 'CASCADA SAGRADA',
      visible: true,
    },
    characters: [],
  };

  it('1. Renders video element when backgroundType="video" and direct video url is supplied', () => {
    const videoState: DisplayState = {
      ...baseDisplayState,
      backgroundType: 'video',
      backgroundUrl: 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29t',
      videoConfig: {
        videoPosterUrl: 'https://example.com/waterfall-poster.webp',
        videoLoop: true,
        videoMuted: true,
        durationSeconds: 12,
      },
    };

    const { container } = render(<StageViewport state={videoState} />);
    const videoEl = container.querySelector('video');
    expect(videoEl).not.toBeNull();
    expect(videoEl?.getAttribute('poster')).toBe('https://example.com/waterfall-poster.webp');
    expect(videoEl?.loop).toBe(true);
    expect(videoEl?.muted).toBe(true);
  });

  it('2. Preserves static poster layer as fallback so players never see a black screen', () => {
    const videoState: DisplayState = {
      ...baseDisplayState,
      backgroundType: 'video',
      backgroundUrl: 'https://example.com/poster.jpg',
      videoConfig: {
        videoAssetId: 'pending-chunk-asset',
        videoPosterUrl: 'https://example.com/poster.jpg',
      },
    };

    const { container } = render(<StageViewport state={videoState} />);
    const activeBg = container.querySelector('.display-bg.active-bg') as HTMLElement;
    expect(activeBg).not.toBeNull();
    expect(activeBg.style.backgroundImage).toContain('https://example.com/poster.jpg');
  });

  it('3. Pauses video playback when isBlackout is enabled', () => {
    const pauseSpy = vi.fn();
    const playSpy = vi.fn().mockResolvedValue(undefined);

    // Mock HTMLMediaElement methods in jsdom
    window.HTMLMediaElement.prototype.play = playSpy;
    window.HTMLMediaElement.prototype.pause = pauseSpy;

    const activeState: DisplayState = {
      ...baseDisplayState,
      backgroundType: 'video',
      backgroundUrl: 'data:video/mp4;base64,AAAA',
      isBlackout: false,
    };

    const { rerender } = render(<StageViewport state={activeState} />);
    const blackoutState: DisplayState = {
      ...activeState,
      isBlackout: true,
    };

    rerender(<StageViewport state={blackoutState} />);
    expect(pauseSpy).toHaveBeenCalled();
  });

  it('4. Applies objectFit based on state.fitMode (cover vs contain)', () => {
    const containState: DisplayState = {
      ...baseDisplayState,
      backgroundType: 'video',
      backgroundUrl: 'data:video/mp4;base64,AAAA',
      fitMode: 'contain',
    };

    const { container } = render(<StageViewport state={containState} />);
    const videoEl = container.querySelector('video') as HTMLVideoElement;
    expect(videoEl?.style.objectFit).toBe('contain');
  });
});
