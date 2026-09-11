import { describe, it, expect, beforeEach } from 'vitest';
import { useMasterModalStore } from './useMasterModalStore';

describe('useMasterModalStore (Zustand Master Modals State)', () => {
  beforeEach(() => {
    useMasterModalStore.getState().closeAllModals();
  });

  it('initializes with all modals closed by default', () => {
    const state = useMasterModalStore.getState();
    expect(state.showCompositorModal).toBe(false);
    expect(state.showSoundboardModal).toBe(false);
    expect(state.showHandoutViewerModal).toBe(false);
    expect(state.showDiagnosticsModal).toBe(false);
    expect(state.showCheckpointsModal).toBe(false);
    expect(state.mobileToolsOpen).toBe(false);
  });

  it('opens and closes specific modals independently', () => {
    const { setShowCompositorModal, setShowSoundboardModal } = useMasterModalStore.getState();

    setShowCompositorModal(true);
    expect(useMasterModalStore.getState().showCompositorModal).toBe(true);
    expect(useMasterModalStore.getState().showSoundboardModal).toBe(false);

    setShowSoundboardModal(true);
    expect(useMasterModalStore.getState().showSoundboardModal).toBe(true);

    setShowCompositorModal(false);
    expect(useMasterModalStore.getState().showCompositorModal).toBe(false);
    expect(useMasterModalStore.getState().showSoundboardModal).toBe(true);
  });

  it('updates scene preset mode between save and insert', () => {
    const { setScenePresetMode, setShowScenePresetModal } = useMasterModalStore.getState();

    setScenePresetMode('insert');
    setShowScenePresetModal(true);

    const state = useMasterModalStore.getState();
    expect(state.scenePresetMode).toBe('insert');
    expect(state.showScenePresetModal).toBe(true);
  });

  it('closes all modals when closeAllModals is invoked', () => {
    const {
      setShowDiagnosticsModal,
      setShowCampaignPickerModal,
      setShowHistoryModal,
      setMobileToolsOpen,
      closeAllModals,
    } = useMasterModalStore.getState();

    setShowDiagnosticsModal(true);
    setShowCampaignPickerModal(true);
    setShowHistoryModal(true);
    setMobileToolsOpen(true);

    expect(useMasterModalStore.getState().showDiagnosticsModal).toBe(true);
    expect(useMasterModalStore.getState().mobileToolsOpen).toBe(true);

    closeAllModals();

    const state = useMasterModalStore.getState();
    expect(state.showDiagnosticsModal).toBe(false);
    expect(state.showCampaignPickerModal).toBe(false);
    expect(state.showHistoryModal).toBe(false);
    expect(state.mobileToolsOpen).toBe(false);
  });
});
