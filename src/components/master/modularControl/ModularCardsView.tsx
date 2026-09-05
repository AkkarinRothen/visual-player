import React from 'react';
import { Undo, Bookmark, ShieldCheck } from 'lucide-react';
import type {
  Scene,
  Character,
  CharacterOnScreen,
  WeatherType,
  LightingFilter,
  CombatState,
} from '../../../types';
import { ModularSceneCard } from './ModularSceneCard';
import { ModularCharactersCard } from './ModularCharactersCard';
import { ModularCombatCard } from './ModularCombatCard';
import { ModularAtmosphereCard } from './ModularAtmosphereCard';
import { ModularAudioCard } from './ModularAudioCard';

export interface ModularCardsViewProps {
  currentScene?: Scene | null;
  sceneName: string;
  backgroundUrl: string;
  onOpenScenePicker?: () => void;
  onTriggerTransition?: () => void;
  onUploadBackground?: () => void;

  characters: CharacterOnScreen[];
  campaignCharacters?: Character[];
  selectedCharId: string | null;
  onSelectCharacter: (id: string) => void;
  onToggleCharacterVisibility: (id: string, currentlyHidden: boolean) => void;
  onOpenCharacterLibrary?: () => void;
  onCreateCharacter?: () => void;

  combatState?: CombatState;
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

  weather: WeatherType;
  weatherIntensity: number;
  lighting: LightingFilter;
  onWeatherChange: (weather: WeatherType) => void;
  onWeatherIntensityChange: (intensity: number) => void;
  onLightingChange: (filter: LightingFilter) => void;
  onOpenAtmospherePresets?: () => void;

  audioTrackTitle?: string;
  isAudioPlaying: boolean;
  audioVolume: number;
  onToggleAudioPlay: () => void;
  onAudioVolumeChange: (volume: number) => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
  onOpenSoundtrack?: () => void;

  onUndo?: () => void;
  canUndo?: boolean;
  onSavePreset?: () => void;
}

export const ModularCardsView: React.FC<ModularCardsViewProps> = ({
  currentScene,
  sceneName,
  backgroundUrl,
  onOpenScenePicker,
  onTriggerTransition,
  onUploadBackground,
  characters,
  campaignCharacters,
  selectedCharId,
  onSelectCharacter,
  onToggleCharacterVisibility,
  onOpenCharacterLibrary,
  onCreateCharacter,
  combatState,
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
  weather,
  weatherIntensity,
  lighting,
  onWeatherChange,
  onWeatherIntensityChange,
  onLightingChange,
  onOpenAtmospherePresets,
  audioTrackTitle,
  isAudioPlaying,
  audioVolume,
  onToggleAudioPlay,
  onAudioVolumeChange,
  onNextTrack,
  onPrevTrack,
  onOpenSoundtrack,
  onUndo,
  canUndo = false,
  onSavePreset,
}) => {
  return (
    <div className="modular-control-scroll-area">
      {/* 1. Escena actual */}
      <ModularSceneCard
        currentScene={currentScene}
        sceneName={sceneName}
        backgroundUrl={backgroundUrl}
        onOpenScenePicker={onOpenScenePicker}
        onTriggerTransition={onTriggerTransition}
        onUploadBackground={onUploadBackground}
      />

      {/* 2. Personajes en mesa */}
      <ModularCharactersCard
        characters={characters}
        campaignCharacters={campaignCharacters}
        selectedCharId={selectedCharId}
        onSelectCharacter={onSelectCharacter}
        onToggleCharacterVisibility={onToggleCharacterVisibility}
        onOpenCharacterLibrary={onOpenCharacterLibrary}
        onCreateCharacter={onCreateCharacter}
      />

      {/* 3. Combate táctico */}
      {combatState && (
        <ModularCombatCard
          combatState={combatState}
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
        />
      )}

      {/* 4. Ambiente */}
      <ModularAtmosphereCard
        weather={weather}
        weatherIntensity={weatherIntensity}
        lighting={lighting}
        onWeatherChange={onWeatherChange}
        onWeatherIntensityChange={onWeatherIntensityChange}
        onLightingChange={onLightingChange}
        onOpenAtmospherePresets={onOpenAtmospherePresets}
      />

      {/* 5. Audio */}
      <ModularAudioCard
        trackTitle={audioTrackTitle}
        isPlaying={isAudioPlaying}
        volume={audioVolume}
        onTogglePlay={onToggleAudioPlay}
        onVolumeChange={onAudioVolumeChange}
        onNextTrack={onNextTrack}
        onPrevTrack={onPrevTrack}
        onOpenSoundtrack={onOpenSoundtrack}
      />

      {/* 5. Footer Actions: Deshacer & Guardar Preset */}
      <div className="modular-footer-actions">
        {onUndo && (
          <button
            type="button"
            className="modular-footer-btn undo"
            onClick={onUndo}
            disabled={!canUndo}
            title="Deshacer el último cambio"
          >
            <Undo size={16} />
            <span>Deshacer</span>
          </button>
        )}

        {onSavePreset && (
          <button
            type="button"
            className="modular-footer-btn save-preset"
            onClick={onSavePreset}
            title="Guardar estado como preset de escena"
          >
            <Bookmark size={16} />
            <span>Guardar preset</span>
          </button>
        )}
      </div>

      {/* 6. Live Status legend */}
      <div className="modular-status-badge">
        <ShieldCheck size={14} style={{ color: '#34d399' }} />
        <span>Todos los cambios se aplican <strong>al instante</strong>. No se publica nada.</span>
      </div>
    </div>
  );
};
