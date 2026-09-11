import React, { Suspense, lazy } from 'react';
import type {
  Campaign,
  DisplayState,
  GameSession,
} from '../../../types';
import { db } from '../../../db';
import { sessionCommandBus } from '../../../services/sessionCommandBus';
import { gameSessionService } from '../../../services/gameSessionService';
import { modalLoaders } from './modalPrefetch';

const ManageFavoritesModal = lazy(() => modalLoaders.manageFavorites().then(m => ({ default: m.ManageFavoritesModal })));
const SceneCompositorModal = lazy(() => modalLoaders.sceneCompositor().then(m => ({ default: m.SceneCompositorModal })));
const ConversationEditorModal = lazy(() => modalLoaders.conversationEditor().then(m => ({ default: m.ConversationEditorModal })));
const CampaignRevelationJournalModal = lazy(() => modalLoaders.campaignRevelationJournal().then(m => ({ default: m.CampaignRevelationJournalModal })));
const SessionPrepWizardModal = lazy(() => modalLoaders.sessionPrepWizard().then(m => ({ default: m.SessionPrepWizardModal })));
const HandoutViewerModal = lazy(() => modalLoaders.handoutViewer().then(m => ({ default: m.HandoutViewerModal })));
const CampaignRecapModal = lazy(() => modalLoaders.campaignRecap().then(m => ({ default: m.CampaignRecapModal })));
const SoundboardModal = lazy(() => modalLoaders.soundboard().then(m => ({ default: m.SoundboardModal })));
const BiomeSoundtrackModal = lazy(() => modalLoaders.biomeSoundtrack().then(m => ({ default: m.BiomeSoundtrackModal })));
const LightingPresetsModal = lazy(() => modalLoaders.lightingPresets().then(m => ({ default: m.LightingPresetsModal })));
const SessionChronicleExportModal = lazy(() => modalLoaders.sessionChronicleExport().then(m => ({ default: m.SessionChronicleExportModal })));
const SessionLibraryModal = lazy(() => modalLoaders.sessionLibrary().then(m => ({ default: m.SessionLibraryModal })));
const ScenePresetModal = lazy(() => modalLoaders.scenePreset().then(m => ({ default: m.ScenePresetModal })));
const SessionReadinessModal = lazy(() => modalLoaders.sessionReadiness().then(m => ({ default: m.SessionReadinessModal })));

import { useMasterModalStore } from '../../../stores/useMasterModalStore';
import { useDisplayStore } from '../../../stores/useDisplayStore';
import { useCampaignStore } from '../../../stores/useCampaignStore';

export interface MasterAuxiliaryModalsProps {
  campaign?: Campaign | null;
  liveState?: DisplayState;
  stagedState?: DisplayState;
  operationMode?: 'live' | 'staging';

  // Manage Favorites
  showManageFavoritesModal?: boolean;
  onCloseManageFavorites?: () => void;
  onSaveFavorites?: (favs: any) => void;

  // Scene Compositor
  showCompositorModal?: boolean;
  onCloseCompositor?: () => void;
  onSaveCompositorCharacters?: any;
  onPreviewCompositorCharacters?: any;
  onSaveCompositionPreset?: any;

  // Conversation Editor
  showConversationEditor?: boolean;
  editingConversation?: any;
  onCloseConversationEditor?: () => void;
  onSaveConversation?: any;

  // Revelation Journal
  showRevelationJournalModal?: boolean;
  onCloseRevelationJournal?: () => void;
  setCampaign?: (campaign: Campaign) => void;

  // Session Prep Wizard
  showSessionPrepWizardModal?: boolean;
  onCloseSessionPrepWizard?: () => void;
  onApplySessionPrepDraft?: any;
  onSaveSessionPrepDraft?: any;

  // Handout Viewer
  showHandoutViewerModal?: boolean;
  onCloseHandoutViewer?: () => void;
  onProjectHandout?: any;
  onDismissHandout?: any;
  onSaveHandouts?: (handouts: any[]) => Promise<void>;
  onDeleteHandout?: (handoutId: string) => Promise<void>;

  // Campaign Recap
  showCampaignRecapModal?: boolean;
  onCloseCampaignRecap?: () => void;
  onProjectRecap?: any;
  onDismissRecap?: any;
  onSaveRecap?: any;

  // Soundboard
  showSoundboardModal?: boolean;
  onCloseSoundboard?: () => void;

