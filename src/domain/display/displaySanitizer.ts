import type { CharacterOnScreen, DisplayState } from '../../types';

/**
 * Generic anonymous dark hooded silhouette in SVG data URI format.
 * Guarantees Zero-Leak: no network request or file inspectable in DevTools will reveal the real portrait.
 */
export const GENERIC_SILHOUETTE_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
      '<rect width="200" height="200" fill="#090d16"/>' +
      '<circle cx="100" cy="72" r="36" fill="#1e293b"/>' +
      '<path d="M38 185 C38 122 162 122 162 185 Z" fill="#1e293b"/>' +
      '<circle cx="100" cy="72" r="33" fill="#0f172a"/>' +
      '<path d="M42 182 C42 126 158 126 158 182 Z" fill="#0f172a"/>' +
      '<circle cx="100" cy="72" r="30" fill="#070a10"/>' +
      '<path d="M46 180 C46 130 154 130 154 180 Z" fill="#070a10"/>' +
      '</svg>'
  );

/**
 * Pure projection sanitizer for a single character on screen.
 * If appearance is unrevealed, replaces avatarUrl with a generic or styled silhouette.
 * If identity is unrevealed, replaces name with the public alias or 'Desconocido'.
 */
export function sanitizeCharacterForDisplay(char: CharacterOnScreen): CharacterOnScreen {
  // Strip DM-only privateLabel so it is never transmitted to the Mesa
  const { privateLabel, ...cleanedChar } = char;

  if (!cleanedChar.revelation) {
    return cleanedChar;
  }

  const { isAppearanceRevealed, isIdentityRevealed, silhouetteUrl, publicAlias } = cleanedChar.revelation;

  const publicAvatarUrl =
    isAppearanceRevealed === false
      ? silhouetteUrl || GENERIC_SILHOUETTE_URL
      : cleanedChar.avatarUrl;

  const publicName =
    isIdentityRevealed === false
      ? publicAlias || 'Desconocido'
      : cleanedChar.name;

  return {
    ...cleanedChar,
    avatarUrl: publicAvatarUrl,
    name: publicName,
  };
}

/**
 * Sanitizes entire DisplayState before dispatching across WebRTC / network to the players Mesa.
 * Ensures strict Zero-Leak security:
 * 1. Secret names and portraits are eliminated before transmission.
 * 2. Hidden characters (isHidden: true) and in-reserve characters (presence: 'in_reserve') are pruned.
 * 3. DM-only privateLabel is suppressed.
 */
export function sanitizeDisplayStateForDisplay(state: DisplayState): DisplayState {
  if (!state.characters || state.characters.length === 0) {
    return state;
  }

  // Filter out any character that is hidden or in reserve
  const publicActiveCharacters = state.characters
    .filter((c) => c.presence !== 'in_reserve' && c.isHidden !== true)
    .map(sanitizeCharacterForDisplay);

  let sanitizedDialogue = state.dialogue;
  if (sanitizedDialogue && sanitizedDialogue.speakerInstanceId) {
    const speakerChar = state.characters.find(
      (c) => c.id === sanitizedDialogue?.speakerInstanceId
    );
    if (speakerChar?.revelation) {
      const { isAppearanceRevealed, isIdentityRevealed, silhouetteUrl, publicAlias } =
        speakerChar.revelation;

      sanitizedDialogue = {
        ...sanitizedDialogue,
        avatarUrl:
          isAppearanceRevealed === false
            ? silhouetteUrl || GENERIC_SILHOUETTE_URL
            : sanitizedDialogue.avatarUrl,
        speakerName:
          isIdentityRevealed === false
            ? publicAlias || 'Desconocido'
            : sanitizedDialogue.speakerName,
      };
    }
  }

  return {
    ...state,
    characters: publicActiveCharacters,
    dialogue: sanitizedDialogue,
  };
}
