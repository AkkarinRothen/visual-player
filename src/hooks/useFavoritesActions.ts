import { useState, useCallback } from 'react';
import type { Campaign, CinematicMacro, DisplayState, DMFavoriteItem, Scene, SessionCheckpoint } from '../types';
import { soundEngine } from '../services/soundEngine';
import { sessionCommandBus } from '../services/sessionCommandBus';

export interface UseFavoritesActionsOptions {
  campaign: Campaign | null;
  updateCampaign: (campaign: Campaign) => Promise<void>;
  setCampaign: (campaign: Campaign) => void;
  selectScene: (scene: Scene) => void;
  handleExecuteMacro: (macro: CinematicMacro) => void;
  liveState: DisplayState;
  saveCheckpoint: (cp: SessionCheckpoint) => Promise<void>;
}

export function useFavoritesActions({
  campaign,
  updateCampaign,
  setCampaign,
  selectScene,
  handleExecuteMacro,
  liveState,
  saveCheckpoint,
}: UseFavoritesActionsOptions) {
  const [favoriteCmdMap, setFavoriteCmdMap] = useState<Record<string, string>>({});

  const saveFavorites = useCallback(
    async (updated: DMFavoriteItem[]) => {
      if (!campaign) return;
      const updatedCampaign: Campaign = {
        ...campaign,
        favorites: updated,
        updatedAt: Date.now(),
      };
      await updateCampaign(updatedCampaign);
      setCampaign(updatedCampaign);
    },
    [campaign, updateCampaign, setCampaign]
  );

  const executeFavorite = useCallback(
    async (item: DMFavoriteItem): Promise<boolean> => {
      try {
        if (item.type === 'scene' && item.targetId) {
          const sc = campaign?.scenes.find((s) => s.id === item.targetId);
          if (sc) {
            selectScene(sc);
            const cmdId = sessionCommandBus.dispatchFullState(
              {
                ...liveState,
                currentSceneId: sc.id,
                sceneName: sc.name,
                backgroundUrl: sc.backgroundUrl,
              }
            );
            setFavoriteCmdMap((prev) => ({ ...prev, [item.id]: cmdId }));
            const receipt = await sessionCommandBus.waitForResult(cmdId, 4500);
            return receipt.status === 'applied';
          }
          return false;
        }

        if (item.type === 'macro' && item.targetId) {
          const mc = campaign?.macros?.find((m) => m.id === item.targetId);
          if (mc) {
            handleExecuteMacro(mc);
            return true;
          }
          return false;
        }

        if (item.type === 'sfx') {
          const preset = (item.params?.synthPreset as string) || item.targetId || 'thunder';
          soundEngine.playSynth(preset);
          const cmdId = sessionCommandBus.dispatchSfx(preset, undefined, item.label);
          setFavoriteCmdMap((prev) => ({ ...prev, [item.id]: cmdId }));
          const receipt = await sessionCommandBus.waitForResult(cmdId, 3500);
          return receipt.status === 'applied';
        }

        if (item.type === 'checkpoint') {
          if (!campaign) return false;
          const cmdId = await sessionCommandBus.dispatchLocalCheckpoint(
            `Favorito: ${item.label}`,
            liveState,
            saveCheckpoint,
            campaign.id
          );
          setFavoriteCmdMap((prev) => ({ ...prev, [item.id]: cmdId }));
          const receipt = await sessionCommandBus.waitForResult(cmdId, 2000);
          return receipt.status === 'saved';
        }

        return false;
      } catch {
        return false;
      }
    },
    [campaign, selectScene, handleExecuteMacro, liveState, saveCheckpoint]
  );

  return {
    favorites: campaign?.favorites || [],
    saveFavorites,
    executeFavorite,
    favoriteCmdMap,
  };
}
