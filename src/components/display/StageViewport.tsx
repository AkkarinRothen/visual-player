import React, { useState, useEffect, useRef } from 'react';
import type { DisplayState } from '../../types';
import { AtmosphereCanvas } from '../canvas/AtmosphereCanvas';
import { DisplayCharactersLayer } from './DisplayCharactersLayer';
import { SceneLightsLayer } from './SceneLightsLayer';
import { ZoneEmittersLayer } from './ZoneEmittersLayer';

export interface StageViewportProps {
  state: DisplayState;
  prevBg?: string | null;
  isCrossfading?: boolean;
  aspectRatio?: number; // Target aspect ratio (width / height), default 16 / 9
  isScaledPreview?: boolean; // When true, fits inside parent container using scale transform
  showBanner?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const StageViewport: React.FC<StageViewportProps> = ({
  state,
  prevBg: propPrevBg,
  isCrossfading: propIsCrossfading,
  aspectRatio = 16 / 9,
  isScaledPreview = false,
  showBanner = true,
  className = '',
  style = {},
}) => {
  // ── Background Crossfade State ──
  const [internalActiveBg, setInternalActiveBg] = useState(state.backgroundUrl);
  const [internalPrevBg, setInternalPrevBg] = useState<string | null>(null);
  const [internalIsCrossfading, setInternalIsCrossfading] = useState(false);

  useEffect(() => {
    if (state.backgroundUrl && state.backgroundUrl !== internalActiveBg) {
      setInternalPrevBg(internalActiveBg);
      setInternalActiveBg(state.backgroundUrl);
      setInternalIsCrossfading(true);
      const timer = setTimeout(() => {
        setInternalIsCrossfading(false);
        setInternalPrevBg(null);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [state.backgroundUrl, internalActiveBg]);

  const activeBg = state.backgroundUrl || internalActiveBg;
  const prevBg = propPrevBg !== undefined ? propPrevBg : internalPrevBg;
  const isCrossfading = propIsCrossfading !== undefined ? propIsCrossfading : internalIsCrossfading;

  // ── Camera Transform Calculations ──
  const cameraFocal = state.camera?.focalPoint || state.focalPoint || { x: 50, y: 50 };
  const cameraZoom = state.camera?.zoom ?? state.zoom ?? 1.0;
  const isReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cameraDurationMs = isReducedMotion ? 0 : state.cameraTransition?.durationMs ?? 800;

  // ── Scaled Preview Fit Calculation ──
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  // Virtual reference resolution for 100% faithful relative coordinates
  const VIRTUAL_WIDTH = 1920;
  const VIRTUAL_HEIGHT = Math.round(VIRTUAL_WIDTH / (aspectRatio || 16 / 9));

  useEffect(() => {
    if (!isScaledPreview || !containerRef.current) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;

      const scaleX = clientWidth / VIRTUAL_WIDTH;
      const scaleY = clientHeight / VIRTUAL_HEIGHT;
      // Fit contained inside the wrapper
      setScaleFactor(Math.min(scaleX, scaleY));
    };

    updateScale();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScale);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [isScaledPreview, VIRTUAL_WIDTH, VIRTUAL_HEIGHT]);

  const viewportContent = (
    <div
      className="stage-camera-viewport"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        transformOrigin: `${cameraFocal.x}% ${cameraFocal.y}%`,
        transform: cameraZoom > 1.001 ? `scale(${cameraZoom})` : 'none',
        transition:
          cameraDurationMs > 0
            ? `transform ${cameraDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1), transform-origin ${cameraDurationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : 'none',
      }}
    >
      {/* Background Crossfade Layers */}
      {prevBg && (
        <div
          className="display-bg prev-bg"
          style={{
            backgroundImage: `url(${prevBg})`,
            backgroundPosition: '50% 50%',
            backgroundSize: state.fitMode === 'contain' ? 'contain' : 'cover',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}
      <div
        className={`display-bg active-bg ${isCrossfading ? 'fade-in' : ''}`}
        style={{
          backgroundImage: `url(${activeBg})`,
          backgroundPosition: '50% 50%',
          backgroundSize: state.fitMode === 'contain' ? 'contain' : 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Atmospheric Effects Canvas (Weather, Lightning, Particles) */}
      <AtmosphereCanvas
        weather={state.weather}
        intensity={state.weatherIntensity}
        lighting={state.lighting}
        shakeTrigger={state.shakeTrigger}
        lightningTrigger={state.lightningTrigger}
      />

      {/* Active Characters & Props Projection Layer */}
      <DisplayCharactersLayer
        characters={state.characters}
        props={state.props || []}
        activeTransitions={state.activeTransitions}
        combatState={state.combatState}
      />

      {/* Scene Dynamic Point Lights & Focal Spots */}
      <SceneLightsLayer
        lights={state.lights || []}
        characters={state.characters}
        props={state.props || []}
      />

      {/* Zone Atmospheric Particle Emitters */}
      <ZoneEmittersLayer
        emitters={state.emitters || []}
        characters={state.characters}
        props={state.props || []}
      />
    </div>
  );

  // Scaled preview wrapper (fits inside small UI boxes like GM preview or modal cards)
  if (isScaledPreview) {
    return (
      <div
        ref={containerRef}
        className={`stage-viewport-scale-wrapper relative flex items-center justify-center overflow-hidden select-none ${className}`}
        style={{
          width: '100%',
          height: '100%',
          aspectRatio: `${aspectRatio}`,
          background: '#000',
          ...style,
        }}
      >
        <div
          className="stage-viewport-virtual-canvas relative overflow-hidden"
          style={{
            width: `${VIRTUAL_WIDTH}px`,
            height: `${VIRTUAL_HEIGHT}px`,
            transform: `scale(${scaleFactor})`,
            transformOrigin: 'center center',
            flexShrink: 0,
            pointerEvents: 'none',
          }}
        >
          {viewportContent}

          {/* Centered Location / Scene Title Banner */}
          {showBanner && state.locationBanner?.visible && state.locationBanner.text && (
            <div className="cinematic-banner-container">
              <div className="cinematic-banner">
                <div className="banner-rune-left">✦</div>
                <div className="banner-content">
                  <h1 className="banner-title">{state.locationBanner.text}</h1>
                  {state.locationBanner.subtitle && (
                    <p className="banner-subtitle">{state.locationBanner.subtitle}</p>
                  )}
                </div>
                <div className="banner-rune-right">✦</div>
              </div>
            </div>
          )}

          {/* Blackout Curtain */}
          {state.isBlackout && (
            <div className="blackout-curtain active">
              <div className="blackout-rune">
                <span>Pantalla Apagada (Blackout)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full-size rendering for Mesa PlayerDisplay
  return (
    <div
      className={`stage-viewport-root relative w-full h-full overflow-hidden select-none ${className}`}
      style={style}
    >
      {viewportContent}

      {/* Centered Location / Scene Title Banner */}
      {showBanner && state.locationBanner?.visible && state.locationBanner.text && (
        <div className="cinematic-banner-container">
          <div className="cinematic-banner">
            <div className="banner-rune-left">✦</div>
            <div className="banner-content">
              <h1 className="banner-title">{state.locationBanner.text}</h1>
              {state.locationBanner.subtitle && (
                <p className="banner-subtitle">{state.locationBanner.subtitle}</p>
              )}
            </div>
            <div className="banner-rune-right">✦</div>
          </div>
        </div>
      )}

      {/* Blackout Curtain */}
      {state.isBlackout && (
        <div className="blackout-curtain active">
          <div className="blackout-rune">
            <span>Pantalla Apagada (Blackout)</span>
          </div>
        </div>
      )}
    </div>
  );
};
