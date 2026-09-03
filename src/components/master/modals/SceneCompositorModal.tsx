import React, { useState, useRef, useCallback } from 'react';
import {
  X,
  FlipHorizontal,
  Layers,
  Lock,
  Unlock,
  Volume2,
  Sparkles,
  RotateCcw,
  Check,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Sliders,
  Plus,
  Trash2,
  Copy,
  Bookmark,
  FolderOpen,
  Eye,
  EyeOff,
  Users,
  Box,
} from 'lucide-react';
import type {
  Campaign,
  CharacterOnScreen,
  CharacterPosition,
  DisplayState,
  ElementTransitionDirective,
  SceneCompositionPreset,
  SceneProp,
} from '../../../types';

interface SceneCompositorModalProps {
  initialState: DisplayState;
  campaign?: Campaign | null;
  operationMode: 'live' | 'staging';
  onSaveState: (
    updatedCharacters: CharacterOnScreen[],
    updatedProps: SceneProp[],
    applyDirectlyToLive: boolean,
    transitions?: ElementTransitionDirective[]
  ) => Promise<void>;
  onSaveCompositionPreset?: (preset: SceneCompositionPreset) => Promise<void>;
  onClose: () => void;
}

function getSlotPositionPercent(pos: CharacterPosition): number {
  switch (pos) {
    case 'left':
      return 20;
    case 'center-left':
      return 40;
    case 'center-right':
      return 60;
    case 'right':
      return 80;
    default:
      return 50;
  }
}

type SelectedEntity =
  | { type: 'character'; id: string }
  | { type: 'prop'; id: string };

