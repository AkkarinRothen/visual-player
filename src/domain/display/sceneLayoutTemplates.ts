import type { CharacterOnScreen } from '../../types';

/** Layouts are deliberately only starting points: they never add, remove, or rename figures. */
export type SceneLayoutTemplate = 'jrpg-battle' | 'visual-novel' | 'tactical-map';

const place = (character: CharacterOnScreen, x: number, y: number, scale: number, isFlipped = false): CharacterOnScreen => ({
  ...character,
  normalizedX: x,
  normalizedY: y,
  scale,
  isFlipped,
  isSpeaking: false,
});

export function applySceneLayoutTemplate(
  characters: CharacterOnScreen[],
  template: SceneLayoutTemplate
): CharacterOnScreen[] {
  if (characters.length === 0) return [];

  if (template === 'visual-novel') {
    const slots = [18, 82, 50, 34, 66];
    return characters.map((character, index) =>
      place(character, slots[index] ?? 50, index < 2 ? 0 : 4, index < 2 ? 1.18 : 0.82, index === 1 || index === 4)
    );
  }

  if (template === 'tactical-map') {
    const columns = 5;
    return characters.map((character, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return place(character, 14 + column * 18, 17 + row * 19, 0.42, false);
    });
  }

  // JRPG: first half of the current layer list is the party, second half the opposition.
  // The order remains visible and can be refined by the director afterwards.
  const partySize = Math.ceil(characters.length / 2);
  return characters.map((character, index) => {
    const isParty = index < partySize;
    const offset = isParty ? index : index - partySize;
    const count = isParty ? partySize : Math.max(1, characters.length - partySize);
    const y = count === 1 ? 0 : 5 + (offset % 3) * 14;
    const x = isParty ? 20 + Math.floor(offset / 3) * 13 : 80 - Math.floor(offset / 3) * 13;
    return place(character, x, y, 0.9, !isParty);
  });
}
