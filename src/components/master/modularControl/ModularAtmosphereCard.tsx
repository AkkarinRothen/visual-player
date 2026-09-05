import React from 'react';
import { CloudRain, CloudFog, CloudLightning, Sun, Droplets, ChevronRight, Check } from 'lucide-react';
import type { WeatherType, LightingFilter } from '../../../types';

export interface ModularAtmosphereCardProps {
  weather: WeatherType;
  weatherIntensity: number; // 0 to 1
  lighting: LightingFilter;
  onWeatherChange: (weather: WeatherType) => void;
  onWeatherIntensityChange: (intensity: number) => void;
  onLightingChange: (filter: LightingFilter) => void;
  onOpenAtmospherePresets?: () => void;
}

const LIGHTING_PALETTES: { id: LightingFilter; name: string; color: string }[] = [
  { id: 'normal', name: 'Natural', color: '#0ea5e9' },
  { id: 'night', name: 'Noche', color: '#1e40af' },
  { id: 'mystic_violet', name: 'Místico', color: '#9333ea' },
  { id: 'blood_moon', name: 'Luna de sangre', color: '#dc2626' },
  { id: 'torch_flicker', name: 'Antorchas', color: '#eab308' },
  { id: 'sunset', name: 'Atardecer', color: '#ea580c' },
];

export const ModularAtmosphereCard: React.FC<ModularAtmosphereCardProps> = ({
  weather,
  weatherIntensity,
  lighting,
  onWeatherChange,
  onWeatherIntensityChange,
  onLightingChange,
  onOpenAtmospherePresets,
}) => {
  const isWeatherActive = weather !== 'none';

  const getWeatherIcon = () => {
    switch (weather) {
      case 'rain': return <CloudRain size={18} style={{ color: '#38bdf8' }} />;
      case 'fog': return <CloudFog size={18} style={{ color: '#94a3b8' }} />;
      case 'storm': return <CloudLightning size={18} style={{ color: '#f59e0b' }} />;
      default: return isWeatherActive ? <CloudRain size={18} style={{ color: '#38bdf8' }} /> : <Sun size={18} style={{ color: '#cbd5e1' }} />;
    }
  };

  const getWeatherLabel = () => {
    switch (weather) {
      case 'rain': return 'Lluvia';
      case 'storm': return 'Tormenta';
      case 'fog': return 'Niebla';
      case 'snow': return 'Nieve';
      case 'embers': return 'Cenizas';
      case 'fireflies': return 'Luciérnagas';
      default: return isWeatherActive ? weather : 'Despejado';
    }
  };

  return (
    <section className="modular-card" aria-label="Ambiente y clima">
      <div className="modular-card-header">
        <div className="modular-card-title-group">
          <CloudRain size={18} className="modular-card-icon" />
          <span>Ambiente</span>
        </div>
        {onOpenAtmospherePresets && (
          <button
            type="button"
            className="modular-card-arrow"
            onClick={onOpenAtmospherePresets}
            aria-label="Presets atmosféricos"
            title="Ver presets de iluminación y clima"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Row 1: Weather State & Switch */}
      <div className="modular-atmo-row">
        <div className="modular-atmo-state">
          {getWeatherIcon()}
          <span>{getWeatherLabel()}</span>
        </div>

        <label className="modular-switch" title={isWeatherActive ? 'Desactivar clima' : 'Activar clima'}>
          <input
            type="checkbox"
            checked={isWeatherActive}
            onChange={(e) => {
              onWeatherChange(e.target.checked ? 'rain' : 'none');
            }}
          />
          <span className="modular-switch-slider" />
        </label>
      </div>

      {/* Row 2: Intensity Slider (visible if weather active or default) */}
      <div className="modular-slider-group">
        <div className="modular-slider-label-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Droplets size={13} />
            <span>Intensidad</span>
          </span>
          <span className="modular-slider-val">
            {Math.round(weatherIntensity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(weatherIntensity * 100)}
          onChange={(e) => onWeatherIntensityChange(Number(e.target.value) / 100)}
          className="modular-range-slider"
          aria-label="Intensidad del clima"
        />
      </div>

      {/* Row 3: Mood / Lighting Tone Palette */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
          Tono / Estado de ánimo
        </span>
        <div className="modular-mood-swatches">
          {LIGHTING_PALETTES.map((palette) => {
            const isActive = lighting === palette.id;
            return (
              <button
                key={palette.id}
                type="button"
                className={`modular-mood-circle ${isActive ? 'active' : ''}`}
                style={{ backgroundColor: palette.color }}
                onClick={() => onLightingChange(palette.id)}
                title={palette.name}
                aria-label={palette.name}
              >
                {isActive && <Check size={14} color="#ffffff" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
