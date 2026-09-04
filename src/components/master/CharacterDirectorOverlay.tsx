import React, { useState } from 'react';
import type {
  CharacterOnScreen,
  Character,
  CameraTransform,
  SceneProp,
  SceneOcclusionRegion,
  StageWaypoint,
} from '../../types';
import type { StageUnifiedItem, OcclusionFormState } from './director/directorTypes';
import { useDirectorDrag } from './director/useDirectorDrag';
import { DirectorTopBar } from './director/DirectorTopBar';
import { DirectorChipsStrip } from './director/DirectorChipsStrip';
import { DirectorBottomBar } from './director/DirectorBottomBar';
import { DirectorMoreDrawer } from './director/DirectorMoreDrawer';
import { DirectorModals } from './director/DirectorModals';
import { Lock, Mic } from 'lucide-react';

export interface CharacterDirectorOverlayProps {
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
  const [occlusionForm, setOcclusionForm] = useState<OcclusionFormState>({
    name: 'Mostrador frontal',
    x: 20,
    y: 0,
    width: 35,
    height: 25,
    zIndex: 25,
  });

  const {
    containerRef,
    dragRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  } = useDirectorDrag({
    characters,
    camera,
    selectedIds,
    setSelectedIds,
    isMultiSelectMode,
    onUpdateCharacter,
    onUpdateMultipleCharacterPositions,
  });

  const primarySelectedChar = characters.find((c) => selectedIds.has(c.id)) || null;

