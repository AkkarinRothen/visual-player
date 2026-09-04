import React from 'react';
import type {
  CharacterOnScreen,
  Character,
  SceneProp,
  SceneOcclusionRegion,
  StageWaypoint,
  CameraTransform,
} from '../../../types';
import type { StageUnifiedItem, OcclusionFormState } from './directorTypes';
import {
  X,
  Check,
  Sliders,
  Play,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  MapPin,
  Move,
  AlertTriangle,
  Layers,
  Plus,
} from 'lucide-react';

export interface DirectorModalsProps {
  characters: CharacterOnScreen[];
  campaignCharacters: Character[];
  unifiedStageItems: StageUnifiedItem[];
  waypoints: StageWaypoint[];
  selectedIds: Set<string>;
  primarySelectedChar: CharacterOnScreen | null;

  // Anchor calibration modal
  calibratingAnchorCharId: string | null;
  setCalibratingAnchorCharId: (id: string | null) => void;
  calibratingOffsetValue: number;
  setCalibratingOffsetValue: React.Dispatch<React.SetStateAction<number>>;

  // Entry prep modal
  preparingEntryCharId: string | null;
  setPreparingEntryCharId: (id: string | null) => void;
  preparingTransition: 'fade' | 'slide-bottom' | 'slide-left' | 'slide-right';
  setPreparingTransition: (t: 'fade' | 'slide-bottom' | 'slide-left' | 'slide-right') => void;

  // Save preset modal
  savingPresetModalOpen: boolean;
  setSavingPresetModalOpen: (open: boolean) => void;
  presetNameInput: string;
  setPresetNameInput: (name: string) => void;

  // Relative layer modal
  relativeLayerModalOpen: 'front_of' | 'behind' | null;
  setRelativeLayerModalOpen: (val: 'front_of' | 'behind' | null) => void;

  // View layers modal
  viewLayersModalOpen: boolean;
  setViewLayersModalOpen: (open: boolean) => void;

  // Save waypoint modal
  savingWaypointModalOpen: boolean;
  setSavingWaypointModalOpen: (open: boolean) => void;
  waypointNameInput: string;
  setWaypointNameInput: (name: string) => void;

  // Move to waypoint modal
  movingToWaypointModalOpen: boolean;
  setMovingToWaypointModalOpen: (open: boolean) => void;

  // Create occlusion modal
  creatingOcclusionModalOpen: boolean;
  setCreatingOcclusionModalOpen: (open: boolean) => void;
  occlusionForm: OcclusionFormState;
  setOcclusionForm: React.Dispatch<React.SetStateAction<OcclusionFormState>>;

  // Action callbacks
  onSaveCameraPreset?: (name: string, camera: CameraTransform) => void;
  onSaveWaypoint?: (waypoint: Omit<StageWaypoint, 'id'>) => void;
  onSaveOcclusionRegion?: (region: Omit<SceneOcclusionRegion, 'id'>) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onUpdateProp?: (propId: string, updates: Partial<SceneProp>, description: string) => void;
  onReorderLayers?: (
    items: { id: string; type: 'character' | 'prop' | 'occlusion'; zIndex: number }[],
    description: string
  ) => void;
  onUpdateCampaignCharacter?: (characterId: string, updates: Partial<Character>) => void;
  reorderRelativeTo: (subjectId: string, targetId: string, placement: 'front_of' | 'behind') => void;
}

