import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type {
  Campaign,
  CharacterOnScreen,
  DisplayState,
  ElementTransitionDirective,
  SceneCompositionPreset,
  SceneProp,
  TacticalGridConfig,
} from '../../../types';
import { CompositorStage } from '../compositor/CompositorStage';
import { CompositorSidebar } from '../compositor/CompositorSidebar';
import { CompositorModals } from '../compositor/CompositorModals';
import { CompositorHeader } from '../compositor/CompositorHeader';
import { CompositorFooter } from '../compositor/CompositorFooter';
import { useCompositorEntities } from '../compositor/useCompositorEntities';
import { AssetPickerModal } from '../../common/AssetPickerModal';
import {
  applySceneLayoutTemplate,
  DEFAULT_TACTICAL_GRID,
  type SceneLayoutTemplate,
} from '../../../domain/display/sceneLayoutTemplates';

export interface SceneCompositorModalProps {
  initialState: DisplayState;
  campaign?: Campaign | null;
  operationMode: 'live' | 'staging';
  onSaveState: (
    updatedCharacters: CharacterOnScreen[],
    updatedProps: SceneProp[],
    applyDirectlyToLive: boolean,
    transitions?: ElementTransitionDirective[],
    backgroundUrl?: string,
    tacticalGrid?: TacticalGridConfig
  ) => Promise<void>;
  onPreviewState?: (
    updatedCharacters: CharacterOnScreen[],
    updatedProps: SceneProp[],
    backgroundUrl?: string,
    tacticalGrid?: TacticalGridConfig
  ) => Promise<void> | void;
  onSaveCompositionPreset?: (preset: SceneCompositionPreset) => Promise<void>;
  onClose: () => void;
}

