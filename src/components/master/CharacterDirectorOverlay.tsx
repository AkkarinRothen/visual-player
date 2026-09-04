import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Smile,
  Eye,
  EyeOff,
  DoorOpen,
  Camera,
  Lock,
  Unlock,
  Tag,
  RotateCcw,
  Check,
  X,
  Layers,
  Sparkles,
  Move,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Ruler,
  ArrowDown,
  ArrowUp,
  Sliders,
  Play,
  Plus,
  ListOrdered,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import type {
  CharacterOnScreen,
  Character,
  CameraTransform,
  SceneProp,
  SceneOcclusionRegion,
  StageWaypoint,
} from '../../types';

interface CharacterDirectorOverlayProps {
  characters: CharacterOnScreen[];
  props?: SceneProp[];
  occlusionRegions?: SceneOcclusionRegion[];
  waypoints?: StageWaypoint[];
  campaignCharacters?: Character[];
  isStaging: boolean;
  groundLineY?: number;
  camera?: CameraTransform;
  savedCameraPresets?: { id: string; name: string; camera: CameraTransform }[];
  onSaveCameraPreset?: (name: string, camera: CameraTransform) => void;
  onSaveWaypoint?: (waypoint: Omit<StageWaypoint, 'id'>) => void;
  onSaveOcclusionRegion?: (region: Omit<SceneOcclusionRegion, 'id'>) => void;
  onDeleteWaypoint?: (waypointId: string) => void;
  onDeleteOcclusionRegion?: (regionId: string) => void;
  onUpdateCharacter: (id: string, updates: Partial<CharacterOnScreen>, description: string) => void;
  onUpdateProp?: (propId: string, updates: Partial<SceneProp>, description: string) => void;
  onReorderLayers?: (
    items: { id: string; type: 'character' | 'prop' | 'occlusion'; zIndex: number }[],
    description: string
  ) => void;
  onUpdateCampaignCharacter?: (characterId: string, updates: Partial<Character>) => void;
  onUpdateMultipleCharacterPositions: (
    updates: { id: string; normalizedX: number; normalizedY: number }[],
    description: string
  ) => void;
  onFocusCamera?: (focalX: number, focalY: number) => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

interface DragState {
  isDragging: boolean;
  anchorId: string;
  startX: number;
  startY: number;
  pointerStartX: number;
  pointerStartY: number;
  currentX: number;
  currentY: number;
  initialPositions: Map<string, { x: number; y: number }>;
}

export const CharacterDirectorOverlay: React.FC<CharacterDirectorOverlayProps> = ({
  characters,
  props = [],
  occlusionRegions = [],
  waypoints = [],
  campaignCharacters = [],
  isStaging,
  groundLineY = 0,
  camera,
  savedCameraPresets = [],
  onSaveCameraPreset,
  onSaveWaypoint,
  onSaveOcclusionRegion,
  onDeleteWaypoint: _onDeleteWaypoint,
  onDeleteOcclusionRegion: _onDeleteOcclusionRegion,
  onUpdateCharacter,
  onUpdateProp,
  onReorderLayers,
  onUpdateCampaignCharacter,
  onUpdateMultipleCharacterPositions,
  onFocusCamera,
  onUndo,
  canUndo = false,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [editingPrivateLabelId, setEditingPrivateLabelId] = useState<string | null>(null);
  const [privateLabelInput, setPrivateLabelInput] = useState<string>('');
  const [showExpressionsForId, setShowExpressionsForId] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState<boolean>(false);
  const [showCameraPresets, setShowCameraPresets] = useState<boolean>(false);
  const [showMorePanel, setShowMorePanel] = useState<boolean>(false);
  const [calibratingAnchorCharId, setCalibratingAnchorCharId] = useState<string | null>(null);
  const [calibratingOffsetValue, setCalibratingOffsetValue] = useState<number>(0);
  const [preparingEntryCharId, setPreparingEntryCharId] = useState<string | null>(null);
  const [preparingTransition, setPreparingTransition] = useState<
    'fade' | 'slide-bottom' | 'slide-left' | 'slide-right'
  >('fade');
  const [savingPresetModalOpen, setSavingPresetModalOpen] = useState<boolean>(false);
  const [presetNameInput, setPresetNameInput] = useState<string>('');
  const [relativeLayerModalOpen, setRelativeLayerModalOpen] = useState<'front_of' | 'behind' | null>(null);
  const [viewLayersModalOpen, setViewLayersModalOpen] = useState<boolean>(false);
  const [savingWaypointModalOpen, setSavingWaypointModalOpen] = useState<boolean>(false);
  const [waypointNameInput, setWaypointNameInput] = useState<string>('');
  const [movingToWaypointModalOpen, setMovingToWaypointModalOpen] = useState<boolean>(false);
  const [creatingOcclusionModalOpen, setCreatingOcclusionModalOpen] = useState<boolean>(false);
  const [occlusionForm, setOcclusionForm] = useState({
    name: 'Mostrador frontal',
    x: 20,
    y: 0,
    width: 35,
    height: 25,
    zIndex: 25,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const prevCameraRef = useRef<CameraTransform | undefined>(camera);
  const [, setForceRender] = useState({});

  // Cancel dragging if camera changes during gesture
  useEffect(() => {
    if (dragRef.current?.isDragging && camera && prevCameraRef.current) {
      if (
        camera.zoom !== prevCameraRef.current.zoom ||
        camera.focalPoint?.x !== prevCameraRef.current.focalPoint?.x ||
        camera.focalPoint?.y !== prevCameraRef.current.focalPoint?.y
      ) {
        dragRef.current = null;
        setForceRender({});
      }
    }
    prevCameraRef.current = camera;
  }, [camera]);

  const primarySelectedChar = characters.find((c) => selectedIds.has(c.id)) || null;

  // Unified stage items for layer ordering (characters + props + occlusion regions)
  const unifiedStageItems = [
    ...characters
      .filter((c) => c.presence !== 'in_reserve')
      .map((c, i) => ({
        id: c.id,
        type: 'character' as const,
        name: c.name,
        privateLabel: c.privateLabel,
        avatarUrl: c.avatarUrl,
        zIndex: c.zIndex !== undefined ? c.zIndex : (i + 1) * 10,
      })),
    ...props
      .filter((p) => p.visible !== false)
      .map((p) => ({
        id: p.id,
        type: 'prop' as const,
        name: p.name,
        privateLabel: undefined as string | undefined,
        avatarUrl: p.assetUrl,
        zIndex: p.zIndex !== undefined ? p.zIndex : 10,
      })),
    ...occlusionRegions.map((occ) => ({
      id: occ.id,
      type: 'occlusion' as const,
      name: occ.name || 'Región de oclusión',
      privateLabel: undefined as string | undefined,
      avatarUrl: '',
      zIndex: occ.zIndex !== undefined ? occ.zIndex : 25,
    })),
  ].sort((a, b) => a.zIndex - b.zIndex);

  // Find underlying campaign character for expressions
  const activeCampaignChar = primarySelectedChar
    ? campaignCharacters.find((cc) => cc.id === primarySelectedChar.characterId)
    : null;

  const handleSelect = (charId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isMultiSelectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(charId)) {
          next.delete(charId);
        } else {
          next.add(charId);
        }
        return next;
      });
    } else {
      setSelectedIds(new Set([charId]));
    }
    setShowExpressionsForId(null);
    setEditingPrivateLabelId(null);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.director-ui-element')) {
      return;
    }
    setSelectedIds(new Set());
    setShowExpressionsForId(null);
    setEditingPrivateLabelId(null);
  };

  // Pointer Drag handling
  const handlePointerDown = (char: CharacterOnScreen, e: React.PointerEvent) => {
    if (char.isLocked) return;
    e.stopPropagation();

    // Select this character if not part of current multi-selection
    if (!selectedIds.has(char.id)) {
      if (isMultiSelectMode) {
        setSelectedIds((prev) => new Set(prev).add(char.id));
      } else {
        setSelectedIds(new Set([char.id]));
      }
    }

    const container = containerRef.current;
    if (!container) return;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    const initialMap = new Map<string, { x: number; y: number }>();
    const effectiveSelected = selectedIds.has(char.id)
      ? Array.from(selectedIds)
      : [char.id];

    characters.forEach((c) => {
      if (effectiveSelected.includes(c.id)) {
        initialMap.set(c.id, {
          x: c.normalizedX ?? 50,
          y: c.normalizedY ?? 0,
        });
      }
    });

    const currentX = char.normalizedX ?? 50;
    const currentY = char.normalizedY ?? 0;

    dragRef.current = {
      isDragging: true,
      anchorId: char.id,
      startX: currentX,
      startY: currentY,
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      currentX,
      currentY,
      initialPositions: initialMap,
    };

    setForceRender({});
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !drag.isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaPixelX = e.clientX - drag.pointerStartX;
    const deltaPixelY = e.clientY - drag.pointerStartY;

    const deltaPercentX = (deltaPixelX / rect.width) * 100;
    const deltaPercentY = -(deltaPixelY / rect.height) * 100; // Inverted Y: 0 is ground line

    // Rigid formation: calculate a single bounding box for all unlocked characters so the whole group stops as a rigid unit
    let minAllowedDeltaX = -100;
    let maxAllowedDeltaX = 100;
    let minAllowedDeltaY = -100;
    let maxAllowedDeltaY = 100;

    drag.initialPositions.forEach((pos, id) => {
      const char = characters.find((c) => c.id === id);
      if (char && !char.isLocked) {
        const halfWidth = 5 * (char.scale ?? 1.0);
        const charMinDeltaX = 0 + halfWidth - pos.x;
        const charMaxDeltaX = 100 - halfWidth - pos.x;
        const charMinDeltaY = 0 - pos.y;
        const charMaxDeltaY = 70 - pos.y;

        if (charMinDeltaX > minAllowedDeltaX) minAllowedDeltaX = charMinDeltaX;
        if (charMaxDeltaX < maxAllowedDeltaX) maxAllowedDeltaX = charMaxDeltaX;
        if (charMinDeltaY > minAllowedDeltaY) minAllowedDeltaY = charMinDeltaY;
        if (charMaxDeltaY < maxAllowedDeltaY) maxAllowedDeltaY = charMaxDeltaY;
      }
    });

    if (minAllowedDeltaX > maxAllowedDeltaX) {
      minAllowedDeltaX = 0;
      maxAllowedDeltaX = 0;
    }
    if (minAllowedDeltaY > maxAllowedDeltaY) {
      minAllowedDeltaY = 0;
      maxAllowedDeltaY = 0;
    }

    const clampedDeltaX = Math.max(minAllowedDeltaX, Math.min(maxAllowedDeltaX, deltaPercentX));
    const clampedDeltaY = Math.max(minAllowedDeltaY, Math.min(maxAllowedDeltaY, deltaPercentY));

    drag.currentX = Math.round(drag.startX + clampedDeltaX);
    drag.currentY = Math.round(drag.startY + clampedDeltaY);

    setForceRender({});
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || !drag.isDragging) return;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const deltaX = drag.currentX - drag.startX;
    const deltaY = drag.currentY - drag.startY;

    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      const updates: { id: string; normalizedX: number; normalizedY: number }[] = [];

      drag.initialPositions.forEach((initial, id) => {
        const char = characters.find((c) => c.id === id);
        if (char && !char.isLocked) {
          const nextX = Math.round(initial.x + deltaX);
          const nextY = Math.round(initial.y + deltaY);
          updates.push({ id, normalizedX: nextX, normalizedY: nextY });
        }
      });

      if (updates.length === 1) {
        const char = characters.find((c) => c.id === updates[0].id);
        const name = char?.privateLabel || char?.name || 'Personaje';
        onUpdateCharacter(
          updates[0].id,
          { normalizedX: updates[0].normalizedX, normalizedY: updates[0].normalizedY },
          `Mover a ${name} a (${updates[0].normalizedX}%, ${updates[0].normalizedY}%)`
        );
      } else if (updates.length > 1) {
        onUpdateMultipleCharacterPositions(
          updates,
          `Mover grupo de ${updates.length} personajes`
        );
      }
    }

    dragRef.current = null;
    setForceRender({});
  };

  const reorderRelativeTo = (
    subjectId: string,
    targetId: string,
    placement: 'front_of' | 'behind'
  ) => {
    const listWithoutSubject = unifiedStageItems.filter((item) => item.id !== subjectId);
    const targetIdx = listWithoutSubject.findIndex((item) => item.id === targetId);
    if (targetIdx === -1) return;

    const subjectItem = unifiedStageItems.find((item) => item.id === subjectId);
    if (!subjectItem) return;

    const insertIndex = placement === 'front_of' ? targetIdx + 1 : targetIdx;
    listWithoutSubject.splice(insertIndex, 0, subjectItem);

    const reordered = listWithoutSubject.map((item, idx) => ({
      ...item,
      zIndex: (idx + 1) * 10,
    }));

    if (onReorderLayers) {
      onReorderLayers(
        reordered.map((r) => ({ id: r.id, type: r.type, zIndex: r.zIndex })),
        `Colocar ${subjectItem.name} ${placement === 'front_of' ? 'delante' : 'detrás'} de ${listWithoutSubject[targetIdx]?.name || 'elemento'}`
      );
    } else {
      const subjectZ = reordered.find((r) => r.id === subjectId)?.zIndex ?? 10;
      if (subjectItem.type === 'prop') {
        onUpdateProp?.(
          subjectId,
          { zIndex: subjectZ },
          `Colocar ${subjectItem.name} ${placement === 'front_of' ? 'delante' : 'detrás'} de elemento`
        );
      } else {
        onUpdateCharacter(
          subjectId,
          { zIndex: subjectZ },
          `Colocar ${subjectItem.name} ${placement === 'front_of' ? 'delante' : 'detrás'} de elemento`
        );
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 select-none overflow-hidden"
      onClick={handleBackgroundClick}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={(e) => {
        if (dragRef.current?.isDragging && e.buttons === 0) {
          dragRef.current = null;
          setForceRender({});
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setForceRender({});
      }}
    >
      {/* ── TOP BAR: Mode, Destination, Multi-Select & Undo ── */}
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
                // Collapse to first
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

      {/* ── VISUAL GUIDES & SAFE MARGINS (Optional Overlay) ── */}
      {showGuides && (
        <>
          <div
            className="pointer-events-none absolute left-0 right-0 h-0.5 bg-amber-400/80 border-b border-amber-300 z-10 flex items-center justify-center transition-all"
            style={{ bottom: `${groundLineY || 0}%` }}
          >
            <span className="bg-slate-950/90 text-amber-300 text-[9px] px-2 py-0.5 rounded-t border border-b-0 border-amber-400/60 font-mono">
              Línea de suelo (Y = {groundLineY || 0}%)
            </span>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[64px] border-t border-dashed border-cyan-400/40 bg-cyan-950/15 z-0 flex items-start justify-end pr-2 pt-0.5">
            <span className="text-[9px] text-cyan-400/80 font-mono">
              Margen seguro: Diálogos y Nombres
            </span>
          </div>
          <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-0.5 border-r border-dashed border-slate-500/30 z-0" />
        </>
      )}

      {/* ── CHARACTER CHIP ROSTER STRIP (Overlapping & Reserve Quick Access) ── */}
      <div className="director-ui-element absolute top-11 left-2 right-2 flex items-center gap-1 overflow-x-auto py-1 px-1 pointer-events-auto no-scrollbar">
        {characters.map((c) => {
          const isSelected = selectedIds.has(c.id);
          const isHidden = c.isHidden === true;
          const isReserve = c.presence === 'in_reserve';
          const isLocked = !!c.isLocked;

          return (
            <button
              key={c.id}
              type="button"
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all border shadow-sm ${
                isSelected
                  ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-semibold ring-1 ring-amber-400'
                  : isHidden || isReserve
                  ? 'bg-slate-900/80 text-slate-400 border-slate-700/60 opacity-70 hover:opacity-100'
                  : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-slate-500'
              }`}
              onClick={(e) => handleSelect(c.id, e)}
            >
              <img
                src={c.avatarUrl}
                alt={c.name}
                className="w-4 h-4 rounded-full object-cover border border-slate-600"
              />
              <span className="truncate max-w-[90px]">
                {c.privateLabel ? `[${c.privateLabel}]` : c.name}
              </span>
              {isHidden && <span title="Oculto en escena"><EyeOff size={10} className="text-amber-400" /></span>}
              {isReserve && <span title="En reserva"><DoorOpen size={10} className="text-purple-400" /></span>}
              {isLocked && <span title="Bloqueado"><Lock size={10} className="text-rose-400" /></span>}
              {c.isSpeaking && <span title="Hablando"><Sparkles size={10} className="text-yellow-300 animate-pulse" /></span>}
            </button>
          );
        })}
      </div>

      {/* ── INTERACTIVE CANVAS HITS & GHOST DRAG PREVIEW ── */}
      {characters.map((char) => {
        const isSelected = selectedIds.has(char.id);
        const posX = char.normalizedX ?? 50;
        const posY = (char.normalizedY ?? 0) + (groundLineY || 0);
        const isHidden = char.isHidden === true;
        const isReserve = char.presence === 'in_reserve';
        const isDraggingThis = dragRef.current?.isDragging && selectedIds.has(char.id);
        const visualAnchorOffsetY = char.visualAnchorOffsetY || 0;

        if (isReserve) {
          // Reserve characters don't take physical space on stage
          return null;
        }

        return (
          <div
            key={char.id}
            className={`director-ui-element absolute flex flex-col items-center justify-end pointer-events-auto transition-transform ${
              char.isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
            }`}
            style={{
              left: `${posX}%`,
              bottom: `${posY}%`,
              transform: `translate(-50%, ${visualAnchorOffsetY}%) scale(${char.scale || 1.0})`,
              width: '120px',
              height: '180px',
              zIndex: isSelected ? 40 : 20,
              opacity: isHidden ? 0.45 : 1.0,
            }}
            onPointerDown={(e) => handlePointerDown(char, e)}
          >
            {/* Hitbox bounding box highlight */}
            <div
              className={`w-full h-full rounded-2xl flex flex-col items-center justify-between p-1 transition-all ${
                isSelected
                  ? 'border-2 border-dashed border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                  : 'border border-transparent hover:border-slate-400/50'
              }`}
            >
              {/* Private Label / Name Pin */}
              <div className="px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-[10px] text-amber-200 font-medium truncate max-w-[110px] shadow">
                {char.privateLabel || char.name}
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-1 bg-slate-950/80 px-1.5 py-0.5 rounded-full border border-slate-800 text-[10px]">
                {isHidden && <EyeOff size={10} className="text-amber-400" />}
                {char.isLocked && <Lock size={10} className="text-rose-400" />}
                {char.isSpeaking && <Mic size={10} className="text-yellow-300 animate-pulse" />}
              </div>
            </div>

            {/* Ghost Silhouette during Drag */}
            {isDraggingThis && dragRef.current && (
              <div
                className="absolute pointer-events-none border-2 border-amber-300 bg-amber-500/20 rounded-2xl flex flex-col items-center justify-center text-amber-200 text-xs font-bold shadow-2xl backdrop-blur-sm"
                style={{
                  left: `${(dragRef.current.currentX - posX) * 1.2}px`,
                  bottom: `${(dragRef.current.currentY - posY) * 1.2}px`,
                  width: '100%',
                  height: '100%',
                  transform: 'translate(-50%, 0)',
                }}
              >
                <div className="bg-slate-950/90 border border-amber-400 px-2 py-0.5 rounded-md text-[10px]">
                  X: {dragRef.current.currentX}% • Y: {dragRef.current.currentY}%
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── FLOATING QUICK ACTIONS BAR (On Selected Character) ── */}
      {primarySelectedChar && !dragRef.current?.isDragging && (
        <div className="director-ui-element absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-slate-950/95 backdrop-blur-md border-2 border-amber-500/60 rounded-2xl p-1.5 shadow-2xl pointer-events-auto max-w-[96vw] overflow-x-auto no-scrollbar">
          {/* Avatar & Name Pill */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-300 truncate max-w-[120px] shrink-0">
            <img
              src={primarySelectedChar.avatarUrl}
              alt={primarySelectedChar.name}
              className="w-4 h-4 rounded-full object-cover shrink-0 border border-slate-700"
            />
            <span className="truncate">{primarySelectedChar.privateLabel || primarySelectedChar.name}</span>
          </div>

          {/* Primary 1: Voice / Speak Toggle */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              primarySelectedChar.isSpeaking
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() =>
              onUpdateCharacter(
                primarySelectedChar.id,
                { isSpeaking: !primarySelectedChar.isSpeaking },
                `${primarySelectedChar.isSpeaking ? 'Silenciar' : 'Hablar'} ${primarySelectedChar.name}`
              )
            }
            title={primarySelectedChar.isSpeaking ? 'Desactivar foco de voz' : 'Activar foco de voz'}
          >
            {primarySelectedChar.isSpeaking ? <Mic size={15} /> : <MicOff size={15} />}
            <span className="hidden sm:inline">Voz</span>
          </button>

          {/* Primary 2: Quick Expression Selector */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              showExpressionsForId === primarySelectedChar.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() =>
              setShowExpressionsForId(
                showExpressionsForId === primarySelectedChar.id ? null : primarySelectedChar.id
              )
            }
            title="Cambiar expresión facial"
          >
            <Smile size={15} />
            <span className="hidden sm:inline">Expresión</span>
          </button>

          {/* Primary 3: Visibility Toggle (Explicit label: Ocultar / Mostrar) */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              primarySelectedChar.isHidden
                ? 'bg-amber-900/60 text-amber-300 border border-amber-500/50'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() =>
              onUpdateCharacter(
                primarySelectedChar.id,
                { isHidden: !primarySelectedChar.isHidden },
                `${primarySelectedChar.isHidden ? 'Mostrar en Mesa' : 'Ocultar en escena'} a ${primarySelectedChar.name}`
              )
            }
            title={primarySelectedChar.isHidden ? 'Mostrar en pantalla pública' : 'Ocultar de la pantalla pública (conserva posición)'}
          >
            {primarySelectedChar.isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{primarySelectedChar.isHidden ? 'Mostrar' : 'Ocultar'}</span>
          </button>

          {/* Primary 4: Presence Toggle (Retirar a reserva / Enviar a escena) */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              primarySelectedChar.presence === 'in_reserve'
                ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() => {
              const nextPresence =
                primarySelectedChar.presence === 'in_reserve' ? 'on_stage' : 'in_reserve';
              onUpdateCharacter(
                primarySelectedChar.id,
                { presence: nextPresence },
                `${nextPresence === 'on_stage' ? 'Hacer entrar a escena' : 'Retirar a reserva'} a ${primarySelectedChar.name}`
              );
            }}
            title={primarySelectedChar.presence === 'in_reserve' ? 'Hacer entrar al escenario' : 'Retirar a la reserva (conserva posición al volver)'}
          >
            <DoorOpen size={15} />
            <span>
              {primarySelectedChar.presence === 'in_reserve' ? 'Entrar' : 'A reserva'}
            </span>
          </button>

          {/* Primary 5: "Más…" Mobile Bottom Drawer Button */}
          <button
            type="button"
            className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium shrink-0 ${
              showMorePanel
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
            }`}
            onClick={() => setShowMorePanel(!showMorePanel)}
            title="Más opciones (Presencia, Transformación, Calibración de apoyo)"
          >
            <Sliders size={15} />
            <span>Más…</span>
          </button>

          {/* Quick Actions (Direct access on medium/wide screens) */}
          <div className="hidden md:flex items-center gap-1 border-l border-slate-800 pl-1">
            {/* Flip / Horizontal Mirror */}
            <button
              type="button"
              className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium ${
                primarySelectedChar.isFlipped
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() =>
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { isFlipped: !primarySelectedChar.isFlipped },
                  `Voltear horizontalmente a ${primarySelectedChar.name}`
                )
              }
              title="Invertir orientación horizontal (espejo)"
            >
              <FlipHorizontal size={15} />
              <span>Girar</span>
            </button>

            {/* Scale Step Adjuster */}
            <div className="flex items-center bg-slate-900 rounded-xl px-1 border border-slate-800 text-xs">
              <button
                type="button"
                className="p-1 text-slate-300 hover:text-white"
                onClick={() => {
                  const currentScale = primarySelectedChar.scale ?? 1.0;
                  const nextScale = Math.max(0.5, +(currentScale - 0.1).toFixed(1));
                  onUpdateCharacter(
                    primarySelectedChar.id,
                    { scale: nextScale },
                    `Ajustar escala de ${primarySelectedChar.name} a ${nextScale}x`
                  );
                }}
                title="Reducir escala visual"
              >
                <ZoomOut size={13} />
              </button>
              <span className="px-1 text-[11px] font-mono text-amber-300 min-w-[28px] text-center">
                {(primarySelectedChar.scale ?? 1.0).toFixed(1)}x
              </span>
              <button
                type="button"
                className="p-1 text-slate-300 hover:text-white"
                onClick={() => {
                  const currentScale = primarySelectedChar.scale ?? 1.0;
                  const nextScale = Math.min(2.5, +(currentScale + 0.1).toFixed(1));
                  onUpdateCharacter(
                    primarySelectedChar.id,
                    { scale: nextScale },
                    `Ajustar escala de ${primarySelectedChar.name} a ${nextScale}x`
                  );
                }}
                title="Aumentar escala visual"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Lock / Unlock */}
            <button
              type="button"
              className={`p-2 rounded-xl transition-colors flex items-center gap-1 text-xs font-medium ${
                primarySelectedChar.isLocked
                  ? 'bg-rose-900/60 text-rose-300 border border-rose-500/50'
                  : 'bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() =>
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { isLocked: !primarySelectedChar.isLocked },
                  `${primarySelectedChar.isLocked ? 'Desbloquear posición' : 'Bloquear posición'} de ${primarySelectedChar.name}`
                )
              }
              title={primarySelectedChar.isLocked ? 'Desbloquear movimiento' : 'Bloquear posición'}
            >
              {primarySelectedChar.isLocked ? <Lock size={15} /> : <Unlock size={15} />}
            </button>

            {/* Layer Ordering (Bring to Front) */}
            <button
              type="button"
              className="p-2 rounded-xl bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
              onClick={() => {
                const allZ = characters.map((c) => c.zIndex ?? 1);
                const maxZ = Math.max(1, ...allZ);
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { zIndex: maxZ + 1 },
                  `Traer al frente a ${primarySelectedChar.name}`
                );
              }}
              title="Traer al frente de la escena"
            >
              <ArrowUp size={15} />
              <span>Al frente</span>
            </button>

            {/* Private Label Editor */}
            <button
              type="button"
              className="p-2 rounded-xl bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs font-medium"
              onClick={() => {
                setEditingPrivateLabelId(primarySelectedChar.id);
                setPrivateLabelInput(primarySelectedChar.privateLabel || '');
              }}
              title="Asignar etiqueta privada del DM"
            >
              <Tag size={15} />
              <span>Etiqueta</span>
            </button>
          </div>

          {/* Close Selection */}
          <button
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-0.5 shrink-0"
            onClick={() => {
              setSelectedIds(new Set());
              setShowMorePanel(false);
            }}
            title="Deseleccionar"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── EXPRESSIONS POPOVER ── */}
      {showExpressionsForId && primarySelectedChar && (
        <div className="director-ui-element absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 shadow-2xl flex flex-col gap-2 min-w-[200px] pointer-events-auto">
          <div className="text-xs font-semibold text-amber-300 flex items-center justify-between">
            <span>Expresiones de {primarySelectedChar.name}</span>
            <button
              type="button"
              onClick={() => setShowExpressionsForId(null)}
              className="text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
            {/* Default Avatar Option */}
            <button
              type="button"
              className={`px-2 py-1 rounded text-xs border ${
                !primarySelectedChar.activeExpression
                  ? 'bg-amber-500/30 text-amber-200 border-amber-400 font-semibold'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
              }`}
              onClick={() => {
                const defaultUrl = activeCampaignChar?.defaultAvatarUrl || primarySelectedChar.avatarUrl;
                const resolvedAnchor =
                  primarySelectedChar.instanceVariantAnchors?.['default'] ??
                  activeCampaignChar?.expressionAnchors?.['default'] ??
                  primarySelectedChar.visualAnchorOffsetY ??
                  0;
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { avatarUrl: defaultUrl, activeExpression: undefined, visualAnchorOffsetY: resolvedAnchor },
                  `Expresión neutral para ${primarySelectedChar.name}`
                );
                setShowExpressionsForId(null);
              }}
            >
              Neutral / Predeterminada
            </button>

            {/* Campaign expressions */}
            {activeCampaignChar?.expressions &&
              Object.entries(activeCampaignChar.expressions).map(([expKey, expUrl]) => (
                <button
                  key={expKey}
                  type="button"
                  className={`px-2 py-1 rounded text-xs border capitalize ${
                    primarySelectedChar.activeExpression === expKey
                      ? 'bg-purple-600 text-white border-purple-400 font-semibold'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                  onClick={() => {
                    const resolvedAnchor =
                      primarySelectedChar.instanceVariantAnchors?.[expKey] ??
                      activeCampaignChar?.expressionAnchors?.[expKey] ??
                      primarySelectedChar.visualAnchorOffsetY ??
                      0;
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { avatarUrl: expUrl, activeExpression: expKey, visualAnchorOffsetY: resolvedAnchor },
                      `Expresión "${expKey}" para ${primarySelectedChar.name} (apoyo: +${resolvedAnchor}%)`
                    );
                    setShowExpressionsForId(null);
                  }}
                >
                  {expKey}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ── PRIVATE LABEL EDITOR MODAL / POPOVER ── */}
      {editingPrivateLabelId && primarySelectedChar && (
        <div className="director-ui-element absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950 border border-amber-500/50 rounded-xl p-3 shadow-2xl flex flex-col gap-2 min-w-[260px] pointer-events-auto">
          <div className="text-xs font-semibold text-amber-300">
            Etiqueta privada (Solo visible para el DM):
          </div>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            placeholder="ej. Guardia puerta, Guardia herido..."
            value={privateLabelInput}
            onChange={(e) => setPrivateLabelInput(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <button
              type="button"
              className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
              onClick={() => setEditingPrivateLabelId(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1"
              onClick={() => {
                onUpdateCharacter(
                  primarySelectedChar.id,
                  { privateLabel: privateLabelInput.trim() || undefined },
                  `Etiqueta privada asignada: "${privateLabelInput.trim()}"`
                );
                setEditingPrivateLabelId(null);
              }}
            >
              <Check size={13} />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      )}

      {/* ── "MÁS…" SECONDARY ACTIONS BOTTOM SHEET / PANEL ── */}
      {showMorePanel && primarySelectedChar && (
        <div className="director-ui-element absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl p-3 shadow-2xl flex flex-col gap-2.5 w-[94%] max-w-[420px] pointer-events-auto">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Sliders size={13} />
              <span>Acciones de {primarySelectedChar.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowMorePanel(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* SECCIÓN: Presencia */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] font-semibold text-purple-300 tracking-wider uppercase">
                Presencia
              </span>
              <button
                type="button"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
                onClick={() => {
                  const next =
                    primarySelectedChar.presence === 'in_reserve' ? 'on_stage' : 'in_reserve';
                  onUpdateCharacter(
                    primarySelectedChar.id,
                    { presence: next },
                    `${next === 'on_stage' ? 'Hacer entrar' : 'Retirar a reserva'} a ${primarySelectedChar.name}`
                  );
                  setShowMorePanel(false);
                }}
              >
                <DoorOpen size={14} />
                <span>
                  {primarySelectedChar.presence === 'in_reserve'
                    ? 'Entrar a escena'
                    : 'Retirar a reserva'}
                </span>
              </button>

              {primarySelectedChar.presence === 'in_reserve' && (
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-500/40 flex items-center gap-1.5 font-medium"
                  onClick={() => {
                    setPreparingEntryCharId(primarySelectedChar.id);
                    setShowMorePanel(false);
                  }}
                >
                  <Play size={14} />
                  <span>Preparar entrada...</span>
                </button>
              )}
            </div>

            {/* SECCIÓN: Encuadre */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
              <span className="text-[10px] font-semibold text-amber-300 tracking-wider uppercase">
                Encuadre
              </span>
              {onFocusCamera && (
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
                  onClick={() => {
                    onFocusCamera(
                      primarySelectedChar.normalizedX ?? 50,
                      primarySelectedChar.normalizedY ?? 0
                    );
                    setShowMorePanel(false);
                  }}
                >
                  <Camera size={14} />
                  <span>Enfocar cámara</span>
                </button>
              )}
            </div>

            {/* SECCIÓN: Transformación */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
              <span className="text-[10px] font-semibold text-cyan-300 tracking-wider uppercase">
                Transformación
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                    primarySelectedChar.isFlipped
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                  onClick={() =>
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { isFlipped: !primarySelectedChar.isFlipped },
                      `Voltear a ${primarySelectedChar.name}`
                    )
                  }
                >
                  <FlipHorizontal size={13} />
                  <span>Girar (Espejo)</span>
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    const allZ = characters.map((c) => c.zIndex ?? 1);
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { zIndex: Math.max(1, ...allZ) + 1 },
                      `Traer al frente`
                    );
                  }}
                >
                  <ArrowUp size={13} />
                  <span>Al frente</span>
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    const allZ = characters.map((c) => c.zIndex ?? 1);
                    const minZ = Math.min(1, ...allZ);
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { zIndex: Math.max(0, minZ - 1) },
                      `Enviar al fondo a ${primarySelectedChar.name}`
                    );
                  }}
                  title="Colocar detrás de los demás personajes u objetos"
                >
                  <ArrowDown size={13} />
                  <span>Al fondo</span>
                </button>

                {/* Calibrar apoyo visual */}
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 text-xs font-semibold"
                  onClick={() => {
                    setCalibratingAnchorCharId(primarySelectedChar.id);
                    setCalibratingOffsetValue(primarySelectedChar.visualAnchorOffsetY || 0);
                    setShowMorePanel(false);
                  }}
                >
                  <Sliders size={13} />
                  <span>Calibrar apoyo visual...</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN: Capas y Profundidad */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-300 tracking-wider uppercase">
                <span>Capas y Profundidad</span>
                <button
                  type="button"
                  onClick={() => {
                    setViewLayersModalOpen(true);
                    setShowMorePanel(false);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 text-[10px] flex items-center gap-0.5 lowercase font-normal"
                >
                  <ListOrdered size={11} />
                  <span>Ver capas de escena</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    const allZ = unifiedStageItems.map((c) => c.zIndex);
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { zIndex: Math.max(10, ...allZ) + 10 },
                      `Traer al frente a ${primarySelectedChar.name}`
                    );
                  }}
                  title="Traer al frente de todos los personajes y objetos"
                >
                  <ArrowUp size={13} />
                  <span>Al frente</span>
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    const allZ = unifiedStageItems.map((c) => c.zIndex);
                    const minZ = Math.min(10, ...allZ);
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { zIndex: Math.max(1, minZ - 10) },
                      `Enviar al fondo a ${primarySelectedChar.name}`
                    );
                  }}
                  title="Colocar detrás de todos los personajes y objetos"
                >
                  <ArrowDown size={13} />
                  <span>Al fondo</span>
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    setRelativeLayerModalOpen('front_of');
                    setShowMorePanel(false);
                  }}
                  title="Colocar inmediatamente delante de otro personaje u objeto de la escena"
                >
                  <ArrowUp size={13} className="text-emerald-400" />
                  <span>Delante de…</span>
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    setRelativeLayerModalOpen('behind');
                    setShowMorePanel(false);
                  }}
                  title="Colocar inmediatamente detrás de otro personaje u objeto (ej. detrás del mostrador)"
                >
                  <ArrowDown size={13} className="text-amber-400" />
                  <span>Detrás de…</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN: Organización */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
              <span className="text-[10px] font-semibold text-rose-300 tracking-wider uppercase">
                Organización
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                    primarySelectedChar.isLocked
                      ? 'bg-rose-900/60 text-rose-200 border-rose-500'
                      : 'bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                  onClick={() =>
                    onUpdateCharacter(
                      primarySelectedChar.id,
                      { isLocked: !primarySelectedChar.isLocked },
                      `${primarySelectedChar.isLocked ? 'Desbloquear' : 'Bloquear'} ${primarySelectedChar.name}`
                    )
                  }
                >
                  {primarySelectedChar.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                  <span>{primarySelectedChar.isLocked ? 'Bloqueado' : 'Bloquear'}</span>
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    setEditingPrivateLabelId(primarySelectedChar.id);
                    setPrivateLabelInput(primarySelectedChar.privateLabel || '');
                    setShowMorePanel(false);
                  }}
                >
                  <Tag size={13} />
                  <span>
                    {primarySelectedChar.privateLabel
                      ? `[${primarySelectedChar.privateLabel}]`
                      : 'Asignar etiqueta'}
                  </span>
                </button>

                {/* Nameplate Position Selector */}
                <div className="flex items-center gap-1 mt-1 w-full bg-slate-950/60 p-1 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-medium pl-1">Etiqueta:</span>
                  {(['auto', 'bottom', 'top', 'side'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                        (primarySelectedChar.nameplatePosition || 'auto') === pos
                          ? 'bg-amber-950/90 text-amber-300 border-amber-500/80 font-bold shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                      onClick={() =>
                        onUpdateCharacter(
                          primarySelectedChar.id,
                          { nameplatePosition: pos },
                          `Ubicación de etiqueta: ${pos}`
                        )
                      }
                      title={`Ubicación de la etiqueta de nombre: ${pos}`}
                    >
                      {pos === 'auto' ? 'Auto' : pos === 'bottom' ? 'Abajo' : pos === 'top' ? 'Arriba' : 'Lateral'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECCIÓN: Puntos Narrativos (Waypoints) */}
            <div className="flex flex-col gap-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800 col-span-2">
              <span className="text-[10px] font-semibold text-cyan-300 tracking-wider uppercase flex items-center gap-1">
                <MapPin size={11} />
                <span>Puntos Narrativos de Escena</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    setWaypointNameInput('');
                    setSavingWaypointModalOpen(true);
                    setShowMorePanel(false);
                  }}
                  title="Guardar coordenadas actuales como un punto narrativo de la escena"
                >
                  <MapPin size={13} className="text-amber-400" />
                  <span>Guardar posición como punto…</span>
                </button>

                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                  onClick={() => {
                    setMovingToWaypointModalOpen(true);
                    setShowMorePanel(false);
                  }}
                  title="Mover esta figura a un punto narrativo guardado"
                >
                  <Move size={13} className="text-cyan-400" />
                  <span>Mover a punto… ({waypoints.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                        { presence: 'on_stage' },
                        `Entrada a escena con ${preparingTransition} para ${char.name}`
                      );
                      setPreparingEntryCharId(null);
                    }}
                  >
                    <Play size={14} />
                    <span>Hacer entrar a escena</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── MODAL: GUARDAR ENCUADRE CON NOMBRE ── */}
      {savingPresetModalOpen && (
        <div className="director-ui-element absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 w-full max-w-xs">
            <div className="text-xs font-bold text-amber-300">Guardar encuadre personalizado</div>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
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
                        {item.privateLabel && item.name !== item.privateLabel && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            Base: {item.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                        item.type === 'prop'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                          : item.type === 'occlusion'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                          : 'bg-indigo-950/60 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {item.type === 'prop' ? 'Objeto' : item.type === 'occlusion' ? 'Oclusión' : 'Personaje'} (Z:{item.zIndex})
                    </span>
                  </button>
                ))}
              {unifiedStageItems.filter((item) => item.id !== primarySelectedChar.id).length === 0 && (
                <div className="text-center text-xs text-slate-500 py-4">
                  No hay otros personajes u objetos en la escena para tomar de referencia.
                </div>
              )}
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
              Crea una capa rectangular que clona el fondo y oculta figuras con menor capa Z (ej. el mostrador o una tarima):
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-400 font-medium">Nombre de la región:</label>
                <input
                  type="text"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  value={occlusionForm.name}
                  onChange={(e) => setOcclusionForm({ ...occlusionForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">X (Izquierda %): {occlusionForm.x}%</label>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    value={occlusionForm.x}
                    onChange={(e) => setOcclusionForm({ ...occlusionForm, x: Number(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Y (Base %): {occlusionForm.y}%</label>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={occlusionForm.y}
                    onChange={(e) => setOcclusionForm({ ...occlusionForm, y: Number(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Ancho (%): {occlusionForm.width}%</label>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    value={occlusionForm.width}
                    onChange={(e) => setOcclusionForm({ ...occlusionForm, width: Number(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-400">Alto (%): {occlusionForm.height}%</label>
                  <input
                    type="range"
                    min={5}
                    max={80}
                    value={occlusionForm.height}
                    onChange={(e) => setOcclusionForm({ ...occlusionForm, height: Number(e.target.value) })}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-300">Capa de profundidad (Z):</span>
                <span className="text-xs font-mono font-bold text-purple-300">{occlusionForm.zIndex}</span>
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
    </div>
  );
};
