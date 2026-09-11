import { create } from 'zustand';

export interface MasterModalState {
  // Modal visibility flags
  showQRModal: boolean;
  showFullScreenPreview: boolean;
  showUnsavedStagingDialog: boolean;
  showSelectivePublishModal: boolean;
  showHistoryModal: boolean;
  showCheckpointsModal: boolean;
  showQuickMoments: boolean;
  showDiagnosticsModal: boolean;
  showCampaignPickerModal: boolean;
  showSummonModal: boolean;
  showNewSceneModal: boolean;
  showNewCharModal: boolean;
  showManageFavoritesModal: boolean;
  showCompositorModal: boolean;
  showConversationEditor: boolean;
  showRevelationJournalModal: boolean;
  showSessionPrepWizardModal: boolean;
  showHandoutViewerModal: boolean;
  showCampaignRecapModal: boolean;
  showSoundboardModal: boolean;
  showBiomeSoundtrackModal: boolean;
  showLightingPresetsModal: boolean;
  showChronicleExportModal: boolean;
  showSessionLibraryModal: boolean;
  showScenePresetModal: boolean;
  scenePresetMode: 'save' | 'insert';
  showReadinessModal: boolean;
  showResourcePacksModal: boolean;
  mobileToolsOpen: boolean;

  // State setters
  setShowQRModal: (val: boolean) => void;
  setShowFullScreenPreview: (val: boolean) => void;
  setShowUnsavedStagingDialog: (val: boolean) => void;
  setShowSelectivePublishModal: (val: boolean) => void;
  setShowHistoryModal: (val: boolean) => void;
  setShowCheckpointsModal: (val: boolean) => void;
  setShowQuickMoments: (val: boolean) => void;
  setShowDiagnosticsModal: (val: boolean) => void;
  setShowCampaignPickerModal: (val: boolean) => void;
  setShowSummonModal: (val: boolean) => void;
  setShowNewSceneModal: (val: boolean) => void;
  setShowNewCharModal: (val: boolean) => void;
  setShowManageFavoritesModal: (val: boolean) => void;
  setShowCompositorModal: (val: boolean) => void;
  setShowConversationEditor: (val: boolean) => void;
  setShowRevelationJournalModal: (val: boolean) => void;
  setShowSessionPrepWizardModal: (val: boolean) => void;
  setShowHandoutViewerModal: (val: boolean) => void;
  setShowCampaignRecapModal: (val: boolean) => void;
  setShowSoundboardModal: (val: boolean) => void;
  setShowBiomeSoundtrackModal: (val: boolean) => void;
  setShowLightingPresetsModal: (val: boolean) => void;
  setShowChronicleExportModal: (val: boolean) => void;
  setShowSessionLibraryModal: (val: boolean) => void;
  setShowScenePresetModal: (val: boolean) => void;
  setScenePresetMode: (mode: 'save' | 'insert') => void;
  setShowReadinessModal: (val: boolean) => void;
  setShowResourcePacksModal: (val: boolean) => void;
  setMobileToolsOpen: (val: boolean) => void;

  // Generic and batch actions
  closeAllModals: () => void;
}

const initialModalState = {
  showQRModal: false,
  showFullScreenPreview: false,
  showUnsavedStagingDialog: false,
  showSelectivePublishModal: false,
  showHistoryModal: false,
  showCheckpointsModal: false,
  showQuickMoments: false,
  showDiagnosticsModal: false,
  showCampaignPickerModal: false,
  showSummonModal: false,
  showNewSceneModal: false,
  showNewCharModal: false,
  showManageFavoritesModal: false,
  showCompositorModal: false,
  showConversationEditor: false,
  showRevelationJournalModal: false,
  showSessionPrepWizardModal: false,
  showHandoutViewerModal: false,
  showCampaignRecapModal: false,
  showSoundboardModal: false,
  showBiomeSoundtrackModal: false,
  showLightingPresetsModal: false,
  showChronicleExportModal: false,
  showSessionLibraryModal: false,
  showScenePresetModal: false,
  scenePresetMode: 'save' as const,
  showReadinessModal: false,
  showResourcePacksModal: false,
  mobileToolsOpen: false,
};

