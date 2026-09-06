import React, { useState, useEffect, useMemo } from 'react';
import type {
  Campaign,
  DisplayState,
  Scene,
  DMFavoriteItem,
  ActionExecutionStatus,
} from '../../types';
import { resolveSmartSceneFavorites } from '../../domain/session/smartFavorites';
import {
  Zap,
  RefreshCcw,
  MonitorPlay,
  AudioLines,
  Swords,
  VolumeX,
  Volume2,
  EyeOff,
  Eye,
  AlertTriangle,
  XOctagon,
  ArrowRight,
  Check,
  Loader2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import './liveQuickSession.css';

const formatLightingLabel = (lighting?: string) => {
  if (!lighting || lighting === 'normal') return 'Luz natural';
  return lighting.replace(/_/g, ' ');
};

const formatWeatherLabel = (weather?: string) => {
  if (!weather || weather === 'none') return 'Sin clima';
  return weather;
};

export interface LiveQuickSessionViewProps {
  campaign: Campaign | null;
  liveState: DisplayState;
  stagedState: DisplayState;
  pendingChangesCount: number;
  isConnected?: boolean;
  onSelectScene: (scene: Scene) => void;
  onPrepareSceneInStaging: (scene: Scene) => void;
  onPublishAllStaged: () => Promise<boolean | void>;
  onDiscardStaged: () => void;
  onTriggerLightning: () => void;
  onTriggerShake: () => void;
  onToggleBlackout: () => void;
  onToggleBanner: () => void;
  onToggleAmbientAudio: () => void;
  onExecuteFavorite: (item: DMFavoriteItem) => Promise<boolean>;
  onOpenManageFavorites: () => void;
  onStartCombat: () => void;
  onEndCombat: () => void;
  onNextCombatTurn: () => void;
  onPrevCombatTurn: () => void;
  onOpenCombatTab: () => void;
  hasRunningMacro?: boolean;
  runningMacroName?: string;
  onCancelMacro?: () => void;
  isMuted?: boolean;
  onToggleMuteTotal?: () => void;
}

export const LiveQuickSessionView: React.FC<LiveQuickSessionViewProps> = ({
  campaign,
  liveState,
  stagedState,
  pendingChangesCount,
  isConnected = true,
  onSelectScene: _onSelectScene,
  onPrepareSceneInStaging,
  onPublishAllStaged,
  onDiscardStaged,
  onTriggerLightning,
  onTriggerShake,
  onToggleBlackout,
  onToggleBanner,
  onToggleAmbientAudio,
  onExecuteFavorite,
  onOpenManageFavorites,
  onStartCombat,
  onEndCombat,
  onNextCombatTurn,
  onPrevCombatTurn,
  onOpenCombatTab,
  hasRunningMacro = false,
  runningMacroName,
  onCancelMacro,
  isMuted = false,
  onToggleMuteTotal,
}) => {
  // Estado de publicación a la mesa
  const [publishStatus, setPublishStatus] = useState<ActionExecutionStatus>('idle');

  // Doble toque de confirmación para Blackout
  const [blackoutArmed, setBlackoutArmed] = useState(false);

  // Estado de ejecución de favoritos
  const [favStatusMap, setFavStatusMap] = useState<Record<string, ActionExecutionStatus>>({});

  // Desarmar blackout automáticamente tras 3.5 segundos
  useEffect(() => {
    if (!blackoutArmed) return;
    const t = setTimeout(() => setBlackoutArmed(false), 3500);
    return () => clearTimeout(t);
  }, [blackoutArmed]);

  // Encontrar escena actual en vivo
  const currentScene = useMemo(() => {
    if (!campaign || !liveState.currentSceneId) return null;
    return campaign.scenes.find((s) => s.id === liveState.currentSceneId) || null;
  }, [campaign, liveState.currentSceneId]);

  // Encontrar escena en Staging (si es diferente)
  const stagedScene = useMemo(() => {
    if (!campaign || !stagedState.currentSceneId) return null;
    return campaign.scenes.find((s) => s.id === stagedState.currentSceneId) || null;
  }, [campaign, stagedState.currentSceneId]);

  // Resolver favoritos contextuales e inteligentes
  const smartFavorites = useMemo(() => {
    return resolveSmartSceneFavorites({
      currentScene,
      campaign,
      activeCharacters: liveState.characters,
      configuredFavorites: campaign?.favorites || [],
      limit: 10,
    });
  }, [currentScene, campaign, liveState.characters]);

  // Manejar publicación
  const handlePublishClick = async () => {
    if (publishStatus === 'sending') return;
    setPublishStatus('sending');
    try {
      const res = await onPublishAllStaged();
      if (res !== false) {
        setPublishStatus('ack');
        setTimeout(() => setPublishStatus('idle'), 2000);
      } else {
        setPublishStatus('rejected');
        setTimeout(() => setPublishStatus('idle'), 3000);
      }
    } catch {
      setPublishStatus('rejected');
      setTimeout(() => setPublishStatus('idle'), 3000);
    }
  };

  // Manejar Blackout seguro
  const handleBlackoutClick = () => {
    if (liveState.isBlackout) {
      onToggleBlackout();
      setBlackoutArmed(false);
    } else {
      if (!blackoutArmed) {
        setBlackoutArmed(true);
      } else {
        onToggleBlackout();
        setBlackoutArmed(false);
      }
    }
  };

  // Ejecutar favorito con feedback visual
  const handleExecuteFav = async (fav: DMFavoriteItem) => {
    if (favStatusMap[fav.id] === 'sending') return;
    setFavStatusMap((prev) => ({ ...prev, [fav.id]: 'sending' }));

    try {
      const success = await onExecuteFavorite(fav);
      if (success) {
        setFavStatusMap((prev) => ({ ...prev, [fav.id]: 'ack' }));
        setTimeout(() => setFavStatusMap((prev) => ({ ...prev, [fav.id]: 'idle' })), 2000);
      } else {
        setFavStatusMap((prev) => ({ ...prev, [fav.id]: 'rejected' }));
        setTimeout(() => setFavStatusMap((prev) => ({ ...prev, [fav.id]: 'idle' })), 3000);
      }
    } catch {
      setFavStatusMap((prev) => ({ ...prev, [fav.id]: 'rejected' }));
      setTimeout(() => setFavStatusMap((prev) => ({ ...prev, [fav.id]: 'idle' })), 3000);
    }
  };

  const isStagedDifferent =
    (stagedScene && stagedScene.id !== currentScene?.id) || pendingChangesCount > 0;
  const combat = liveState.combatState;
  const isCombatActive = combat?.isActive;
  const currentCombatant =
    isCombatActive && combat.combatants.length > 0
      ? combat.combatants[combat.currentTurnIndex] || combat.combatants[0]
      : null;

  return (
    <div className="quick-live-session-root" role="region" aria-label="Pantalla Hoy juego">
      {/* 1. ESTADO EN MESA (LIVE) */}
      <section className="quick-live-status-card" aria-label="Escena activa en mesa">
        <div className="quick-live-card-media">
          {liveState.backgroundUrl ? (
            <img src={liveState.backgroundUrl} alt={liveState.sceneName || 'Escena en mesa'} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500">
              Sin fondo cargado
            </div>
          )}
          <div className="quick-live-card-overlay">
            <div className="quick-live-badge-row">
              <div className="quick-live-live-badge">
                <span className="quick-live-live-dot" />
                <span>En Mesa</span>
              </div>
              <span className={`quick-live-sync-chip ${isConnected ? 'online' : 'offline'}`}>
                {isConnected ? 'Sincronizado' : 'Offline'}
              </span>
            </div>
            <div className="quick-live-title-box">
              <h2 className="quick-live-scene-title">
                {currentScene?.name || liveState.sceneName || 'Escena Inicial'}
              </h2>
              <span className="quick-live-meta-text">
                {currentScene?.subtitle || liveState.sceneName || 'Mesa lista para dirigir'}
              </span>
              <div className="quick-live-scene-stats" aria-label="Estado breve de la escena">
                <span>{liveState.characters.length} PJ/NPC</span>
                <span>{formatLightingLabel(liveState.lighting)}</span>
                <span>{formatWeatherLabel(liveState.weather)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores / Alternadores de Estado Rápido */}
        <div className="quick-live-indicators-row">
          <button
            type="button"
            className={`quick-live-pill-toggle ${liveState.locationBanner?.visible ? 'active' : ''}`}
            onClick={onToggleBanner}
            title="Alternar visibilidad del cartel en la mesa"
          >
            <MonitorPlay size={14} />
            <span>Cartel: {liveState.locationBanner?.visible ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            className={`quick-live-pill-toggle accent-audio ${liveState.ambientPlaying ? 'active' : ''}`}
            onClick={onToggleAmbientAudio}
            title="Alternar audio ambiental en la mesa"
          >
            <AudioLines size={14} />
            <span>Música: {liveState.ambientPlaying ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </section>

      {/* 2. TRANSICIÓN RÁPIDA (AHORA VS PRÓXIMA / STAGING) */}
      <section className="quick-transition-section" aria-label="Transición y preparación de escenas">
        <div className="quick-transition-header">
          <div className="quick-transition-title">
            <ArrowRight size={15} className="text-blue-400" />
            <span>Transición rápida</span>
          </div>
          {isStagedDifferent && (
            <div className="flex items-center gap-2">
              <span className="quick-transition-staging-status">
                {pendingChangesCount > 0 ? `${pendingChangesCount} cambio(s)` : 'Nueva escena lista'}
              </span>
              <button
                type="button"
                className="text-xs text-rose-400 hover:text-rose-300 underline"
                onClick={onDiscardStaged}
                title="Descartar cambios preparados"
              >
                Descartar
              </button>
            </div>
          )}
        </div>

        <div className="quick-scene-route">
          <div className="quick-route-node is-live">
            <span className="quick-route-label">Ahora</span>
            <strong>{currentScene?.name || liveState.sceneName || 'Escena actual'}</strong>
          </div>
          <div className="quick-route-line" aria-hidden="true" />
          <div className={`quick-route-node ${isStagedDifferent ? 'is-staged' : ''}`}>
            <span className="quick-route-label">Después</span>
            <strong>{stagedScene?.name || 'Sin cambio preparado'}</strong>
          </div>
        </div>

        {/* Botón Principal Gigante: PUBLICAR A LA MESA */}
        <button
          type="button"
          className={`quick-publish-primary-btn ${isStagedDifferent ? 'has-staged' : ''} ${
            publishStatus === 'sending' ? 'sending' : ''
          } ${publishStatus === 'ack' ? 'ack' : ''}`}
          onClick={handlePublishClick}
          disabled={publishStatus === 'sending' || !isStagedDifferent}
          aria-label="Publicar cambios preparados a la mesa"
        >
          {publishStatus === 'sending' ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>PUBLICANDO A LA MESA…</span>
            </>
          ) : publishStatus === 'ack' ? (
            <>
              <Check size={20} />
              <span>¡ENVIADO A LA MESA!</span>
            </>
          ) : isStagedDifferent ? (
            <>
              <ArrowRight size={20} />
              <span>ENVIAR A LA MESA AHORA</span>
            </>
          ) : (
            <span>Mesa sincronizada con preparación</span>
          )}
        </button>

        {/* Carrusel Táctil de Escenas de Campaña */}
        {campaign?.scenes && campaign.scenes.length > 0 && (
          <div className="quick-scenes-carousel" role="tablist" aria-label="Escenas de la campaña">
            {campaign.scenes.map((scene) => {
              const isLive = scene.id === currentScene?.id;
              const isStaged = scene.id === stagedScene?.id;

              return (
                <button
                  key={scene.id}
                  type="button"
                  className={`quick-scene-chip ${isLive ? 'active-live' : ''} ${
                    isStaged ? 'active-staged' : ''
                  }`}
                  onClick={() => onPrepareSceneInStaging(scene)}
                  title={`Preparar "${scene.name}"`}
                >
                  {scene.backgroundUrl && <img src={scene.backgroundUrl} alt="" />}
                  <div className="quick-scene-chip-overlay">
                    <span className="quick-scene-chip-name">{scene.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. COMBATE RÁPIDO (SI ESTÁ ACTIVO O INICIAR) */}
      <section className="quick-combat-strip" aria-label="Control de Combate">
        <div className="quick-combat-info">
          <div className="quick-combat-title">
            <Swords size={16} />
            <span>{isCombatActive ? `Ronda ${combat.round}` : 'Combate en Pausa'}</span>
          </div>
          <span className="quick-combat-turn-text">
            {isCombatActive && currentCombatant
              ? `Turno: ${currentCombatant.name}`
              : 'Toca iniciar para abrir iniciativa'}
          </span>
        </div>
        <div className="quick-combat-actions">
          {isCombatActive ? (
            <>
              <button
                type="button"
                className="quick-combat-btn"
                onClick={onPrevCombatTurn}
                title="Turno anterior"
              >
                ◀ Ant
              </button>
              <button
                type="button"
                className="quick-combat-btn"
                onClick={onNextCombatTurn}
                title="Siguiente turno"
              >
                Sig ▶
              </button>
              <button
                type="button"
                className="quick-combat-btn text-rose-300"
                onClick={onEndCombat}
                title="Finalizar combate actual"
              >
                Fin
              </button>
            </>
          ) : (
            <button
              type="button"
              className="quick-combat-btn"
              onClick={onStartCombat}
              title="Iniciar combate"
            >
              Iniciar Combate
            </button>
          )}
        </div>
      </section>

      {/* 4. FAVORITOS INTELIGENTES (CONTEXTUALES POR ESCENA) */}
      <section className="session-favorites-bar-wrapper" aria-label="Favoritos inteligentes">
        <div className="favorites-bar-header">
          <div className="flex-align-gap">
            <Sparkles size={14} className="text-amber-400" />
            <span className="fav-bar-title">FAVORITOS DE LA ESCENA (1 TOQUE)</span>
          </div>
          <button
            className="manage-favs-btn"
            onClick={onOpenManageFavorites}
            title="Personalizar favoritos"
          >
            <SlidersHorizontal size={13} />
            <span>Gestionar</span>
          </button>
        </div>

        <div className="session-favorites-scroll-row">
          {smartFavorites.map((fav) => {
            const status = favStatusMap[fav.id] || 'idle';

            return (
              <button
                key={fav.id}
                className={`fav-action-tile ${status}`}
                onClick={() => handleExecuteFav(fav)}
                disabled={status === 'sending'}
                title={fav.label}
              >
                <div className="fav-tile-icon-box">
                  {status === 'sending' ? (
                    <Loader2 size={18} className="animate-spin text-amber-400" />
                  ) : status === 'ack' ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : (
                    <Sparkles size={18} className="text-amber-400" />
                  )}
                </div>
                <span className="fav-tile-label">{fav.label}</span>
                {fav.isDynamicSuggestion && (
                  <span className="fav-ack-badge" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc' }}>
                    Sugerido
                  </span>
                )}
                {status === 'ack' && <span className="fav-ack-badge">ACK</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. ACCIONES RÁPIDAS DE MESA (GRID DE 1 TOQUE) */}
      <section className="quick-actions-grid" aria-label="Acciones de ambientación rápida">
        <button
          type="button"
          className="quick-action-tile-btn accent-amber"
          onClick={onTriggerLightning}
          title="Disparar relámpago en la mesa"
        >
          <Zap size={22} />
          <span>Relámpago</span>
        </button>

        <button
          type="button"
          className="quick-action-tile-btn accent-rose"
          onClick={onTriggerShake}
          title="Sacudir pantalla de la mesa"
        >
          <RefreshCcw size={22} />
          <span>Sacudir</span>
        </button>

        <button
          type="button"
          className="quick-action-tile-btn accent-sky"
          onClick={onToggleBanner}
          title="Alternar cartel de localización"
        >
          <MonitorPlay size={22} />
          <span>Cartel</span>
        </button>

        <button
          type="button"
          className="quick-action-tile-btn accent-emerald"
          onClick={onOpenCombatTab}
          title="Abrir panel de combate completo"
        >
          <Swords size={22} />
          <span>Combate</span>
        </button>
      </section>

      {/* 6. DOCK DE EMERGENCIA PERSISTENTE */}
      <aside className="quick-emergency-persistent-bar" aria-label="Controles de emergencia del DM">
        {/* MUTE TOTAL */}
        <button
          type="button"
          className={`quick-emergency-btn mute ${isMuted ? 'active-muted' : ''}`}
          onClick={onToggleMuteTotal}
          title={isMuted ? 'Reactivar audio' : 'Silencio total inmediato'}
        >
          {isMuted ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span>{isMuted ? 'Reactivar' : 'Mute Total'}</span>
        </button>

        {/* PARAR MOMENTO (SI HAY UNO CORRIENDO) */}
        {hasRunningMacro && onCancelMacro && (
          <button
            type="button"
            className="quick-emergency-btn cancel-macro"
            onClick={onCancelMacro}
            title="Detener momento en ejecución"
          >
            <XOctagon size={18} />
            <span>Parar: {runningMacroName || 'Momento'}</span>
          </button>
        )}

        {/* BLACKOUT CON DOBLE TOQUE DE PROTECCIÓN */}
        <button
          type="button"
          className={`quick-emergency-btn blackout ${
            liveState.isBlackout
              ? 'active-blackout'
              : blackoutArmed
              ? 'armed'
              : ''
          }`}
          onClick={handleBlackoutClick}
          title={
            liveState.isBlackout
              ? 'Encender pantalla'
              : blackoutArmed
              ? 'Toca de nuevo para activar blackout'
              : 'Blackout inmediato (doble toque)'
          }
        >
          {liveState.isBlackout ? (
            <>
              <Eye size={18} />
              <span>Encender</span>
            </>
          ) : blackoutArmed ? (
            <>
              <AlertTriangle size={18} />
              <span>¿Confirmar?</span>
            </>
          ) : (
            <>
              <EyeOff size={18} />
              <span>Blackout</span>
            </>
          )}
        </button>
      </aside>
    </div>
  );
};
