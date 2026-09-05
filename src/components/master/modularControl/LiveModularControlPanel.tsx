import React, { useState, useMemo } from 'react';
import { Maximize2 } from 'lucide-react';
import type {
  Campaign,
  DisplayState,
  Scene,
  CharacterOnScreen,
  WeatherType,
  LightingFilter,
} from '../../../types';
import { StageViewport } from '../../display/StageViewport';
import { StageTouchOverlay } from './StageTouchOverlay';
import { ModularCardsView } from './ModularCardsView';
import { ContextualCharacterInspector } from './ContextualCharacterInspector';

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
  onOpenCharacterLibrary?: () => void;
  onOpenQuickDialogue?: (characterId: string) => void;
  onDismissCharacter?: (characterId: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onSavePreset?: () => void;
  onOpenAtmospherePresets?: () => void;
  onOpenSoundtrack?: () => void;
  onToggleAmbientAudio?: () => void;
  onOpenFullScreen?: () => void;
}

export const LiveModularControlPanel: React.FC<LiveModularControlPanelProps> = ({
  campaign,
  liveState,
  isConnected = true,
  onUpdateCharacter,
  onUpdateDisplayField,
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
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

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
    const newScale = Math.max(0.4, Math.min(2.2, Math.round((currentScale + delta) * 10) / 10));
    onUpdateCharacter?.(id, { scale: newScale }, `Escala de ${char.name}: ${Math.round(newScale * 100)}%`);
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
          characters={liveState.characters}
          campaignCharacters={campaign?.characters}
          selectedCharId={selectedCharId}
          onSelectCharacter={(id) => setSelectedCharId(id)}
          onToggleCharacterVisibility={handleToggleCharacterVisibility}
          onOpenCharacterLibrary={onOpenCharacterLibrary}
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
    </div>
  );
};