  // Unified stage items for layer ordering (characters + props + occlusion regions)
  const unifiedStageItems: StageUnifiedItem[] = [
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

  const activeCampaignChar = primarySelectedChar
    ? campaignCharacters.find((cc) => cc.id === primarySelectedChar.characterId) || null
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
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
    >
      {/* ── TOP BAR: Mode, Destination, Multi-Select & Undo ── */}
      <DirectorTopBar
        isStaging={isStaging}
        showGuides={showGuides}
        setShowGuides={setShowGuides}
        showCameraPresets={showCameraPresets}
        setShowCameraPresets={setShowCameraPresets}
        onFocusCamera={onFocusCamera}
        primarySelectedChar={primarySelectedChar}
        characters={characters}
        savedCameraPresets={savedCameraPresets}
        onSaveCameraPreset={onSaveCameraPreset}
        setSavingPresetModalOpen={setSavingPresetModalOpen}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onUpdateMultipleCharacterPositions={onUpdateMultipleCharacterPositions}
        isMultiSelectMode={isMultiSelectMode}
        setIsMultiSelectMode={setIsMultiSelectMode}
        canUndo={canUndo}
        onUndo={onUndo}
      />

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
          <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-0.5 border-r border-dashed border-amber-500/30 z-0" />
        </>
      )}

      {/* ── CHARACTER CHIP ROSTER STRIP (Overlapping & Reserve Quick Access) ── */}
      <DirectorChipsStrip
        characters={characters}
        selectedIds={selectedIds}
        onSelect={handleSelect}
      />

      {/* ── CHARACTER SELECTION BOXES & TOUCH HANDLES ── */}
      {characters.map((char) => {
        if (char.presence === 'in_reserve') return null;

        const isSelected = selectedIds.has(char.id);
        const isDraggingThis = dragRef.current?.isDragging && dragRef.current.anchorId === char.id;
        const isLocked = !!char.isLocked;
        const cursorClass = isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing';

        const posX = char.normalizedX ?? 50;
        const posY = (char.normalizedY ?? 0) + (groundLineY || 0);
        const visualAnchorOffsetY = char.visualAnchorOffsetY || 0;
        const effectiveScale = char.scale ?? 1.0;

        return (
          <div
            key={char.id}
            data-testid={`director-handle-${char.id}`}
            className={`director-ui-element absolute pointer-events-auto ${cursorClass} transition-transform ${
              isSelected ? 'z-40' : 'z-20'
            }`}
            style={{
              left: `${posX}%`,
              bottom: `${posY}%`,
              transform: `translate(-50%, ${visualAnchorOffsetY}%)`,
              touchAction: 'none',
            }}
            onClick={(e) => handleSelect(char.id, e)}
            onPointerDown={(e) => handlePointerDown(char, e)}
          >
            {/* Direct Selection Box */}
            <div
              className={`relative rounded-2xl transition-all p-1 flex flex-col items-center justify-center ${
                isSelected
                  ? 'ring-2 ring-amber-400 bg-amber-500/15 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'hover:ring-1 hover:ring-amber-400/50 hover:bg-slate-900/30'
              }`}
              style={{
                width: `${Math.round(80 * effectiveScale)}px`,
                height: `${Math.round(120 * effectiveScale)}px`,
              }}
            >
              {/* Center crosshair dot */}
              <div
                className={`w-2 h-2 rounded-full border border-slate-950 transition-colors ${
                  isSelected ? 'bg-amber-400 shadow-sm' : 'bg-slate-300 opacity-60'
                }`}
              />

              {/* Private label tag pill */}
              <div
                className={`absolute -top-5 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap shadow-md transition-colors ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950/80 text-slate-200 border border-slate-700'
                }`}
              >
                {char.privateLabel || char.name}
              </div>

              {/* Badges corner */}
              <div className="absolute top-1 right-1 flex items-center gap-0.5">
                {char.isHidden && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Oculto" />
                )}
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
      <DirectorBottomBar
        primarySelectedChar={primarySelectedChar}
        activeCampaignChar={activeCampaignChar}
        characters={characters}
        dragRef={dragRef}
        showExpressionsForId={showExpressionsForId}
        setShowExpressionsForId={setShowExpressionsForId}
        editingPrivateLabelId={editingPrivateLabelId}
        setEditingPrivateLabelId={setEditingPrivateLabelId}
        privateLabelInput={privateLabelInput}
        setPrivateLabelInput={setPrivateLabelInput}
        showMorePanel={showMorePanel}
        setShowMorePanel={setShowMorePanel}
        setSelectedIds={setSelectedIds}
        onUpdateCharacter={onUpdateCharacter}
      />

      {/* ── "MÁS…" SECONDARY ACTIONS BOTTOM SHEET / PANEL ── */}
      <DirectorMoreDrawer
        showMorePanel={showMorePanel}
        setShowMorePanel={setShowMorePanel}
        primarySelectedChar={primarySelectedChar}
        characters={characters}
        unifiedStageItems={unifiedStageItems}
        waypoints={waypoints}
        onFocusCamera={onFocusCamera}
        setPreparingEntryCharId={setPreparingEntryCharId}
        setCalibratingAnchorCharId={setCalibratingAnchorCharId}
        setCalibratingOffsetValue={setCalibratingOffsetValue}
        setViewLayersModalOpen={setViewLayersModalOpen}
        setRelativeLayerModalOpen={setRelativeLayerModalOpen}
        setEditingPrivateLabelId={setEditingPrivateLabelId}
        setPrivateLabelInput={setPrivateLabelInput}
        setWaypointNameInput={setWaypointNameInput}
        setSavingWaypointModalOpen={setSavingWaypointModalOpen}
        setMovingToWaypointModalOpen={setMovingToWaypointModalOpen}
        onUpdateCharacter={onUpdateCharacter}
      />

      {/* ── DIRECTOR MODALS LAYER ── */}
      <DirectorModals
        characters={characters}
        campaignCharacters={campaignCharacters}
        unifiedStageItems={unifiedStageItems}
        waypoints={waypoints}
        selectedIds={selectedIds}
        primarySelectedChar={primarySelectedChar}
        calibratingAnchorCharId={calibratingAnchorCharId}
        setCalibratingAnchorCharId={setCalibratingAnchorCharId}
        calibratingOffsetValue={calibratingOffsetValue}
        setCalibratingOffsetValue={setCalibratingOffsetValue}
        preparingEntryCharId={preparingEntryCharId}
        setPreparingEntryCharId={setPreparingEntryCharId}
        preparingTransition={preparingTransition}
        setPreparingTransition={setPreparingTransition}
        savingPresetModalOpen={savingPresetModalOpen}
        setSavingPresetModalOpen={setSavingPresetModalOpen}
        presetNameInput={presetNameInput}
        setPresetNameInput={setPresetNameInput}
        relativeLayerModalOpen={relativeLayerModalOpen}
        setRelativeLayerModalOpen={setRelativeLayerModalOpen}
        viewLayersModalOpen={viewLayersModalOpen}
        setViewLayersModalOpen={setViewLayersModalOpen}
        savingWaypointModalOpen={savingWaypointModalOpen}
        setSavingWaypointModalOpen={setSavingWaypointModalOpen}
        waypointNameInput={waypointNameInput}
        setWaypointNameInput={setWaypointNameInput}
        movingToWaypointModalOpen={movingToWaypointModalOpen}
        setMovingToWaypointModalOpen={setMovingToWaypointModalOpen}
        creatingOcclusionModalOpen={creatingOcclusionModalOpen}
        setCreatingOcclusionModalOpen={setCreatingOcclusionModalOpen}
        occlusionForm={occlusionForm}
        setOcclusionForm={setOcclusionForm}
        onSaveCameraPreset={onSaveCameraPreset}
        onSaveWaypoint={onSaveWaypoint}
        onSaveOcclusionRegion={onSaveOcclusionRegion}
        onUpdateCharacter={onUpdateCharacter}
        onUpdateProp={onUpdateProp}
        onReorderLayers={onReorderLayers}
        onUpdateCampaignCharacter={onUpdateCampaignCharacter}
        reorderRelativeTo={reorderRelativeTo}
      />
    </div>
  );
};
