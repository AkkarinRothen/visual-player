import { create } from 'zustand';
import type { Campaign, SavedEncounter, Scene, Character } from '../types';
import {
  getAllCampaigns,
  getActiveCampaignId,
  setActiveCampaignId,
  createCampaign as dbCreateCampaign,
  updateCampaign as dbUpdateCampaign,
  duplicateCampaign as dbDuplicateCampaign,
  deleteCampaign as dbDeleteCampaign,
  getCampaignEncounters,
  saveEncounter as dbSaveEncounter,
  deleteEncounter as dbDeleteEncounter,
  initDefaultDataIfNeeded,
} from '../db';

export interface CampaignStoreState {
  campaign: Campaign | null;
  campaignList: Campaign[];
  activeCampaignId: string;
  encountersList: SavedEncounter[];
  isLoading: boolean;

  // Actions
  loadCampaigns: () => Promise<void>;
  setCampaign: (campaign: Campaign | null) => void;
  setCampaignList: (campaignList: Campaign[]) => void;
  selectCampaign: (campaignId: string) => Promise<void>;
  createCampaign: (newCampaign: Campaign) => Promise<void>;
  updateCampaign: (updatedCampaign: Campaign) => Promise<void>;
  duplicateCampaign: (campaignId: string) => Promise<Campaign | null>;
  deleteCampaign: (campaignId: string) => Promise<void>;
  saveEncounter: (encounter: SavedEncounter) => Promise<void>;
  deleteEncounter: (encounterId: string) => Promise<void>;
  updateScene: (scene: Scene) => Promise<void>;
  deleteScene: (sceneId: string) => Promise<void>;
  updateCharacter: (char: Character) => Promise<void>;
  deleteCharacter: (charId: string) => Promise<void>;
}

export const useCampaignStore = create<CampaignStoreState>((set, get) => ({
  campaign: null,
  campaignList: [],
  activeCampaignId: '',
  encountersList: [],
  isLoading: false,

  loadCampaigns: async () => {
    set({ isLoading: true });
    try {
      await initDefaultDataIfNeeded();
      const list = await getAllCampaigns();
      const activeId = await getActiveCampaignId();

      let active = list.find((c) => c.id === activeId) || list[0] || null;
      let encounters: SavedEncounter[] = [];
      if (active) {
        encounters = await getCampaignEncounters(active.id);
      }

      set({
        campaignList: list,
        campaign: active,
        activeCampaignId: active ? active.id : '',
        encountersList: encounters,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load campaigns in useCampaignStore:', error);
      set({ isLoading: false });
    }
  },

  setCampaign: (campaign) => set({ campaign }),
  setCampaignList: (campaignList) => set({ campaignList }),

  selectCampaign: async (campaignId: string) => {
    const { campaignList } = get();
    const found = campaignList.find((c) => c.id === campaignId) || null;
    if (!found) return;

    await setActiveCampaignId(campaignId);
    const encounters = await getCampaignEncounters(campaignId);

    set({
      campaign: found,
      activeCampaignId: campaignId,
      encountersList: encounters,
    });
  },

  createCampaign: async (newCampaign: Campaign) => {
    await dbCreateCampaign(newCampaign);
    const list = await getAllCampaigns();
    set({
      campaignList: list,
      campaign: newCampaign,
      activeCampaignId: newCampaign.id,
      encountersList: [],
    });
  },

  updateCampaign: async (updatedCampaign: Campaign) => {
    await dbUpdateCampaign(updatedCampaign);
    const { campaignList, campaign } = get();
    const updatedList = campaignList.map((c) =>
      c.id === updatedCampaign.id ? updatedCampaign : c
    );

    set({
      campaignList: updatedList,
      campaign: campaign?.id === updatedCampaign.id ? updatedCampaign : campaign,
    });
  },

  duplicateCampaign: async (campaignId: string) => {
    const duplicated = await dbDuplicateCampaign(campaignId);
    if (duplicated) {
      const list = await getAllCampaigns();
      set({
        campaignList: list,
        campaign: duplicated,
        activeCampaignId: duplicated.id,
      });
    }
    return duplicated;
  },

  deleteCampaign: async (campaignId: string) => {
    await dbDeleteCampaign(campaignId);
    const list = await getAllCampaigns();
    const remaining = list[0] || null;
    let encounters: SavedEncounter[] = [];
    if (remaining) {
      encounters = await getCampaignEncounters(remaining.id);
    }

    set({
      campaignList: list,
      campaign: remaining,
      activeCampaignId: remaining ? remaining.id : '',
      encountersList: encounters,
    });
  },

  saveEncounter: async (encounter: SavedEncounter) => {
    await dbSaveEncounter(encounter);
    const { activeCampaignId } = get();
    if (activeCampaignId) {
      const encounters = await getCampaignEncounters(activeCampaignId);
      set({ encountersList: encounters });
    }
  },

  deleteEncounter: async (encounterId: string) => {
    await dbDeleteEncounter(encounterId);
    const { activeCampaignId } = get();
    if (activeCampaignId) {
      const encounters = await getCampaignEncounters(activeCampaignId);
      set({ encountersList: encounters });
    }
  },

  updateScene: async (scene: Scene) => {
    const { campaign } = get();
    if (!campaign) return;

    const existingIndex = campaign.scenes.findIndex((s) => s.id === scene.id);
    const updatedScenes =
      existingIndex >= 0
        ? campaign.scenes.map((s) => (s.id === scene.id ? scene : s))
        : [...campaign.scenes, scene];

    const updatedCamp: Campaign = {
      ...campaign,
      scenes: updatedScenes,
      updatedAt: Date.now(),
    };

    await get().updateCampaign(updatedCamp);
  },

  deleteScene: async (sceneId: string) => {
    const { campaign } = get();
    if (!campaign) return;

    const updatedCamp: Campaign = {
      ...campaign,
      scenes: campaign.scenes.filter((s) => s.id !== sceneId),
      updatedAt: Date.now(),
    };

    await get().updateCampaign(updatedCamp);
  },

  updateCharacter: async (char: Character) => {
    const { campaign } = get();
    if (!campaign) return;

    const existingIndex = campaign.characters.findIndex((c) => c.id === char.id);
    const updatedChars =
      existingIndex >= 0
        ? campaign.characters.map((c) => (c.id === char.id ? char : c))
        : [...campaign.characters, char];

    const updatedCamp: Campaign = {
      ...campaign,
      characters: updatedChars,
      updatedAt: Date.now(),
    };

    await get().updateCampaign(updatedCamp);
  },

  deleteCharacter: async (charId: string) => {
    const { campaign } = get();
    if (!campaign) return;

    const updatedCamp: Campaign = {
      ...campaign,
      characters: campaign.characters.filter((c) => c.id !== charId),
      updatedAt: Date.now(),
    };

    await get().updateCampaign(updatedCamp);
  },
}));
