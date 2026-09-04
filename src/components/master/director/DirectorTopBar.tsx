import React from 'react';
import type { CharacterOnScreen, CameraTransform } from '../../../types';
import {
  Move,
  Ruler,
  Camera,
  Plus,
  ArrowDown,
  Layers,
  RotateCcw,
} from 'lucide-react';

export interface DirectorTopBarProps {
  isStaging: boolean;
  showGuides: boolean;
  setShowGuides: (show: boolean) => void;
  showCameraPresets: boolean;
  setShowCameraPresets: (show: boolean) => void;
  onFocusCamera?: (focalX: number, focalY: number) => void;
  primarySelectedChar: CharacterOnScreen | null;
  characters: CharacterOnScreen[];
  savedCameraPresets?: { id: string; name: string; camera: CameraTransform }[];
  onSaveCameraPreset?: (name: string, camera: CameraTransform) => void;
  setSavingPresetModalOpen: (open: boolean) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  onUpdateMultipleCharacterPositions: (
    updates: { id: string; normalizedX: number; normalizedY: number }[],
    description: string
  ) => void;
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (val: boolean) => void;
  canUndo?: boolean;
  onUndo?: () => void;
}

export const DirectorTopBar: React.FC<DirectorTopBarProps> = ({
  isStaging,
  showGuides,
  setShowGuides,
  showCameraPresets,
  setShowCameraPresets,
  onFocusCamera,
  primarySelectedChar,
  characters,
  savedCameraPresets = [],
  onSaveCameraPreset,
  setSavingPresetModalOpen,
  selectedIds,
  setSelectedIds,
  onUpdateMultipleCharacterPositions,
  isMultiSelectMode,
  setIsMultiSelectMode,
  canUndo,
  onUndo,
}) => {
  return (
    <div className="director-ui-element absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1.5 pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-amber-500/40 rounded-xl px-2.5 py-1 text-xs shadow-2xl">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 font-bold text-amber-400">
          <Move size={13} className="text-amber-400" />
          <span className="tracking-wide">MODO DIRECCIÓN</span>
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            isStaging
              ? 'bg-purple-900/60 text-purple-200 border border-purple-500/50'
              : 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/50'
          }`}
        >
          {isStaging ? 'DESTINO: BORRADOR' : 'DESTINO: MESA (EN VIVO)'}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Guides Toggle */}
        <button
          type="button"
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
            showGuides
              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 font-semibold'
              : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
          }`}
          onClick={() => setShowGuides(!showGuides)}
          title="Mostrar línea de suelo y márgenes seguros de diálogo"
        >
          <Ruler size={11} />
          <span>Guías</span>
        </button>

        {/* Camera Presets Dropdown */}
        {onFocusCamera && (
          <div className="relative">
            <button
              type="button"
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                showCameraPresets
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400 font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
              onClick={() => setShowCameraPresets(!showCameraPresets)}
              title="Presets de encuadre de cámara"
            >
              <Camera size={11} />
              <span>Cámara</span>
            </button>
            {showCameraPresets && (
              <div className="director-ui-element absolute top-7 right-0 z-50 bg-slate-950/95 backdrop-blur-md border border-amber-500/50 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[150px]">
                <button
                  type="button"
                  className="text-left text-xs text-slate-200 hover:text-amber-300 px-2 py-1 rounded hover:bg-slate-900 flex items-center justify-between transition-colors"
                  onClick={() => {
                    onFocusCamera(50, 50);
                    setShowCameraPresets(false);
                  }}
                >
                  <span>Plano General</span>
                  <span className="text-[10px] text-slate-500 font-mono">1.0x</span>
                </button>
                {primarySelectedChar && (
                  <button
                    type="button"
                    className="text-left text-xs text-slate-200 hover:text-amber-300 px-2 py-1 rounded hover:bg-slate-900 flex items-center justify-between transition-colors"
                    onClick={() => {
                      onFocusCamera(
                        primarySelectedChar.normalizedX ?? 50,
                        primarySelectedChar.normalizedY ?? 0
                      );
                      setShowCameraPresets(false);
                    }}
                  >
                    <span className="truncate max-w-[95px]">{primarySelectedChar.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">1.35x</span>
                  </button>
                )}
                <button
                  type="button"
                  className="text-left text-xs text-slate-200 hover:text-amber-300 px-2 py-1 rounded hover:bg-slate-900 flex items-center justify-between transition-colors"
                  onClick={() => {
                    const speaker = characters.find((c) => c.isSpeaking) || characters[0];
                    if (speaker) {
                      onFocusCamera(speaker.normalizedX ?? 50, speaker.normalizedY ?? 0);
                    }
                    setShowCameraPresets(false);
                  }}
                >
                  <span>Hablante</span>
                  <span className="text-[10px] text-slate-500 font-mono">Auto</span>
                </button>

                {/* Saved Scene Camera Presets */}
                {savedCameraPresets && savedCameraPresets.length > 0 && (
                  <div className="border-t border-slate-800 pt-1 flex flex-col gap-0.5">
                    <span className="text-[9px] font-semibold text-amber-400/80 px-1 uppercase tracking-wider">
                      Encuadres de escena
                    </span>
                    {savedCameraPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className="text-left text-xs text-amber-200 hover:text-white px-2 py-1 rounded hover:bg-slate-900 flex items-center justify-between transition-colors"
                        onClick={() => {
                          onFocusCamera(preset.camera.focalPoint.x, preset.camera.focalPoint.y);
                          setShowCameraPresets(false);
                        }}
                      >
                        <span className="truncate max-w-[95px]">{preset.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {preset.camera.zoom.toFixed(1)}x
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {onSaveCameraPreset && (
                  <button
                    type="button"
                    className="text-left text-xs text-cyan-300 hover:text-white px-2 py-1 rounded hover:bg-slate-900 flex items-center gap-1 border-t border-slate-800 mt-0.5"
                    onClick={() => {
                      setShowCameraPresets(false);
                      setSavingPresetModalOpen(true);
                    }}
                  >
                    <Plus size={11} />
                    <span>Guardar encuadre actual...</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Group Alignment Tools when 2 or more selected */}
        {selectedIds.size >= 2 && (
          <div className="flex items-center gap-1 bg-slate-900/90 border border-amber-500/40 rounded-lg px-1.5 py-0.5">
            <button
              type="button"
              className="text-[10px] text-amber-300 hover:text-white flex items-center gap-0.5 font-medium"
              onClick={() => {
                const updates = Array.from(selectedIds).map((id) => {
                  const char = characters.find((c) => c.id === id);
                  return {
                    id,
                    normalizedX: char?.normalizedX ?? 50,
                    normalizedY: 0,
                  };
                });
                onUpdateMultipleCharacterPositions(updates, 'Alinear personajes a la línea de suelo');
              }}
              title="Alinear todos los seleccionados al suelo (Y = 0%)"
            >
              <ArrowDown size={11} />
              <span>Al suelo</span>
            </button>
            <button
              type="button"
              className="text-[10px] text-amber-300 hover:text-white flex items-center gap-0.5 font-medium ml-1"
              onClick={() => {
                const selectedChars = characters
                  .filter((c) => selectedIds.has(c.id))
                  .sort((a, b) => (a.normalizedX ?? 50) - (b.normalizedX ?? 50));
                if (selectedChars.length <= 1) return;
                const minX = selectedChars[0].normalizedX ?? 20;
                const maxX = selectedChars[selectedChars.length - 1].normalizedX ?? 80;
                const span = maxX - minX;
                const step = span / (selectedChars.length - 1);
                const updates = selectedChars.map((c, idx) => ({
                  id: c.id,
                  normalizedX: Math.round(minX + step * idx),
                  normalizedY: c.normalizedY ?? 0,
                }));
                onUpdateMultipleCharacterPositions(updates, 'Distribuir personajes horizontalmente');
              }}
              title="Distribuir equitativamente en horizontal"
            >
              <span>Distribuir</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
            isMultiSelectMode
              ? 'bg-amber-500 text-slate-950 font-semibold'
              : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
          }`}
          onClick={() => {
            setIsMultiSelectMode(!isMultiSelectMode);
            if (isMultiSelectMode && selectedIds.size > 1) {
              const first = Array.from(selectedIds)[0];
              setSelectedIds(first ? new Set([first]) : new Set());
            }
          }}
          title="Permite seleccionar y desplazar varios personajes conservando su formación relativa"
        >
          <Layers size={11} />
          <span>{isMultiSelectMode ? 'Selección múltiple (Activa)' : 'Seleccionar varios'}</span>
        </button>

        {canUndo && onUndo && (
          <button
            type="button"
            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 flex items-center gap-1"
            onClick={onUndo}
            title="Deshacer el último cambio de dirección"
          >
            <RotateCcw size={11} />
            <span>Deshacer</span>
          </button>
        )}
      </div>
    </div>
  );
};
