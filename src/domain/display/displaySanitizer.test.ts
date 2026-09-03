import { describe, it, expect } from 'vitest';
import {
  sanitizeCharacterForDisplay,
  sanitizeDisplayStateForDisplay,
  GENERIC_SILHOUETTE_URL,
} from './displaySanitizer';
import type { CharacterOnScreen, DisplayState } from '../../types';

describe('Zero-Leak Display Sanitizer Suite', () => {
  const secretNpc: CharacterOnScreen = {
    id: 'npc-secret-assassin',
    name: 'Lord Corvus (El Asesino de la Rosa)',
    avatarUrl: 'https://example.com/portraits/corvus_unmasked.png',
    position: 'center-right',
    normalizedX: 60,
    normalizedY: 80,
    isSpeaking: true,
    revelation: {
      isAppearanceRevealed: false,
      isIdentityRevealed: false,
      publicAlias: 'Figura Encapuchada',
    },
  };

  it('1. Replaces secret avatar and true name when appearance & identity are unrevealed', () => {
    const sanitized = sanitizeCharacterForDisplay(secretNpc);

    // Zero-Leak assertion: secret strings MUST NOT appear
    expect(sanitized.avatarUrl).not.toContain('corvus_unmasked');
    expect(sanitized.avatarUrl).toBe(GENERIC_SILHOUETTE_URL);
    expect(sanitized.name).toBe('Figura Encapuchada');
    expect(sanitized.id).toBe('npc-secret-assassin'); // Stable ID preserved
  });

  it('2. Allows flexible sequence: reveals face while keeping identity secret', () => {
    const faceRevealedOnly: CharacterOnScreen = {
      ...secretNpc,
      revelation: {
        isAppearanceRevealed: true,
        isIdentityRevealed: false,
        publicAlias: 'Espadachín Misterioso',
      },
    };

    const sanitized = sanitizeCharacterForDisplay(faceRevealedOnly);
    expect(sanitized.avatarUrl).toBe('https://example.com/portraits/corvus_unmasked.png');
    expect(sanitized.name).toBe('Espadachín Misterioso');
  });

  it('3. Allows flexible sequence: reveals name while keeping face in silhouette', () => {
    const nameRevealedOnly: CharacterOnScreen = {
      ...secretNpc,
      revelation: {
        isAppearanceRevealed: false,
        isIdentityRevealed: true,
      },
    };

    const sanitized = sanitizeCharacterForDisplay(nameRevealedOnly);
    expect(sanitized.avatarUrl).toBe(GENERIC_SILHOUETTE_URL);
    expect(sanitized.name).toBe('Lord Corvus (El Asesino de la Rosa)');
  });

  it('4. Sanitizes entire DisplayState and active dialogue speaker without leaking', () => {
    const liveState: DisplayState = {
      currentSceneId: 'sc-shadows',
      sceneName: 'Callejón Brumoso',
      backgroundUrl: 'https://example.com/alley.jpg',
      characters: [secretNpc],
      weather: 'none',
      weatherIntensity: 0,
      lighting: 'normal',
      locationBanner: { text: 'Callejón', visible: true },
      isBlackout: false,
      shakeTrigger: 0,
      lightningTrigger: 0,
      ambientAudioUrl: '',
      ambientPlaying: false,
      ambientVolume: 0.5,
      lastSfx: null,
      combatState: { isActive: false, round: 0, currentTurnIndex: 0, combatants: [] },
      dialogue: {
        id: 'dlg-1',
        speakerInstanceId: 'npc-secret-assassin',
        speakerName: secretNpc.name,
        avatarUrl: secretNpc.avatarUrl,
        text: 'Nadie puede verme el rostro todavía.',
        style: 'whisper',
        visible: true,
      },
    };

    const sanitizedState = sanitizeDisplayStateForDisplay(liveState);

    // Characters array sanitized
    expect(sanitizedState.characters[0].avatarUrl).toBe(GENERIC_SILHOUETTE_URL);
    expect(sanitizedState.characters[0].name).toBe('Figura Encapuchada');

    // Dialogue speaker projection sanitized
    expect(sanitizedState.dialogue?.avatarUrl).toBe(GENERIC_SILHOUETTE_URL);
    expect(sanitizedState.dialogue?.speakerName).toBe('Figura Encapuchada');
  });

  it('5. Regular characters without revelation are untouched', () => {
    const regularNpc: CharacterOnScreen = {
      id: 'npc-paladin',
      name: 'Sir Gareth',
      avatarUrl: 'https://example.com/gareth.png',
      position: 'center-left',
      normalizedX: 40,
      normalizedY: 80,
      isSpeaking: false,
    };

    const sanitized = sanitizeCharacterForDisplay(regularNpc);
    expect(sanitized.avatarUrl).toBe(regularNpc.avatarUrl);
    expect(sanitized.name).toBe(regularNpc.name);
  });
});
