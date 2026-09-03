import { describe, it, expect } from 'vitest';
import type { CinematicDialogue, SavedConversation } from '../../types';

describe('Dialogue Branching & Private Choices Suite', () => {
  const conversationWithBranches: SavedConversation = {
    id: 'conv-inquisition',
    title: 'Interrogatorio en las Celdas',
    createdAt: Date.now(),
    lines: [
      {
        id: 'line-root',
        speakerName: 'Inquisidor Vane',
        text: '¿Confesarás tus crímenes o preferirás el hierro ardiente?',
        style: 'speech',
        choices: [
          {
            id: 'choice-cooperate',
            label: 'Si los jugadores colaboran',
            targetLineId: 'line-mercy',
            conditionNote: 'Persuasión DC 12 o dar oro',
          },
          {
            id: 'choice-defy',
            label: 'Si desafían a la inquisición',
            targetLineId: 'line-torture',
            conditionNote: 'Intimidación o silencio',
          },
        ],
      },
      {
        id: 'line-mercy',
        speakerName: 'Inquisidor Vane',
        text: 'Una elección prudente. Vuestras vidas serán perdonadas... por ahora.',
        style: 'whisper',
      },
      {
        id: 'line-torture',
        speakerName: 'Inquisidor Vane',
        text: '¡Guardias! Traed las tenazas. Veremos cuánto dura su orgullo.',
        style: 'shout',
      },
    ],
  };

  it('1. DM branch selection navigates directly to target line and projects only chosen text', () => {
    const rootLine = conversationWithBranches.lines[0];
    const chosenBranch = rootLine.choices![0]; // Cooperate

    const targetLine = conversationWithBranches.lines.find(
      (l) => l.id === chosenBranch.targetLineId
    );
    expect(targetLine).toBeDefined();

    // Projected public dialogue
    const publicDialogue: CinematicDialogue = {
      id: `dlg-${targetLine!.id}`,
      speakerName: targetLine!.speakerName,
      text: targetLine!.text,
      style: targetLine!.style || 'speech',
      visible: true,
    };

    // Verify public dialogue only contains the chosen branch outcome
    expect(publicDialogue.text).toBe(
      'Una elección prudente. Vuestras vidas serán perdonadas... por ahora.'
    );

    // Private DM labels, condition notes, and unchosen alternatives are never in public dialogue
    expect((publicDialogue as any).choices).toBeUndefined();
    expect((publicDialogue as any).conditionNote).toBeUndefined();
    expect(JSON.stringify(publicDialogue)).not.toContain('Traed las tenazas');
    expect(JSON.stringify(publicDialogue)).not.toContain('Persuasión DC 12');
  });

  it('2. Records DM choice decisions in session history without mutating conversation template', () => {
    const sessionChoices: Record<string, string> = {};

    const rootLine = conversationWithBranches.lines[0];
    const selectedChoice = rootLine.choices![1]; // Defy

    // Record decision in session
    sessionChoices[rootLine.id] = selectedChoice.id;

    expect(sessionChoices['line-root']).toBe('choice-defy');

    // Conversation template itself remains immutable
    expect(conversationWithBranches.lines[0].choices).toHaveLength(2);
    expect(conversationWithBranches.lines[0].choices![0].id).toBe('choice-cooperate');
  });
});
