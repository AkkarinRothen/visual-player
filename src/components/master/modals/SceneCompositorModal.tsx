import React, { useState, useRef, useCallback } from 'react';
import { X, Sliders, RotateCcw, Check } from 'lucide-react';
import type {
  Campaign,
  CharacterOnScreen,
  DisplayState,
  ElementTransitionDirective,
  SceneCompositionPreset,
  SceneProp,
} from '../../../types';
import type { SelectedEntity } from '../compositor/compositorTypes';
import { getSlotPositionPercent } from '../compositor/compositorTypes';
import { CompositorStage } from '../compositor/CompositorStage';
import { CompositorSidebar } from '../compositor/CompositorSidebar';
import { CompositorModals } from '../compositor/CompositorModals';

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

  // Submodals state
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

    const deltaPercentX = (deltaX / rect.width) * 100;
    const deltaPercentY = -(deltaY / rect.height) * 100;

    let nextX = Math.round((dragStartRef.current.startX + deltaPercentX) * 10) / 10;
    let nextY = Math.round((dragStartRef.current.startY + deltaPercentY) * 10) / 10;

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

  const changeLayer = (direction: 'front' | 'back') => {
    if (!selectedEntity) return;
    pushHistory();

    const targetZ = direction === 'front' ? 60 : 1;

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
          <CompositorStage
            stageRef={stageRef}
            aspectGuide={aspectGuide}
            initialState={initialState}
            characters={characters}
            propsList={propsList}
            selectedEntity={selectedEntity}
            setSelectedEntity={setSelectedEntity}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            pushHistory={pushHistory}
            setCharacters={setCharacters}
            setShowAddPropModal={setShowAddPropModal}
            setShowSavePresetModal={setShowSavePresetModal}
            setShowLoadPresetModal={setShowLoadPresetModal}
            campaign={campaign}
            canSavePreset={Boolean(onSaveCompositionPreset)}
          />

          <CompositorSidebar
            filterType={filterType}
            setFilterType={setFilterType}
            characters={characters}
            propsList={propsList}
            selectedEntity={selectedEntity}
            setSelectedEntity={setSelectedEntity}
            selectedChar={selectedChar}
            selectedProp={selectedProp}
            characterTemplate={characterTemplate}
            propTemplate={propTemplate}
            toggleSpeaking={toggleSpeaking}
            toggleFlip={toggleFlip}
            toggleLock={toggleLock}
            setScale={setScale}
            nudge={nudge}
            changeLayer={changeLayer}
            pushHistory={pushHistory}
            setCharacters={setCharacters}
            setPropsList={setPropsList}
            toggleVisibility={toggleVisibility}
            duplicateProp={duplicateProp}
            removeProp={removeProp}
            toggleAnchor={toggleAnchor}
            setRotation={setRotation}
          />
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

      <CompositorModals
        showAddPropModal={showAddPropModal}
        setShowAddPropModal={setShowAddPropModal}
        campaign={campaign}
        newPropName={newPropName}
        setNewPropName={setNewPropName}
        newPropUrl={newPropUrl}
        setNewPropUrl={setNewPropUrl}
        newPropAnchor={newPropAnchor}
        setNewPropAnchor={setNewPropAnchor}
        handleAddPropSubmit={handleAddPropSubmit}
        showSavePresetModal={showSavePresetModal}
        setShowSavePresetModal={setShowSavePresetModal}
        presetName={presetName}
        setPresetName={setPresetName}
        presetDesc={presetDesc}
        setPresetDesc={setPresetDesc}
        handleSavePreset={handleSavePreset}
        showLoadPresetModal={showLoadPresetModal}
        setShowLoadPresetModal={setShowLoadPresetModal}
        handleApplyPreset={handleApplyPreset}
      />
    </div>
  );
};
