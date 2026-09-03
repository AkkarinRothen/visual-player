import React, { useState, useRef } from 'react';
import {
  Volume2,
  X,
  Headphones,
  Square,
  Swords,
  Flame,
  Sparkles,
  Zap,
  DoorClosed,
  Bell,
  Skull,
  Eye,
  Ghost,
  Key,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import type { Campaign, SoundboardCategory, SoundboardPad } from '../../../types';
import {
  getDefaultSoundboardBank,
  filterPadsByCategory,
} from '../../../domain/audio/soundboardDefaults';
import { soundEngine } from '../../../services/soundEngine';

interface SoundboardModalProps {
  isOpen: boolean;
  campaign: Campaign | null;
  onTriggerSfx: (pad: SoundboardPad) => Promise<void>;
  onStopAllSfx: () => Promise<void>;
  onClose: () => void;
}

// Icon mapping helper
const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Swords,
  Flame,
  Sparkles,
  Zap,
  DoorClosed,
  Bell,
  Skull,
  Eye,
  Ghost,
  Key,
  AlertTriangle,
  Trophy,
};

export const SoundboardModal: React.FC<SoundboardModalProps> = ({
  isOpen,
  campaign,
  onTriggerSfx,
  onStopAllSfx,
  onClose,
}) => {
  if (!isOpen) return null;

  // Selected bank (fallback to campaign banks or default bank)
  const currentBank =
    campaign?.soundboardBanks && campaign.soundboardBanks.length > 0
      ? campaign.soundboardBanks[0]
      : getDefaultSoundboardBank(campaign?.title);

  const [selectedCategory, setSelectedCategory] = useState<SoundboardCategory | 'all'>('all');
  const [isPrivateRehearsal, setIsPrivateRehearsal] = useState<boolean>(false);

  // Pad cooldown and visual firing tracking
  const [activePadIds, setActivePadIds] = useState<Record<string, 'firing' | 'cooldown'>>({});
  const cooldownTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const filteredPads = filterPadsByCategory(currentBank.pads, selectedCategory);

  const handlePadPress = async (pad: SoundboardPad) => {
    // 1. Protection against accidental rapid double-tap (debounce 450ms)
    if (activePadIds[pad.id]) {
      if (pad.retriggerPolicy === 'ignore') {
        return;
      }
    }

    // 2. Haptic vibration feedback on mobile
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(40);
      } catch {
        // Safe fallback if permission is restricted
      }
    }

    // 3. Mark visual firing state
    setActivePadIds((prev) => ({ ...prev, [pad.id]: 'firing' }));
    if (cooldownTimers.current[pad.id]) {
      clearTimeout(cooldownTimers.current[pad.id]);
    }
    cooldownTimers.current[pad.id] = setTimeout(() => {
      setActivePadIds((prev) => {
        const next = { ...prev };
        delete next[pad.id];
        return next;
      });
    }, 450);

    // 4. Sound execution: Private rehearsal (Local DM only) vs Mesa (WebRTC broadcast)
    if (isPrivateRehearsal) {
      if (pad.audioUrl) {
        soundEngine.playAudioUrl(pad.audioUrl, pad.volume ?? 0.8);
      } else if (pad.sfxPreset) {
        soundEngine.playSynth(pad.sfxPreset);
      }
    } else {
      await onTriggerSfx(pad);
    }
  };

  const handleStopAll = async () => {
    soundEngine.stopAllSfx();
    await onStopAllSfx();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh]">
        {/* MODAL HEADER */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Volume2 size={18} className="text-amber-400" />
            <span className="font-bold text-slate-100 text-sm sm:text-base">
              Soundboard: Matriz Rápida de SFX
            </span>
            {isPrivateRehearsal && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-950 text-purple-300 border border-purple-700/60 flex items-center gap-1">
                <Headphones size={11} />
                Ensayo Privado
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStopAll}
              className="px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
              title="Detener de inmediato todos los efectos de sonido activos en la Mesa"
            >
              <Square size={12} className="fill-red-400" />
              <span>Detener SFX</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* TOOLBAR & CATEGORY FILTERS */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'combat', label: 'Combate' },
              { id: 'ambient', label: 'Ambiente' },
              { id: 'creature', label: 'Criaturas' },
              { id: 'narrative', label: 'Narrativa' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as SoundboardCategory | 'all')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Private Rehearsal Toggle */}
          <button
            type="button"
            onClick={() => setIsPrivateRehearsal(!isPrivateRehearsal)}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs ${
              isPrivateRehearsal
                ? 'bg-purple-900/80 text-purple-200 border border-purple-600/80 shadow'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
            title="Activar para escuchar los efectos solo en tus auriculares/dispositivo sin emitir en la Mesa"
          >
            <Headphones size={13} className={isPrivateRehearsal ? 'text-purple-300' : 'text-slate-500'} />
            <span>{isPrivateRehearsal ? 'Ensayo Activo (Local)' : 'Modo Mesa (Público)'}</span>
          </button>
        </div>

        {/* PADS GRID AREA */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/60">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredPads.map((pad) => {
              const isFiring = activePadIds[pad.id] === 'firing';
              const IconComponent = (pad.icon && ICON_MAP[pad.icon]) || Volume2;

              return (
                <button
                  key={pad.id}
                  type="button"
                  onClick={() => handlePadPress(pad)}
                  className={`relative p-3.5 sm:p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all select-none active:scale-95 ${
                    isFiring
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400/80 shadow-lg shadow-amber-950/40'
                      : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                  style={{ minHeight: '96px', touchAction: 'manipulation' }}
                >
                  <div
                    className={`p-2 rounded-xl transition-all ${
                      isFiring
                        ? 'bg-amber-500 text-slate-950 scale-110 shadow-md'
                        : 'bg-slate-950 text-amber-400 border border-slate-800'
                    }`}
                  >
                    <IconComponent size={20} />
                  </div>

                  <span className="font-bold text-xs leading-tight tracking-wide text-slate-100 line-clamp-1">
                    {pad.label}
                  </span>

                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">
                    {pad.category}
                  </span>

                  {/* Firing animation ping */}
                  {isFiring && (
                    <span className="absolute inset-0 rounded-xl border-2 border-amber-400 animate-ping pointer-events-none opacity-50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <footer className="flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-slate-950/90 text-xs text-slate-400">
          <span>{filteredPads.length} pads disponibles en {currentBank.name}</span>
          <span className="text-[11px] text-slate-500">
            {isPrivateRehearsal ? 'Escucha privada en este dispositivo' : 'Proyección de audio activa en la Mesa'}
          </span>
        </footer>
      </div>
    </div>
  );
};
