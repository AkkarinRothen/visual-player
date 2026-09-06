import React, { useState } from 'react';
import {
  Radio,
  Zap,
  RefreshCcw,
  MonitorPlay,
  AudioLines,
  Volume2,
  MoreHorizontal,
  ImagePlus,
  Moon,
  Camera,
  Eye,
  Sparkles,
  Flame,
} from 'lucide-react';

export interface SessionQuickActionsBarProps {
  operationMode: 'live' | 'staging';
  onTriggerLightning: () => void;
  onTriggerShake: () => void;
  onToggleBanner: () => void;
  onToggleAmbientAudio: () => void;
  onOpenSoundboard?: () => void;
  onOpenCompositor?: () => void;
  onOpenLightingPresets?: () => void;
  onOpenHandoutViewer?: () => void;
  onOpenBiomeSoundtrack?: () => void;
  onQuickActionTriggered?: (label: string) => void;
}

export const SessionQuickActionsBar: React.FC<SessionQuickActionsBarProps> = ({
  operationMode,
  onTriggerLightning,
  onTriggerShake,
  onToggleBanner,
  onToggleAmbientAudio,
  onOpenSoundboard,
  onOpenCompositor,
  onOpenLightingPresets,
  onOpenHandoutViewer,
  onOpenBiomeSoundtrack,
  onQuickActionTriggered,
}) => {
  const [quickDrawer, setQuickDrawer] = useState<'more' | null>(null);

  const runAction = (label: string, action: () => void) => {
    action();
    onQuickActionTriggered?.(label);
  };

  return (
    <>
      <section className="live-quick-console" aria-label="Acciones rápidas de la sesión">
        <div className="live-quick-console-header">
          <div className="live-quick-console-title">
            <Radio size={15} />
            <span>Acciones rápidas</span>
            {operationMode === 'staging' && (
              <span className="live-quick-console-mode">Preparación</span>
            )}
          </div>
          <span className="live-quick-console-hint">Un toque durante la partida</span>
        </div>

        <div className="live-quick-actions" role="toolbar" aria-label="Acciones rápidas">
          <button
            type="button"
            className="live-quick-action accent"
            onClick={() => runAction('Relámpago activado', onTriggerLightning)}
          >
            <Zap size={19} />
            <span>Relámpago</span>
          </button>
          <button
            type="button"
            className="live-quick-action"
            onClick={() => runAction('Sacudida activada', onTriggerShake)}
          >
            <RefreshCcw size={18} />
            <span>Sacudir</span>
          </button>
          <button
            type="button"
            className="live-quick-action"
            onClick={() => runAction('Cartel alternado', onToggleBanner)}
          >
            <MonitorPlay size={18} />
            <span>Cartel</span>
          </button>
          <button
            type="button"
            className="live-quick-action"
            onClick={() => runAction('Ambiente alternado', onToggleAmbientAudio)}
          >
            <AudioLines size={18} />
            <span>Ambiente</span>
          </button>
          <button
            type="button"
            className="live-quick-action"
            onClick={() =>
              onOpenSoundboard && runAction('Panel de sonidos abierto', onOpenSoundboard)
            }
            disabled={!onOpenSoundboard}
          >
            <Volume2 size={18} />
            <span>Sonidos</span>
          </button>
          <button
            type="button"
            className={`live-quick-action more ${quickDrawer === 'more' ? 'active' : ''}`}
            onClick={() => setQuickDrawer('more')}
            aria-expanded={quickDrawer === 'more'}
          >
            <MoreHorizontal size={19} />
            <span>Más</span>
          </button>
          <button
            type="button"
            className="live-quick-action scene-edit"
            onClick={onOpenCompositor}
            disabled={!onOpenCompositor}
          >
            <ImagePlus size={18} />
            <span>Editar escena</span>
          </button>
        </div>
      </section>

      {quickDrawer === 'more' && (
        <div className="live-quick-drawer-overlay" onClick={() => setQuickDrawer(null)}>
          <section
            className="live-quick-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-quick-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="live-quick-drawer-handle" aria-hidden="true" />
            <div className="live-quick-drawer-header">
              <div>
                <span className="live-quick-drawer-eyebrow">Consola de partida</span>
                <h2 id="live-quick-drawer-title">Más acciones</h2>
              </div>
              <button
                type="button"
                className="live-quick-drawer-close"
                onClick={() => setQuickDrawer(null)}
                aria-label="Cerrar acciones rápidas"
              >
                ×
              </button>
            </div>
            <div className="live-quick-drawer-grid">
              <button
                type="button"
                onClick={() => {
                  onOpenLightingPresets?.();
                  setQuickDrawer(null);
                }}
              >
                <Moon size={20} />
                <span>Iluminación</span>
              </button>
              <button
                type="button"
                className="live-quick-drawer-feature"
                onClick={() => {
                  onOpenCompositor?.();
                  setQuickDrawer(null);
                }}
              >
                <Camera size={20} />
                <span>Cámara y escena</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenHandoutViewer?.();
                  setQuickDrawer(null);
                }}
              >
                <Eye size={20} />
                <span>Mostrar recurso</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenBiomeSoundtrack?.();
                  setQuickDrawer(null);
                }}
              >
                <Sparkles size={20} />
                <span>Música ambiental</span>
              </button>
              <button
                type="button"
                className="live-quick-drawer-feature"
                onClick={() => {
                  onOpenCompositor?.();
                  setQuickDrawer(null);
                }}
              >
                <ImagePlus size={20} />
                <span>Fondo y personajes</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenLightingPresets?.();
                  setQuickDrawer(null);
                }}
              >
                <Flame size={20} />
                <span>Preset dramático</span>
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
};
