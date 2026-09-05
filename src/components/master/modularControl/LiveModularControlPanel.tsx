import React, { useState, useMemo } from 'react';
import { Maximize2, Grid } from 'lucide-react';
import type {
  Campaign,
  Character,
  DisplayState,
  Scene,
  CharacterOnScreen,
  WeatherType,
  LightingFilter,
  DMFavoriteItem,
} from '../../../types';
import { StageViewport } from '../../display/StageViewport';
import { StageTouchOverlay } from './StageTouchOverlay';
import { ModularCardsView } from './ModularCardsView';
import { ContextualCharacterInspector } from './ContextualCharacterInspector';
import { CharacterEditModal } from '../modals/CharacterEditModal';
import { AssetPickerModal, type SelectedAssetResult } from '../../common/AssetPickerModal';
import { MobileEdgePullTabs } from './drawers/MobileEdgePullTabs';
import { MobileFxEdgeDrawer } from './drawers/MobileFxEdgeDrawer';
import { MobileResourcesEdgeDrawer } from './drawers/MobileResourcesEdgeDrawer';

export interface LiveModularControlPanelProps {
  campaign: Campaign | null;
  liveState: DisplayState;
  isConnected?: boolean;
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
  onSelectScene?: (scene: Scene) => void;
  onOpenScenePicker?: () => void;
  onTriggerTransition?: () => void;
  onUploadBackground?: () => void;
  onOpenCharacterLibrary?: () => void;
  onCreateCharacter?: () => void;
  onEditCharacterSheet?: (character: Character) => void;
  onSetExactScale?: (id: string, scale: number) => void;
  onOpenQuickDialogue?: (characterId: string) => void;
  onDismissCharacter?: (characterId: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onSavePreset?: () => void;
  onOpenAtmospherePresets?: () => void;
  onOpenSoundtrack?: () => void;
  onToggleAmbientAudio?: () => void;
  onOpenFullScreen?: () => void;
  onNextCombatTurn?: () => void;
  onPrevCombatTurn?: () => void;
  onUpdateCombatantHp?: (combatantId: string, newHp: number) => void;
  onToggleCombatantCondition?: (combatantId: string, condition: string) => void;
  onStartCombat?: () => void;
  onEndCombat?: () => void;
  onFocusCombatant?: (combatantId: string) => void;
  onOpenCombatTab?: () => void;
  combatTimerRemaining?: number;
  isTimerRunning?: boolean;
  onToggleTimer?: () => void;
  // Edge Drawer actions
  onTriggerLightning?: () => void;
  onTriggerShake?: () => void;
  onToggleBlackout?: () => void;
  onToggleBanner?: () => void;
  favorites?: DMFavoriteItem[];
  onExecuteFavorite?: (item: DMFavoriteItem) => Promise<boolean> | boolean;
  onOpenNotes?: () => void;
  onOpenRevelationJournal?: () => void;
  onOpenManageFavorites?: () => void;
  onTriggerSfx?: (preset: string) => void;
}

export const LiveModularControlPanel: React.FC<LiveModularControlPanelProps> = ({
  campaign,
  liveState,
  isConnected = true,
  onUpdateCharacter,
  onUpdateDisplayField,
  onSelectScene,
  onOpenScenePicker,
  onTriggerTransition,
  onUploadBackground,
  onOpenCharacterLibrary,
  onCreateCharacter,
  onEditCharacterSheet,
  onSetExactScale,
  onOpenQuickDialogue,
  onDismissCharacter,
  onUndo,
  canUndo = false,
  onSavePreset,
  onOpenAtmospherePresets,
  onOpenSoundtrack,
  onToggleAmbientAudio,
  onOpenFullScreen,
  onNextCombatTurn,
  onPrevCombatTurn,
  onUpdateCombatantHp,
  onToggleCombatantCondition,
  onStartCombat,
  onEndCombat,
  onFocusCombatant,
  onOpenCombatTab,
  combatTimerRemaining,
  isTimerRunning,
  onToggleTimer,
  onTriggerLightning,
  onTriggerShake,
  onToggleBlackout,
  onToggleBanner,
  favorites = [],
  onExecuteFavorite,
  onOpenNotes,
  onOpenRevelationJournal,
  onOpenManageFavorites,
  onTriggerSfx,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [isTacticalModeActive, setIsTacticalModeActive] = useState(false);
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
    const newScale = Math.max(0.4, Math.min(2.5, Math.round((currentScale + delta) * 10) / 10));
    onUpdateCharacter?.(id, { scale: newScale }, `Escala de ${char.name}: ${Math.round(newScale * 100)}%`);
  };

  const handleSetExactScale = (id: string, scale: number) => {
    if (onSetExactScale) {
      onSetExactScale(id, scale);
      return;
    }
    const char = liveState.characters.find((c) => c.id === id);
    if (!char) return;
    const clampedScale = Math.max(0.4, Math.min(2.5, Math.round(scale * 100) / 100));
    onUpdateCharacter?.(id, { scale: clampedScale }, `Escala de ${char.name}: ${Math.round(clampedScale * 100)}%`);
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

  return (
    <div className="modular-control-container" data-testid="modular-control-container">
      {/* 1. PERSISTENT 16:9 STAGE VIEWPORT */}
      <section className="modular-stage-wrapper" aria-label="Escenario en vivo 16:9">
        {/* Live indicator pill */}
        <div className="modular-stage-live-pill">
          <span className="modular-stage-live-dot" />
          <span>{isConnected ? 'Mesa conectada' : 'Control local'}</span>
        </div>

        {/* Floating actions */}
        <div className="modular-stage-floating-actions">
          <button
            type="button"
            className={`modular-stage-btn ${isTacticalModeActive ? 'active' : ''}`}
            onClick={() => setIsTacticalModeActive((prev) => !prev)}
            title={isTacticalModeActive ? 'Desactivar cuadrícula táctica' : 'Activar cuadrícula táctica'}
            aria-label="Cuadrícula táctica"
            id="stage-tactical-toggle-btn"
            style={{
              backgroundColor: isTacticalModeActive ? 'rgba(56, 189, 248, 0.25)' : undefined,
              borderColor: isTacticalModeActive ? '#38bdf8' : undefined,
              color: isTacticalModeActive ? '#38bdf8' : undefined,
            }}
          >
            <Grid size={18} />
          </button>
          {onOpenFullScreen && (
            <button
              type="button"
              className="modular-stage-btn"
              onClick={onOpenFullScreen}
              title="Pantalla completa"
              aria-label="Maximizar visor"
            >
              <Maximize2 size={18} />
            </button>
          )}
        </div>

        {/* The 16:9 Stage Viewport */}
        <StageViewport state={liveState} />

        {/* Interactive Direct Touch Overlay */}
        <StageTouchOverlay
          characters={liveState.characters}
          selectedCharId={selectedCharId}
          onSelectCharacter={(id) => setSelectedCharId(id)}
          onMoveCharacter={handleMoveCharacter}
          isTacticalMode={isTacticalModeActive}
          gridConfig={liveState.tacticalGrid}
        />
      </section>

      {/* 2. BODY: FLUID TRANSITION BETWEEN MODULAR CARDS (PROP 4) & INSPECTOR (PROP 1) */}
      {selectedChar ? (
        <ContextualCharacterInspector
          character={selectedChar}
          campaignCharacters={campaign?.characters}
          onClose={() => setSelectedCharId(null)}
          onToggleVisibility={handleToggleCharacterVisibility}
          onScaleChange={handleScaleChange}
          onSetExactScale={handleSetExactScale}
          onEditCharacterSheet={(char) => handleOpenEditCharacterSheet(char)}
          onLayerChange={handleLayerChange}
          onToggleMirror={handleToggleMirror}
          onOpenQuickDialogue={
            onOpenQuickDialogue ? () => onOpenQuickDialogue(selectedChar.id) : undefined
          }
          onDismissCharacter={
            onDismissCharacter ? () => {
              onDismissCharacter(selectedChar.id);
              setSelectedCharId(null);
            } : undefined
          }
        />
      ) : (
        <ModularCardsView
          currentScene={currentScene}
          sceneName={liveState.sceneName}
          backgroundUrl={liveState.backgroundUrl}
          onOpenScenePicker={onOpenScenePicker}
          onTriggerTransition={onTriggerTransition}
          onUploadBackground={handleOpenUploadBackground}
          characters={liveState.characters}
          campaignCharacters={campaign?.characters}
          selectedCharId={selectedCharId}
          onSelectCharacter={(id) => setSelectedCharId(id)}
          onToggleCharacterVisibility={handleToggleCharacterVisibility}
          onOpenCharacterLibrary={onOpenCharacterLibrary}
          onCreateCharacter={handleOpenCreateCharacter}
          combatState={liveState.combatState}
          onNextCombatTurn={onNextCombatTurn}
          onPrevCombatTurn={onPrevCombatTurn}
          onUpdateCombatantHp={onUpdateCombatantHp}
          onToggleCombatantCondition={onToggleCombatantCondition}
          onStartCombat={onStartCombat}
          onEndCombat={onEndCombat}
          onFocusCombatant={onFocusCombatant}
          onOpenCombatTab={onOpenCombatTab}
          combatTimerRemaining={combatTimerRemaining}
          isTimerRunning={isTimerRunning}
          onToggleTimer={onToggleTimer}
          weather={liveState.weather}
          weatherIntensity={liveState.weatherIntensity}
          lighting={liveState.lighting}
          onWeatherChange={handleWeatherChange}
          onWeatherIntensityChange={handleWeatherIntensityChange}
          onLightingChange={handleLightingChange}
          onOpenAtmospherePresets={onOpenAtmospherePresets}
          audioTrackTitle={currentScene?.ambientAudioName || 'Pista ambiental'}
          isAudioPlaying={liveState.ambientPlaying}
          audioVolume={liveState.ambientVolume}
          onToggleAudioPlay={onToggleAmbientAudio || (() => {})}
          onAudioVolumeChange={handleAudioVolumeChange}
          onOpenSoundtrack={onOpenSoundtrack}
          onUndo={onUndo}
          canUndo={canUndo}
          onSavePreset={onSavePreset}
        />
      )}

      {/* 3. Modal para Crear o Editar Ficha de Personaje / Token */}
      {(isCreatingCharacter || !!charToEditInModal) && (
        <CharacterEditModal
          isOpen={isCreatingCharacter || !!charToEditInModal}
          charToEdit={charToEditInModal}
          onSave={handleSaveCharacterFromModal}
          onClose={() => {
            setIsCreatingCharacter(false);
            setCharToEditInModal(null);
          }}
        />
      )}

      {/* 4. Modal para Subir o Seleccionar Fondo de Escenario */}
      {isBgPickerOpen && (
        <AssetPickerModal
          isOpen={isBgPickerOpen}
          mode="background"
          currentUrl={liveState.backgroundUrl}
          title="Subir o cambiar fondo de escenario"
          onSelectAsset={handleBackgroundSelected}
          onClose={() => setIsBgPickerOpen(false)}
        />
      )}

      {/* 5. Solapas táctiles en los bordes para el pulgar (Edge Pull Tabs) */}
      <MobileEdgePullTabs
        isLeftOpen={isLeftDrawerOpen}
        isRightOpen={isRightDrawerOpen}
        onToggleLeft={() => {
          setIsRightDrawerOpen(false);
          setIsLeftDrawerOpen((prev) => !prev);
        }}
        onToggleRight={() => {
          setIsLeftDrawerOpen(false);
          setIsRightDrawerOpen((prev) => !prev);
        }}
        hasActiveFxAlert={Boolean(liveState.isBlackout || liveState.lightningTrigger > 0)}
      />

      {/* 6. Drawer Lateral Izquierdo: Efectos en Vivo & Cinemáticos */}
      <MobileFxEdgeDrawer
        isOpen={isLeftDrawerOpen}
        onClose={() => setIsLeftDrawerOpen(false)}
        onTriggerLightning={handleTriggerLightning}
        onTriggerShake={handleTriggerShake}
        onToggleBlackout={handleToggleBlackout}
        isBlackout={liveState.isBlackout}
        onToggleBanner={handleToggleBanner}
        isBannerVisible={Boolean(liveState.locationBanner?.visible)}
        onTriggerSfx={onTriggerSfx}
      />

      {/* 7. Drawer Lateral Derecho: Recursos & Gestión de Mesa */}
      <MobileResourcesEdgeDrawer
        isOpen={isRightDrawerOpen}
        onClose={() => setIsRightDrawerOpen(false)}
        campaign={campaign}
        favorites={favorites}
        onExecuteFavorite={onExecuteFavorite}
        onSelectScene={onSelectScene}
        onInvokeCharacter={handleInvokeCharacterFromDrawer}
        onOpenNotes={onOpenNotes}
        onOpenRevelationJournal={onOpenRevelationJournal}
        onOpenManageFavorites={onOpenManageFavorites}
        activeSceneId={liveState.currentSceneId || undefined}
      />
    </div>
  );
};
