import type {
  CharacterOnScreen,
  TacticalGridConfig,
  DialoguePresentationMode,
  DialogueThemeId,
  ShadowPreset,
} from '../../types';

export const DEFAULT_TACTICAL_GRID: TacticalGridConfig = {
  enabled: true,
  type: 'square',
  columns: 10,
  opacity: 0.38,
};

/** Layouts are deliberately only starting points: they never add, remove, or rename figures. */
export type SceneLayoutTemplate = 'jrpg-battle' | 'visual-novel' | 'tactical-map';

export interface TemplatePresentationRecommendation {
  suggestedPresentationMode: DialoguePresentationMode;
  suggestedThemeId: DialogueThemeId;
  defaultShadowPreset: ShadowPreset;
  nameplatePosition: 'auto' | 'bottom' | 'top' | 'side';
  title: string;
  description: string;
}

export const TEMPLATE_RECOMMENDATIONS: Record<SceneLayoutTemplate, TemplatePresentationRecommendation> = {
  'jrpg-battle': {
    suggestedPresentationMode: 'balloon',
    suggestedThemeId: 'jrpg-retro',
    defaultShadowPreset: 'soft-ellipse',
    nameplatePosition: 'auto',
    title: 'Batalla JRPG',
    description: 'Figuras enfrentadas en dos bandos, globos con cola sobre el hablante y sombras elípticas de suelo.',
  },
  'visual-novel': {
    suggestedPresentationMode: 'visual-novel',
    suggestedThemeId: 'classic-fantasy',
    defaultShadowPreset: 'soft-ellipse',
    nameplatePosition: 'bottom',
    title: 'Novela Visual / Diálogo',
    description: 'Protagonistas destacados en primer plano con caja inferior cinematográfica.',
  },
  'tactical-map': {
    suggestedPresentationMode: 'subtitle',
    suggestedThemeId: 'cyber-modern',
    defaultShadowPreset: 'elongated',
    nameplatePosition: 'bottom',
    title: 'Mapa Táctico',
    description: 'Miniaturas compactas en cuadrícula regular con peanas y sombras alargadas.',
  },
};

export interface ApplyTemplateOptions {
  applyComposition?: boolean;
  applyPresentation?: boolean;
}

const place = (
  character: CharacterOnScreen,
  x: number,
  y: number,
  scale: number,
  isFlipped = false
): CharacterOnScreen => ({
  ...character,
  normalizedX: x,
  normalizedY: y,
  scale,
  isFlipped,
  isSpeaking: false,
});

export function applySceneLayoutTemplate(
  characters: CharacterOnScreen[],
  template: SceneLayoutTemplate,
  options: ApplyTemplateOptions = { applyComposition: true, applyPresentation: true }
): CharacterOnScreen[] {
  if (characters.length === 0) return [];

  const rec = TEMPLATE_RECOMMENDATIONS[template];
  let processed = [...characters];

  // 1. Physical composition layer (positions, scales, flip)
  if (options.applyComposition !== false) {
    if (template === 'visual-novel') {
      const slots = [18, 82, 50, 34, 66];
      processed = processed.map((character, index) =>
        place(character, slots[index] ?? 50, index < 2 ? 0 : 4, index < 2 ? 1.18 : 0.82, index === 1 || index === 4)
      );
    } else if (template === 'tactical-map') {
      const columns = 5;
      processed = processed.map((character, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return place(character, 14 + column * 18, 17 + row * 19, 0.42, false);
      });
    } else {
      // 'jrpg-battle'
      const hasTeams = processed.some((character) => character.tacticalTeam);
      const partySize = hasTeams
        ? processed.filter((character) => character.tacticalTeam !== 'enemies').length
        : Math.ceil(processed.length / 2);
      let partyIndex = 0;
      let enemyIndex = 0;
      processed = processed.map((character, index) => {
        const isParty = hasTeams ? character.tacticalTeam !== 'enemies' : index < partySize;
        const offset = isParty ? partyIndex++ : enemyIndex++;
        const count = isParty ? partySize : Math.max(1, processed.length - partySize);
        const y = count === 1 ? 0 : 5 + (offset % 3) * 14;
        const x = isParty ? 20 + Math.floor(offset / 3) * 13 : 80 - Math.floor(offset / 3) * 13;
        return place(character, x, y, 0.9, !isParty);
      });
    }
  }

  // 2. Presentation layer (shadow preset, nameplate positioning)
  if (options.applyPresentation !== false) {
    processed = processed.map((character) => ({
      ...character,
      shadowPreset: character.shadowPreset || rec.defaultShadowPreset,
      nameplatePosition: character.nameplatePosition || rec.nameplatePosition,
    }));
  }

  return processed;
}
