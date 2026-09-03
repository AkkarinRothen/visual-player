import React, { useState } from 'react';
import {
  Music,
  X,
  Headphones,
  Send,
  Save,
  Volume2,
  Compass,
  Zap,
  Swords,
  Coffee,
  Play,
  Square,
} from 'lucide-react';
import type {
  Campaign,
  BiomeSoundProfile,
  EnvironmentBiome,
  SceneSituation,
} from '../../../types';
import {
  DEFAULT_BIOME_PROFILES,
  resolveBiomeTrackLayer,
} from '../../../domain/audio/biomeDefaults';
import { resolveAudioTransitionPlan } from '../../../domain/audio/biomeSoundCoordinator';
import { soundEngine } from '../../../services/soundEngine';

interface BiomeSoundtrackModalProps {
  isOpen: boolean;
  campaign: Campaign | null;
  currentAmbientUrl?: string;
  currentAmbientVolume?: number;
  currentAmbientPlaying?: boolean;
  onApplySoundtrack: (url: string, volume: number, crossfade: boolean) => Promise<void>;
  onSaveProfiles: (profiles: BiomeSoundProfile[]) => Promise<void>;
  onClose: () => void;
}

const BIOME_LABELS: Record<EnvironmentBiome, { label: string; icon: string }> = {
  tavern: { label: 'Taberna', icon: '🍺' },
  forest: { label: 'Bosque', icon: '🌲' },
  dungeon: { label: 'Mazmorra', icon: '🗝️' },
  city: { label: 'Ciudad', icon: '🏰' },
  ruins: { label: 'Ruinas', icon: '🏛️' },
  sea: { label: 'Alta Mar', icon: '⛵' },
};

const SITUATION_META: Record<
  SceneSituation,
  { label: string; icon: React.FC<{ size?: number; className?: string }>; desc: string }
> = {
  exploration: {
    label: 'Exploración',
    icon: Compass,
    desc: 'Atmósfera tranquila de descubrimiento y tránsito',
  },
  tension: {
    label: 'Tensión',
    icon: Zap,
    desc: 'Incertidumbre, peligro al acecho o sigilo',
  },
  combat: {
    label: 'Combate',
    icon: Swords,
    desc: 'Acción desenfrenada, percusión y adrenalina',
  },
  rest: {
    label: 'Descanso',
    icon: Coffee,
    desc: 'Campamento, recuperación y alivio seguro',
  },
};

