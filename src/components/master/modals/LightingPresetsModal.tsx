import React, { useState } from 'react';
import {
  Sun,
  X,
  Plus,
  Flame,
  Moon,
  Sparkles,
  Layers,
  Check,
  RefreshCw,
  Save,
} from 'lucide-react';
import type {
  Campaign,
  SceneLight,
  SceneLightingPreset,
  LightingApplyMode,
  LightingFilter,
} from '../../../types';
import {
  DEFAULT_LIGHTING_PRESETS,
  applyLightingPreset,
} from '../../../domain/display/lightingPresetDefaults';

interface LightingPresetsModalProps {
  isOpen: boolean;
  campaign: Campaign | null;
  currentLights: SceneLight[];
  currentLightingFilter?: LightingFilter;
  onApplyPreset: (
    preset: SceneLightingPreset,
    mode: LightingApplyMode,
    newLights: SceneLight[]
  ) => Promise<void>;
  onSavePreset: (newPreset: SceneLightingPreset) => Promise<void>;
  onClose: () => void;
}

const PRESET_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'preset-warm-tavern': Flame,
  'preset-moonlit-ruins': Moon,
  'preset-arcane-shrine': Sparkles,
};

export const LightingPresetsModal: React.FC<LightingPresetsModalProps> = ({
  isOpen,
  campaign,
  currentLights = [],
  currentLightingFilter = 'normal',
  onApplyPreset,
  onSavePreset,
  onClose,
}) => {
  if (!isOpen) return null;

  const allPresets: SceneLightingPreset[] = [
    ...DEFAULT_LIGHTING_PRESETS,
    ...(campaign?.lightingPresets || []),
  ];

  const [selectedPresetId, setSelectedPresetId] = useState<string>(allPresets[0].id);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetDesc, setNewPresetDesc] = useState<string>('');
  const [showSaveForm, setShowSaveForm] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [appliedMode, setAppliedMode] = useState<string | null>(null);

  const selectedPreset =
    allPresets.find((p) => p.id === selectedPresetId) || allPresets[0];

  const handleApply = async (mode: LightingApplyMode) => {
    const nextLights = applyLightingPreset(currentLights, selectedPreset, mode);
    setAppliedMode(mode);
    await onApplyPreset(selectedPreset, mode, nextLights);
    setTimeout(() => setAppliedMode(null), 1500);
  };

  const handleSaveCurrentAsPreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: SceneLightingPreset = {
      id: `preset-custom-${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || 'Preset personalizado de escena',
      lights: JSON.parse(JSON.stringify(currentLights)),
      lightingFilter: currentLightingFilter,
      transitionDurationMs: 800,
    };

    await onSavePreset(newPreset);
    setSaveSuccess(true);
    setNewPresetName('');
    setNewPresetDesc('');
    setShowSaveForm(false);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]">
        {/* HEADER */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Sun size={18} className="text-amber-400" />
            <span className="font-bold text-slate-100 text-sm sm:text-base">
              Presets de Iluminación y Luces de Escena
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Preset Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {allPresets.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              const IconComponent = PRESET_ICONS[preset.id] || Layers;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-3.5 rounded-xl border flex flex-col items-start gap-2 transition-all text-left relative ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/80 text-amber-100 shadow-md ring-1 ring-amber-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <IconComponent
                        size={15}
                        className={isSelected ? 'text-amber-400' : 'text-slate-400'}
                      />
                      <span>{preset.name}</span>
                    </div>
                    {preset.lightingFilter && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {preset.lightingFilter}
                      </span>
                    )}
                  </div>

                  {preset.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {preset.description}
                    </p>
                  )}

                  {/* Swatches preview */}
                  <div className="flex items-center gap-1 mt-auto pt-1">
                    {preset.lights.map((l) => (
                      <span
                        key={l.id}
                        className="w-3.5 h-3.5 rounded-full border border-slate-900 shadow-sm"
                        style={{ backgroundColor: l.color }}
                        title={`${l.name} (${l.preset})`}
                      />
                    ))}
                    <span className="text-[10px] text-slate-400 ml-1">
                      {preset.lights.length} {preset.lights.length === 1 ? 'luz' : 'luces'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Preset Detail & Inspection */}
          {selectedPreset && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{selectedPreset.name}</h4>
                  <p className="text-xs text-slate-400">{selectedPreset.description}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <span>Transición suave: </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {selectedPreset.transitionDurationMs || 800}ms
                  </span>
                </div>
              </div>

              {/* Lights list inside preset */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {selectedPreset.lights.map((light) => (
                  <div
                    key={light.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-950 shrink-0"
                        style={{ backgroundColor: light.color }}
                      />
                      <span className="font-medium text-slate-300">{light.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {light.preset} {light.flicker ? '· parpadeo' : ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons: Replace or Merge */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleApply('merge')}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-200 border border-sky-800/50 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Plus size={13} className="text-sky-400" />
                  <span>
                    {appliedMode === 'merge' ? '¡Combinado!' : 'Combinar con Actuales'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApply('replace')}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-amber-50 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-900/40 transition-all active:scale-95"
                >
                  <RefreshCw size={13} />
                  <span>
                    {appliedMode === 'replace' ? '¡Aplicado!' : 'Reemplazar Iluminación'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Save Current Lights Section */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-slate-200 block">
                  Iluminación Actual de la Escena
                </span>
                <span className="text-[11px] text-slate-400">
                  {currentLights.length} {currentLights.length === 1 ? 'luz configurada' : 'luces configuradas'} en Mesa (Filtro: {currentLightingFilter})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowSaveForm(!showSaveForm)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Save size={13} />
                <span>{showSaveForm ? 'Cancelar' : 'Guardar Actual como Preset'}</span>
              </button>
            </div>

            {showSaveForm && (
              <form onSubmit={handleSaveCurrentAsPreset} className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Nombre del preset (ej: Cripta Profunda)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                    required
                  />
                  <input
                    type="text"
                    value={newPresetDesc}
                    onChange={(e) => setNewPresetDesc(e.target.value)}
                    placeholder="Descripción narrativa (opcional)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Check size={13} />
                    <span>Guardar en Campaña</span>
                  </button>
                </div>
              </form>
            )}

            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-bold block animate-fade-in">
                ✓ Preset guardado exitosamente en la campaña
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
