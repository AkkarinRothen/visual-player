import { useState, useMemo, useEffect } from 'react';
import type {
  Campaign,
  Character,
  DisplayState,
  CharacterOnScreen,
  WeatherType,
  LightingFilter,
} from '../../../../types';
import type { SelectedAssetResult } from '../../../common/AssetPickerModal';
import type { StoredAsset } from '../../../../db';
import {
  alignBattleRanks,
  snapCharactersToGrid,
  distributeHorizontally,
} from '../../../../domain/display/tacticalFormations';
import { DEFAULT_TACTICAL_GRID } from '../../../../domain/display/sceneLayoutTemplates';
import { sessionCommandBus } from '../../../../services/sessionCommandBus';

interface UseLiveModularControlProps {
  campaign: Campaign | null;
  liveState: DisplayState;
  onUpdateCharacter?: (
    id: string,
    updates: Partial<CharacterOnScreen>,
    description: string
  ) => void;
  onUpdateDisplayField?: <K extends keyof DisplayState>(
    field: K,
    value: DisplayState[K],
    description: string
  ) => void;
  onUploadBackground?: () => void;
  onCreateCharacter?: () => void;
  onEditCharacterSheet?: (character: Character) => void;
  onSetExactScale?: (id: string, scale: number) => void;
  onTriggerLightning?: () => void;
  onTriggerShake?: () => void;
  onToggleBlackout?: () => void;
  onToggleBanner?: () => void;
}

