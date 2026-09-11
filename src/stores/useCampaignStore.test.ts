import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCampaignStore } from './useCampaignStore';
import type { Campaign, Scene, Character } from '../types';

vi.mock('../db', () => {
  const dummyCampaign: Campaign = {
    id: 'camp-test-1',
    title: 'Campaña de Prueba',
    description: 'Descripción test',
    scenes: [
      {
        id: 'scene-1',
        name: 'Plaza Central',
        backgroundUrl: '/img/plaza.jpg',
        weather: 'none',
        lighting: 'normal',
      },
    ],
    characters: [
      {
        id: 'char-1',
        name: 'Gimli',
        roleOrTitle: 'Guerrero',
        defaultAvatarUrl: '/img/gimli.jpg',
      },
    ],
    macros: [],
    createdAt: 1000,
    updatedAt: 1000,
  };

  let mockList = [dummyCampaign];

  return {
    initDefaultDataIfNeeded: vi.fn().mockResolvedValue(undefined),
    getAllCampaigns: vi.fn().mockImplementation(() => Promise.resolve([...mockList])),
    getActiveCampaignId: vi.fn().mockResolvedValue('camp-test-1'),
    setActiveCampaignId: vi.fn().mockResolvedValue(undefined),
    createCampaign: vi.fn().mockImplementation((camp) => {
      mockList.push(camp);
      return Promise.resolve();
    }),
    updateCampaign: vi.fn().mockImplementation((camp) => {
      mockList = mockList.map((c) => (c.id === camp.id ? camp : c));
      return Promise.resolve();
    }),
    duplicateCampaign: vi.fn().mockImplementation((id) => {
      const orig = mockList.find((c) => c.id === id);
      if (!orig) return Promise.resolve(null);
      const copy = { ...orig, id: `camp-copy-${Date.now()}` };
      mockList.push(copy);
      return Promise.resolve(copy);
    }),
    deleteCampaign: vi.fn().mockImplementation((id) => {
      mockList = mockList.filter((c) => c.id !== id);
      return Promise.resolve();
    }),
    getCampaignEncounters: vi.fn().mockResolvedValue([]),
    saveEncounter: vi.fn().mockResolvedValue(undefined),
    deleteEncounter: vi.fn().mockResolvedValue(undefined),
  };
});

describe('useCampaignStore', () => {
  beforeEach(() => {
    useCampaignStore.setState({
      campaign: null,
      campaignList: [],
      activeCampaignId: '',
      encountersList: [],
      isLoading: false,
    });
  });

  it('loads campaigns and sets active campaign from db', async () => {
    await useCampaignStore.getState().loadCampaigns();

    const state = useCampaignStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.campaignList).toHaveLength(1);
    expect(state.campaign?.title).toBe('Campaña de Prueba');
    expect(state.activeCampaignId).toBe('camp-test-1');
  });

  it('updates scenes in the active campaign', async () => {
    await useCampaignStore.getState().loadCampaigns();

    const newScene: Scene = {
      id: 'scene-2',
      name: 'Torre del Mago',
      backgroundUrl: '/img/torre.jpg',
      weather: 'none',
      lighting: 'dark',
    };

    await useCampaignStore.getState().updateScene(newScene);

    const updated = useCampaignStore.getState().campaign;
    expect(updated?.scenes).toHaveLength(2);
    expect(updated?.scenes[1].name).toBe('Torre del Mago');

    // Delete scene
    await useCampaignStore.getState().deleteScene('scene-2');
    const afterDelete = useCampaignStore.getState().campaign;
    expect(afterDelete?.scenes).toHaveLength(1);
  });

  it('updates characters in the active campaign', async () => {
    await useCampaignStore.getState().loadCampaigns();

    const newChar: Character = {
      id: 'char-2',
      name: 'Legolas',
      roleOrTitle: 'Arquero',
      defaultAvatarUrl: '/img/legolas.jpg',
    };

    await useCampaignStore.getState().updateCharacter(newChar);

    const updated = useCampaignStore.getState().campaign;
    expect(updated?.characters).toHaveLength(2);
    expect(updated?.characters[1].name).toBe('Legolas');

    // Delete character
    await useCampaignStore.getState().deleteCharacter('char-2');
    const afterDelete = useCampaignStore.getState().campaign;
    expect(afterDelete?.characters).toHaveLength(1);
  });
});
