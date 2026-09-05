import { describe, it, expect } from 'vitest';
import {
  advanceDialogueStep,
  previousDialogueStep,
  sanitizeDialogueForPublicDisplay,
} from './dialogueSession';
import type { CharacterOnScreen, ConversationSession, DialogueLine } from '../../types';

describe('dialogueSession suite', () => {
  const speaker: CharacterOnScreen = {
    id: 'hero-1',
    name: 'Kyra',
    avatarUrl: 'https://example.com/kyra.png',
    position: 'center-left',
    isSpeaking: true,
  };

  const concealedSpeaker: CharacterOnScreen = {
    id: 'npc-secret',
    name: 'Lord Malakor',
    avatarUrl: 'https://example.com/malakor.png',
    position: 'right',
    isSpeaking: true,
    revelation: {
      isAppearanceRevealed: false,
      isIdentityRevealed: false,
      publicAlias: 'Hombre Misterioso',
    },
  };

  const sampleLines: DialogueLine[] = [
    {
      id: 'line-1',
      speakerCharacterId: 'hero-1',
      speakerName: 'Kyra',
      text: 'Who is up for a little target practice?',
      dmNotes: 'SECRET: Kyra will betray the party later.',
      choices: [{ id: 'c1', label: 'Secret branch', targetLineId: 'line-9' }],
      presentationMode: 'balloon',
      themeId: 'jrpg-retro',
    },
    {
      id: 'line-2',
      speakerCharacterId: 'hero-1',
      speakerName: 'Kyra',
      text: 'Let us show them what we got!',
      presentationMode: 'balloon',
      themeId: 'jrpg-retro',
    },
  ];

  it('1. Strictly sanitizes dialogue, excluding dmNotes and private choices', () => {
    const sanitized = sanitizeDialogueForPublicDisplay(sampleLines[0], speaker, false);

    expect(sanitized.text).toBe('Who is up for a little target practice?');
    expect(sanitized.speakerName).toBe('Kyra');
    expect(sanitized.avatarUrl).toBe('https://example.com/kyra.png');
    expect(sanitized.presentationMode).toBe('balloon');
    expect(sanitized.themeId).toBe('jrpg-retro');
    // Verify that dmNotes and choices are not present on sanitized CinematicDialogue
    expect((sanitized as any).dmNotes).toBeUndefined();
    expect((sanitized as any).choices).toBeUndefined();
  });

  it('2. Uses publicAlias and hides avatar when identity is not revealed', () => {
    const line: DialogueLine = {
      id: 'line-x',
      speakerCharacterId: 'npc-secret',
      text: 'No sabrán quién los golpeó...',
    };

    const sanitized = sanitizeDialogueForPublicDisplay(line, concealedSpeaker, false);
    expect(sanitized.speakerName).toBe('Hombre Misterioso');
    expect(sanitized.avatarUrl).toBeUndefined();
  });

  it('3. Two-touch rule: 1st touch completes typewriter if typing', () => {
    const session: ConversationSession = {
      conversationId: 'conv-1',
      currentLineIndex: 0,
      lines: sampleLines,
    };

    // 1st touch while typing
    const firstTouchResult = advanceDialogueStep(session, true, [speaker]);
    expect(firstTouchResult.status).toBe('complete');
    expect(firstTouchResult.currentLineIndex).toBe(0);
    expect(firstTouchResult.activeDialogue?.isCompleted).toBe(true);
  });

  it('4. Two-touch rule: 2nd touch advances to next line when completed', () => {
    const session: ConversationSession = {
      conversationId: 'conv-1',
      currentLineIndex: 0,
      lines: sampleLines,
    };

    // 2nd touch when text is already complete
    const secondTouchResult = advanceDialogueStep(session, false, [speaker]);
    expect(secondTouchResult.status).toBe('typing');
    expect(secondTouchResult.currentLineIndex).toBe(1);
    expect(secondTouchResult.activeLine?.id).toBe('line-2');
    expect(secondTouchResult.activeDialogue?.isCompleted).toBe(false);
  });

  it('5. Closes dialogue cleanly when advancing past the last line', () => {
    const session: ConversationSession = {
      conversationId: 'conv-1',
      currentLineIndex: 1, // Last line
      lines: sampleLines,
    };

    const endResult = advanceDialogueStep(session, false, [speaker]);
    expect(endResult.status).toBe('closed');
    expect(endResult.activeDialogue).toBeNull();
  });

  it('6. Steps back to previous line in completed state without re-triggering animation', () => {
    const session: ConversationSession = {
      conversationId: 'conv-1',
      currentLineIndex: 1,
      lines: sampleLines,
    };

    const backResult = previousDialogueStep(session, [speaker]);
    expect(backResult.status).toBe('complete');
    expect(backResult.currentLineIndex).toBe(0);
    expect(backResult.activeLine?.id).toBe('line-1');
    expect(backResult.activeDialogue?.isCompleted).toBe(true);
  });
});