export const SceneCompositorModal: React.FC<SceneCompositorModalProps> = ({
  initialState,
  campaign,
  operationMode,
  onSaveState,
  onPreviewState,
  onSaveCompositionPreset,
  onClose,
}) => {
  const {
    characters,
    setCharacters,
    propsList,
    setPropsList,
    selectedEntity,
    setSelectedEntity,
    selectedChar,
    selectedProp,
    history,
    pushHistory,
    handleUndo,
    stageRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleAddCharacter,
    nudge,
    setScale,
    setRotation,
    toggleFlip,
    toggleLock,
    toggleVisibility,
    toggleAnchor,
    toggleSpeaking,
    changeLayer,
    duplicateProp,
    removeProp,
    setTacticalTeam,
  } = useCompositorEntities(initialState);

  const [filterType, setFilterType] = useState<'all' | 'characters' | 'props'>('all');
  const [aspectGuide, setAspectGuide] = useState<'16:9' | '16:10' | '4:3'>('16:9');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState(initialState.backgroundUrl);
  const [tacticalGrid, setTacticalGrid] = useState<TacticalGridConfig>(
    initialState.tacticalGrid || DEFAULT_TACTICAL_GRID
  );

  // Submodals state
  const [showAddPropModal, setShowAddPropModal] = useState<boolean>(false);
  const [newPropUrl, setNewPropUrl] = useState<string>('');
  const [newPropName, setNewPropName] = useState<string>('');
  const [newPropAnchor, setNewPropAnchor] = useState<'bottom-center' | 'center'>('bottom-center');

  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [presetName, setPresetName] = useState<string>('');
  const [presetDesc, setPresetDesc] = useState<string>('');

  const [showLoadPresetModal, setShowLoadPresetModal] = useState<boolean>(false);

  const previewCallbackRef = useRef(onPreviewState);
  const livePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestPreviewRef = useRef({ characters, propsList, backgroundUrl, tacticalGrid });
  const lastQueuedPreviewRef = useRef({ characters, propsList, backgroundUrl, tacticalGrid });

  useEffect(() => {
    previewCallbackRef.current = onPreviewState;
  }, [onPreviewState]);

  const flushLivePreview = useCallback(() => {
    if (operationMode !== 'live' || !previewCallbackRef.current) return;
    const latest = latestPreviewRef.current;
    void previewCallbackRef.current(
      latest.characters,
      latest.propsList,
      latest.backgroundUrl,
      latest.tacticalGrid
    );
  }, [operationMode]);

  useEffect(() => {
    const nextPreview = { characters, propsList, backgroundUrl, tacticalGrid };
    latestPreviewRef.current = nextPreview;
    const previous = lastQueuedPreviewRef.current;
    if (
      previous.characters === characters &&
      previous.propsList === propsList &&
      previous.backgroundUrl === backgroundUrl &&
      previous.tacticalGrid === tacticalGrid
    )
      return;
    lastQueuedPreviewRef.current = nextPreview;
    if (operationMode !== 'live' || !previewCallbackRef.current || livePreviewTimerRef.current)
      return;

    // Throttle to ~12 FPS
    livePreviewTimerRef.current = setTimeout(() => {
      livePreviewTimerRef.current = null;
      flushLivePreview();
    }, 80);
  }, [characters, propsList, backgroundUrl, tacticalGrid, operationMode, flushLivePreview]);

  useEffect(() => () => {
    if (!livePreviewTimerRef.current) return;
    clearTimeout(livePreviewTimerRef.current);
    const latest = latestPreviewRef.current;
    void previewCallbackRef.current?.(
      latest.characters,
      latest.propsList,
      latest.backgroundUrl,
      latest.tacticalGrid
    );
  }, []);

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
      thumbnailUrl: backgroundUrl,
      backgroundUrl,
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
      tacticalGrid,
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
    if (preset.tacticalGrid) setTacticalGrid(preset.tacticalGrid);
    setShowLoadPresetModal(false);
  };

  const handleApplyLayoutTemplate = (template: SceneLayoutTemplate) => {
    pushHistory();
    setCharacters((current) => applySceneLayoutTemplate(current, template));
    if (template === 'tactical-map') setTacticalGrid((grid) => ({ ...grid, enabled: true }));
  };

  const handleSave = async (directToLive: boolean) => {
    if (directToLive && onPreviewState) {
      if (livePreviewTimerRef.current) {
        clearTimeout(livePreviewTimerRef.current);
        livePreviewTimerRef.current = null;
      }
      flushLivePreview();
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSaveState(characters, propsList, directToLive, undefined, backgroundUrl, tacticalGrid);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (operationMode === 'live' && livePreviewTimerRef.current) {
      clearTimeout(livePreviewTimerRef.current);
      livePreviewTimerRef.current = null;
      flushLivePreview();
    }
    onClose();
  };

  const characterTemplate = selectedChar?.characterId
    ? campaign?.characters.find((c) => c.id === selectedChar.characterId)
    : null;

  const propTemplate = selectedProp?.assetId
    ? campaign?.propAssets?.find((p) => p.id === selectedProp.assetId)
    : null;

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 outline-none"
        >
          <div className="compositor-modal bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            <Dialog.Title className="sr-only">Compositor de Escena</Dialog.Title>
        <CompositorHeader
          operationMode={operationMode}
          aspectGuide={aspectGuide}
          onSelectAspectGuide={setAspectGuide}
          onClose={handleClose}
        />

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
            backgroundUrl={backgroundUrl}
            onOpenBackgroundPicker={() => setShowBackgroundPicker(true)}
            onApplyLayoutTemplate={handleApplyLayoutTemplate}
            tacticalGrid={tacticalGrid}
            onChangeTacticalGrid={setTacticalGrid}
          />

          <CompositorSidebar
            filterType={filterType}
            campaign={campaign}
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
            onAddCharacter={handleAddCharacter}
            setTacticalTeam={setTacticalTeam}
            operationMode={operationMode}
          />
        </div>

        <CompositorFooter
          historyLength={history.length}
          operationMode={operationMode}
          isSaving={isSaving}
          onUndo={handleUndo}
          onCancel={handleClose}
          onSave={handleSave}
        />
      </div>
        </Dialog.Content>

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

      <AssetPickerModal
        isOpen={showBackgroundPicker}
        mode="background"
        currentUrl={backgroundUrl}
        title="Cambiar fondo de la escena"
        onSelectAsset={(asset) => {
          pushHistory();
          setBackgroundUrl(asset.url);
          setShowBackgroundPicker(false);
        }}
        onClose={() => setShowBackgroundPicker(false)}
      />
      </Dialog.Portal>
    </Dialog.Root>
  );
};
