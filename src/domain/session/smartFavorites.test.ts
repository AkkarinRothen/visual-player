import { describe, it, expect } from 'vitest';
import { resolveSmartSceneFavorites } from './smartFavorites';
import type { Campaign, Scene, CharacterOnScreen, DMFavoriteItem } from '../../types';

describe('resolveSmartSceneFavorites Suite', () => {
  const mockScene: Scene = {
    id: 'scene-tavern',
    name: 'Taberna del Dragón',
    backgroundUrl: 'https://example.com/tavern.jpg',
    weather: 'none',
    lighting: 'normal',
  };

  const mockScene2: Scene = {
    id: 'scene-forest',
    name: 'Bosque Sombrío',
    backgroundUrl: 'https://example.com/forest.jpg',
    weather: 'rain',
    lighting: 'night',
  };

  const mockCampaign: Campaign = {
    id: 'camp-1',
    title: 'Campaña de Prueba',
    createdAt: Date.now(),
    scenes: [mockScene, mockScene2],
    characters: [],
    macros: [
      {
        id: 'macro-tavern-brawl',
        name: 'Pelea en la Taberna',
        description: 'Pelea de bar',
        icon: 'Zap',
        steps: [],
      },
      {
        id: 'macro-forest-fog',
        name: 'Niebla del Bosque',
        description: 'Niebla espesa',
        icon: 'Cloud',
        steps: [],
      },
    ],
  };

  const mockActiveCharacters: CharacterOnScreen[] = [
    {
      id: 'char-instance-1',
      characterId: 'char-innkeeper',
      name: 'Tabernero Durmiente',
      avatarUrl: 'https://example.com/innkeeper.png',
      position: 'center-left',
      isSpeaking: false,
    },
  ];

  const mockConfiguredFavorites: DMFavoriteItem[] = [
    {
      id: 'fav-global-lightning',
      type: 'sfx',
      label: 'Trueno Fuerte',
      icon: 'Zap',
    },
    {
      id: 'fav-tavern-special',
      type: 'sfx',
      label: 'Música de Taberna',
      sceneId: 'scene-tavern',
      icon: 'Volume2',
    },
  ];

  it('1. Prioritizes explicit scene favorites at the top', () => {
    const result = resolveSmartSceneFavorites({
      currentScene: mockScene,
      campaign: mockCampaign,
      activeCharacters: [],
      configuredFavorites: mockConfiguredFavorites,
    });

    expect(result[0].id).toBe('fav-tavern-special');
    expect(result[0].isDynamicSuggestion).toBe(false);
  });

  it('2. Dynamically generates quick actions for active characters on screen', () => {
    const result = resolveSmartSceneFavorites({
      currentScene: mockScene,
      campaign: mockCampaign,
      activeCharacters: mockActiveCharacters,
      configuredFavorites: [],
    });

    const charFav = result.find((f) => f.id === 'smart-char-char-instance-1');
    expect(charFav).toBeDefined();
    expect(charFav?.label).toContain('Tabernero Durmiente');
    expect(charFav?.isDynamicSuggestion).toBe(true);
  });

  it('3. Matches campaign macros that correspond to the current scene name', () => {
    const result = resolveSmartSceneFavorites({
      currentScene: mockScene,
      campaign: mockCampaign,
      activeCharacters: [],
      configuredFavorites: [],
    });

    const macroFav = result.find((f) => f.id === 'smart-macro-macro-tavern-brawl');
    expect(macroFav).toBeDefined();
    expect(macroFav?.label).toBe('Pelea en la Taberna');
    expect(macroFav?.isDynamicSuggestion).toBe(true);
  });

  it('4. Recommends next campaign scene when current scene is active', () => {
    const result = resolveSmartSceneFavorites({
      currentScene: mockScene,
      campaign: mockCampaign,
      activeCharacters: [],
      configuredFavorites: [],
    });

    const nextSceneFav = result.find((f) => f.id === 'smart-next-scene-scene-forest');
    expect(nextSceneFav).toBeDefined();
    expect(nextSceneFav?.label).toBe('Ir a Bosque Sombrío');
  });

  it('5. Appends global favorites without duplicates', () => {
    const result = resolveSmartSceneFavorites({
      currentScene: mockScene,
      campaign: mockCampaign,
      activeCharacters: mockActiveCharacters,
      configuredFavorites: mockConfiguredFavorites,
    });

    const globalFav = result.find((f) => f.id === 'fav-global-lightning');
    expect(globalFav).toBeDefined();
    expect(globalFav?.isDynamicSuggestion).toBe(false);
  });
});
