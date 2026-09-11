// Modal prefetchers and loaders for React.lazy code-splitting in Visual Player

export const modalLoaders = {
  selectivePublish: () => import('../SelectivePublishModal'),
  fullScreenPreview: () => import('../FullScreenPreviewModal'),
  connectionDiagnostic: () => import('../../common/ConnectionDiagnosticModal'),
  history: () => import('../HistoryModal'),
  checkpoints: () => import('../CheckpointsModal'),
  campaignPicker: () => import('./CampaignPickerModal'),
  sceneEdit: () => import('./SceneEditModal'),
  characterEdit: () => import('./CharacterEditModal'),
  summonCharacter: () => import('./SummonCharacterModal'),
  masterQR: () => import('./MasterQRModal'),
  networkDiagnostics: () => import('../NetworkDiagnosticsModal'),
  manageFavorites: () => import('./ManageFavoritesModal'),
  sceneCompositor: () => import('./SceneCompositorModal'),
  conversationEditor: () => import('./ConversationEditorModal'),
  campaignRevelationJournal: () => import('./CampaignRevelationJournalModal'),
  sessionPrepWizard: () => import('./SessionPrepWizardModal'),
  handoutViewer: () => import('./HandoutViewerModal'),
  campaignRecap: () => import('./CampaignRecapModal'),
  soundboard: () => import('./SoundboardModal'),
  biomeSoundtrack: () => import('./BiomeSoundtrackModal'),
  lightingPresets: () => import('./LightingPresetsModal'),
  sessionChronicleExport: () => import('./SessionChronicleExportModal'),
  sessionLibrary: () => import('./SessionLibraryModal'),
  scenePreset: () => import('./ScenePresetModal'),
  sessionReadiness: () => import('./SessionReadinessModal'),
  resourcePacks: () => import('./ResourcePacksModal'),
};

export function prefetchModal(key: keyof typeof modalLoaders): void {
  try {
    const loader = modalLoaders[key];
    if (loader) {
      void loader();
    }
  } catch {
    // Non-blocking prefetch
  }
}