export function useLiveModularControl({
  campaign,
  liveState,
  onUpdateCharacter,
  onUpdateDisplayField,
  onUploadBackground,
  onCreateCharacter,
  onEditCharacterSheet,
  onSetExactScale,
  onTriggerLightning,
  onTriggerShake,
  onToggleBlackout,
  onToggleBanner,
}: UseLiveModularControlProps) {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [isTacticalModeActive, setIsTacticalModeActiveState] = useState(
    () => !!liveState.tacticalGrid?.enabled
  );

  useEffect(() => {
    if (liveState.tacticalGrid?.enabled !== undefined) {
      setIsTacticalModeActiveState(liveState.tacticalGrid.enabled);
    }
  }, [liveState.tacticalGrid?.enabled]);

  const setIsTacticalModeActive: React.Dispatch<React.SetStateAction<boolean>> = (value) => {
    setIsTacticalModeActiveState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      const currentGrid = liveState.tacticalGrid || DEFAULT_TACTICAL_GRID;
      onUpdateDisplayField?.(
        'tacticalGrid',
        { ...currentGrid, enabled: next },
        next ? 'Activar cuadrícula táctica' : 'Desactivar cuadrícula táctica'
      );
      return next;
    });
  };
  const [isCreatingCharacter, setIsCreatingCharacter] = useState(false);
  const [charToEditInModal, setCharToEditInModal] = useState<Character | null>(null);
  const [isBgPickerOpen, setIsBgPickerOpen] = useState(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  // Find active scene object if available in campaign
  const currentScene = useMemo(() => {
    if (!campaign || !liveState.currentSceneId) return null;
    return campaign.scenes.find((s) => s.id === liveState.currentSceneId) || null;
  }, [campaign, liveState.currentSceneId]);

  // Find selected character on screen
  const selectedChar = useMemo(() => {
    if (!selectedCharId) return null;
    return liveState.characters.find((c) => c.id === selectedCharId) || null;
  }, [selectedCharId, liveState.characters]);

  // Handlers for FX Actions in drawer
  const handleTriggerLightning = () => {
    if (onTriggerLightning) {
      onTriggerLightning();
    } else {
      onUpdateDisplayField?.('lightningTrigger', Date.now(), 'Relámpago en vivo');
    }
  };

  const handleTriggerShake = () => {
    if (onTriggerShake) {
      onTriggerShake();
    } else {
      onUpdateDisplayField?.('shakeTrigger', Date.now(), 'Sacudir escenario');
    }
  };

  const handleToggleBlackout = () => {
    if (onToggleBlackout) {
      onToggleBlackout();
    } else {
      const nextBlackout = !liveState.isBlackout;
      onUpdateDisplayField?.('isBlackout', nextBlackout, `Apagón de mesa: ${nextBlackout ? 'Activo' : 'Inactivo'}`);
    }
  };

  const handleToggleBanner = () => {
    if (onToggleBanner) {
      onToggleBanner();
    } else {
      const nextVisible = !liveState.locationBanner?.visible;
      onUpdateDisplayField?.(
        'locationBanner',
        {
          text: liveState.locationBanner?.text || liveState.sceneName || 'Ubicación',
          visible: nextVisible,
        },
        `Cartel de ubicación: ${nextVisible ? 'Visible' : 'Oculto'}`
      );
    }
  };

  const handleInvokeCharacterFromDrawer = (char: Character) => {
    const existing = liveState.characters.find((c) => c.id === char.id || c.characterId === char.id);
    if (existing) {
      onUpdateCharacter?.(existing.id, { isHidden: false }, `Hacer visible a ${char.name}`);
      setSelectedCharId(existing.id);
    } else {
      const onScreenChar: CharacterOnScreen = {
        id: char.id,
        characterId: char.id,
        name: char.name,
        avatarUrl: char.defaultAvatarUrl,
        position: 'center-right',
        scale: 1.0,
        zIndex: (liveState.characters.length + 1) * 2,
        normalizedX: 50,
        normalizedY: 15,
        isHidden: false,
        isSpeaking: false,
      };
      onUpdateDisplayField?.(
        'characters',
        [...liveState.characters, onScreenChar],
        `Invocado ${char.name} a la mesa`
      );
      setSelectedCharId(char.id);
    }
  };

  // Handlers for instant character updates
  const handleToggleCharacterVisibility = (id: string, currentlyHidden: boolean) => {
    const nextHidden = !currentlyHidden;
    onUpdateCharacter?.(
      id,
      { isHidden: nextHidden },
      `Visibilidad de figura: ${nextHidden ? 'Oculto' : 'Visible en mesa'}`
    );
  };

  const handleScaleChange = (id: string, delta: number) => {
    const char = liveState.characters.find((c) => c.id === id);
    if (!char) return;
    const currentScale = char.scale || 1.0;
    const newScale = Math.max(0.15, Math.min(2.5, Math.round((currentScale + delta) * 10) / 10));
    onUpdateCharacter?.(id, { scale: newScale }, `Escala de ${char.name}: ${Math.round(newScale * 100)}%`);
  };

  const handleSetExactScale = (id: string, scale: number) => {
    if (onSetExactScale) {
      onSetExactScale(id, scale);
      return;
    }
    const char = liveState.characters.find((c) => c.id === id);
    if (!char) return;
    const clampedScale = Math.max(0.15, Math.min(2.5, Math.round(scale * 100) / 100));
    onUpdateCharacter?.(id, { scale: clampedScale }, `Escala de ${char.name}: ${Math.round(clampedScale * 100)}%`);
  };

  const handleApplyBattleRanks = () => {
    if (!liveState.characters || liveState.characters.length === 0) return;
    const formatted = alignBattleRanks(
      liveState.characters,
      liveState.tacticalGrid?.columns || 12
    );
    if (onUpdateDisplayField) {
      onUpdateDisplayField('characters', formatted, 'Formación: Fila de batalla JRPG');
    } else if (onUpdateCharacter) {
      formatted.forEach((c) => {
        onUpdateCharacter(
          c.id,
          {
            normalizedX: c.normalizedX,
            normalizedY: c.normalizedY,
            scale: c.scale,
            isFlipped: c.isFlipped,
          },
          'Formación: Fila de batalla'
        );
      });
    }
  };

  const handleSnapAllToGrid = () => {
    if (!liveState.characters || liveState.characters.length === 0) return;
    const cols = liveState.tacticalGrid?.columns || 10;
    const snapped = snapCharactersToGrid(liveState.characters, cols, false);
    if (onUpdateDisplayField) {
      onUpdateDisplayField('characters', snapped, 'Alinear a cuadrícula');
    } else if (onUpdateCharacter) {
      snapped.forEach((c) => {
        onUpdateCharacter(
          c.id,
          { normalizedX: c.normalizedX, normalizedY: c.normalizedY },
          'Alinear a cuadrícula'
        );
      });
    }
  };

  const handleDistributeHorizontally = () => {
    if (!liveState.characters || liveState.characters.length === 0) return;
    const distributed = distributeHorizontally(
      liveState.characters,
      liveState.groundLineY || 10
    );
    if (onUpdateDisplayField) {
      onUpdateDisplayField('characters', distributed, 'Distribuir en línea');
    } else if (onUpdateCharacter) {
      distributed.forEach((c) => {
        onUpdateCharacter(
          c.id,
          {
            normalizedX: c.normalizedX,
            normalizedY: c.normalizedY,
            scale: c.scale,
          },
          'Distribuir en línea'
        );
      });
    }
  };

  const handleFitScaleToGrid = () => {
    if (!liveState.characters || liveState.characters.length === 0) return;
    const cols = liveState.tacticalGrid?.columns || 10;
    const scaled = snapCharactersToGrid(liveState.characters, cols, true);
    if (onUpdateDisplayField) {
      onUpdateDisplayField('characters', scaled, 'Ajustar tamaño a casilla');
    } else if (onUpdateCharacter) {
      scaled.forEach((c) => {
        onUpdateCharacter(
          c.id,
          {
            normalizedX: c.normalizedX,
            normalizedY: c.normalizedY,
            scale: c.scale,
          },
          'Ajustar tamaño a casilla'
        );
      });
    }
  };

  const handleOpenCreateCharacter = () => {
    if (onCreateCharacter) {
      onCreateCharacter();
    } else {
      setIsCreatingCharacter(true);
    }
  };

  const handleOpenUploadBackground = () => {
    if (onUploadBackground) {
      onUploadBackground();
    } else {
      setIsBgPickerOpen(true);
    }
  };

  const handleOpenEditCharacterSheet = (charIdOrChar: string | Character) => {
    let targetChar: Character;
    if (typeof charIdOrChar === 'string') {
      const found = campaign?.characters.find((c) => c.id === charIdOrChar);
      targetChar = found || {
        id: charIdOrChar,
        name: selectedChar?.name || 'Personaje',
        roleOrTitle: '',
        defaultAvatarUrl: selectedChar?.avatarUrl || '',
      };
    } else {
      targetChar = charIdOrChar;
    }
    if (onEditCharacterSheet) {
      onEditCharacterSheet(targetChar);
    } else {
      setCharToEditInModal(targetChar);
    }
  };

  const handleSaveCharacterFromModal = (charData: Partial<Character>) => {
    if (charToEditInModal) {
      onUpdateCharacter?.(
        charToEditInModal.id,
        {
          name: charData.name,
          avatarUrl: charData.defaultAvatarUrl,
        },
        `Ficha de ${charData.name || 'personaje'} actualizada`
      );
      setCharToEditInModal(null);
    } else {
      const newId = `char_${Date.now()}`;
      const newName = charData.name?.trim() || 'Nuevo Personaje';
      const newAvatar = charData.defaultAvatarUrl || '';
      const onScreenChar: CharacterOnScreen = {
        id: newId,
        name: newName,
        avatarUrl: newAvatar,
        position: 'center-right',
        scale: 1.0,
        zIndex: (liveState.characters.length + 1) * 2,
        normalizedX: 0.5,
        normalizedY: 0.5,
        isHidden: false,
        isSpeaking: false,
      };
      onUpdateDisplayField?.(
        'characters',
        [...liveState.characters, onScreenChar],
        `Añadido ${newName} al escenario`
      );
      setSelectedCharId(newId);
      setIsCreatingCharacter(false);
    }
  };

  const handleBackgroundSelected = (asset: SelectedAssetResult) => {
    onUpdateDisplayField?.('backgroundUrl', asset.url, `Fondo actualizado: ${asset.name}`);
    setIsBgPickerOpen(false);
  };

  const handleUseResourceAssetFromDrawer = (asset: StoredAsset) => {
    const category = asset.category || 'asset';

    if (category === 'background') {
      onUpdateDisplayField?.('backgroundUrl', asset.dataUrl, `Fondo desde pack: ${asset.name}`);
      return;
    }

    if (category === 'character' || category === 'token') {
      const newId = `${category}_${Date.now()}`;
      const onScreenChar: CharacterOnScreen = {
        id: newId,
        characterId: asset.id,
        name: asset.name,
        avatarUrl: asset.dataUrl,
        position: 'center-right',
        scale: category === 'token' ? 0.8 : 1.0,
        zIndex: (liveState.characters.length + 1) * 2,
        normalizedX: 50,
        normalizedY: 15,
        isHidden: false,
        isSpeaking: false,
      };
      onUpdateDisplayField?.(
        'characters',
        [...liveState.characters, onScreenChar],
        `Recurso invocado desde pack: ${asset.name}`
      );
      setSelectedCharId(newId);
      return;
    }

    const nextProp = {
      id: `prop_${Date.now()}`,
      assetId: asset.id,
      name: asset.name,
      assetUrl: asset.dataUrl,
      normalizedX: 50,
      normalizedY: 50,
      scale: 1,
      zIndex: 30,
      anchor: 'center' as const,
      visible: true,
    };

    onUpdateDisplayField?.(
      'props',
      [...(liveState.props || []), nextProp],
      `Asset colocado desde pack: ${asset.name}`
    );
  };

  const handleLayerChange = (id: string, direction: 'up' | 'down') => {
    const char = liveState.characters.find((c) => c.id === id);
    if (!char) return;
    const currentZ = char.zIndex || 1;
    const newZ = direction === 'up' ? Math.min(50, currentZ + 1) : Math.max(1, currentZ - 1);
    onUpdateCharacter?.(id, { zIndex: newZ }, `Capa de ${char.name}: ${newZ}`);
  };

  const handleToggleMirror = (id: string) => {
    const char = liveState.characters.find((c) => c.id === id);
    if (!char) return;
    const nextFlipped = !char.isFlipped;
    onUpdateCharacter?.(id, { isFlipped: nextFlipped }, `Reflejo de ${char.name}: ${nextFlipped ? 'Espejo' : 'Normal'}`);
  };

  const handleMoveCharacter = (id: string, normalizedX: number, normalizedY: number) => {
    onUpdateCharacter?.(
      id,
      { normalizedX, normalizedY },
      `Posición en vivo de figura`
    );
  };

  const handleStreamMoveCharacter = (id: string, normalizedX: number, normalizedY: number) => {
    sessionCommandBus.dispatchStreamCharacterTransform(id, normalizedX, normalizedY);
  };

  const handleStreamScaleCharacter = (id: string, scale: number) => {
    sessionCommandBus.dispatchStreamCharacterTransform(id, undefined, undefined, scale);
  };

  const handleCameraChange = (camera: { focalPoint: { x: number; y: number }; zoom: number }) => {
    onUpdateDisplayField?.('camera', camera, `Zoom de cámara: ${camera.zoom.toFixed(1)}x`);
  };

  const handleStreamCameraChange = (camera: { focalPoint: { x: number; y: number }; zoom: number }) => {
    sessionCommandBus.dispatchStreamControl('camera', camera);
  };

  // Handlers for instant atmosphere & audio
  const handleWeatherChange = (weather: WeatherType) => {
    onUpdateDisplayField?.('weather', weather, `Clima en vivo: ${weather}`);
  };

  const handleWeatherIntensityChange = (intensity: number) => {
    onUpdateDisplayField?.('weatherIntensity', intensity, `Intensidad del clima: ${Math.round(intensity * 100)}%`);
  };

  const handleLightingChange = (filter: LightingFilter) => {
    onUpdateDisplayField?.('lighting', filter, `Tono de iluminación: ${filter}`);
  };

  const handleAudioVolumeChange = (vol: number) => {
    onUpdateDisplayField?.('ambientVolume', vol, `Volumen ambiental: ${Math.round(vol * 100)}%`);
  };

  return {
    selectedCharId,
    setSelectedCharId,
    isTacticalModeActive,
    setIsTacticalModeActive,
    isCreatingCharacter,
    setIsCreatingCharacter,
    charToEditInModal,
    setCharToEditInModal,
    isBgPickerOpen,
    setIsBgPickerOpen,
    isLeftDrawerOpen,
    setIsLeftDrawerOpen,
    isRightDrawerOpen,
    setIsRightDrawerOpen,
    currentScene,
    selectedChar,
    handleTriggerLightning,
    handleTriggerShake,
    handleToggleBlackout,
    handleToggleBanner,
    handleInvokeCharacterFromDrawer,
    handleToggleCharacterVisibility,
    handleScaleChange,
    handleSetExactScale,
    handleOpenCreateCharacter,
    handleOpenUploadBackground,
    handleOpenEditCharacterSheet,
    handleSaveCharacterFromModal,
    handleBackgroundSelected,
    handleUseResourceAssetFromDrawer,
    handleLayerChange,
    handleToggleMirror,
    handleMoveCharacter,
    handleStreamMoveCharacter,
    handleStreamScaleCharacter,
    handleCameraChange,
    handleStreamCameraChange,
    handleWeatherChange,
    handleWeatherIntensityChange,
    handleLightingChange,
    handleAudioVolumeChange,
    handleApplyBattleRanks,
    handleSnapAllToGrid,
    handleDistributeHorizontally,
    handleFitScaleToGrid,
  };
}