export const BiomeSoundtrackModal: React.FC<BiomeSoundtrackModalProps> = ({
  isOpen,
  campaign,
  currentAmbientUrl = '',
  currentAmbientVolume = 0.6,
  currentAmbientPlaying = false,
  onApplySoundtrack,
  onSaveProfiles,
  onClose,
}) => {
  if (!isOpen) return null;

  // Profiles draft (from campaign or defaults)
  const [profiles, setProfiles] = useState<BiomeSoundProfile[]>(() => {
    if (campaign?.biomeProfiles && campaign.biomeProfiles.length > 0) {
      return JSON.parse(JSON.stringify(campaign.biomeProfiles));
    }
    return JSON.parse(JSON.stringify(DEFAULT_BIOME_PROFILES));
  });

  const [selectedBiome, setSelectedBiome] = useState<EnvironmentBiome>('tavern');
  const [selectedSituation, setSelectedSituation] = useState<SceneSituation>('exploration');
  const [isRehearsingLocally, setIsRehearsingLocally] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const currentProfile =
    profiles.find((p) => p.biome === selectedBiome) || profiles[0];
  const currentLayer = resolveBiomeTrackLayer(currentProfile, selectedSituation);

  const updateCurrentLayer = (field: string, value: any) => {
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.biome !== selectedBiome) return p;
        return {
          ...p,
          situations: {
            ...p.situations,
            [selectedSituation]: {
              ...p.situations[selectedSituation],
              [field]: value,
            },
          },
        };
      })
    );
  };

  const handlePrivateRehearsalToggle = () => {
    if (isRehearsingLocally) {
      soundEngine.stopAmbient();
      setIsRehearsingLocally(false);
    } else {
      const urlToPlay = currentLayer.musicUrl || currentLayer.ambientUrl;
      const vol = currentLayer.musicVolume ?? currentLayer.ambientVolume ?? 0.6;
      if (urlToPlay) {
        soundEngine.setAmbient(urlToPlay, true, vol, true);
        setIsRehearsingLocally(true);
      }
    }
  };

  const handleApplyToMesa = async () => {
    if (isRehearsingLocally) {
      soundEngine.stopAmbient();
      setIsRehearsingLocally(false);
    }

    const plan = resolveAudioTransitionPlan(
      {
        url: currentAmbientUrl,
        volume: currentAmbientVolume,
        playing: currentAmbientPlaying,
      },
      currentLayer
    );

    if (plan.url) {
      await onApplySoundtrack(plan.url, plan.volume, plan.crossfade);
    }
  };

  const handleSaveToCampaign = async () => {
    await onSaveProfiles(profiles);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh]">
        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-amber-400" />
            <span className="font-bold text-slate-100 text-sm sm:text-base">
              Selector de Banda Sonora por Bioma y Situación
            </span>
          </div>

          <button
            onClick={() => {
              if (isRehearsingLocally) soundEngine.stopAmbient();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* BIOME SELECTOR TABS */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          {(Object.keys(BIOME_LABELS) as EnvironmentBiome[]).map((biome) => {
            const isSelected = selectedBiome === biome;
            const meta = BIOME_LABELS[biome];
            return (
              <button
                key={biome}
                type="button"
                onClick={() => {
                  setSelectedBiome(biome);
                  if (isRehearsingLocally) soundEngine.stopAmbient();
                  setIsRehearsingLocally(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* SITUATION DRAMATIC TONE SELECTOR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 py-3 bg-slate-900/90 border-b border-slate-800">
          {(Object.keys(SITUATION_META) as SceneSituation[]).map((sit) => {
            const isSelected = selectedSituation === sit;
            const meta = SITUATION_META[sit];
            const Icon = meta.icon;
            return (
              <button
                key={sit}
                type="button"
                onClick={() => {
                  setSelectedSituation(sit);
                  if (isRehearsingLocally) soundEngine.stopAmbient();
                  setIsRehearsingLocally(false);
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-start gap-1 transition-all text-left ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500/80 text-amber-200 shadow'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Icon size={14} className={isSelected ? 'text-amber-400' : 'text-slate-400'} />
                  <span>{meta.label}</span>
                </div>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {meta.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* TRACK LAYER CONFIGURATION */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-950/70 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Music Track Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Music size={13} className="text-amber-400" />
                <span>Pista Musical (Tema / Melodía)</span>
              </label>
              <input
                type="text"
                value={currentLayer.musicUrl || ''}
                onChange={(e) => updateCurrentLayer('musicUrl', e.target.value)}
                placeholder="https://ejemplo.com/audio/combate.mp3"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>

            {/* Ambient Track Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Volume2 size={13} className="text-sky-400" />
                <span>Capa Ambiental Continua (Sonido de fondo)</span>
              </label>
              <input
                type="text"
                value={currentLayer.ambientUrl || ''}
                onChange={(e) => updateCurrentLayer('ambientUrl', e.target.value)}
                placeholder="https://ejemplo.com/audio/viento.mp3"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* Sliders: Volume and Crossfade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Volumen de Mezcla:</span>
                <span className="font-mono font-bold text-amber-300">
                  {Math.round((currentLayer.musicVolume ?? 0.6) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={currentLayer.musicVolume ?? 0.6}
                onChange={(e) => updateCurrentLayer('musicVolume', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Duración de Fundido (Crossfade):</span>
                <span className="font-mono font-bold text-sky-300">
                  {currentLayer.crossfadeSeconds ?? 2.0}s
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.5"
                value={currentLayer.crossfadeSeconds ?? 2.0}
                onChange={(e) =>
                  updateCurrentLayer('crossfadeSeconds', parseFloat(e.target.value))
                }
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Rehearsal Preview Controller */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-900/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Headphones size={16} className="text-purple-400" />
              <div>
                <span className="font-bold text-slate-200 block">Ensayo Privado (Local)</span>
                <span className="text-[11px] text-slate-400">
                  Escucha esta capa en tu dispositivo antes de enviarla a la Mesa
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrivateRehearsalToggle}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                isRehearsingLocally
                  ? 'bg-red-900/70 text-red-200 border border-red-700/60'
                  : 'bg-purple-900/70 hover:bg-purple-800 text-purple-200 border border-purple-600/60'
              }`}
            >
              {isRehearsingLocally ? (
                <>
                  <Square size={12} className="fill-red-400" />
                  <span>Detener Ensayo</span>
                </>
              ) : (
                <>
                  <Play size={12} className="fill-purple-400" />
                  <span>Probar en Auriculares</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-800 bg-slate-950/90">
          <button
            type="button"
            onClick={handleSaveToCampaign}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Save size={13} />
            <span>{saveSuccess ? '¡Guardado en Campaña!' : 'Guardar en Campaña'}</span>
          </button>

          <button
            type="button"
            onClick={handleApplyToMesa}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-50 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-900/40 transition-all active:scale-95"
          >
            <Send size={14} />
            <span>Proyectar Tono a la Mesa</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
