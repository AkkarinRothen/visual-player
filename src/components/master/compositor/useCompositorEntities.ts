import { useState, useRef, useCallback } from 'react';
import type {
  Character,
  CharacterOnScreen,
  DisplayState,
  SceneProp,
  TacticalTeam,
} from '../../../types';
import type { SelectedEntity } from './compositorTypes';
import { getSlotPositionPercent } from './compositorTypes';

export function useCompositorEntities(initialState: DisplayState) {
  const [characters, setCharacters] = useState<CharacterOnScreen[]>(() =>
    initialState.characters.map((c, i) => ({
      ...c,
      normalizedX:
        c.normalizedX !== undefined ? c.normalizedX : getSlotPositionPercent(c.position),
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

  const [history, setHistory] = useState<
    { characters: CharacterOnScreen[]; props: SceneProp[] }[]
  >([]);

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

  const handleAddCharacter = useCallback(
    (character: Character) => {
      const nextCharacter: CharacterOnScreen = {
        id: `compositor-${character.id}-${Date.now()}`,
        characterId: character.id,
        name: character.name,
        avatarUrl: character.defaultAvatarUrl,
        position: 'center-left',
        normalizedX: 50,
        normalizedY: 0,
        scale: 1,
        zIndex: characters.length + propsList.length + 1,
        isFlipped: false,
        isLocked: false,
        isSpeaking: false,
      };
      pushHistory();
      setCharacters((prev) => [...prev, nextCharacter]);
      setSelectedEntity({ type: 'character', id: nextCharacter.id });
    },
    [characters.length, propsList.length, pushHistory]
  );

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
        prev.map((c) =>
          c.id === selectedEntity.id ? { ...c, normalizedX: nextX, normalizedY: nextY } : c
        )
      );
    } else {
      setPropsList((prev) =>
        prev.map((p) =>
          p.id === selectedEntity.id ? { ...p, normalizedX: nextX, normalizedY: nextY } : p
        )
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
      prev.map((p) =>
        p.id === selectedEntity.id ? { ...p, visible: p.visible === false } : p
      )
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

  const setTacticalTeam = (team: TacticalTeam) => {
    if (!selectedEntity || selectedEntity.type !== 'character') return;
    pushHistory();
    setCharacters((current) =>
      current.map((char) =>
        char.id === selectedEntity.id ? { ...char, tacticalTeam: team } : char
      )
    );
  };

  const selectedChar =
    selectedEntity?.type === 'character'
      ? characters.find((c) => c.id === selectedEntity.id) || null
      : null;

  const selectedProp =
    selectedEntity?.type === 'prop'
      ? propsList.find((p) => p.id === selectedEntity.id) || null
      : null;

  return {
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
  };
}