export const DirectorModals: React.FC<DirectorModalsProps> = ({
  characters,
  campaignCharacters,
  unifiedStageItems,
  waypoints,
  selectedIds,
  primarySelectedChar,
  calibratingAnchorCharId,
  setCalibratingAnchorCharId,
  calibratingOffsetValue,
  setCalibratingOffsetValue,
  preparingEntryCharId,
  setPreparingEntryCharId,
  preparingTransition,
  setPreparingTransition,
  savingPresetModalOpen,
  setSavingPresetModalOpen,
  presetNameInput,
  setPresetNameInput,
  relativeLayerModalOpen,
  setRelativeLayerModalOpen,
  viewLayersModalOpen,
  setViewLayersModalOpen,
  savingWaypointModalOpen,
  setSavingWaypointModalOpen,
  waypointNameInput,
  setWaypointNameInput,
  movingToWaypointModalOpen,
  setMovingToWaypointModalOpen,
  creatingOcclusionModalOpen,
  setCreatingOcclusionModalOpen,
  occlusionForm,
  setOcclusionForm,
  onSaveCameraPreset,
  onSaveWaypoint,
  onSaveOcclusionRegion,
  onUpdateCharacter,
  onUpdateProp,
  onReorderLayers,
  onUpdateCampaignCharacter,
  reorderRelativeTo,
}) => {
  return (
    <>
      {/* ── MODAL: CALIBRAR PUNTO DE APOYO VISUAL ── */}
      {calibratingAnchorCharId &&
        (() => {
          const char = characters.find((c) => c.id === calibratingAnchorCharId);
          if (!char) return null;

          return (
            <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
              <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                    <Sliders size={14} />
                    <span>Calibrar apoyo en suelo: {char.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalibratingAnchorCharId(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-[11px] text-slate-300">
                  Ajustá el punto de apoyo para compensar márgenes transparentes bajo los pies. La
                  línea roja representa el suelo de la escena.
                </p>

                {/* Checkerboard Preview Stage */}
                <div className="w-full h-44 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] bg-slate-950 rounded-xl border border-slate-700 relative overflow-hidden flex items-end justify-center pb-0">
                  {/* Ground red line */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 z-10 shadow-[0_0_8px_rgba(244,63,94,0.8)] flex items-center justify-end pr-2">
                    <span className="text-[8px] font-mono text-rose-300 font-bold">SUELO</span>
                  </div>

                  {/* Standee with current offset */}
                  <img
                    src={char.avatarUrl}
                    alt={char.name}
                    className="max-h-36 object-contain transition-transform duration-75"
                    style={{
                      transform: `translateY(${calibratingOffsetValue}%)`,
                    }}
                  />
                </div>

                {/* Slider & Controls */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-mono w-20">
                    Offset: +{calibratingOffsetValue}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={calibratingOffsetValue}
                    onChange={(e) => setCalibratingOffsetValue(Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <button
                    type="button"
                    className="text-[10px] text-slate-400 hover:text-white underline shrink-0"
                    onClick={() => setCalibratingOffsetValue(0)}
                  >
                    Restablecer
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800 flex-wrap">
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    onClick={() => setCalibratingAnchorCharId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/40"
                    onClick={() => {
                      const expKey = char.activeExpression || 'default';
                      const updatedAnchors = {
                        ...(char.instanceVariantAnchors || {}),
                        [expKey]: calibratingOffsetValue,
                      };
                      onUpdateCharacter(
                        char.id,
                        {
                          visualAnchorOffsetY: calibratingOffsetValue,
                          instanceVariantAnchors: updatedAnchors,
                        },
                        `Punto de apoyo calibrado (+${calibratingOffsetValue}%) para figura de ${char.name}`
                      );
                      setCalibratingAnchorCharId(null);
                    }}
                    title="Guarda la calibración solo para esta figura en la escena actual"
                  >
                    <span>Guardar en esta figura</span>
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1"
                    onClick={() => {
                      const expKey = char.activeExpression || 'default';
                      const updatedAnchors = {
                        ...(char.instanceVariantAnchors || {}),
                        [expKey]: calibratingOffsetValue,
                      };
                      onUpdateCharacter(
                        char.id,
                        {
                          visualAnchorOffsetY: calibratingOffsetValue,
                          instanceVariantAnchors: updatedAnchors,
                        },
                        `Punto de apoyo calibrado (+${calibratingOffsetValue}%) para ${char.name}`
                      );
                      if (char.characterId && onUpdateCampaignCharacter) {
                        const baseChar = campaignCharacters.find((c) => c.id === char.characterId);
                        const campAnchors = {
                          ...(baseChar?.expressionAnchors || {}),
                          [expKey]: calibratingOffsetValue,
                        };
                        onUpdateCampaignCharacter(char.characterId, { expressionAnchors: campAnchors });
                      }
                      setCalibratingAnchorCharId(null);
                    }}
                    title="Guarda en la biblioteca/ficha para que todas las futuras apariciones usen esta calibración"
                  >
                    <Check size={14} />
                    <span>Guardar apoyo</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── MODAL: PREPARAR ENTRADA DESDE RESERVA ── */}
      {preparingEntryCharId &&
        (() => {
          const char = characters.find((c) => c.id === preparingEntryCharId);
          if (!char) return null;

          return (
            <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
              <div className="bg-slate-900 border-2 border-purple-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                    <Play size={14} />
                    <span>Preparar entrada: {char.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreparingEntryCharId(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <p className="text-[11px] text-slate-300">
                  Configurá la animación de entrada. El recurso público ya está listo en la Mesa. Al
                  pulsar entrar se ejecutará con animación suave.
                </p>

                <div className="flex flex-col gap-1.5 text-xs">
                  <span className="text-slate-400 font-medium">Tipo de animación:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'fade', label: 'Fundido (Fade)' },
                      { id: 'slide-bottom', label: 'Desde abajo' },
                      { id: 'slide-left', label: 'Desde izquierda' },
                      { id: 'slide-right', label: 'Desde derecha' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`px-2 py-1.5 rounded-lg border text-xs text-left ${
                          preparingTransition === t.id
                            ? 'bg-purple-600 text-white border-purple-400 font-semibold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                        onClick={() => setPreparingTransition(t.id as any)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Telemetry status badge */}
                <div className="p-2 rounded-xl bg-slate-950/80 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <span>Recurso público verificado y listo en Mesa</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                    onClick={() => setPreparingEntryCharId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-1.5 shadow-lg shadow-purple-900/40"
                    onClick={() => {
                      onUpdateCharacter(
                        char.id,
                        {
                          presence: 'on_stage',
                        },
                        `Entrada a escena con ${preparingTransition} para ${char.name}`
                      );
                      setPreparingEntryCharId(null);
                    }}
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Hacer entrar a escena</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── MODAL: GUARDAR PRESET DE CÁMARA ── */}
      {savingPresetModalOpen && (
        <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-xs">
            <span className="font-bold text-amber-300 text-xs">Guardar encuadre actual</span>
            <input
              type="text"
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              placeholder="ej. Mostrador, Puerta sótano..."
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white"
                onClick={() => {
                  setSavingPresetModalOpen(false);
                  setPresetNameInput('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400"
                onClick={() => {
                  if (presetNameInput.trim() && onSaveCameraPreset) {
                    onSaveCameraPreset(presetNameInput.trim(), {
                      focalPoint: {
                        x: primarySelectedChar?.normalizedX ?? 50,
                        y: primarySelectedChar?.normalizedY ?? 50,
                      },
                      zoom: 1.35,
                    });
                  }
                  setSavingPresetModalOpen(false);
                  setPresetNameInput('');
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: COLOCAR DELANTE / DETRÁS DE UN ELEMENTO ── */}
      {relativeLayerModalOpen && primarySelectedChar && (
        <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                {relativeLayerModalOpen === 'front_of' ? (
                  <ArrowUp size={14} className="text-emerald-400" />
                ) : (
                  <ArrowDown size={14} className="text-amber-400" />
                )}
                <span>
                  Colocar a {primarySelectedChar.name} {relativeLayerModalOpen === 'front_of' ? 'delante de…' : 'detrás de…'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setRelativeLayerModalOpen(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Elegí la figura u objeto de referencia. Se reordenarán las capas de forma limpia para evitar colisiones:
            </p>

            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-60 pr-1">
              {unifiedStageItems
                .filter((item) => item.id !== primarySelectedChar.id)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 transition-all text-left"
                    onClick={() => {
                      reorderRelativeTo(primarySelectedChar.id, item.id, relativeLayerModalOpen);
                      setRelativeLayerModalOpen(null);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.name}
                          className="w-7 h-7 rounded-lg object-cover border border-slate-700 bg-slate-900"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-purple-700/60 bg-purple-950/80 text-purple-300">
                          <Layers size={14} />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-200">
                          {item.privateLabel || item.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.type === 'prop' ? 'Objeto de decorado' : item.type === 'occlusion' ? 'Región Oclusión' : 'Personaje'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
                      Capa {item.zIndex}
                    </span>
                  </button>
                ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                onClick={() => setRelativeLayerModalOpen(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VER CAPAS DE LA ESCENA (ORDEN DE PROFUNDIDAD) ── */}
      {viewLayersModalOpen && (
        <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                <ListOrdered size={14} />
                <span>Capas de la Escena (Orden de Profundidad)</span>
              </span>
              <button
                type="button"
                onClick={() => setViewLayersModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Orden de capas actual de frente a fondo. El elemento superior tapa a los que están
              debajo:
            </p>

            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-64 pr-1">
              {[...unifiedStageItems].reverse().map((item, displayIdx, arr) => {
                const isTop = displayIdx === 0;
                const isBottom = displayIdx === arr.length - 1;

                const moveDirection = (direction: 'up' | 'down') => {
                  const currentItems = [...unifiedStageItems];
                  const currentIdx = currentItems.findIndex((i) => i.id === item.id);
                  if (currentIdx === -1) return;

                  const swapTargetIdx = direction === 'up' ? currentIdx + 1 : currentIdx - 1;
                  if (swapTargetIdx < 0 || swapTargetIdx >= currentItems.length) return;

                  const temp = currentItems[currentIdx];
                  currentItems[currentIdx] = currentItems[swapTargetIdx];
                  currentItems[swapTargetIdx] = temp;

                  const reordered = currentItems.map((it, idx) => ({
                    ...it,
                    zIndex: (idx + 1) * 10,
                  }));

                  if (onReorderLayers) {
                    onReorderLayers(
                      reordered.map((r) => ({ id: r.id, type: r.type, zIndex: r.zIndex })),
                      `Reordenar capas de escena`
                    );
                  } else {
                    const updatedZ = reordered.find((r) => r.id === item.id)?.zIndex ?? 10;
                    if (item.type === 'character') {
                      onUpdateCharacter(item.id, { zIndex: updatedZ }, 'Ajustar capa');
                    } else if (item.type === 'prop') {
                      onUpdateProp?.(item.id, { zIndex: updatedZ }, 'Ajustar capa');
                    }
                  }
                };

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      selectedIds.has(item.id)
                        ? 'bg-slate-800 border-amber-400/80 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          disabled={isTop}
                          onClick={() => moveDirection('up')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
                          title="Mover hacia el frente"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          disabled={isBottom}
                          onClick={() => moveDirection('down')}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20"
                          title="Mover hacia el fondo"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                      {item.avatarUrl ? (
                        <img
                          src={item.avatarUrl}
                          alt={item.name}
                          className="w-7 h-7 rounded-lg object-cover border border-slate-700 bg-slate-900"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-purple-700/60 bg-purple-950/80 text-purple-300">
                          <Layers size={14} />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-200">
                          {item.privateLabel || item.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.type === 'prop' ? 'Objeto' : item.type === 'occlusion' ? 'Región Oclusión' : 'Personaje'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
                      Capa {item.zIndex}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                type="button"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-950/80 text-purple-200 hover:text-white border border-purple-500/50 flex items-center gap-1"
                onClick={() => {
                  setViewLayersModalOpen(false);
                  setCreatingOcclusionModalOpen(true);
                }}
              >
                <Plus size={12} />
                <span>Nueva región oclusión</span>
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white"
                onClick={() => setViewLayersModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: GUARDAR PUNTO NARRATIVO ── */}
      {savingWaypointModalOpen && primarySelectedChar && (
        <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                <MapPin size={14} />
                <span>Guardar punto narrativo de escena</span>
              </span>
              <button
                type="button"
                onClick={() => setSavingWaypointModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Guarda las coordenadas actuales de <strong>{primarySelectedChar.name}</strong> (X: {primarySelectedChar.normalizedX ?? 50}%, Y: {primarySelectedChar.normalizedY ?? 0}%, Capa {primarySelectedChar.zIndex ?? 10}) como un punto reutilizable para esta escena.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 font-medium">Nombre del punto:</label>
              <input
                type="text"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                placeholder="ej. En la puerta, Detrás de la barra..."
                value={waypointNameInput}
                onChange={(e) => setWaypointNameInput(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
                onClick={() => setSavingWaypointModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!waypointNameInput.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40"
                onClick={() => {
                  if (onSaveWaypoint && waypointNameInput.trim()) {
                    onSaveWaypoint({
                      name: waypointNameInput.trim(),
                      normalizedX: primarySelectedChar.normalizedX ?? 50,
                      normalizedY: primarySelectedChar.normalizedY ?? 0,
                      targetZIndex: primarySelectedChar.zIndex,
                    });
                  }
                  setSavingWaypointModalOpen(false);
                }}
              >
                Guardar punto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: MOVER A PUNTO NARRATIVO ── */}
      {movingToWaypointModalOpen && primarySelectedChar && (
        <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-cyan-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                <Move size={14} />
                <span>Mover a punto narrativo: {primarySelectedChar.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setMovingToWaypointModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Elegí el destino. El personaje mantendrá su escala, apoyo calibrado y expresión facial:
            </p>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-60 pr-1">
              {waypoints.map((wp) => {
                const isOccupied = characters.some(
                  (c) =>
                    c.id !== primarySelectedChar.id &&
                    Math.abs((c.normalizedX ?? 50) - wp.normalizedX) < 6 &&
                    Math.abs((c.normalizedY ?? 0) - wp.normalizedY) < 6
                );

                return (
                  <div
                    key={wp.id}
                    className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-cyan-400" />
                        <span className="text-xs font-semibold text-slate-200">{wp.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({wp.normalizedX}%, {wp.normalizedY}%)
                          {wp.targetZIndex !== undefined && ` • Capa ${wp.targetZIndex}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="px-2 py-1 rounded text-[11px] font-semibold bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/50"
                          onClick={() => {
                            const updates: Partial<CharacterOnScreen> = {
                              normalizedX: wp.normalizedX,
                              normalizedY: wp.normalizedY,
                            };
                            if (wp.targetZIndex !== undefined) {
                              updates.zIndex = wp.targetZIndex;
                            }
                            onUpdateCharacter(
                              primarySelectedChar.id,
                              updates,
                              `Mover a ${primarySelectedChar.name} suave a ${wp.name}`
                            );
                            setMovingToWaypointModalOpen(false);
                          }}
                        >
                          Suave (0.4s)
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          onClick={() => {
                            const updates: Partial<CharacterOnScreen> = {
                              normalizedX: wp.normalizedX,
                              normalizedY: wp.normalizedY,
                            };
                            if (wp.targetZIndex !== undefined) {
                              updates.zIndex = wp.targetZIndex;
                            }
                            onUpdateCharacter(
                              primarySelectedChar.id,
                              updates,
                              `Mover a ${primarySelectedChar.name} instantáneo a ${wp.name}`
                            );
                            setMovingToWaypointModalOpen(false);
                          }}
                        >
                          Instantáneo
                        </button>
                      </div>
                    </div>
                    {isOccupied && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                        <AlertTriangle size={11} />
                        <span>Hay otra figura cerca de este punto.</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {waypoints.length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4">
                  No hay puntos narrativos guardados en esta escena. Podés guardar la posición actual usando el botón «Guardar posición como punto…».
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
                onClick={() => setMovingToWaypointModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR REGIÓN DE OCLUSIÓN ── */}
      {creatingOcclusionModalOpen && (
        <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-purple-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-purple-300 text-xs flex items-center gap-1.5">
                <Layers size={14} />
                <span>Nueva región de oclusión frontal</span>
              </span>
              <button
                type="button"
                onClick={() => setCreatingOcclusionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Define una porción del fondo que actuará como máscara frontal. Cualquier figura con capa inferior quedará oculta detrás de este elemento:
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-slate-400 font-medium">Nombre de la máscara:</label>
                <input
                  type="text"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  value={occlusionForm.name}
                  onChange={(e) => setOcclusionForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-slate-400 font-medium">Posición X (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                    value={occlusionForm.x}
                    onChange={(e) => setOcclusionForm((prev) => ({ ...prev, x: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-slate-400 font-medium">Posición Y (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                    value={occlusionForm.y}
                    onChange={(e) => setOcclusionForm((prev) => ({ ...prev, y: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-slate-400 font-medium">Ancho (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                    value={occlusionForm.width}
                    onChange={(e) => setOcclusionForm((prev) => ({ ...prev, width: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-slate-400 font-medium">Alto (%):</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                    value={occlusionForm.height}
                    onChange={(e) => setOcclusionForm((prev) => ({ ...prev, height: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-slate-400 font-medium">Nivel de capa (zIndex):</label>
                <input
                  type="number"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                  value={occlusionForm.zIndex}
                  onChange={(e) => setOcclusionForm((prev) => ({ ...prev, zIndex: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
                onClick={() => setCreatingOcclusionModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!occlusionForm.name.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
                onClick={() => {
                  if (onSaveOcclusionRegion && occlusionForm.name.trim()) {
                    onSaveOcclusionRegion({
                      name: occlusionForm.name.trim(),
                      x: occlusionForm.x,
                      y: occlusionForm.y,
                      width: occlusionForm.width,
                      height: occlusionForm.height,
                      zIndex: occlusionForm.zIndex,
                    });
                  }
                  setCreatingOcclusionModalOpen(false);
                }}
              >
                Crear región
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