export const SceneCompositorModal: React.FC<SceneCompositorModalProps> = ({
  initialState,
  campaign,
  operationMode,
  onSaveState,
  onSaveCompositionPreset,
  onClose,
}) => {
  const [characters, setCharacters] = useState<CharacterOnScreen[]>(() =>
    initialState.characters.map((c, i) => ({
      ...c,
      normalizedX: c.normalizedX !== undefined ? c.normalizedX : getSlotPositionPercent(c.position),
      normalizedY: c.normalizedY !== undefined ? c.normalizedY : 0,
      scale: c.scale !== undefined ? c.scale : 1.0,
      isFlipped: !!c.isFlipped,
      zIndex: c.zIndex !== undefined ? c.zIndex : i + 1,
      isLocked: !!c.isLocked,
    }))
  );

  const [propsList, setPropsList] = useState<SceneProp[]>(() =>
    (initialState.props || []).map((p, i) => ({
      ...p,
      scale: p.scale !== undefined ? p.scale : 1.0,
      zIndex: p.zIndex !== undefined ? p.zIndex : characters.length + i + 1,
      visible: p.visible !== false,
      anchor: p.anchor || 'bottom-center',
    }))
  );

  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(() => {
    if (characters.length > 0) return { type: 'character', id: characters[0].id };
    if (propsList.length > 0) return { type: 'prop', id: propsList[0].id };
    return null;
  });

  const [filterType, setFilterType] = useState<'all' | 'characters' | 'props'>('all');
  const [aspectGuide, setAspectGuide] = useState<'16:9' | '16:10' | '4:3'>('16:9');
  const [history, setHistory] = useState<{ characters: CharacterOnScreen[]; props: SceneProp[] }[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modals inside compositor
  const [showAddPropModal, setShowAddPropModal] = useState<boolean>(false);
  const [newPropUrl, setNewPropUrl] = useState<string>('');
  const [newPropName, setNewPropName] = useState<string>('');
  const [newPropAnchor, setNewPropAnchor] = useState<'bottom-center' | 'center'>('bottom-center');

  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [presetName, setPresetName] = useState<string>('');
  const [presetDesc, setPresetDesc] = useState<string>('');

  const [showLoadPresetModal, setShowLoadPresetModal] = useState<boolean>(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  }>({
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
  });

  // Push snapshot to history before mutating
  const pushHistory = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-15),
      {
        characters: JSON.parse(JSON.stringify(characters)),
        props: JSON.parse(JSON.stringify(propsList)),
      },
    ]);
  }, [characters, propsList]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setCharacters(previous.characters);
    setPropsList(previous.props);
  }, [history]);

  // Pointer drag on stage
  const handlePointerDown = (
    e: React.PointerEvent,
    entity: SelectedEntity,
    currentX: number,
    currentY: number,
    isLocked?: boolean
  ) => {
    if (isLocked) return;

    setSelectedEntity(entity);
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    pushHistory();

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: currentX,
      startY: currentY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !selectedEntity || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;

    // Convert pixels to normalized percentage relative to the 16:9 stage
    const deltaPercentX = (deltaX / rect.width) * 100;
    const deltaPercentY = -(deltaY / rect.height) * 100; // inverted Y (0 is bottom)

    let nextX = Math.round((dragStartRef.current.startX + deltaPercentX) * 10) / 10;
    let nextY = Math.round((dragStartRef.current.startY + deltaPercentY) * 10) / 10;

    // Soft bounds
    nextX = Math.max(-10, Math.min(110, nextX));
    nextY = Math.max(0, Math.min(75, nextY));

    if (selectedEntity.type === 'character') {
      setCharacters((prev) =>
        prev.map((c) => (c.id === selectedEntity.id ? { ...c, normalizedX: nextX, normalizedY: nextY } : c))
      );
    } else {
      setPropsList((prev) =>
        prev.map((p) => (p.id === selectedEntity.id ? { ...p, normalizedX: nextX, normalizedY: nextY } : p))
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Nudge helpers
  const nudge = (dx: number, dy: number) => {
    if (!selectedEntity) return;
    pushHistory();
    if (selectedEntity.type === 'character') {
      setCharacters((prev) =>
        prev.map((c) => {
          if (c.id !== selectedEntity.id) return c;
          const nx = Math.max(0, Math.min(100, (c.normalizedX ?? 50) + dx));
          const ny = Math.max(0, Math.min(70, (c.normalizedY ?? 0) + dy));
          return { ...c, normalizedX: Math.round(nx), normalizedY: Math.round(ny) };
        })
      );
    } else {
      setPropsList((prev) =>
        prev.map((p) => {
          if (p.id !== selectedEntity.id) return p;
          const nx = Math.max(0, Math.min(100, p.normalizedX + dx));
          const ny = Math.max(0, Math.min(70, p.normalizedY + dy));
          return { ...p, normalizedX: Math.round(nx), normalizedY: Math.round(ny) };
        })
      );
    }
  };

  const setScale = (newScale: number) => {
    if (!selectedEntity) return;
    pushHistory();
    const clamped = Math.max(0.2, Math.min(3.0, Math.round(newScale * 10) / 10));
    if (selectedEntity.type === 'character') {
      setCharacters((prev) =>
        prev.map((c) => (c.id === selectedEntity.id ? { ...c, scale: clamped } : c))
      );
    } else {
      setPropsList((prev) =>
        prev.map((p) => (p.id === selectedEntity.id ? { ...p, scale: clamped } : p))
      );
    }
  };

  const setRotation = (degrees: number) => {
    if (!selectedEntity || selectedEntity.type !== 'prop') return;
    pushHistory();
    setPropsList((prev) =>
      prev.map((p) => (p.id === selectedEntity.id ? { ...p, rotation: degrees } : p))
    );
  };

  const setOpacity = (val: number) => {
    if (!selectedEntity || selectedEntity.type !== 'prop') return;
    pushHistory();
    setPropsList((prev) =>
      prev.map((p) => (p.id === selectedEntity.id ? { ...p, opacity: Math.max(0.1, Math.min(1.0, val)) } : p))
    );
  };

  const toggleFlip = () => {
    if (!selectedEntity) return;
    pushHistory();
    if (selectedEntity.type === 'character') {
      setCharacters((prev) =>
        prev.map((c) => (c.id === selectedEntity.id ? { ...c, isFlipped: !c.isFlipped } : c))
      );
    } else {
      setPropsList((prev) =>
        prev.map((p) => (p.id === selectedEntity.id ? { ...p, isFlipped: !p.isFlipped } : p))
      );
    }
  };

  const toggleLock = () => {
    if (!selectedEntity) return;
    if (selectedEntity.type === 'character') {
      setCharacters((prev) =>
        prev.map((c) => (c.id === selectedEntity.id ? { ...c, isLocked: !c.isLocked } : c))
      );
    } else {
      setPropsList((prev) =>
        prev.map((p) => (p.id === selectedEntity.id ? { ...p, isLocked: !p.isLocked } : p))
      );
    }
  };

  const toggleVisibility = () => {
    if (!selectedEntity || selectedEntity.type !== 'prop') return;
    pushHistory();
    setPropsList((prev) =>
      prev.map((p) => (p.id === selectedEntity.id ? { ...p, visible: p.visible === false } : p))
    );
  };

  const toggleAnchor = () => {
    if (!selectedEntity || selectedEntity.type !== 'prop') return;
    pushHistory();
    setPropsList((prev) =>
      prev.map((p) =>
        p.id === selectedEntity.id
          ? { ...p, anchor: p.anchor === 'center' ? 'bottom-center' : 'center' }
          : p
      )
    );
  };

  const toggleSpeaking = () => {
    if (!selectedEntity || selectedEntity.type !== 'character') return;
    pushHistory();
    setCharacters((prev) =>
      prev.map((c) => (c.id === selectedEntity.id ? { ...c, isSpeaking: !c.isSpeaking } : c))
    );
  };

  // Unified Layer Reordering across characters and props
  const changeLayer = (direction: 'up' | 'down' | 'front' | 'back') => {
    if (!selectedEntity) return;
    pushHistory();

    const currentZ =
      selectedEntity.type === 'character'
        ? characters.find((c) => c.id === selectedEntity.id)?.zIndex ?? 1
        : propsList.find((p) => p.id === selectedEntity.id)?.zIndex ?? 1;

    let targetZ = currentZ;
    if (direction === 'up') targetZ = currentZ + 1;
    if (direction === 'down') targetZ = Math.max(1, currentZ - 1);
    if (direction === 'front') targetZ = 60;
    if (direction === 'back') targetZ = 1;

    if (selectedEntity.type === 'character') {
      setCharacters((prev) =>
        prev.map((c) => (c.id === selectedEntity.id ? { ...c, zIndex: targetZ } : c))
      );
    } else {
      setPropsList((prev) =>
        prev.map((p) => (p.id === selectedEntity.id ? { ...p, zIndex: targetZ } : p))
      );
    }
  };

  // Prop actions
  const duplicateProp = (propId: string) => {
    const target = propsList.find((p) => p.id === propId);
    if (!target) return;
    pushHistory();

    const duplicated: SceneProp = {
      ...JSON.parse(JSON.stringify(target)),
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${target.name} (Copia)`,
      normalizedX: Math.min(90, target.normalizedX + 5),
      normalizedY: target.normalizedY,
      zIndex: target.zIndex + 1,
    };

    setPropsList((prev) => [...prev, duplicated]);
    setSelectedEntity({ type: 'prop', id: duplicated.id });
  };

  const removeProp = (propId: string) => {
    pushHistory();
    setPropsList((prev) => prev.filter((p) => p.id !== propId));
    if (selectedEntity?.type === 'prop' && selectedEntity.id === propId) {
      setSelectedEntity(null);
    }
  };

  const handleAddPropSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropUrl.trim()) return;
    pushHistory();

    const newProp: SceneProp = {
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newPropName.trim() || 'Objeto de Escenario',
      assetUrl: newPropUrl.trim(),
      normalizedX: 50,
      normalizedY: newPropAnchor === 'center' ? 30 : 0,
      scale: 1.0,
      rotation: 0,
      isFlipped: false,
      opacity: 1.0,
      zIndex: characters.length + propsList.length + 1,
      anchor: newPropAnchor,
      visible: true,
      isLocked: false,
    };

    setPropsList((prev) => [...prev, newProp]);
    setSelectedEntity({ type: 'prop', id: newProp.id });
    setShowAddPropModal(false);
    setNewPropUrl('');
    setNewPropName('');
  };

  // Presets handling
  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) return;

    const preset: SceneCompositionPreset = {
      id: `comp-${Date.now()}`,
      name: presetName.trim(),
      description: presetDesc.trim() || undefined,
      thumbnailUrl: initialState.backgroundUrl,
      backgroundUrl: initialState.backgroundUrl,
      variantId: initialState.activeVariantId,
      focalPoint: initialState.focalPoint,
      fitMode: initialState.fitMode,
      zoom: initialState.zoom,
      lighting: initialState.lighting,
      weather: initialState.weather,
      weatherIntensity: initialState.weatherIntensity,
      characters: characters.map((c) => ({
        id: c.id,
        characterId: c.characterId,
        name: c.name,
        avatarUrl: c.avatarUrl,
        activeExpression: c.activeExpression,
        normalizedX: c.normalizedX ?? 50,
        normalizedY: c.normalizedY ?? 0,
        scale: c.scale ?? 1.0,
        isFlipped: c.isFlipped,
        zIndex: c.zIndex ?? 1,
        position: c.position,
      })),
      props: JSON.parse(JSON.stringify(propsList)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (onSaveCompositionPreset) {
      await onSaveCompositionPreset(preset);
    }
    setShowSavePresetModal(false);
    setPresetName('');
    setPresetDesc('');
  };

  const handleApplyPreset = (preset: SceneCompositionPreset) => {
    pushHistory();
    if (preset.characters) {
      setCharacters(
        preset.characters.map((c) => ({
          id: c.id,
          characterId: c.characterId,
          name: c.name,
          avatarUrl: c.avatarUrl,
          activeExpression: c.activeExpression,
          position: c.position || 'center-left',
          normalizedX: c.normalizedX,
          normalizedY: c.normalizedY,
          scale: c.scale,
          isFlipped: c.isFlipped,
          zIndex: c.zIndex,
          isSpeaking: false,
        }))
      );
    }
    if (preset.props) {
      setPropsList(JSON.parse(JSON.stringify(preset.props)));
    }
    setShowLoadPresetModal(false);
  };

  const handleSave = async (directToLive: boolean) => {
    setIsSaving(true);
    try {
      await onSaveState(characters, propsList, directToLive);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Selected item reference
  const selectedChar =
    selectedEntity?.type === 'character'
      ? characters.find((c) => c.id === selectedEntity.id) || null
      : null;

  const selectedProp =
    selectedEntity?.type === 'prop'
      ? propsList.find((p) => p.id === selectedEntity.id) || null
      : null;

  const characterTemplate = selectedChar?.characterId
    ? campaign?.characters.find((c) => c.id === selectedChar.characterId)
    : null;

  const propTemplate = selectedProp?.assetId
    ? campaign?.propAssets?.find((p) => p.id === selectedProp.assetId)
    : null;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
      <div className="compositor-modal bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* HEADER */}
        <header className="compositor-header px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-amber-400" />
            <h2 className="font-bold text-lg text-white">Compositor Táctil de Escena</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                operationMode === 'live'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {operationMode === 'live' ? '⚡ Modo En Vivo' : '📝 Modo Borrador'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* ASPECT GUIDE TOGGLE */}
            <div className="aspect-selector flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
              <button
                className={`px-2 py-1 rounded ${aspectGuide === '16:9' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
                onClick={() => setAspectGuide('16:9')}
              >
                16:9
              </button>
              <button
                className={`px-2 py-1 rounded ${aspectGuide === '16:10' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
                onClick={() => setAspectGuide('16:10')}
              >
                16:10
              </button>
              <button
                className={`px-2 py-1 rounded ${aspectGuide === '4:3' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
                onClick={() => setAspectGuide('4:3')}
              >
                4:3
              </button>
            </div>

            <button
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              onClick={onClose}
              aria-label="Cerrar compositor"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* MAIN BODY: 16:9 STAGE PREVIEW + LAYER CONTROLS */}
        <div className="compositor-body flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-4">
          {/* LEFT: 16:9 INTERACTIVE UNIFIED STAGE */}
          <div className="flex-1 flex flex-col items-center">
            <div
              ref={stageRef}
              className={`stage-viewport relative w-full aspect-video rounded-xl overflow-hidden border-2 border-slate-700 select-none shadow-inner touch-none ${
                aspectGuide === '16:10' ? 'max-w-[90%]' : aspectGuide === '4:3' ? 'max-w-[75%]' : ''
              }`}
              style={{
                backgroundImage: `url(${initialState.backgroundUrl})`,
                backgroundPosition: `${initialState.focalPoint?.x ?? 50}% ${initialState.focalPoint?.y ?? 50}%`,
                backgroundSize: initialState.fitMode === 'contain' ? 'contain' : 'cover',
                backgroundRepeat: 'no-repeat',
              }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {/* STAGE GROUND LINE HELPER */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500/30 border-t border-dashed border-amber-400/40 pointer-events-none" />

              {/* UNIFIED RENDERING: CHARACTERS AND PROPS SORTED BY Z-INDEX */}
              {[
                ...characters.map((c) => ({
                  type: 'character' as const,
                  id: c.id,
                  data: c,
                  zIndex: c.zIndex ?? 1,
                })),
                ...propsList.map((p) => ({
                  type: 'prop' as const,
                  id: p.id,
                  data: p,
                  zIndex: p.zIndex,
                })),
              ]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((item) => {
                  if (item.type === 'character') {
                    const char = item.data;
                    const posX = char.normalizedX ?? getSlotPositionPercent(char.position);
                    const posY = char.normalizedY ?? 0;
                    const scale = char.scale ?? 1.0;
                    const isSelected =
                      selectedEntity?.type === 'character' && selectedEntity.id === char.id;
                    const isOutOfBounds = posX < 2 || posX > 98;

                    return (
                      <div
                        key={char.id}
                        onPointerDown={(e) =>
                          handlePointerDown(
                            e,
                            { type: 'character', id: char.id },
                            posX,
                            posY,
                            char.isLocked
                          )
                        }
                        className={`stage-character-item absolute cursor-grab active:cursor-grabbing transition-transform ${
                          isSelected ? 'ring-2 ring-amber-400 shadow-lg' : ''
                        }`}
                        style={{
                          left: `${posX}%`,
                          bottom: `${posY}%`,
                          transformOrigin: 'bottom center',
                          transform: `translate(-50%, 0) scale(${scale}) scaleX(${char.isFlipped ? -1 : 1})`,
                          zIndex: item.zIndex,
                        }}
                      >
                        {isOutOfBounds && isSelected && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow whitespace-nowrap">
                            <AlertTriangle size={10} />
                            Borde
                          </div>
                        )}

                        <div className="relative w-20 sm:w-28 h-28 sm:h-36 rounded-lg overflow-hidden border border-white/20 bg-black/60 shadow-md">
                          <img
                            src={char.avatarUrl}
                            alt={char.name}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                          {char.isSpeaking && (
                            <div className="absolute top-1 right-1 bg-amber-500 text-black p-0.5 rounded-full">
                              <Sparkles size={12} />
                            </div>
                          )}
                          {char.isLocked && (
                            <div className="absolute top-1 left-1 bg-slate-900/80 text-slate-300 p-0.5 rounded">
                              <Lock size={12} />
                            </div>
                          )}
                        </div>

                        <div
                          className="char-stage-tag text-center text-[10px] text-white font-medium bg-black/70 px-1 rounded mt-0.5 truncate max-w-[110px]"
                          style={{ transform: `scaleX(${char.isFlipped ? -1 : 1})` }}
                        >
                          {char.name}
                        </div>
                      </div>
                    );
                  }

                  // PROP RENDERING
                  const prop = item.data;
                  if (prop.visible === false) return null;
                  const isSelected = selectedEntity?.type === 'prop' && selectedEntity.id === prop.id;
                  const isBottomAnchor = prop.anchor !== 'center';

                  return (
                    <div
                      key={prop.id}
                      onPointerDown={(e) =>
                        handlePointerDown(
                          e,
                          { type: 'prop', id: prop.id },
                          prop.normalizedX,
                          prop.normalizedY,
                          prop.isLocked
                        )
                      }
                      className={`stage-prop-item absolute cursor-grab active:cursor-grabbing select-none ${
                        isSelected ? 'ring-2 ring-purple-400 shadow-lg rounded' : ''
                      }`}
                      style={{
                        left: `${prop.normalizedX}%`,
                        bottom: `${prop.normalizedY}%`,
                        transformOrigin: isBottomAnchor ? 'bottom center' : 'center center',
                        transform: `translate(-50%, ${isBottomAnchor ? '0' : '50%'}) rotate(${
                          prop.rotation || 0
                        }deg) scale(${prop.scale}) scaleX(${prop.isFlipped ? -1 : 1})`,
                        zIndex: item.zIndex,
                        opacity: prop.opacity !== undefined ? prop.opacity : 1.0,
                      }}
                    >
                      <img
                        src={prop.assetUrl}
                        alt={prop.name}
                        className="pointer-events-none"
                        style={{
                          maxWidth: '180px',
                          maxHeight: '180px',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
                        }}
                      />
                      {isSelected && (
                        <div
                          className="text-[9px] bg-purple-950/80 text-purple-200 px-1 rounded absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap"
                          style={{ transform: `scaleX(${prop.isFlipped ? -1 : 1})` }}
                        >
                          {prop.name}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* PRESETS & TOOLS BAR */}
            <div className="presets-bar flex items-center justify-between gap-1.5 mt-3 w-full pb-1 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                <button
                  className="px-2.5 py-1 bg-purple-900/40 border border-purple-500/30 hover:bg-purple-800/40 text-xs rounded-lg text-purple-200 flex items-center gap-1 font-semibold"
                  onClick={() => setShowAddPropModal(true)}
                >
                  <Plus size={13} />
                  <span>Objeto</span>
                </button>

                <button
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-200 flex items-center gap-1"
                  onClick={() => setShowSavePresetModal(true)}
                  title="Guardar disposición visual como composición"
                >
                  <Bookmark size={13} className="text-amber-400" />
                  <span>Guardar Preset</span>
                </button>

                {campaign?.savedCompositions && campaign.savedCompositions.length > 0 && (
                  <button
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-200 flex items-center gap-1"
                    onClick={() => setShowLoadPresetModal(true)}
                    title="Cargar composición guardada"
                  >
                    <FolderOpen size={13} className="text-sky-400" />
                    <span>Cargar ({campaign.savedCompositions.length})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-xs rounded text-slate-300"
                  onClick={() => {
                    pushHistory();
                    setCharacters((prev) =>
                      prev.map((c) => ({
                        ...c,
                        normalizedX: getSlotPositionPercent(c.position),
                        normalizedY: 0,
                        scale: 1.0,
                        isFlipped: false,
                      }))
                    );
                  }}
                  title="Restablecer ranuras de personajes"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: ONE-HANDED ENTITY CONTROLS */}
          <div className="compositor-controls w-full md:w-80 flex flex-col gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            {/* FILTER & LAYER LIST */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400 font-semibold uppercase block">
                  Capas ({characters.length + propsList.length})
                </label>
                <div className="flex items-center gap-1 bg-slate-900 rounded p-0.5 text-[10px]">
                  <button
                    className={`px-1.5 py-0.5 rounded ${filterType === 'all' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
                    onClick={() => setFilterType('all')}
                  >
                    Todos
                  </button>
                  <button
                    className={`px-1.5 py-0.5 rounded ${filterType === 'characters' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
                    onClick={() => setFilterType('characters')}
                  >
                    NPCs
                  </button>
                  <button
                    className={`px-1.5 py-0.5 rounded ${filterType === 'props' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400'}`}
                    onClick={() => setFilterType('props')}
                  >
                    Props
                  </button>
                </div>
              </div>

              {/* LAYER LIST SORTED BY Z-INDEX DESCENDING */}
              <div className="char-list flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto max-h-40 pb-1">
                {[
                  ...characters.map((c) => ({ type: 'character' as const, id: c.id, c, zIndex: c.zIndex ?? 1 })),
                  ...propsList.map((p) => ({ type: 'prop' as const, id: p.id, p, zIndex: p.zIndex })),
                ]
                  .filter((item) => {
                    if (filterType === 'characters') return item.type === 'character';
                    if (filterType === 'props') return item.type === 'prop';
                    return true;
                  })
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((item) => {
                    const isSelected =
                      selectedEntity?.type === item.type && selectedEntity.id === item.id;

                    if (item.type === 'character') {
                      return (
                        <button
                          key={item.id}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition-colors shrink-0 md:shrink ${
                            isSelected
                              ? 'bg-amber-500/20 border border-amber-500/40 text-white font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          onClick={() => setSelectedEntity({ type: 'character', id: item.id })}
                        >
                          <Users size={12} className="text-amber-400 shrink-0" />
                          <img src={item.c.avatarUrl} alt={item.c.name} className="w-5 h-5 rounded-full object-cover" />
                          <span className="truncate flex-1">{item.c.name}</span>
                          <span className="text-[10px] text-slate-500">Z:{item.zIndex}</span>
                          {item.c.isSpeaking && <Sparkles size={11} className="text-amber-400" />}
                          {item.c.isLocked && <Lock size={11} className="text-slate-500" />}
                        </button>
                      );
                    }

                    // Prop list item
                    return (
                      <button
                        key={item.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg text-left text-xs transition-colors shrink-0 md:shrink ${
                          isSelected
                            ? 'bg-purple-500/20 border border-purple-500/40 text-white font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                        onClick={() => setSelectedEntity({ type: 'prop', id: item.id })}
                      >
                        <Box size={12} className="text-purple-400 shrink-0" />
                        <img src={item.p.assetUrl} alt={item.p.name} className="w-5 h-5 object-contain" />
                        <span className="truncate flex-1">{item.p.name}</span>
                        <span className="text-[10px] text-slate-500">Z:{item.zIndex}</span>
                        {item.p.visible === false && <EyeOff size={11} className="text-rose-400" />}
                        {item.p.isLocked && <Lock size={11} className="text-slate-500" />}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* CONTROLS FOR SELECTED CHARACTER */}
            {selectedChar && (
              <div className="selected-controls flex flex-col gap-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>NPC: {selectedChar.name}</span>
                  <span className="text-[10px] text-slate-400">Capa {selectedChar.zIndex ?? 1}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-semibold ${
                      selectedChar.isSpeaking ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    onClick={toggleSpeaking}
                  >
                    <Volume2 size={14} />
                    <span className="mt-0.5 text-[10px]">{selectedChar.isSpeaking ? 'Hablando' : 'Hablar'}</span>
                  </button>

                  <button
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-semibold ${
                      selectedChar.isFlipped ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    onClick={toggleFlip}
                  >
                    <FlipHorizontal size={14} />
                    <span className="mt-0.5 text-[10px]">Voltear</span>
                  </button>

                  <button
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-semibold ${
                      selectedChar.isLocked ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                    onClick={toggleLock}
                  >
                    {selectedChar.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    <span className="mt-0.5 text-[10px]">{selectedChar.isLocked ? 'Bloqueado' : 'Mover'}</span>
                  </button>
                </div>

                {/* SCALE SLIDER */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>Tamaño</span>
                    <span className="font-bold text-amber-400">{(selectedChar.scale ?? 1.0).toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                      onClick={() => setScale((selectedChar.scale ?? 1.0) - 0.1)}
                    >
                      <ZoomOut size={12} />
                    </button>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={selectedChar.scale ?? 1.0}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <button
                      className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                      onClick={() => setScale((selectedChar.scale ?? 1.0) + 0.1)}
                    >
                      <ZoomIn size={12} />
                    </button>
                  </div>
                </div>

                {/* NUDGES */}
                <div>
                  <div className="grid grid-cols-4 gap-1">
                    <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(-5, 0)}>
                      ← Izq
                    </button>
                    <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(5, 0)}>
                      Der →
                    </button>
                    <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(0, 5)}>
                      ↑ Subir
                    </button>
                    <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(0, -5)}>
                      ↓ Bajar
                    </button>
                  </div>
                </div>

                {/* LAYERING */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded flex items-center justify-between"
                    onClick={() => changeLayer('front')}
                  >
                    <span>Frente</span>
                    <Layers size={11} />
                  </button>
                  <button
                    className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded flex items-center justify-between"
                    onClick={() => changeLayer('back')}
                  >
                    <span>Fondo</span>
                    <Layers size={11} />
                  </button>
                </div>

                {characterTemplate?.expressions && Object.keys(characterTemplate.expressions).length > 0 && (
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Expresiones</label>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      <button
                        className={`px-2 py-0.5 rounded text-[11px] ${
                          !selectedChar.activeExpression ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-300'
                        }`}
                        onClick={() => {
                          pushHistory();
                          setCharacters((prev) =>
                            prev.map((c) =>
                              c.id === selectedChar.id
                                ? { ...c, activeExpression: '', avatarUrl: characterTemplate.defaultAvatarUrl }
                                : c
                            )
                          );
                        }}
                      >
                        Neutral
                      </button>
                      {Object.entries(characterTemplate.expressions).map(([expName, url]) => (
                        <button
                          key={expName}
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            selectedChar.activeExpression === expName ? 'bg-amber-500 text-black font-bold' : 'bg-slate-800 text-slate-300'
                          }`}
                          onClick={() => {
                            pushHistory();
                            setCharacters((prev) =>
                              prev.map((c) =>
                                c.id === selectedChar.id
                                  ? { ...c, activeExpression: expName, avatarUrl: url }
                                  : c
                              )
                            );
                          }}
                        >
                          {expName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTROLS FOR SELECTED PROP */}
            {selectedProp && (
              <div className="selected-controls flex flex-col gap-2.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                  <span className="truncate max-w-[170px]">{selectedProp.name}</span>
                  <span className="text-[10px] text-slate-400">Capa {selectedProp.zIndex}</span>
                </div>

                {/* PROP ACTIONS: VISIBILITY, FLIP, ANCHOR, DUPLICATE, DELETE */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    className={`p-1.5 rounded flex flex-col items-center text-[10px] ${
                      selectedProp.visible !== false ? 'bg-slate-800 text-slate-200' : 'bg-rose-500/20 text-rose-300'
                    }`}
                    onClick={toggleVisibility}
                    title="Ocultar o mostrar objeto"
                  >
                    {selectedProp.visible !== false ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>Ver</span>
                  </button>

                  <button
                    className={`p-1.5 rounded flex flex-col items-center text-[10px] ${
                      selectedProp.isFlipped ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'
                    }`}
                    onClick={toggleFlip}
                    title="Voltear horizontal"
                  >
                    <FlipHorizontal size={13} />
                    <span>Voltear</span>
                  </button>

                  <button
                    className="p-1.5 rounded flex flex-col items-center text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200"
                    onClick={() => duplicateProp(selectedProp.id)}
                    title="Duplicar objeto"
                  >
                    <Copy size={13} />
                    <span>Duplicar</span>
                  </button>

                  <button
                    className="p-1.5 rounded flex flex-col items-center text-[10px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300"
                    onClick={() => removeProp(selectedProp.id)}
                    title="Eliminar de la escena"
                  >
                    <Trash2 size={13} />
                    <span>Borrar</span>
                  </button>
                </div>

                {/* ANCHOR TOGGLE */}
                <div className="flex items-center justify-between text-[11px] bg-slate-900 p-1.5 rounded">
                  <span className="text-slate-400">Anclaje</span>
                  <button
                    className="px-2 py-0.5 rounded text-[10px] bg-purple-900/40 text-purple-200 border border-purple-500/30"
                    onClick={toggleAnchor}
                  >
                    {selectedProp.anchor === 'center' ? 'Centro (Flotante)' : 'Suelo (Apoyado)'}
                  </button>
                </div>

                {/* VISUAL STATES / VARIANTS */}
                {propTemplate?.visualStates && propTemplate.visualStates.length > 0 && (
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Variante / Estado Visual</label>
                    <div className="flex flex-wrap gap-1">
                      {propTemplate.visualStates.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                            selectedProp.visualStateId === st.id
                              ? 'bg-purple-600 text-white font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          onClick={() => {
                            pushHistory();
                            setPropsList((prev) =>
                              prev.map((p) =>
                                p.id === selectedProp.id
                                  ? {
                                      ...p,
                                      visualStateId: st.id,
                                      assetUrl: st.assetUrl,
                                      anchor: st.anchor || p.anchor,
                                      scale: Math.round(p.scale * (st.scaleModifier ?? 1.0) * 10) / 10,
                                    }
                                  : p
                              )
                            );
                          }}
                        >
                          {st.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ROTATION SLIDER */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>Rotación</span>
                    <span className="font-bold text-purple-400">{selectedProp.rotation || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={selectedProp.rotation || 0}
                    onChange={(e) => setRotation(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* SCALE SLIDER */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>Escala</span>
                    <span className="font-bold text-purple-400">{selectedProp.scale.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={selectedProp.scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* OPACITY SLIDER */}
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                    <span>Opacidad / Transparencia</span>
                    <span className="font-bold text-purple-400">
                      {Math.round((selectedProp.opacity ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={selectedProp.opacity ?? 1.0}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                  />
                </div>

                {/* NUDGES & LAYERING */}
                <div className="grid grid-cols-4 gap-1">
                  <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(-5, 0)}>
                    ←
                  </button>
                  <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(5, 0)}>
                    →
                  </button>
                  <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(0, 5)}>
                    ↑
                  </button>
                  <button className="p-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] rounded" onClick={() => nudge(0, -5)}>
                    ↓
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded flex items-center justify-between"
                    onClick={() => changeLayer('front')}
                  >
                    <span>Al Frente</span>
                    <Layers size={11} />
                  </button>
                  <button
                    className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-[11px] rounded flex items-center justify-between"
                    onClick={() => changeLayer('back')}
                  >
                    <span>Al Fondo</span>
                    <Layers size={11} />
                  </button>
                </div>
              </div>
            )}

            {!selectedChar && !selectedProp && (
              <div className="text-xs text-slate-500 italic text-center py-6">
                Selecciona un personaje u objeto para ajustar su posición, tamaño y orden de capa.
              </div>
            )}
          </div>
        </div>

        {/* FOOTER: UNDO & COMMIT ACTIONS */}
        <footer className="compositor-footer px-4 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
              onClick={handleUndo}
              disabled={history.length === 0}
            >
              <RotateCcw size={14} />
              <span>Deshacer ({history.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg disabled:opacity-50"
              onClick={() => handleSave(operationMode === 'live')}
              disabled={isSaving}
            >
              <Check size={16} />
              <span>{operationMode === 'live' ? 'Publicar a Mesa (ACK)' : 'Guardar en Borrador'}</span>
            </button>
          </div>
        </footer>
      </div>

      {/* DIALOG: AGREGAR OBJETO (PROP) */}
      {showAddPropModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Box size={16} className="text-purple-400" />
                Agregar Objeto de Escenario
              </h3>
              <button onClick={() => setShowAddPropModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* QUICK PICKS FROM CAMPAIGN ASSETS (IF PRESENT) */}
            {campaign?.propAssets && campaign.propAssets.length > 0 && (
              <div className="mb-3">
                <label className="text-[11px] text-slate-400 block mb-1">Biblioteca de Campaña</label>
                <div className="grid grid-cols-3 gap-1.5 max-h-28 overflow-y-auto">
                  {campaign.propAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex flex-col items-center text-center"
                      onClick={() => {
                        setNewPropUrl(asset.assetUrl);
                        setNewPropName(asset.name);
                        setNewPropAnchor(asset.defaultAnchor || 'bottom-center');
                      }}
                    >
                      <img src={asset.assetUrl} alt={asset.name} className="w-10 h-10 object-contain mb-1" />
                      <span className="text-[10px] text-slate-200 truncate w-full">{asset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddPropSubmit} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nombre del Objeto</label>
                <input
                  type="text"
                  placeholder="ej. Barra de Taberna, Cofre, Farol"
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">URL de la Imagen (PNG transparente)</label>
                <input
                  type="url"
                  required
                  placeholder="https://ejemplo.com/cofre.png"
                  value={newPropUrl}
                  onChange={(e) => setNewPropUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tipo de Anclaje</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`p-2 rounded text-xs ${
                      newPropAnchor === 'bottom-center'
                        ? 'bg-purple-900/60 border border-purple-400 text-white font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                    onClick={() => setNewPropAnchor('bottom-center')}
                  >
                    Suelo (Base fija)
                  </button>
                  <button
                    type="button"
                    className={`p-2 rounded text-xs ${
                      newPropAnchor === 'center'
                        ? 'bg-purple-900/60 border border-purple-400 text-white font-bold'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                    onClick={() => setNewPropAnchor('center')}
                  >
                    Flotante (Centro)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPropModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 font-bold text-xs text-white">
                  Colocar en Escena
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: GUARDAR COMPOSICIÓN PRESET */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <Bookmark size={16} className="text-amber-400" />
              Guardar Composición
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Guarda la posición de los NPCs, expresiones y props sin tocar la partida en curso.
            </p>
            <form onSubmit={handleSavePreset} className="flex flex-col gap-2.5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Consejo de la Ciudad, Taberna en calma"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Notas visuales sobre la disposición..."
                  value={presetDesc}
                  onChange={(e) => setPresetDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowSavePresetModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-xs"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs">
                  Guardar Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: CARGAR COMPOSICIÓN PRESET */}
      {showLoadPresetModal && campaign?.savedCompositions && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FolderOpen size={16} className="text-sky-400" />
                Cargar Composición Guardada
              </h3>
              <button onClick={() => setShowLoadPresetModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-2">
              {campaign.savedCompositions.map((comp) => (
                <div
                  key={comp.id}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700/80 rounded-lg border border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{comp.name}</h4>
                    {comp.description && (
                      <p className="text-[10px] text-slate-400 truncate">{comp.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span>{comp.characters.length} NPCs</span>
                      <span>•</span>
                      <span>{comp.props?.length || 0} Props</span>
                    </div>
                  </div>
                  <button
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded"
                    onClick={() => handleApplyPreset(comp)}
                  >
                    Aplicar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
