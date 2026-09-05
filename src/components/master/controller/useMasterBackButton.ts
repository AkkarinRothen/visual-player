import { useEffect } from 'react';
import { getPlatformBridge } from '../../../platform';
import { backButtonStack } from '../../../services/backButtonStack';

export interface UseMasterBackButtonParams {
  showQRModal: boolean;
  setShowQRModal: (open: boolean) => void;
  showDiagnosticsModal: boolean;
  setShowDiagnosticsModal: (open: boolean) => void;
  showHistoryModal: boolean;
  setShowHistoryModal: (open: boolean) => void;
  showCheckpointsModal: boolean;
  setShowCheckpointsModal: (open: boolean) => void;
  showQuickMoments: boolean;
  setShowQuickMoments: (open: boolean) => void;
  showSummonModal: boolean;
  setShowSummonModal: (open: boolean) => void;
  showNewSceneModal: boolean;
  setShowNewSceneModal: (open: boolean) => void;
  showNewCharModal: boolean;
  setShowNewCharModal: (open: boolean) => void;
  showCampaignPickerModal: boolean;
  setShowCampaignPickerModal: (open: boolean) => void;
  showSelectivePublishModal: boolean;
  setShowSelectivePublishModal: (open: boolean) => void;
  showCompositorModal: boolean;
  setShowCompositorModal: (open: boolean) => void;
  showConversationEditor: boolean;
  setShowConversationEditor: (open: boolean) => void;
  showSessionLibraryModal: boolean;
  setShowSessionLibraryModal: (open: boolean) => void;
  showManageFavoritesModal: boolean;
  setShowManageFavoritesModal: (open: boolean) => void;
  showRevelationJournalModal: boolean;
  setShowRevelationJournalModal: (open: boolean) => void;
  showSessionPrepWizardModal: boolean;
  setShowSessionPrepWizardModal: (open: boolean) => void;
  showHandoutViewerModal: boolean;
  setShowHandoutViewerModal: (open: boolean) => void;
  showCampaignRecapModal: boolean;
  setShowCampaignRecapModal: (open: boolean) => void;
  showSoundboardModal: boolean;
  setShowSoundboardModal: (open: boolean) => void;
  showLightingPresetsModal: boolean;
  setShowLightingPresetsModal: (open: boolean) => void;
  showChronicleExportModal: boolean;
  setShowChronicleExportModal: (open: boolean) => void;
  showReadinessModal: boolean;
  setShowReadinessModal: (open: boolean) => void;
  showFullScreenPreview: boolean;
  setShowFullScreenPreview: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

export const useMasterBackButton = ({
  showQRModal,
  setShowQRModal,
  showDiagnosticsModal,
  setShowDiagnosticsModal,
  showHistoryModal,
  setShowHistoryModal,
  showCheckpointsModal,
  setShowCheckpointsModal,
  showQuickMoments,
  setShowQuickMoments,
  showSummonModal,
  setShowSummonModal,
  showNewSceneModal,
  setShowNewSceneModal,
  showNewCharModal,
  setShowNewCharModal,
  showCampaignPickerModal,
  setShowCampaignPickerModal,
  showSelectivePublishModal,
  setShowSelectivePublishModal,
  showCompositorModal,
  setShowCompositorModal,
  showConversationEditor,
  setShowConversationEditor,
  showSessionLibraryModal,
  setShowSessionLibraryModal,
  showManageFavoritesModal,
  setShowManageFavoritesModal,
  showRevelationJournalModal,
  setShowRevelationJournalModal,
  showSessionPrepWizardModal,
  setShowSessionPrepWizardModal,
  showHandoutViewerModal,
  setShowHandoutViewerModal,
  showCampaignRecapModal,
  setShowCampaignRecapModal,
  showSoundboardModal,
  setShowSoundboardModal,
  showLightingPresetsModal,
  setShowLightingPresetsModal,
  showChronicleExportModal,
  setShowChronicleExportModal,
  showReadinessModal,
  setShowReadinessModal,
  showFullScreenPreview,
  setShowFullScreenPreview,
  activeTab,
  setActiveTab,
}: UseMasterBackButtonParams) => {
  useEffect(() => {
    const bridge = getPlatformBridge();
    bridge.screen.setOrientation('unlocked');

    const unbindBack = bridge.lifecycle.onBackButton(() => {
      const consumedByStack = backButtonStack.dispatchBack();
      if (consumedByStack) return true;

      if (showQRModal) { setShowQRModal(false); return true; }
      if (showDiagnosticsModal) { setShowDiagnosticsModal(false); return true; }
      if (showHistoryModal) { setShowHistoryModal(false); return true; }
      if (showCheckpointsModal) { setShowCheckpointsModal(false); return true; }
      if (showQuickMoments) { setShowQuickMoments(false); return true; }
      if (showSummonModal) { setShowSummonModal(false); return true; }
      if (showNewSceneModal) { setShowNewSceneModal(false); return true; }
      if (showNewCharModal) { setShowNewCharModal(false); return true; }
      if (showCampaignPickerModal) { setShowCampaignPickerModal(false); return true; }
      if (showSelectivePublishModal) { setShowSelectivePublishModal(false); return true; }
      if (showCompositorModal) { setShowCompositorModal(false); return true; }
      if (showConversationEditor) { setShowConversationEditor(false); return true; }
      if (showSessionLibraryModal) { setShowSessionLibraryModal(false); return true; }
      if (showManageFavoritesModal) { setShowManageFavoritesModal(false); return true; }
      if (showRevelationJournalModal) { setShowRevelationJournalModal(false); return true; }
      if (showSessionPrepWizardModal) { setShowSessionPrepWizardModal(false); return true; }
      if (showHandoutViewerModal) { setShowHandoutViewerModal(false); return true; }
      if (showCampaignRecapModal) { setShowCampaignRecapModal(false); return true; }
      if (showSoundboardModal) { setShowSoundboardModal(false); return true; }
      if (showLightingPresetsModal) { setShowLightingPresetsModal(false); return true; }
      if (showChronicleExportModal) { setShowChronicleExportModal(false); return true; }
      if (showReadinessModal) { setShowReadinessModal(false); return true; }

      if (showFullScreenPreview) { setShowFullScreenPreview(false); return true; }

      if (activeTab !== 'live') {
        setActiveTab('live');
        return true;
      }

      return false;
    });

    return () => {
      unbindBack();
    };
  }, [
    showQRModal,
    setShowQRModal,
    showDiagnosticsModal,
    setShowDiagnosticsModal,
    showHistoryModal,
    setShowHistoryModal,
    showCheckpointsModal,
    setShowCheckpointsModal,
    showQuickMoments,
    setShowQuickMoments,
    showSummonModal,
    setShowSummonModal,
    showNewSceneModal,
    setShowNewSceneModal,
    showNewCharModal,
    setShowNewCharModal,
    showCampaignPickerModal,
    setShowCampaignPickerModal,
    showSelectivePublishModal,
    setShowSelectivePublishModal,
    showCompositorModal,
    setShowCompositorModal,
    showConversationEditor,
    setShowConversationEditor,
    showSessionLibraryModal,
    setShowSessionLibraryModal,
    showManageFavoritesModal,
    setShowManageFavoritesModal,
    showRevelationJournalModal,
    setShowRevelationJournalModal,
    showSessionPrepWizardModal,
    setShowSessionPrepWizardModal,
    showHandoutViewerModal,
    setShowHandoutViewerModal,
    showCampaignRecapModal,
    setShowCampaignRecapModal,
    showSoundboardModal,
    setShowSoundboardModal,
    showLightingPresetsModal,
    setShowLightingPresetsModal,
    showChronicleExportModal,
    setShowChronicleExportModal,
    showReadinessModal,
    setShowReadinessModal,
    showFullScreenPreview,
    setShowFullScreenPreview,
    activeTab,
    setActiveTab,
  ]);
};
