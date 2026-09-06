import React from 'react';
import type {
  Campaign,
  DisplayState,
  Scene,
  SceneVariant,
  CameraTransform,
  SceneLight,
  SceneZoneEmitter,
  SceneInteraction,
  SceneInteractionTransition,
  DuckingPreset,
  LightningConfig,
  SceneSituation,
} from '../../../types';
import { SceneInteractionsToolbar } from './SceneInteractionsToolbar';
import { ActiveSceneHeaderPreview } from './activeScene/ActiveSceneHeaderPreview';
import { ActiveSceneMetaChips } from './activeScene/ActiveSceneMetaChips';
import { ActiveSceneQuickActions } from './activeScene/ActiveSceneQuickActions';
import { ActiveSceneCameraLightsBar } from './activeScene/ActiveSceneCameraLightsBar';
import { ActiveSceneVariantsAndRevelations } from './activeScene/ActiveSceneVariantsAndRevelations';

export interface ActiveSceneCardProps {
  liveState: DisplayState;
  activeScene: Scene | null;
  campaign: Campaign | null;
  onToggleBanner: () => void;
  onTriggerLightning: () => void;
  onTriggerShake: () => void;
  onToggleAmbientAudio: () => void;
  onToggleAutoStorm?: () => void;
  lightningConfig?: LightningConfig;
  onToggleDisableFlash?: () => void;
  onToggleDmSpeakingDucked?: () => void;
  onSelectDuckingPreset?: (preset: DuckingPreset) => void;
  onOpenCompositor?: () => void;
  onOpenSoundboard?: () => void;
  onSetCameraTransform?: (transform: CameraTransform) => void;
  onResetCamera?: () => void;
  onUpdateSceneLights?: (lights: SceneLight[]) => void;
  onUpdateZoneEmitters?: (emitters: SceneZoneEmitter[]) => void;
  onSelectSceneVariant?: (variant: SceneVariant) => void;
  onRevealCharacterAppearance?: (characterId: string) => void;
  onRevealCharacterIdentity?: (characterId: string) => void;
  onTriggerInteraction?: (
    interaction: SceneInteraction,
    transition: SceneInteractionTransition
  ) => Promise<void> | void;
  executingInteractionId?: string | null;
  onOpenLightingPresets?: () => void;
  onOpenRevelationJournal?: () => void;
  onOpenCampaignRecap?: () => void;
  onOpenSessionPrepWizard?: () => void;
  onOpenHandoutViewer?: () => void;
  onOpenBiomeSoundtrack?: () => void;
  onOpenChronicleExport?: () => void;
  onSelectSituation?: (situation: SceneSituation) => void;
}

export const ActiveSceneCard: React.FC<ActiveSceneCardProps> = ({
  liveState,
  activeScene,
  campaign,
  onToggleBanner,
  onTriggerLightning,
  onTriggerShake,
  onToggleAmbientAudio,
  onToggleAutoStorm,
  lightningConfig,
  onToggleDisableFlash,
  onToggleDmSpeakingDucked,
  onSelectDuckingPreset,
  onOpenCompositor,
  onOpenSoundboard,
  onSetCameraTransform,
  onResetCamera,
  onUpdateSceneLights,
  onUpdateZoneEmitters,
  onSelectSceneVariant,
  onRevealCharacterAppearance,
  onRevealCharacterIdentity,
  onTriggerInteraction,
  executingInteractionId,
  onOpenLightingPresets,
  onOpenRevelationJournal,
  onOpenCampaignRecap,
  onOpenSessionPrepWizard,
  onOpenHandoutViewer,
  onOpenBiomeSoundtrack,
  onOpenChronicleExport,
  onSelectSituation,
}) => {
  return (
    <section className="session-card active-scene-card">
      <ActiveSceneHeaderPreview
        isBlackout={liveState.isBlackout}
        backgroundUrl={liveState.backgroundUrl}
        sceneName={liveState.sceneName}
        locationBanner={liveState.locationBanner}
      />

      <ActiveSceneMetaChips
        liveState={liveState}
        campaign={campaign}
        onOpenLightingPresets={onOpenLightingPresets}
        onOpenRevelationJournal={onOpenRevelationJournal}
        onOpenCampaignRecap={onOpenCampaignRecap}
        onOpenSessionPrepWizard={onOpenSessionPrepWizard}
        onOpenHandoutViewer={onOpenHandoutViewer}
        onOpenBiomeSoundtrack={onOpenBiomeSoundtrack}
        onOpenChronicleExport={onOpenChronicleExport}
        onSelectSituation={onSelectSituation}
      />

      <ActiveSceneQuickActions
        liveState={liveState}
        lightningConfig={lightningConfig}
        onToggleBanner={onToggleBanner}
        onTriggerLightning={onTriggerLightning}
        onToggleAutoStorm={onToggleAutoStorm}
        onToggleDisableFlash={onToggleDisableFlash}
        onTriggerShake={onTriggerShake}
        onToggleAmbientAudio={onToggleAmbientAudio}
        onToggleDmSpeakingDucked={onToggleDmSpeakingDucked}
        onSelectDuckingPreset={onSelectDuckingPreset}
        onOpenCompositor={onOpenCompositor}
        onOpenSoundboard={onOpenSoundboard}
      />

      <ActiveSceneCameraLightsBar
        liveState={liveState}
        onSetCameraTransform={onSetCameraTransform}
        onResetCamera={onResetCamera}
        onUpdateSceneLights={onUpdateSceneLights}
        onUpdateZoneEmitters={onUpdateZoneEmitters}
      />

      <ActiveSceneVariantsAndRevelations
        liveState={liveState}
        activeScene={activeScene}
        onSelectSceneVariant={onSelectSceneVariant}
        onRevealCharacterAppearance={onRevealCharacterAppearance}
        onRevealCharacterIdentity={onRevealCharacterIdentity}
      />

      {/* 3.6 SCENE INTERACTIONS TOOLBAR (1-TOUCH DECLARATIVE ACTIONS) */}
      <SceneInteractionsToolbar
        interactions={liveState.interactions}
        executingInteractionId={executingInteractionId}
        onTriggerInteraction={onTriggerInteraction}
      />
    </section>
  );
};
