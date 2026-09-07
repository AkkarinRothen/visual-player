import React from 'react';
import type {
  Campaign,
  Character,
  DisplayState,
  Scene,
  CharacterOnScreen,
  DMFavoriteItem,
} from '../../../types';
import { ModularCardsView } from './ModularCardsView';
import { ContextualCharacterInspector } from './ContextualCharacterInspector';
import { useLiveModularControl } from './live/useLiveModularControl';
import { LiveStageSection } from './live/LiveStageSection';
import { LiveModalsSection } from './live/LiveModalsSection';
import { LiveDrawersSection } from './live/LiveDrawersSection';

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

export const LiveModularControlPanel: React.FC<LiveModularControlPanelProps> = (props) => {
  const {
    campaign,
    liveState,
    isConnected = true,
    onSelectScene,
    onOpenScenePicker,
    onTriggerTransition,
    onOpenCharacterLibrary,
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
    favorites = [],
    onExecuteFavorite,
    onOpenNotes,
    onOpenRevelationJournal,
    onOpenManageFavorites,
    onTriggerSfx,
  } = props;

  const {
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
    handleWeatherChange,
    handleWeatherIntensityChange,
    handleLightingChange,
    handleAudioVolumeChange,
    handleApplyBattleRanks,
    handleSnapAllToGrid,
    handleDistributeHorizontally,
    handleFitScaleToGrid,
  } = useLiveModularControl(props);

  return (
    <div className="modular-control-container" data-testid="modular-control-container">
      {/* 1. PERSISTENT 16:9 STAGE VIEWPORT */}
      <LiveStageSection
        liveState={liveState}
        isConnected={isConnected}
        isTacticalModeActive={isTacticalModeActive}
        setIsTacticalModeActive={setIsTacticalModeActive}
        selectedCharId={selectedCharId}
        setSelectedCharId={setSelectedCharId}
        onMoveCharacter={handleMoveCharacter}
        onOpenFullScreen={onOpenFullScreen}
        onApplyBattleRanks={handleApplyBattleRanks}
        onSnapAllToGrid={handleSnapAllToGrid}
        onDistributeHorizontally={handleDistributeHorizontally}
        onFitScaleToGrid={handleFitScaleToGrid}
      />

      {/* 2. BODY: FLUID TRANSITION BETWEEN MODULAR CARDS & INSPECTOR */}
      {selectedChar ? (
        <ContextualCharacterInspector
          character={selectedChar}
          campaignCharacters={campaign?.characters}
          onClose={() => setSelectedCharId(null)}
          onToggleVisibility={handleToggleCharacterVisibility}
          onScaleChange={handleScaleChange}
          onSetExactScale={handleSetExactScale}
          onUpdateDisplayStyle={(id, style) =>
            props.onUpdateCharacter?.(
              id,
              { displayStyle: style },
              `Formato de figura: ${style === 'auto' ? 'Automático' : style === 'standee' ? 'Standee' : 'Token'}`
            )
          }
          onEditCharacterSheet={handleOpenEditCharacterSheet}
          onLayerChange={handleLayerChange}
          onToggleMirror={handleToggleMirror}
          onOpenQuickDialogue={
            onOpenQuickDialogue ? () => onOpenQuickDialogue(selectedChar.id) : undefined
          }
          onDismissCharacter={
            onDismissCharacter
              ? () => {
                  onDismissCharacter(selectedChar.id);
                  setSelectedCharId(null);
                }
              : undefined
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

      {/* 3. Modal para Crear o Editar Ficha de Personaje / Token y Fondo */}
      <LiveModalsSection
        isCreatingCharacter={isCreatingCharacter}
        charToEditInModal={charToEditInModal}
        onSaveCharacter={handleSaveCharacterFromModal}
        onCloseCharacterModal={() => {
          setIsCreatingCharacter(false);
          setCharToEditInModal(null);
        }}
        isBgPickerOpen={isBgPickerOpen}
        currentBackgroundUrl={liveState.backgroundUrl}
        onSelectBackground={handleBackgroundSelected}
        onCloseBgPicker={() => setIsBgPickerOpen(false)}
      />

      {/* 4. Solapas táctiles y cajones laterales de FX y Recursos */}
      <LiveDrawersSection
        liveState={liveState}
        campaign={campaign}
        isLeftDrawerOpen={isLeftDrawerOpen}
        setIsLeftDrawerOpen={setIsLeftDrawerOpen}
        isRightDrawerOpen={isRightDrawerOpen}
        setIsRightDrawerOpen={setIsRightDrawerOpen}
        onTriggerLightning={handleTriggerLightning}
        onTriggerShake={handleTriggerShake}
        onToggleBlackout={handleToggleBlackout}
        onToggleBanner={handleToggleBanner}
        onTriggerSfx={onTriggerSfx}
        favorites={favorites}
        onExecuteFavorite={onExecuteFavorite}
        onSelectScene={onSelectScene}
        onInvokeCharacter={handleInvokeCharacterFromDrawer}
        onUseResourceAsset={handleUseResourceAssetFromDrawer}
        onOpenNotes={onOpenNotes}
        onOpenRevelationJournal={onOpenRevelationJournal}
        onOpenManageFavorites={onOpenManageFavorites}
      />
    </div>
  );
};
