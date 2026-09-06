import React, { useEffect, useState } from 'react';
import type {
  CharacterOnScreen,
  Character,
  CameraTransform,
  SceneProp,
  SceneOcclusionRegion,
  StageWaypoint,
} from '../../types';
import type {
  StageUnifiedItem,
  OcclusionFormState,
  FormationType,
  CustomFormationPreset,
} from './director/directorTypes';
import { calculateFormationPositions } from './director/formationMath';
import { useDirectorDrag } from './director/useDirectorDrag';
import { DirectorTopBar } from './director/DirectorTopBar';
import { DirectorChipsStrip } from './director/DirectorChipsStrip';
import { DirectorBottomBar } from './director/DirectorBottomBar';
import { DirectorMoreDrawer } from './director/DirectorMoreDrawer';
import { DirectorModals } from './director/DirectorModals';
import { DirectorStageGuides } from './director/DirectorStageGuides';
import { DirectorDropZonesAndFeedback } from './director/DirectorDropZonesAndFeedback';
import { DirectorCharacterTokens } from './director/DirectorCharacterTokens';

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
  onOpenCharacterLibrary?: () => void;
  onRemoveCharacters?: (ids: string[]) => void;
  onAddCharacter?: (character: CharacterOnScreen, description: string) => void;
  onLiveDragMove?: (updates: { id: string; normalizedX: number; normalizedY: number }[]) => void;
  followMesaLive?: boolean;
  setFollowMesaLive?: (follow: boolean) => void;
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
  onOpenCharacterLibrary,
  onRemoveCharacters,
  onAddCharacter,
  onLiveDragMove,
  followMesaLive,
  setFollowMesaLive,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [editingPrivateLabelId, setEditingPrivateLabelId] = useState<string | null>(null);
  const [privateLabelInput, setPrivateLabelInput] = useState<string>('');
  const [showExpressionsForId, setShowExpressionsForId] = useState<string | null>(null);
  const [showGuides, setShowGuides] = useState<boolean>(false);
  const [magneticSnapping, setMagneticSnapping] = useState<boolean>(false);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(false);
  const [localFollowMesaLive, setLocalFollowMesaLive] = useState<boolean>(false);
  const effectiveFollowMesaLive = followMesaLive !== undefined ? followMesaLive : localFollowMesaLive;
  const effectiveSetFollowMesaLive = setFollowMesaLive || setLocalFollowMesaLive;
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
  const [savingFormationModalOpen, setSavingFormationModalOpen] = useState<boolean>(false);
  const [formationNameInput, setFormationNameInput] = useState<string>('');
  const [customFormations, setCustomFormations] = useState<CustomFormationPreset[]>([]);
  const [quickActionMessage, setQuickActionMessage] = useState<string | null>(null);
  const [reserveDrag, setReserveDrag] = useState<{
    character: CharacterOnScreen;
    startX: number;
    startY: number;
    passedSlop: boolean;
    normalizedX: number;
    normalizedY: number;
  } | null>(null);

  useEffect(() => {
    if (!quickActionMessage) return;
    const timer = window.setTimeout(() => setQuickActionMessage(null), 4500);
    return () => window.clearTimeout(timer);
  }, [quickActionMessage]);

  const announceQuickAction = (message: string) => setQuickActionMessage(message);

  const handleDuplicateCharacter = (char: CharacterOnScreen) => {
    if (!onAddCharacter) return;
    const baseName = (char.privateLabel || char.name).replace(/\s+\d+$/, '').trim() || char.name;

    const existingNumbers: number[] = [];
    let hasUnnumberedOriginal = false;
    characters.forEach((c) => {
      const cLabel = c.privateLabel || c.name;
      if (c.characterId === char.characterId || cLabel.startsWith(baseName)) {
        const match = cLabel.match(/\s+(\d+)$/);
        if (match) {
          existingNumbers.push(parseInt(match[1], 10));
        } else {
          hasUnnumberedOriginal = true;
        }
      }
    });

    let newNumber = 2;
    if (existingNumbers.length > 0) {
      newNumber = Math.max(...existingNumbers) + 1;
    } else if (hasUnnumberedOriginal) {
      onUpdateCharacter(
        char.id,
        { privateLabel: `${baseName} 1` },
        `Asignar etiqueta "${baseName} 1" al original`
      );
      newNumber = 2;
    }

    const newLabel = `${baseName} ${newNumber}`;
    const nextX = Math.max(5, Math.min(95, (char.normalizedX ?? 50) + 6));
    const nextY = char.normalizedY ?? 0;

    const newChar: CharacterOnScreen = {
      ...char,
      id: `dup-${char.characterId || 'char'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      privateLabel: newLabel,
      normalizedX: Math.round(nextX * 10) / 10,
      normalizedY: Math.round(nextY * 10) / 10,
      presence: 'on_stage',
      isHidden: false,
      isLocked: false,
      zIndex: (char.zIndex ?? 10) + 1,
    };

    onAddCharacter(newChar, `Añadir copia "${newLabel}"`);
    setSelectedIds(new Set([newChar.id]));
    announceQuickAction(`Copia "${newLabel}" añadida`);
  };

  const handleWaypointClick = (waypoint: StageWaypoint) => {
    if (selectedIds.size > 0) {
      const selectedChars = characters.filter((c) => selectedIds.has(c.id) && !c.isLocked);
      if (selectedChars.length === 1) {
        const c = selectedChars[0];
        onUpdateCharacter(
          c.id,
          { normalizedX: waypoint.normalizedX, normalizedY: waypoint.normalizedY },
          `Mover a ${c.privateLabel || c.name} a punto "${waypoint.name}"`
        );
        announceQuickAction(`${c.privateLabel || c.name} movido a "${waypoint.name}"`);
      } else if (selectedChars.length > 1) {
        const updates = selectedChars.map((c, i) => {
          const offset = (i - (selectedChars.length - 1) / 2) * 5;
          const targetX = Math.max(5, Math.min(95, waypoint.normalizedX + offset));
          return {
            id: c.id,
            normalizedX: Math.round(targetX * 10) / 10,
            normalizedY: waypoint.normalizedY,
          };
        });
        onUpdateMultipleCharacterPositions(updates, `Mover grupo a punto "${waypoint.name}"`);
        announceQuickAction(`Grupo movido a "${waypoint.name}"`);
      }
    } else {
      onFocusCamera?.(waypoint.normalizedX, waypoint.normalizedY);
      announceQuickAction(`Punto "${waypoint.name}" enfocado`);
    }
  };

  const handleApplyFormation = (
    formation: FormationType | 'custom',
    customOffsets?: { dx: number; dy: number }[]
  ) => {
    const selectedChars = characters.filter((c) => selectedIds.has(c.id) && !c.isLocked);
    if (selectedChars.length < 2) return;
    const anchorId =
      primarySelectedChar && selectedIds.has(primarySelectedChar.id)
        ? primarySelectedChar.id
        : selectedChars[0].id;

    const updates = calculateFormationPositions(
      selectedChars,
      anchorId,
      formation,
      customOffsets
    );

    const formationNames: Record<string, string> = {
      line: 'Fila horizontal',
      semicircle: 'Semicírculo',
      flanks: 'Flancos',
      cluster: 'Racimo',
      custom: 'Personalizada',
    };
    const label = formationNames[formation] || 'Táctica';
    onUpdateMultipleCharacterPositions(updates, `Aplicar formación "${label}"`);
    announceQuickAction(`Formación "${label}" aplicada`);
  };

  const handleSaveCurrentFormation = () => {
    const selectedChars = characters.filter((c) => selectedIds.has(c.id) && !c.isLocked);
    if (selectedChars.length < 2 || !formationNameInput.trim()) return;
    const anchor =
      primarySelectedChar && selectedIds.has(primarySelectedChar.id)
        ? primarySelectedChar
        : selectedChars[0];
    const anchorX = anchor.normalizedX ?? 50;
    const anchorY = anchor.normalizedY ?? 0;

    const offsets = selectedChars.map((c) => ({
      dx: Math.round(((c.normalizedX ?? 50) - anchorX) * 10) / 10,
      dy: Math.round(((c.normalizedY ?? 0) - anchorY) * 10) / 10,
    }));

    const newPreset: CustomFormationPreset = {
      id: `formation-${Date.now()}`,
      name: formationNameInput.trim(),
      relativeOffsets: offsets,
    };
    setCustomFormations((prev) => [...prev, newPreset]);
    announceQuickAction(`Formación "${newPreset.name}" guardada`);
    setFormationNameInput('');
  };

  const {
    containerRef,
    dragPreview,
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
    followMesaLive: !isStaging && effectiveFollowMesaLive,
    magneticSnapping,
    waypoints,
    onLiveDragMove,
    onUpdateCharacter,
    onUpdateMultipleCharacterPositions,
    onQuickDrop: (characterIds, target) => {
      const affected = characters.filter((character) => characterIds.includes(character.id));
      if (target === 'remove' && onRemoveCharacters) {
        onRemoveCharacters(characterIds);
        announceQuickAction(`${affected.length === 1 ? affected[0].name : `${affected.length} personajes`} quitado de la escena`);
        setSelectedIds(new Set());
        return;
      }
      affected.forEach((character) => {
        const updates = target === 'hide'
          ? { isHidden: true }
          : { presence: 'in_reserve' as const };
        onUpdateCharacter(
          character.id,
          updates,
          target === 'hide' ? `Ocultar en escena a ${character.name}` : `Retirar a reserva a ${character.name}`
        );
      });
      announceQuickAction(
        target === 'hide'
          ? `${affected.length === 1 ? affected[0].name : `${affected.length} personajes`} ocultado`
          : `${affected.length === 1 ? affected[0].name : `${affected.length} personajes`} enviado a reserva`
      );
      setSelectedIds(new Set());
    },
  });

  const handleReservePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!reserveDrag || !containerRef.current) return;
    const delta = Math.hypot(event.clientX - reserveDrag.startX, event.clientY - reserveDrag.startY);
    if (!reserveDrag.passedSlop && delta < 10) return;
    const rect = containerRef.current.getBoundingClientRect();
    const normalizedX = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100));
    const stageY = ((rect.bottom - event.clientY) / rect.height) * 100 - (groundLineY || 0);
    setReserveDrag({
      ...reserveDrag,
      passedSlop: true,
      normalizedX: Math.round(normalizedX * 10) / 10,
      normalizedY: Math.round(Math.max(0, Math.min(70, stageY)) * 10) / 10,
    });
  };

  const handleReservePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!reserveDrag) return;
    try { containerRef.current?.releasePointerCapture(event.pointerId); } catch {}
    if (reserveDrag.passedSlop) {
      onUpdateCharacter(
        reserveDrag.character.id,
        {
          presence: 'on_stage',
          isHidden: false,
          normalizedX: reserveDrag.normalizedX,
          normalizedY: reserveDrag.normalizedY,
        },
        `Hacer entrar a ${reserveDrag.character.name} en (${reserveDrag.normalizedX}%, ${reserveDrag.normalizedY}%)`
      );
      setSelectedIds(new Set([reserveDrag.character.id]));
      announceQuickAction(`${reserveDrag.character.name} entró al escenario`);
    }
    setReserveDrag(null);
  };

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
      className="director-overlay absolute inset-0 z-30 select-none overflow-hidden"
      onClick={handleBackgroundClick}
      onPointerMove={(event) => {
        handlePointerMove(event);
        handleReservePointerMove(event);
      }}
      onPointerUp={(event) => {
        handlePointerUp(event);
        handleReservePointerUp(event);
      }}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={() => {
        handlePointerCancel();
        setReserveDrag(null);
      }}
    >
      {/* ── TOP BAR: Mode, Destination, Multi-Select & Undo ── */}
      <DirectorTopBar
        isStaging={isStaging}
        showGuides={showGuides}
        setShowGuides={setShowGuides}
        showCameraPresets={showCameraPresets}
        setShowCameraPresets={setShowCameraPresets}
        showWaypoints={showWaypoints}
        setShowWaypoints={setShowWaypoints}
        waypointsCount={waypoints.length}
        followMesaLive={effectiveFollowMesaLive}
        setFollowMesaLive={effectiveSetFollowMesaLive}
        onFocusCamera={onFocusCamera}
        primarySelectedChar={primarySelectedChar}
        characters={characters}
        savedCameraPresets={savedCameraPresets}
        onSaveCameraPreset={onSaveCameraPreset}
        setSavingPresetModalOpen={setSavingPresetModalOpen}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        onUpdateMultipleCharacterPositions={onUpdateMultipleCharacterPositions}
        magneticSnapping={magneticSnapping}
        setMagneticSnapping={setMagneticSnapping}
        onApplyFormation={handleApplyFormation}
        customFormations={customFormations}
        onOpenSaveFormationModal={() => {
          setFormationNameInput('');
          setSavingFormationModalOpen(true);
        }}
        isMultiSelectMode={isMultiSelectMode}
        setIsMultiSelectMode={setIsMultiSelectMode}
        canUndo={canUndo}
        onUndo={onUndo}
      />

      {/* ── VISIBLE NARRATIVE WAYPOINTS & GUIDES ── */}
      <DirectorStageGuides
        showWaypoints={showWaypoints}
        showGuides={showGuides}
        waypoints={waypoints}
        groundLineY={groundLineY}
        snapGuideLines={dragPreview?.snapGuideLines}
        onWaypointClick={handleWaypointClick}
      />

      {/* ── CHARACTER CHIP ROSTER STRIP (Overlapping & Reserve Quick Access) ── */}
      <DirectorChipsStrip
        characters={characters}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onOpenCharacterLibrary={onOpenCharacterLibrary}
        onBeginReserveDrag={(character, event) => {
          event.stopPropagation();
          try { containerRef.current?.setPointerCapture(event.pointerId); } catch {}
          setReserveDrag({
            character,
            startX: event.clientX,
            startY: event.clientY,
            passedSlop: false,
            normalizedX: character.normalizedX ?? 50,
            normalizedY: character.normalizedY ?? 0,
          });
        }}
        onTogglePresence={(character) => {
          const nextPresence = character.presence === 'in_reserve' ? 'on_stage' : 'in_reserve';
          onUpdateCharacter(
            character.id,
            { presence: nextPresence },
            `${nextPresence === 'on_stage' ? 'Hacer entrar a escena' : 'Retirar a reserva'} a ${character.name}`
          );
          announceQuickAction(
            `${character.name} ${nextPresence === 'on_stage' ? 'entró al escenario' : 'fue enviado a reserva'}`
          );
          if (nextPresence === 'in_reserve') {
            setSelectedIds((current) => {
              const next = new Set(current);
              next.delete(character.id);
              return next;
            });
          }
        }}
      />

      {/* ── DROP ZONES & QUICK FEEDBACK TOAST ── */}
      <DirectorDropZonesAndFeedback
        reserveDrag={reserveDrag}
        groundLineY={groundLineY}
        hasPassedTouchSlop={dragPreview?.hasPassedTouchSlop}
        quickDropTarget={dragPreview?.quickDropTarget}
        quickActionMessage={quickActionMessage}
        onUndo={onUndo}
        onClearQuickActionMessage={() => setQuickActionMessage(null)}
      />

      {/* ── CHARACTER SELECTION BOXES & TOUCH HANDLES ── */}
      <DirectorCharacterTokens
        characters={characters}
        selectedIds={selectedIds}
        dragPreview={dragPreview}
        groundLineY={groundLineY}
        onSelect={handleSelect}
        onPointerDown={handlePointerDown}
      />

      {/* ── FLOATING QUICK ACTIONS BAR (On Selected Character) ── */}
      <DirectorBottomBar
        primarySelectedChar={primarySelectedChar}
        activeCampaignChar={activeCampaignChar}
        characters={characters}
        isDragging={!!dragPreview?.hasPassedTouchSlop}
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
        onDuplicateCharacter={handleDuplicateCharacter}
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
        onDuplicateCharacter={handleDuplicateCharacter}
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
        savingFormationModalOpen={savingFormationModalOpen}
        setSavingFormationModalOpen={setSavingFormationModalOpen}
        formationNameInput={formationNameInput}
        setFormationNameInput={setFormationNameInput}
        onSaveCurrentFormation={handleSaveCurrentFormation}
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
