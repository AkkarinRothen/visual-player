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
import { Archive, EyeOff, Lock, Mic, RotateCcw, Trash2, MapPin } from 'lucide-react';

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
      className="absolute inset-0 z-30 select-none overflow-hidden"
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

      {/* ── VISIBLE NARRATIVE WAYPOINTS ── */}
      {(showWaypoints || showGuides) && waypoints.map((wp) => (
        <div
          key={wp.id}
          data-testid={`director-waypoint-${wp.id}`}
          className="director-ui-element absolute -translate-x-1/2 translate-y-1/2 pointer-events-auto cursor-pointer z-30 group"
          style={{
            left: `${wp.normalizedX}%`,
            bottom: `${wp.normalizedY + (groundLineY || 0)}%`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleWaypointClick(wp);
          }}
          title={`Punto narrativo: ${wp.name}. Toca para mover la figura seleccionada aquí.`}
        >
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/90 border border-cyan-400/80 text-cyan-200 text-[10px] font-semibold shadow-xl group-hover:scale-110 group-hover:border-amber-400 group-hover:text-amber-300 transition-all">
            <MapPin size={11} className="text-amber-400" />
            <span>{wp.name}</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 border border-slate-950 mx-auto mt-0.5 group-hover:bg-amber-400 shadow-sm" />
        </div>
      ))}

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

      {/* ── DYNAMIC MAGNETIC SNAP GUIDE LINES ── */}
      {dragPreview?.snapGuideLines && dragPreview.snapGuideLines.map((line, idx) => (
        line.axis === 'x' ? (
          <div
            key={`snap-x-${line.position}-${idx}`}
            data-testid={`snap-guide-x-${line.position}`}
            className="pointer-events-none absolute top-0 bottom-0 z-40 border-l-2 border-dashed border-rose-400/90 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
            style={{ left: `${line.position}%` }}
          >
            <div className="absolute top-12 -translate-x-1/2 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-400 text-rose-200 text-[9px] font-mono font-semibold shadow-lg whitespace-nowrap">
              {line.label}
            </div>
          </div>
        ) : (
          <div
            key={`snap-y-${line.position}-${idx}`}
            data-testid={`snap-guide-y-${line.position}`}
            className="pointer-events-none absolute left-0 right-0 z-40 border-b-2 border-dashed border-rose-400/90 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"
            style={{ bottom: `${line.position + (groundLineY || 0)}%` }}
          >
            <div className="absolute right-4 -translate-y-1/2 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-400 text-rose-200 text-[9px] font-mono font-semibold shadow-lg whitespace-nowrap">
              {line.label}
            </div>
          </div>
        )
      ))}

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

      {reserveDrag?.passedSlop && (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2 rounded-2xl border-2 border-emerald-300 bg-emerald-500/20 p-1 shadow-2xl"
          style={{
            left: `${reserveDrag.normalizedX}%`,
            bottom: `${reserveDrag.normalizedY + (groundLineY || 0)}%`,
            width: `${Math.round(80 * (reserveDrag.character.scale ?? 1))}px`,
            height: `${Math.round(120 * (reserveDrag.character.scale ?? 1))}px`,
          }}
        >
          <img src={reserveDrag.character.avatarUrl} alt="" className="h-full w-full object-contain opacity-80" />
        </div>
      )}

      {dragPreview?.hasPassedTouchSlop && (
        <div className="director-ui-element pointer-events-none absolute right-2 top-20 bottom-3 z-[60] flex w-[min(104px,22%)] flex-col gap-1.5">
          {([
            ['reserve', 'Reserva', Archive, 'border-purple-400 bg-purple-950/90 text-purple-200'],
            ['hide', 'Ocultar', EyeOff, 'border-amber-400 bg-amber-950/90 text-amber-200'],
            ['remove', 'Quitar', Trash2, 'border-rose-400 bg-rose-950/90 text-rose-200'],
          ] as const).map(([target, label, Icon, colors]) => (
            <div
              key={target}
              className={`flex flex-1 flex-col items-center justify-center rounded-xl border-2 text-[11px] font-bold shadow-xl transition-transform ${colors} ${
                dragPreview.quickDropTarget === target ? 'scale-105 ring-2 ring-white' : 'opacity-80'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      {quickActionMessage && (
        <div className="director-ui-element absolute bottom-16 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-400/60 bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-2xl pointer-events-auto">
          <span>{quickActionMessage}</span>
          {onUndo && (
            <button
              type="button"
              className="flex items-center gap-1 font-bold text-amber-300 hover:text-amber-200"
              onClick={() => {
                onUndo();
                setQuickActionMessage(null);
              }}
            >
              <RotateCcw size={13} />
              <span>Deshacer</span>
            </button>
          )}
        </div>
      )}

      {/* ── CHARACTER SELECTION BOXES & TOUCH HANDLES ── */}
      {characters.map((char) => {
        if (char.presence === 'in_reserve') return null;

        const isSelected = selectedIds.has(char.id);
        const activeDrag = dragPreview;
        const isDraggingThis = !!activeDrag?.isDragging && activeDrag.initialPositions.has(char.id);
        const isLocked = !!char.isLocked;
        const cursorClass = isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing';

        const initialDragPosition = activeDrag?.initialPositions.get(char.id);
        const dragDeltaX = activeDrag?.hasPassedTouchSlop ? activeDrag.currentX - activeDrag.startX : 0;
        const dragDeltaY = activeDrag?.hasPassedTouchSlop ? activeDrag.currentY - activeDrag.startY : 0;
        const posX = initialDragPosition
          ? initialDragPosition.x + dragDeltaX
          : char.normalizedX ?? 50;
        const logicalPosY = initialDragPosition
          ? initialDragPosition.y + dragDeltaY
          : char.normalizedY ?? 0;
        const posY = logicalPosY + (groundLineY || 0);
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
              {isDraggingThis && activeDrag?.hasPassedTouchSlop && (
                <img
                  src={char.avatarUrl}
                  alt=""
                  className="absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)] object-contain opacity-70 pointer-events-none drop-shadow-xl"
                  draggable={false}
                />
              )}

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

            {isDraggingThis && activeDrag?.hasPassedTouchSlop && activeDrag.anchorId === char.id && (
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-7 pointer-events-none bg-slate-950/95 border border-amber-400 px-2 py-0.5 rounded-md text-[10px] text-amber-200 font-mono whitespace-nowrap shadow-xl">
                X {posX.toFixed(1)}% · Y {logicalPosY.toFixed(1)}%
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
