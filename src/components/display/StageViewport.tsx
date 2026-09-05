import React, { useState, useEffect, useRef } from 'react';
import type { DisplayState } from '../../types';
import { db } from '../../db';
import { AtmosphereCanvas } from '../canvas/AtmosphereCanvas';
import { DisplayCharactersLayer } from './DisplayCharactersLayer';
import { SceneLightsLayer } from './SceneLightsLayer';
import { ZoneEmittersLayer } from './ZoneEmittersLayer';
import { CinematicDialogueLayer } from './CinematicDialogueLayer';
import { InitiativeRibbon } from './InitiativeRibbon';

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

  // ── Video Background Subsystem ──
  const isVideoBackground =
    state.backgroundType === 'video' ||
    Boolean(state.videoConfig?.videoAssetId) ||
    Boolean(state.backgroundUrl?.startsWith('data:video/')) ||
    Boolean(state.backgroundUrl && /\.(mp4|webm)($|\?)/i.test(state.backgroundUrl));

  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isCancelled = false;

    if (!isVideoBackground) {
      setResolvedVideoUrl(null);
      setIsVideoPlaying(false);
      return;
    }

    if (
      state.backgroundUrl?.startsWith('data:video/') ||
      state.backgroundUrl?.startsWith('blob:') ||
      (state.backgroundUrl && /\.(mp4|webm)($|\?)/i.test(state.backgroundUrl))
    ) {
      setResolvedVideoUrl(state.backgroundUrl);
      return;
    }

    const assetId = state.videoConfig?.videoAssetId;
    if (assetId) {
      db.assets
        .get(assetId)
        .then((asset) => {
          if (!isCancelled && asset?.dataUrl) {
            setResolvedVideoUrl(asset.dataUrl);
          }
        })
        .catch((err) => {
          console.warn('[StageViewport] Could not load video asset from DB:', err);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [isVideoBackground, state.videoConfig?.videoAssetId, state.backgroundUrl]);

  // Pause / resume on blackout
  useEffect(() => {
    if (!videoRef.current) return;
    if (state.isBlackout) {
      videoRef.current.pause();
    } else if (resolvedVideoUrl) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined && typeof playPromise?.catch === 'function') {
        playPromise.catch(() => {});
      }
    }
  }, [state.isBlackout, resolvedVideoUrl]);

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

  // Logical 16:9 reference resolution (uniform scaling, zero distortion, zero unintentional crop)
  const LOGICAL_STAGE_WIDTH = 1920;
  const LOGICAL_STAGE_HEIGHT = 1080;

  useEffect(() => {
    if (!isScaledPreview || !containerRef.current) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth === 0 || clientHeight === 0) return;

      const scaleX = clientWidth / LOGICAL_STAGE_WIDTH;
      const scaleY = clientHeight / LOGICAL_STAGE_HEIGHT;
      // Fit contained inside the wrapper with neutral bands
      setScaleFactor(Math.min(scaleX, scaleY));
    };

    updateScale();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateScale);
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [isScaledPreview]);

  const isPortrait = aspectRatio < 1;

  const viewportContent = (
    <div
      className="stage-camera-viewport w-full h-full relative"
      style={{
        transformOrigin: `${cameraFocal.x}% ${cameraFocal.y}%`,
        transform: `scale(${cameraZoom})`,
        transition: cameraDurationMs > 0 ? `transform ${cameraDurationMs}ms cubic-bezier(0.25, 1, 0.5, 1)` : 'none',
        willChange: 'transform',
        overflow: 'hidden',
      }}
    >
      {/* Background Layers with crossfade and video ambient support */}
      <div className="stage-background-subsystem absolute inset-0 pointer-events-none">
        {prevBg && (
          <div
            className="display-bg prev-bg"
            style={{ backgroundImage: `url(${prevBg})` }}
          />
        )}
        {/* Static poster fallback layer: Always present so that players NEVER see a black frame */}
        <div
          className={`display-bg active-bg ${isCrossfading ? 'fade-in' : ''}`}
          style={{
            backgroundImage: `url(${state.videoConfig?.videoPosterUrl || activeBg})`,
            opacity: isVideoBackground && isVideoPlaying ? 0 : 1,
            transition: 'opacity 0.4s ease-in-out',
          }}
        />

        {/* Seamless Video Loop Layer */}
        {isVideoBackground && resolvedVideoUrl && (
          <video
            ref={videoRef}
            src={resolvedVideoUrl}
            poster={state.videoConfig?.videoPosterUrl || activeBg}
            autoPlay
            loop={state.videoConfig?.videoLoop ?? true}
            muted={state.videoConfig?.videoMuted ?? true}
            playsInline
            onPlaying={() => setIsVideoPlaying(true)}
            onPause={() => {
              if (state.isBlackout) setIsVideoPlaying(false);
            }}
            className={`display-bg active-bg active-video-bg ${isCrossfading ? 'fade-in' : ''}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: state.fitMode || 'cover',
              position: 'absolute',
              inset: 0,
              opacity: isVideoPlaying ? 1 : 0,
              transition: 'opacity 0.4s ease-in-out',
            }}
          />
        )}
      </div>

      {state.tacticalGrid?.enabled && (() => {
        const columns = Math.max(2, state.tacticalGrid.columns);
        const rows = Math.max(2, Math.round(columns * 9 / 16));
        const isHex = state.tacticalGrid.type === 'hex';
        const hexRadius = 100 / columns / Math.sqrt(3);
        const hexRows = Math.ceil(100 / (hexRadius * 1.5)) + 1;
        const hexes = isHex
          ? Array.from({ length: hexRows }, (_, row) => Array.from({ length: columns + 2 }, (_, column) => {
              const centerX = column * hexRadius * Math.sqrt(3) + (row % 2 ? hexRadius * Math.sqrt(3) / 2 : 0);
              const centerY = row * hexRadius * 1.5;
              const points = Array.from({ length: 6 }, (_, point) => {
                const angle = Math.PI / 180 * (60 * point);
                return `${centerX + hexRadius * Math.cos(angle)},${centerY + hexRadius * Math.sin(angle)}`;
              }).join(' ');
              return <polygon key={`${row}-${column}`} points={points} fill="none" stroke="currentColor" strokeWidth="0.16" />;
            }))
          : [];
        return (
          <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none text-emerald-200" style={{ opacity: state.tacticalGrid.opacity }} viewBox="0 0 100 100" preserveAspectRatio="none">
            {isHex ? hexes : <>
              {Array.from({ length: columns + 1 }, (_, index) => <line key={`v-${index}`} x1={index * 100 / columns} y1="0" x2={index * 100 / columns} y2="100" stroke="currentColor" strokeWidth="0.16" />)}
              {Array.from({ length: rows + 1 }, (_, index) => <line key={`h-${index}`} x1="0" y1={index * 100 / rows} x2="100" y2={index * 100 / rows} stroke="currentColor" strokeWidth="0.16" />)}
            </>}
          </svg>
        );
      })()}

      {/* Atmosphere / Weather Particles & Lighting */}
      <AtmosphereCanvas
        weather={state.weather}
        intensity={state.weatherIntensity}
        lighting={state.lighting}
        lightningTrigger={state.lightningTrigger}
      />

      {/* Dynamic Lighting System */}
      {state.lights && state.lights.length > 0 && (
        <SceneLightsLayer
          lights={state.lights}
          characters={state.characters}
          props={state.props || []}
        />
      )}

      {/* Zone Emitters System */}
      {state.emitters && state.emitters.length > 0 && (
        <ZoneEmittersLayer
          emitters={state.emitters}
          characters={state.characters}
          props={state.props || []}
        />
      )}

      {/* Characters & Props Layer */}
      <DisplayCharactersLayer
        characters={state.characters}
        props={state.props || []}
        occlusionRegions={state.occlusionRegions || []}
        backgroundUrl={activeBg}
        hasActiveDialogue={!!state.dialogue?.visible}
        combatState={state.combatState}
        nameDisplayMode={state.nameDisplayMode}
        groundLineY={state.groundLineY}
      />
    </div>
  );

  // Scaled rendering for GM Mini Preview or Modal (reproduces Mesa physical aspect ratio + 16:9 canvas with bands)
  if (isScaledPreview) {
    return (
      <div
        ref={containerRef}
        className={`stage-viewport-root w-full h-full relative flex items-center justify-center overflow-hidden select-none bg-black ${className}`}
        style={{ aspectRatio: `${aspectRatio}`, ...style }}
      >
        <div
          className="stage-viewport-virtual-canvas relative overflow-hidden"
          style={
            {
              width: `${LOGICAL_STAGE_WIDTH}px`,
              height: `${LOGICAL_STAGE_HEIGHT}px`,
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'center center',
              flexShrink: 0,
              pointerEvents: 'none',
              '--stage-width': `${LOGICAL_STAGE_WIDTH}px`,
              '--stage-height': `${LOGICAL_STAGE_HEIGHT}px`,
              containerType: 'size',
            } as React.CSSProperties
          }
        >
          {viewportContent}

          {/* Cinematic Dialogue & Narration Projection Layer */}
          {state.dialogue && (
            <CinematicDialogueLayer dialogue={state.dialogue} />
          )}

          {/* Combat Initiative Ribbon Overlay */}
          {state.combatState?.isActive && (
            <InitiativeRibbon combatState={state.combatState} />
          )}

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

        {/* Suggest rotation when in portrait orientation */}
        {isPortrait && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none z-30">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-950/80 text-amber-300 border border-amber-500/30">
              Gira la pantalla a horizontal (16:9)
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full-size rendering for Mesa PlayerDisplay (contains 16:9 canvas centered with neutral bands)
  return (
    <div
      className={`stage-viewport-root relative w-full h-full flex items-center justify-center overflow-hidden select-none bg-black ${className}`}
      style={style}
    >
      <div
        className="stage-viewport-canvas-box relative overflow-hidden"
        style={
          {
            aspectRatio: '16 / 9',
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'min(100vw, calc(100vh * (16 / 9)))',
            height: 'min(100vh, calc(100vw / (16 / 9)))',
            position: 'relative',
            '--stage-width': 'min(100vw, calc(100vh * (16 / 9)))',
            '--stage-height': 'min(100vh, calc(100vw / (16 / 9)))',
            containerType: 'size',
          } as React.CSSProperties
        }
      >
        {viewportContent}

        {/* Cinematic Dialogue & Narration Projection Layer */}
        {state.dialogue && (
          <CinematicDialogueLayer dialogue={state.dialogue} />
        )}

        {/* Combat Initiative Ribbon Overlay */}
        {state.combatState?.isActive && (
          <InitiativeRibbon combatState={state.combatState} />
        )}

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

      {/* Suggest rotation when in portrait orientation */}
      {isPortrait && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none z-30">
          <span className="text-xs px-3 py-1 rounded-full bg-slate-950/90 text-amber-300 border border-amber-500/40 shadow-lg">
            ✦ Girar pantalla a horizontal para ver el escenario completo (16:9) ✦
          </span>
        </div>
      )}
    </div>
  );
};
