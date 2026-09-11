import type { Campaign, Scene, CharacterOnScreen, DMFavoriteItem } from '../../types';

export interface ResolveSmartFavoritesParams {
  currentScene: Scene | null;
  campaign: Campaign | null;
  activeCharacters?: CharacterOnScreen[];
  configuredFavorites?: DMFavoriteItem[];
  limit?: number;
}

/**
 * Resuelve y prioriza la lista de favoritos para la sesión en vivo ("Hoy juego"):
 * 1. Favoritos configurados vinculados específicamente a la escena actual (`sceneId` o `targetId`).
 * 2. NPCs activos en pantalla (acciones rápidas de diálogo/enfoque).
 * 3. Macros cinematográficos relevantes para la escena actual.
 * 4. Escenas siguientes sugeridas de la campaña.
 * 5. Favoritos globales predeterminados del DM.
 */
export function resolveSmartSceneFavorites({
  currentScene,
  campaign,
  activeCharacters = [],
  configuredFavorites = [],
  limit = 12,
}: ResolveSmartFavoritesParams): DMFavoriteItem[] {
  const result: DMFavoriteItem[] = [];
  const seenIds = new Set<string>();

  const addFavorite = (item: DMFavoriteItem) => {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      result.push(item);
    }
  };

  // 1. Favoritos del usuario explícitamente vinculados a la escena actual
  if (currentScene) {
    for (const fav of configuredFavorites) {
      if (fav.sceneId === currentScene.id || (fav.type === 'scene' && fav.targetId === currentScene.id)) {
        addFavorite({
          ...fav,
          isDynamicSuggestion: false,
        });
      }
    }
  }

  // 2. NPCs en pantalla: generar atajos rápidos para hablar o interactuar
  for (const char of activeCharacters) {
    if (result.length >= limit) break;
    addFavorite({
      id: `smart-char-${char.id}`,
      type: 'combatCommand',
      label: `Enfocar ${char.name}`,
      icon: 'Sparkles',
      targetId: char.id,
      sceneId: currentScene?.id,
      isDynamicSuggestion: true,
    });
  }

  // 3. Macros de la campaña que apliquen a la escena actual
  if (campaign?.macros && currentScene) {
    const sceneKeywords = currentScene.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    for (const macro of campaign.macros) {
      if (result.length >= limit) break;
      const macroNameLower = macro.name.toLowerCase();
      const matchesScene = sceneKeywords.some((kw) => macroNameLower.includes(kw));

      if (matchesScene) {
        addFavorite({
          id: `smart-macro-${macro.id}`,
          type: 'macro',
          label: macro.name,
          icon: 'Zap',
          targetId: macro.id,
          sceneId: currentScene.id,
          isDynamicSuggestion: true,
        });
      }
    }
  }

  // 4. Escenas siguientes sugeridas de la campaña (distintas a la actual)
  if (campaign?.scenes && currentScene) {
    const currentIndex = campaign.scenes.findIndex((s) => s.id === currentScene.id);
    const nextScenes = campaign.scenes
      .filter((s) => s.id !== currentScene.id)
      .slice(currentIndex >= 0 ? currentIndex : 0, (currentIndex >= 0 ? currentIndex : 0) + 2);

    for (const nextScene of nextScenes) {
      if (result.length >= limit) break;
      addFavorite({
        id: `smart-next-scene-${nextScene.id}`,
        type: 'scene',
        label: `Ir a ${nextScene.name}`,
        icon: 'Sparkles',
        targetId: nextScene.id,
        sceneId: currentScene.id,
        isDynamicSuggestion: true,
      });
    }
  }

  // 5. Completar con los favoritos configurados globales del DM
  for (const fav of configuredFavorites) {
    if (result.length >= limit) break;
    addFavorite({
      ...fav,
      isDynamicSuggestion: false,
    });
  }

  return result.slice(0, limit);
}

export const DEFAULT_FAVORITES: DMFavoriteItem[] = [
  {
    id: 'fav-lightning',
    type: 'sfx',
    label: 'Rayo y Trueno',
    icon: 'Zap',
    color: '#38bdf8',
    targetId: 'thunder',
    params: { synthPreset: 'thunder' },
  },
  {
    id: 'fav-sword',
    type: 'sfx',
    label: 'Choque de Espadas',
    icon: 'Swords',
    color: '#fbbf24',
    targetId: 'sword_clash',
    params: { synthPreset: 'sword_clash' },
  },
  {
    id: 'fav-victory',
    type: 'sfx',
    label: 'Fanfarria',
    icon: 'Sparkles',
    color: '#34d399',
    targetId: 'victory_fanfare',
    params: { synthPreset: 'victory_fanfare' },
  },
  {
    id: 'fav-monster',
    type: 'sfx',
    label: 'Rugido Bestial',
    icon: 'Skull',
    color: '#f87171',
    targetId: 'monster_growl',
    params: { synthPreset: 'monster_growl' },
  },
];

