import { describe, it, expect } from 'vitest';
import type {
  CombatState,
  Combatant,
  CharacterOnScreen,
  CombatTrackingMode,
} from '../../types';

describe('Cinematic Combat Suite', () => {
  const mockCharacters: CharacterOnScreen[] = [
    {
      id: 'npc-guard-1',
      name: 'Guardia Real',
      avatarUrl: 'https://example.com/guard.png',
      position: 'center-left',
      normalizedX: 35,
      normalizedY: 50,
      isSpeaking: false,
    },
    {
      id: 'npc-cultist-1',
      name: 'Cultista Sombrío',
      avatarUrl: 'https://example.com/cultist.png',
      position: 'right',
      normalizedX: 75,
      normalizedY: 60,
      isSpeaking: false,
    },
  ];

  const mockCombatants: Combatant[] = [
    {
      id: 'comb-1',
      characterId: 'npc-guard-1',
      name: 'Guardia Real',
      avatarUrl: 'https://example.com/guard.png',
      initiative: 18,
      currentHp: 25,
      maxHp: 30,
      showHpToPlayers: true,
      conditions: ['blessed'],
      isMonster: false,
    },
    {
      id: 'comb-2',
      characterId: 'npc-cultist-1',
      name: 'Cultista Sombrío',
      avatarUrl: 'https://example.com/cultist.png',
      initiative: 14,
      currentHp: 12,
      maxHp: 20,
      showHpToPlayers: true,
      conditions: ['poisoned', 'burning'],
      isMonster: true,
    },
    {
      id: 'comb-3',
      name: 'Refuerzo Fuera de Pantalla',
      avatarUrl: 'https://example.com/hidden.png',
      initiative: 8,
      currentHp: 15,
      maxHp: 15,
      showHpToPlayers: false,
      conditions: [],
      isMonster: true,
      isSecret: true,
    },
  ];

  const combatState: CombatState = {
    isActive: true,
    round: 1,
    currentTurnIndex: 0,
    combatants: mockCombatants,
    trackingMode: 'suggest',
  };

  it('1. Links active combatant by characterId and identifies on-screen focal instance', () => {
    const activeCombatant = combatState.combatants[combatState.currentTurnIndex];
    expect(activeCombatant.id).toBe('comb-1');

    // Matching on screen
    const matchingChar = mockCharacters.find(
      (c) => c.id === activeCombatant.characterId || c.id === activeCombatant.id
    );

    expect(matchingChar).toBeDefined();
    expect(matchingChar?.id).toBe('npc-guard-1');
    expect(activeCombatant.conditions).toContain('blessed');
  });

  it('2. Suggest mode proposes focus target without auto-altering camera transform', () => {
    const nextTurnIndex = 1;
    const nextCombatant = combatState.combatants[nextTurnIndex];
    const targetChar = mockCharacters.find(
      (c) => c.id === nextCombatant.characterId || c.id === nextCombatant.id
    );

    const mode: CombatTrackingMode = 'suggest';
    let autoCameraFocal: { x: number; y: number } | null = null;
    let suggestedCharacterId: string | null = null;

    if (mode === 'suggest') {
      suggestedCharacterId = targetChar ? targetChar.id : null;
    } else if (mode === 'auto' && targetChar) {
      autoCameraFocal = { x: targetChar.normalizedX!, y: targetChar.normalizedY! };
    }

    expect(suggestedCharacterId).toBe('npc-cultist-1');
    expect(autoCameraFocal).toBeNull(); // No auto-movement in suggest mode
  });

  it('3. Auto mode computes focal point of target character', () => {
    const activeCombatant = combatState.combatants[1]; // Cultist
    const targetChar = mockCharacters.find(
      (c) => c.id === activeCombatant.characterId || c.id === activeCombatant.id
    );

    const mode: CombatTrackingMode = 'auto';
    let autoCamera: { focalPoint: { x: number; y: number }; zoom: number } | null = null;

    if (mode === 'auto' && targetChar) {
      autoCamera = {
        focalPoint: {
          x: targetChar.normalizedX ?? 50,
          y: targetChar.normalizedY ?? 50,
        },
        zoom: 1.35,
      };
    }

    expect(autoCamera).not.toBeNull();
    expect(autoCamera?.focalPoint.x).toBe(75);
    expect(autoCamera?.focalPoint.y).toBe(60);
    expect(autoCamera?.zoom).toBe(1.35);
  });

  it('4. Off-screen combatant handling: does not propose or pan camera if character is not deployed on stage', () => {
    const offscreenCombatant = combatState.combatants[2]; // Refuerzo Fuera de Pantalla
    const targetChar = mockCharacters.find(
      (c) => c.id === offscreenCombatant.characterId || c.id === offscreenCombatant.id
    );

    expect(targetChar).toBeUndefined();

    const suggestedCharacterId = targetChar ? (targetChar as any).id : null;
    expect(suggestedCharacterId).toBeNull();
  });
});
