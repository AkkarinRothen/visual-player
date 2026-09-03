import React from 'react';
import type {
  Campaign,
  DisplayState,
  GameSession,
} from '../../../types';
import { db } from '../../../db';
import { sessionCommandBus } from '../../../services/sessionCommandBus';
import { ManageFavoritesModal } from './ManageFavoritesModal';
import { SceneCompositorModal } from './SceneCompositorModal';
import { ConversationEditorModal } from './ConversationEditorModal';
import { CampaignRevelationJournalModal } from './CampaignRevelationJournalModal';
import { SessionPrepWizardModal } from './SessionPrepWizardModal';
import { HandoutViewerModal } from './HandoutViewerModal';
import { CampaignRecapModal } from './CampaignRecapModal';
import { SoundboardModal } from './SoundboardModal';
import { BiomeSoundtrackModal } from './BiomeSoundtrackModal';
import { LightingPresetsModal } from './LightingPresetsModal';
import { SessionChronicleExportModal } from './SessionChronicleExportModal';
import { SessionLibraryModal } from './SessionLibraryModal';
import { ScenePresetModal } from './ScenePresetModal';
import { SessionReadinessModal } from './SessionReadinessModal';
import { gameSessionService } from '../../../services/gameSessionService';

export interface MasterAuxiliaryModalsProps {
  campaign: Campaign | null;
  liveState: DisplayState;
  stagedState: DisplayState;
  operationMode: 'live' | 'staging';

  // Manage Favorites
  showManageFavoritesModal: boolean;
  onCloseManageFavorites: () => void;
  onSaveFavorites: (favs: any) => void;

  // Scene Compositor
  showCompositorModal: boolean;
  onCloseCompositor: () => void;
  onSaveCompositorCharacters: any;
  onSaveCompositionPreset: any;

  // Conversation Editor
  showConversationEditor: boolean;
  editingConversation: any;
  onCloseConversationEditor: () => void;
  onSaveConversation: any;

  // Revelation Journal
  showRevelationJournalModal: boolean;
  onCloseRevelationJournal: () => void;
  setCampaign: (campaign: Campaign) => void;

  // Session Prep Wizard
  showSessionPrepWizardModal: boolean;
  onCloseSessionPrepWizard: () => void;
  onApplySessionPrepDraft: any;
  onSaveSessionPrepDraft: any;

  // Handout Viewer
  showHandoutViewerModal: boolean;
  onCloseHandoutViewer: () => void;
  onProjectHandout: any;
  onDismissHandout: any;

  // Campaign Recap
  showCampaignRecapModal: boolean;
  onCloseCampaignRecap: () => void;
  onProjectRecap: any;
  onDismissRecap: any;
  onSaveRecap: any;

  // Soundboard
  showSoundboardModal: boolean;
  onCloseSoundboard: () => void;

  // Biome Soundtrack
  showBiomeSoundtrackModal: boolean;
  onCloseBiomeSoundtrack: () => void;
  onApplySoundtrack: any;
  onSaveBiomeProfiles: any;

  // Lighting Presets
  showLightingPresetsModal: boolean;
  onCloseLightingPresets: () => void;
  onApplyLightingPreset: any;
  onSaveLightingPreset: any;

  // Session Chronicle Export
  showChronicleExportModal: boolean;
  onCloseChronicleExport: () => void;

  // Session Library
  showSessionLibraryModal: boolean;
  onCloseSessionLibrary: () => void;
  onLoadSessionFromLibrary: (session: GameSession, mode: 'live' | 'staged') => void;

  // Scene Preset Modal
  showScenePresetModal: boolean;
  scenePresetMode: 'save' | 'insert';
  onCloseScenePresetModal: () => void;
  onPresetSaved?: (preset: any) => void;
  onPresetInstantiated?: (session: any, mode: 'append_scene' | 'replace_staged') => void;

  // Session Readiness Modal
  showReadinessModal?: boolean;
  onCloseReadinessModal?: () => void;
}

export const MasterAuxiliaryModals: React.FC<MasterAuxiliaryModalsProps> = ({
  campaign,
  liveState,
  stagedState,
  operationMode,
  showManageFavoritesModal,
  onCloseManageFavorites,
  onSaveFavorites,
  showCompositorModal,
  onCloseCompositor,
  onSaveCompositorCharacters,
  onSaveCompositionPreset,
  showConversationEditor,
  editingConversation,
  onCloseConversationEditor,
  onSaveConversation,
  showRevelationJournalModal,
  onCloseRevelationJournal,
  setCampaign,
  showSessionPrepWizardModal,
  onCloseSessionPrepWizard,
  onApplySessionPrepDraft,
  onSaveSessionPrepDraft,
  showHandoutViewerModal,
  onCloseHandoutViewer,
  onProjectHandout,
  onDismissHandout,
  showCampaignRecapModal,
  onCloseCampaignRecap,
  onProjectRecap,
  onDismissRecap,
  onSaveRecap,
  showSoundboardModal,
  onCloseSoundboard,
  showBiomeSoundtrackModal,
  onCloseBiomeSoundtrack,
  onApplySoundtrack,
  onSaveBiomeProfiles,
  showLightingPresetsModal,
  onCloseLightingPresets,
  onApplyLightingPreset,
  onSaveLightingPreset,
  showChronicleExportModal,
  onCloseChronicleExport,
  showSessionLibraryModal,
  onCloseSessionLibrary,
  onLoadSessionFromLibrary,
  showScenePresetModal,
  scenePresetMode,
  onCloseScenePresetModal,
  onPresetSaved,
  onPresetInstantiated,
  showReadinessModal,
  onCloseReadinessModal,
}) => {
  return (
    <>
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
    </>
  );
};