export const useMasterModalStore = create<MasterModalState>((set) => ({
  ...initialModalState,

  setShowQRModal: (val) => set({ showQRModal: val }),
  setShowFullScreenPreview: (val) => set({ showFullScreenPreview: val }),
  setShowUnsavedStagingDialog: (val) => set({ showUnsavedStagingDialog: val }),
  setShowSelectivePublishModal: (val) => set({ showSelectivePublishModal: val }),
  setShowHistoryModal: (val) => set({ showHistoryModal: val }),
  setShowCheckpointsModal: (val) => set({ showCheckpointsModal: val }),
  setShowQuickMoments: (val) => set({ showQuickMoments: val }),
  setShowDiagnosticsModal: (val) => set({ showDiagnosticsModal: val }),
  setShowCampaignPickerModal: (val) => set({ showCampaignPickerModal: val }),
  setShowSummonModal: (val) => set({ showSummonModal: val }),
  setShowNewSceneModal: (val) => set({ showNewSceneModal: val }),
  setShowNewCharModal: (val) => set({ showNewCharModal: val }),
  setShowManageFavoritesModal: (val) => set({ showManageFavoritesModal: val }),
  setShowCompositorModal: (val) => set({ showCompositorModal: val }),
  setShowConversationEditor: (val) => set({ showConversationEditor: val }),
  setShowRevelationJournalModal: (val) => set({ showRevelationJournalModal: val }),
  setShowSessionPrepWizardModal: (val) => set({ showSessionPrepWizardModal: val }),
  setShowHandoutViewerModal: (val) => set({ showHandoutViewerModal: val }),
  setShowCampaignRecapModal: (val) => set({ showCampaignRecapModal: val }),
  setShowSoundboardModal: (val) => set({ showSoundboardModal: val }),
  setShowBiomeSoundtrackModal: (val) => set({ showBiomeSoundtrackModal: val }),
  setShowLightingPresetsModal: (val) => set({ showLightingPresetsModal: val }),
  setShowChronicleExportModal: (val) => set({ showChronicleExportModal: val }),
  setShowSessionLibraryModal: (val) => set({ showSessionLibraryModal: val }),
  setShowScenePresetModal: (val) => set({ showScenePresetModal: val }),
  setScenePresetMode: (mode) => set({ scenePresetMode: mode }),
  setShowReadinessModal: (val) => set({ showReadinessModal: val }),
  setShowResourcePacksModal: (val) => set({ showResourcePacksModal: val }),
  setMobileToolsOpen: (val) => set({ mobileToolsOpen: val }),

  closeAllModals: () =>
    set({
      showQRModal: false,
      showFullScreenPreview: false,
      showUnsavedStagingDialog: false,
      showSelectivePublishModal: false,
      showHistoryModal: false,
      showCheckpointsModal: false,
      showQuickMoments: false,
      showDiagnosticsModal: false,
      showCampaignPickerModal: false,
      showSummonModal: false,
      showNewSceneModal: false,
      showNewCharModal: false,
      showManageFavoritesModal: false,
      showCompositorModal: false,
      showConversationEditor: false,
      showRevelationJournalModal: false,
      showSessionPrepWizardModal: false,
      showHandoutViewerModal: false,
      showCampaignRecapModal: false,
      showSoundboardModal: false,
      showBiomeSoundtrackModal: false,
      showLightingPresetsModal: false,
      showChronicleExportModal: false,
      showSessionLibraryModal: false,
      showScenePresetModal: false,
      showReadinessModal: false,
      showResourcePacksModal: false,
      mobileToolsOpen: false,
    }),
}));