  // Biome Soundtrack
  showBiomeSoundtrackModal?: boolean;
  onCloseBiomeSoundtrack?: () => void;
  onApplySoundtrack?: any;
  onSaveBiomeProfiles?: any;

  // Lighting Presets
  showLightingPresetsModal?: boolean;
  onCloseLightingPresets?: () => void;
  onApplyLightingPreset?: any;
  onSaveLightingPreset?: any;

  // Session Chronicle Export
  showChronicleExportModal?: boolean;
  onCloseChronicleExport?: () => void;

  // Session Library
  showSessionLibraryModal?: boolean;
  onCloseSessionLibrary?: () => void;
  onLoadSessionFromLibrary?: (session: GameSession, mode: 'live' | 'staged') => void;

  // Scene Preset Modal
  showScenePresetModal?: boolean;
  scenePresetMode?: 'save' | 'insert';
  onCloseScenePresetModal?: () => void;
  onPresetSaved?: (preset: any) => void;
  onPresetInstantiated?: (session: any, mode: 'append_scene' | 'replace_staged') => void;

  // Session Readiness Modal
  showReadinessModal?: boolean;
  onCloseReadinessModal?: () => void;
}

export const MasterAuxiliaryModals: React.FC<MasterAuxiliaryModalsProps> = (props) => {
  const modalStore = useMasterModalStore();
  const displayStore = useDisplayStore();
  const campaignStore = useCampaignStore();

  const campaign = props.campaign !== undefined ? props.campaign : campaignStore.campaign;
  const setCampaign = props.setCampaign ?? campaignStore.setCampaign;
  const liveState = props.liveState ?? displayStore.liveState;
  const stagedState = props.stagedState ?? displayStore.stagedState;
  const operationMode = props.operationMode ?? displayStore.operationMode;

  const showManageFavoritesModal = props.showManageFavoritesModal ?? modalStore.showManageFavoritesModal;
  const onCloseManageFavorites = props.onCloseManageFavorites ?? (() => modalStore.setShowManageFavoritesModal(false));
  const onSaveFavorites = props.onSaveFavorites ?? (() => {});

  const showCompositorModal = props.showCompositorModal ?? modalStore.showCompositorModal;
  const onCloseCompositor = props.onCloseCompositor ?? (() => modalStore.setShowCompositorModal(false));
  const onSaveCompositorCharacters = props.onSaveCompositorCharacters;
  const onPreviewCompositorCharacters = props.onPreviewCompositorCharacters;
  const onSaveCompositionPreset = props.onSaveCompositionPreset;

  const showConversationEditor = props.showConversationEditor ?? modalStore.showConversationEditor;
  const editingConversation = props.editingConversation;
  const onCloseConversationEditor = props.onCloseConversationEditor ?? (() => modalStore.setShowConversationEditor(false));
  const onSaveConversation = props.onSaveConversation;

  const showRevelationJournalModal = props.showRevelationJournalModal ?? modalStore.showRevelationJournalModal;
  const onCloseRevelationJournal = props.onCloseRevelationJournal ?? (() => modalStore.setShowRevelationJournalModal(false));

  const showSessionPrepWizardModal = props.showSessionPrepWizardModal ?? modalStore.showSessionPrepWizardModal;
  const onCloseSessionPrepWizard = props.onCloseSessionPrepWizard ?? (() => modalStore.setShowSessionPrepWizardModal(false));
  const onApplySessionPrepDraft = props.onApplySessionPrepDraft;
  const onSaveSessionPrepDraft = props.onSaveSessionPrepDraft;

  const showHandoutViewerModal = props.showHandoutViewerModal ?? modalStore.showHandoutViewerModal;
  const onCloseHandoutViewer = props.onCloseHandoutViewer ?? (() => modalStore.setShowHandoutViewerModal(false));
  const onProjectHandout = props.onProjectHandout;
  const onDismissHandout = props.onDismissHandout;
  const onSaveHandouts = props.onSaveHandouts;
  const onDeleteHandout = props.onDeleteHandout;

  const showCampaignRecapModal = props.showCampaignRecapModal ?? modalStore.showCampaignRecapModal;
  const onCloseCampaignRecap = props.onCloseCampaignRecap ?? (() => modalStore.setShowCampaignRecapModal(false));
  const onProjectRecap = props.onProjectRecap;
  const onDismissRecap = props.onDismissRecap;
  const onSaveRecap = props.onSaveRecap;

  const showSoundboardModal = props.showSoundboardModal ?? modalStore.showSoundboardModal;
  const onCloseSoundboard = props.onCloseSoundboard ?? (() => modalStore.setShowSoundboardModal(false));

  const showBiomeSoundtrackModal = props.showBiomeSoundtrackModal ?? modalStore.showBiomeSoundtrackModal;
  const onCloseBiomeSoundtrack = props.onCloseBiomeSoundtrack ?? (() => modalStore.setShowBiomeSoundtrackModal(false));
  const onApplySoundtrack = props.onApplySoundtrack;
  const onSaveBiomeProfiles = props.onSaveBiomeProfiles;

  const showLightingPresetsModal = props.showLightingPresetsModal ?? modalStore.showLightingPresetsModal;
  const onCloseLightingPresets = props.onCloseLightingPresets ?? (() => modalStore.setShowLightingPresetsModal(false));
  const onApplyLightingPreset = props.onApplyLightingPreset;
  const onSaveLightingPreset = props.onSaveLightingPreset;

  const showChronicleExportModal = props.showChronicleExportModal ?? modalStore.showChronicleExportModal;
  const onCloseChronicleExport = props.onCloseChronicleExport ?? (() => modalStore.setShowChronicleExportModal(false));

  const showSessionLibraryModal = props.showSessionLibraryModal ?? modalStore.showSessionLibraryModal;
  const onCloseSessionLibrary = props.onCloseSessionLibrary ?? (() => modalStore.setShowSessionLibraryModal(false));
  const onLoadSessionFromLibrary = props.onLoadSessionFromLibrary ?? (() => {});

  const showScenePresetModal = props.showScenePresetModal ?? modalStore.showScenePresetModal;
  const scenePresetMode = props.scenePresetMode ?? modalStore.scenePresetMode;
  const onCloseScenePresetModal = props.onCloseScenePresetModal ?? (() => modalStore.setShowScenePresetModal(false));
  const onPresetSaved = props.onPresetSaved;
  const onPresetInstantiated = props.onPresetInstantiated;

  const showReadinessModal = props.showReadinessModal ?? modalStore.showReadinessModal;
  const onCloseReadinessModal = props.onCloseReadinessModal ?? (() => modalStore.setShowReadinessModal(false));
  return (
    <Suspense fallback={null}>
      {/* MODAL: GESTIONAR FAVORITOS */}
      {showManageFavoritesModal && campaign && (
        <ManageFavoritesModal
          campaign={campaign}
          favorites={campaign.favorites || []}
          onSaveFavorites={onSaveFavorites}
          onClose={onCloseManageFavorites}
        />
      )}

      {/* MODAL: COMPOSITOR TÁCTIL DE ESCENA */}
      {showCompositorModal && (
        <SceneCompositorModal
          initialState={operationMode === 'staging' ? stagedState : liveState}
          campaign={campaign}
          operationMode={operationMode}
          onSaveState={onSaveCompositorCharacters}
          onPreviewState={onPreviewCompositorCharacters}
          onSaveCompositionPreset={onSaveCompositionPreset}
          onClose={onCloseCompositor}
        />
      )}

      {/* MODAL: EDITOR DE CONVERSACIONES Y DIÁLOGOS */}
      {showConversationEditor && campaign && (
        <ConversationEditorModal
          isOpen={showConversationEditor}
          campaign={campaign}
          conversation={editingConversation}
          onSave={onSaveConversation}
          onClose={onCloseConversationEditor}
        />
      )}

      {/* MODAL: DIARIO DE REVELACIONES Y ESTADO DE CAMPAÑA */}
      {showRevelationJournalModal && campaign && (
        <CampaignRevelationJournalModal
          isOpen={showRevelationJournalModal}
          campaign={campaign}
          onUpdateCampaign={async (updated) => {
            await db.campaigns.put(updated);
            setCampaign(updated);
          }}
          onClose={onCloseRevelationJournal}
        />
      )}

      {/* MODAL: ASISTENTE DE PREPARACIÓN DE SESIÓN */}
      {showSessionPrepWizardModal && campaign && (
        <SessionPrepWizardModal
          isOpen={showSessionPrepWizardModal}
          campaign={campaign}
          liveState={liveState}
          onApplyDraftToStaging={onApplySessionPrepDraft}
          onSaveDraft={onSaveSessionPrepDraft}
          onClose={onCloseSessionPrepWizard}
        />
      )}

      {/* MODAL: VISOR DE HANDOUTS Y DOCUMENTOS */}
      {showHandoutViewerModal && (
        <HandoutViewerModal
          isOpen={showHandoutViewerModal}
          activeHandout={liveState.activeHandout}
          savedHandouts={gameSessionService.getActiveHandouts(campaign?.savedHandouts || [])}
          onProjectHandout={onProjectHandout}
          onDismissHandout={onDismissHandout}
          onSaveHandouts={onSaveHandouts}
          onDeleteHandout={onDeleteHandout}
          onClose={onCloseHandoutViewer}
        />
      )}

      {/* MODAL: CRÓNICA CINEMATOGRÁFICA DE APERTURA */}
      {showCampaignRecapModal && campaign && (
        <CampaignRecapModal
          isOpen={showCampaignRecapModal}
          campaign={campaign}
          activeRecap={liveState.activeRecap}
          onProjectRecap={onProjectRecap}
          onDismissRecap={onDismissRecap}
          onSaveRecap={onSaveRecap}
          onClose={onCloseCampaignRecap}
        />
      )}

      {/* MODAL: SOUNDBOARD MATRIZ RÁPIDA DE SFX */}
      {showSoundboardModal && (
        <SoundboardModal
          isOpen={showSoundboardModal}
          campaign={campaign}
          onTriggerSfx={async (pad: any) => {
            sessionCommandBus.dispatchSfx(pad.sfxPreset || pad.id, pad.audioUrl, pad.label);
          }}
          onStopAllSfx={async () => {
            sessionCommandBus.dispatchStopAllSfx();
          }}
          onClose={onCloseSoundboard}
        />
      )}

      {/* MODAL: SELECTOR DE BANDA SONORA POR BIOMA */}
      {showBiomeSoundtrackModal && (
        <BiomeSoundtrackModal
          isOpen={showBiomeSoundtrackModal}
          campaign={campaign}
          currentAmbientUrl={liveState.ambientAudioUrl}
          currentAmbientVolume={liveState.ambientVolume}
          currentAmbientPlaying={liveState.ambientPlaying}
          onApplySoundtrack={onApplySoundtrack}
          onSaveProfiles={onSaveBiomeProfiles}
          onClose={onCloseBiomeSoundtrack}
        />
      )}

      {/* MODAL: PRESETS DE ILUMINACIÓN POR ESCENA */}
      {showLightingPresetsModal && (
        <LightingPresetsModal
          isOpen={showLightingPresetsModal}
          campaign={campaign}
          currentLights={liveState.lights || []}
          currentLightingFilter={liveState.lighting}
          onApplyPreset={onApplyLightingPreset}
          onSavePreset={onSaveLightingPreset}
          onClose={onCloseLightingPresets}
        />
      )}

      {/* MODAL: EXPORTADOR DE CRÓNICA Y DIARIO DE SESIÓN */}
      {showChronicleExportModal && (
        <SessionChronicleExportModal
          isOpen={showChronicleExportModal}
          campaign={campaign}
          liveState={liveState}
          onClose={onCloseChronicleExport}
        />
      )}

      {/* MODAL: BIBLIOTECA DE PREPARACIONES Y SESIONES */}
      {showSessionLibraryModal && campaign && (
        <SessionLibraryModal
          isOpen={showSessionLibraryModal}
          campaignId={campaign.id}
          onLoadSession={onLoadSessionFromLibrary}
          onClose={onCloseSessionLibrary}
        />
      )}

      {/* MODAL: PRESETS DE ESCENA COMPLETA (GUARDAR E INSERTAR) */}
      {showScenePresetModal && campaign && (
        <ScenePresetModal
          isOpen={showScenePresetModal}
          mode={scenePresetMode}
          campaignId={campaign.id}
          stagedState={stagedState}
          campaignConversations={campaign.savedConversations || []}
          onClose={onCloseScenePresetModal}
          onPresetSaved={onPresetSaved}
          onPresetInstantiated={onPresetInstantiated}
        />
      )}

      {/* MODAL: EVALUACIÓN LISTA PARA JUGAR */}
      {showReadinessModal && (
        <SessionReadinessModal
          sessionId={gameSessionService.getCurrentSessionId() || ''}
          sessionName={gameSessionService.getCurrentSession()?.name || 'Sesión'}
          onClose={onCloseReadinessModal || (() => {})}
        />
      )}
    </Suspense>
  );
};
