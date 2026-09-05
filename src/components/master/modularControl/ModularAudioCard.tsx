import React from 'react';
import { Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronRight } from 'lucide-react';

export interface ModularAudioCardProps {
  trackTitle?: string;
  isPlaying: boolean;
  volume: number; // 0 to 1
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
  onOpenSoundtrack?: () => void;
}

export const ModularAudioCard: React.FC<ModularAudioCardProps> = ({
  trackTitle,
  isPlaying,
  volume,
  onTogglePlay,
  onVolumeChange,
  onNextTrack,
  onPrevTrack,
  onOpenSoundtrack,
}) => {
  return (
    <section className="modular-card" aria-label="Control de Audio">
      <div className="modular-card-header">
        <div className="modular-card-title-group">
          <Music size={18} className="modular-card-icon" style={{ color: '#c084fc' }} />
          <span>Audio</span>
        </div>
        {onOpenSoundtrack && (
          <button
            type="button"
            className="modular-card-arrow"
            onClick={onOpenSoundtrack}
            aria-label="Abrir catálogo de música"
            title="Ver catálogo de música ambiental y efectos"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="modular-audio-row">
        <div className="modular-audio-cover">
          <Music size={22} />
        </div>

        <div className="modular-audio-meta">
          <span className="modular-audio-title" title={trackTitle || 'Pista ambiental'}>
            {trackTitle || 'Pista ambiental'}
          </span>
          <span className="modular-audio-subtitle">
            {isPlaying ? 'Reproduciendo en mesa' : 'Pausado'}
          </span>
        </div>

        <div className="modular-audio-controls">
          {onPrevTrack && (
            <button
              type="button"
              className="modular-audio-btn"
              onClick={onPrevTrack}
              title="Pista anterior"
              aria-label="Pista anterior"
            >
              <SkipBack size={15} />
            </button>
          )}

          <button
            type="button"
            className={`modular-audio-btn ${isPlaying ? 'play-pulse' : ''}`}
            onClick={onTogglePlay}
            title={isPlaying ? 'Pausar música' : 'Reproducir música'}
            aria-label={isPlaying ? 'Pausar música' : 'Reproducir música'}
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} style={{ marginLeft: '2px' }} />}
          </button>

          {onNextTrack && (
            <button
              type="button"
              className="modular-audio-btn"
              onClick={onNextTrack}
              title="Siguiente pista"
              aria-label="Siguiente pista"
            >
              <SkipForward size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Volume slider row */}
      <div className="modular-audio-volume-row">
        <button
          type="button"
          onClick={() => onVolumeChange(volume > 0 ? 0 : 0.6)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
          title={volume === 0 ? 'Activar sonido' : 'Silenciar'}
        >
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(volume * 100)}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          className="modular-range-slider"
          style={{ accentColor: '#c084fc' }}
          aria-label="Volumen de audio"
        />

        <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700, minWidth: '32px', textAlign: 'right' }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </section>
  );
};
