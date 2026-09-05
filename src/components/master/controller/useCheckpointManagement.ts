import { useState, useCallback } from 'react';
import type { Campaign, DisplayState, HistoryEvent, SessionCheckpoint } from '../../../types';
import { saveCheckpoint, getCampaignCheckpoints, deleteCheckpoint } from '../../../db';
import { soundEngine } from '../../../services/soundEngine';

export interface UseCheckpointManagementParams {
  campaign: Campaign | null;
  activeDisplay: DisplayState;
  liveState: DisplayState;
  restoreSnapshot: (state: DisplayState, description: string) => void;
}

export const useCheckpointManagement = ({
  campaign,
  activeDisplay,
  liveState,
  restoreSnapshot,
}: UseCheckpointManagementParams) => {
  const [checkpointsList, setCheckpointsList] = useState<SessionCheckpoint[]>([]);

  // Helper: Create Auto-Checkpoint in Dexie
  const createAutoCheckpoint = useCallback(
    async (triggerName: string, stateToSave: DisplayState) => {
      if (!campaign) return;
      const autoCp: SessionCheckpoint = {
        id: `cp-auto-${Date.now()}`,
        campaignId: campaign.id,
        name: `Auto: ${triggerName}`,
        type: 'auto',
        trigger: triggerName,
        createdAt: Date.now(),
        state: stateToSave,
      };
      await saveCheckpoint(autoCp);
      const updated = await getCampaignCheckpoints(campaign.id);
      setCheckpointsList(updated);
    },
    [campaign]
  );

  // Manual Checkpoint
  const handleSaveManualCheckpoint = useCallback(
    async (name: string) => {
      if (!campaign) return;
      const cp: SessionCheckpoint = {
        id: `cp-manual-${Date.now()}`,
        campaignId: campaign.id,
        name,
        type: 'manual',
        trigger: 'Manual',
        createdAt: Date.now(),
        state: activeDisplay,
      };
      await saveCheckpoint(cp);
      const updated = await getCampaignCheckpoints(campaign.id);
      setCheckpointsList(updated);
      soundEngine.playSynth('church_bell');
    },
    [campaign, activeDisplay]
  );

  // Restore Checkpoint
  const handleRestoreCheckpoint = useCallback(
    async (checkpoint: SessionCheckpoint) => {
      await createAutoCheckpoint(`Seguridad: Antes de restaurar "${checkpoint.name}"`, liveState);
      restoreSnapshot(checkpoint.state, `Restaurado Checkpoint: ${checkpoint.name}`);
      soundEngine.playSynth('fanfare_victory');
    },
    [createAutoCheckpoint, liveState, restoreSnapshot]
  );

  // Delete Checkpoint
  const handleDeleteCheckpoint = useCallback(
    async (id: string) => {
      if (!campaign) return;
      await deleteCheckpoint(id);
      const updated = await getCampaignCheckpoints(campaign.id);
      setCheckpointsList(updated);
    },
    [campaign]
  );

  // History restore
  const handleRestoreFromHistory = useCallback(
    (evt: HistoryEvent) => {
      restoreSnapshot(evt.stateSnapshot, `Restaurado a: ${evt.description}`);
    },
    [restoreSnapshot]
  );

  return {
    checkpointsList,
    setCheckpointsList,
    createAutoCheckpoint,
    handleSaveManualCheckpoint,
    handleRestoreCheckpoint,
    handleDeleteCheckpoint,
    handleRestoreFromHistory,
  };
};
