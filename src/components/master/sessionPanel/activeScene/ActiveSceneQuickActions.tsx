import React from 'react';
import {
  Image as ImageIcon,
  Zap,
  CloudLightning,
  EyeOff,
  Activity,
  Volume2,
  VolumeX,
  Mic,
  Sliders,
} from 'lucide-react';
import type { DisplayState, LightningConfig, DuckingPreset } from '../../../../types';

interface ActiveSceneQuickActionsProps {
  liveState: DisplayState;
  lightningConfig?: LightningConfig;
  onToggleBanner: () => void;
  onTriggerLightning: () => void;
  onToggleAutoStorm?: () => void;
  onToggleDisableFlash?: () => void;
  onTriggerShake: () => void;
  onToggleAmbientAudio: () => void;
  onToggleDmSpeakingDucked?: () => void;
  onSelectDuckingPreset?: (preset: DuckingPreset) => void;
  onOpenCompositor?: () => void;
  onOpenSoundboard?: () => void;
}

export const ActiveSceneQuickActions: React.FC<ActiveSceneQuickActionsProps> = ({
  liveState,
  lightningConfig,
  onToggleBanner,
  onTriggerLightning,
  onToggleAutoStorm,
  onToggleDisableFlash,
  onTriggerShake,
  onToggleAmbientAudio,
  onToggleDmSpeakingDucked,
  onSelectDuckingPreset,
  onOpenCompositor,
  onOpenSoundboard,
}) => {
  return (
    <div className="scene-quick-actions-row">
      <button
        className={`scene-action-btn ${liveState.locationBanner.visible ? 'active' : ''}`}
        onClick={onToggleBanner}
        title="Mostrar u ocultar título del lugar a los jugadores"
      >
        <ImageIcon size={14} />
        <span>{liveState.locationBanner.visible ? 'Ocultar Cartel' : 'Mostrar Cartel'}</span>
      </button>

      <button
        className="scene-action-btn"
        onClick={onTriggerLightning}
        title="Disparar relámpago inmediato con trueno sincronizado"
      >
        <Zap size={14} className="text-sky-400" />
        <span>Rayo</span>
      </button>

      {onToggleAutoStorm && (
        <button
          className={`scene-action-btn ${
            lightningConfig?.enabled
              ? 'active !bg-sky-950/60 !border-sky-500/70 !text-sky-300'
              : ''
          }`}
          onClick={onToggleAutoStorm}
          title="Activar/Pausar cadencia automática de relámpagos estocásticos según el clima"
        >
          <CloudLightning
            size={14}
            className={lightningConfig?.enabled ? 'text-sky-400 animate-pulse' : 'text-slate-400'}
          />
          <span>{lightningConfig?.enabled ? 'Tormenta Activa' : 'Auto-Tormenta'}</span>
        </button>
      )}

      {lightningConfig?.enabled && onToggleDisableFlash && (
        <button
          className={`scene-action-btn ${
            lightningConfig?.disableFlashes ? 'active !bg-amber-950/50 !text-amber-300' : ''
          }`}
          onClick={onToggleDisableFlash}
          title="Modo fotosensible: suprime destellos brillantes en pantalla manteniendo el sonido del trueno"
        >
          <EyeOff
            size={14}
            className={lightningConfig?.disableFlashes ? 'text-amber-400' : 'text-slate-400'}
          />
          <span>{lightningConfig?.disableFlashes ? 'Sin Destellos' : 'Con Destellos'}</span>
        </button>
      )}

      <button
        className="scene-action-btn"
        onClick={onTriggerShake}
        title="Temblor visual de pantalla"
      >
        <Activity size={14} className="text-amber-400" />
        <span>Temblor</span>
      </button>

      {liveState.ambientAudioUrl && (
        <button
          className={`scene-action-btn ${liveState.ambientPlaying ? 'playing' : ''}`}
          onClick={onToggleAmbientAudio}
          title="Pausar / Reanudar música ambiental de la escena"
        >
          {liveState.ambientPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>{liveState.ambientPlaying ? 'Pausar Música' : 'Sonar Música'}</span>
        </button>
      )}

      {onToggleDmSpeakingDucked && (
        <button
          className={`scene-action-btn ${
            liveState.isDmSpeakingDucked
              ? 'active !bg-amber-950/60 !border-amber-500/80 !text-amber-300'
              : ''
          }`}
          onClick={onToggleDmSpeakingDucked}
          title="Atenuación inteligente de fondo ('ducking') para hablar/narrar con claridad sin distorsión"
        >
          <Mic
            size={14}
            className={
              liveState.isDmSpeakingDucked
                ? 'text-amber-400 animate-pulse'
                : 'text-slate-400'
            }
          />
          <span>{liveState.isDmSpeakingDucked ? 'Hablando (Ducked)' : 'Hablar'}</span>
        </button>
      )}

      {onSelectDuckingPreset && (
        <select
          value={liveState.duckingProfile?.preset || 'narration'}
          onChange={(e) => onSelectDuckingPreset(e.target.value as DuckingPreset)}
          className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-1 text-[11px] cursor-pointer"
          title="Perfil de atenuación ('ducking') de audio"
        >
          <option value="gentle">Atenuación Suave (-35%)</option>
          <option value="narration">Narración (-65%)</option>
          <option value="intense">Atenuación Intensa (-85%)</option>
        </select>
      )}

      {onOpenCompositor && (
        <button
          className="scene-action-btn compositor-btn"
          onClick={onOpenCompositor}
          title="Abrir Compositor Táctil de Personajes"
        >
          <Sliders size={14} className="text-purple-400" />
          <span>Compositor</span>
        </button>
      )}

      {onOpenSoundboard && (
        <button
          className="scene-action-btn"
          onClick={onOpenSoundboard}
          title="Abrir Soundboard: Matriz rápida de efectos de sonido táctiles"
        >
          <Volume2 size={14} className="text-amber-400" />
          <span>SFX Pad</span>
        </button>
      )}
    </div>
  );
};
