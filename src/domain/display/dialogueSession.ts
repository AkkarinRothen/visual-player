import type {
  CharacterOnScreen,
  CinematicDialogue,
  DialogueLine,
  ConversationSession,
} from '../../types';

export type DialoguePlaybackStatus = 'idle' | 'typing' | 'complete' | 'closed';

export interface DialogueSessionState {
  status: DialoguePlaybackStatus;
  conversationId?: string;
  currentLineIndex: number;
  activeLine?: DialogueLine | null;
  activeDialogue?: CinematicDialogue | null;
}

/**
 * Strictly sanitizes a DialogueLine before emitting to the physical Mesa.
 * Guarantees that dmNotes, branching choices, and hidden identities never leak.
 */
export function sanitizeDialogueForPublicDisplay(
  line: DialogueLine,
  speakerCharacter?: CharacterOnScreen | null,
  isCompleted = false
): CinematicDialogue {
  // Check if identity is concealed
  const isConcealed = speakerCharacter?.revelation && !speakerCharacter.revelation.isIdentityRevealed;
  const publicSpeakerName = isConcealed
    ? speakerCharacter?.revelation?.publicAlias || 'Desconocido'
    : line.speakerName || speakerCharacter?.name;

  return {
    id: line.id,
    speakerInstanceId: speakerCharacter?.id,
    speakerName: publicSpeakerName,
    text: line.text,
    avatarUrl: isConcealed ? undefined : (line.avatarUrl || speakerCharacter?.avatarUrl),
    activeExpression: line.activeExpression || speakerCharacter?.activeExpression,
    style: line.style || 'speech',
    visible: true,
    autoFocusSpeaker: line.autoFocusSpeaker,
    isCompleted,
    presentationMode: line.presentationMode || 'auto',
    themeId: line.themeId || 'default-gold',
  };
}

/**
 * Advance step following the user-mandated two-touch rule:
 * 1st touch: immediately finishes typewriter text if currently typing.
 * 2nd touch: advances to the next dialogue line or closes if finished.
 */
export function advanceDialogueStep(
  session: ConversationSession,
  isCurrentlyTyping: boolean,
  characters: CharacterOnScreen[] = []
): DialogueSessionState {
  if (!session.lines || session.lines.length === 0) {
    return {
      status: 'closed',
      conversationId: session.conversationId,
      currentLineIndex: 0,
      activeLine: null,
      activeDialogue: null,
    };
  }

  const currentIndex = Math.max(0, Math.min(session.lines.length - 1, session.currentLineIndex));
  const currentLine = session.lines[currentIndex];
  const speaker = characters.find((c) => c.id === currentLine.speakerCharacterId);

  // 1st touch: Complete typewriter on current line
  if (isCurrentlyTyping) {
    return {
      status: 'complete',
      conversationId: session.conversationId,
      currentLineIndex: currentIndex,
      activeLine: currentLine,
      activeDialogue: sanitizeDialogueForPublicDisplay(currentLine, speaker, true),
    };
  }

  // 2nd touch: Advance to next line or close if at end
  const nextIndex = currentIndex + 1;
  if (nextIndex >= session.lines.length) {
    return {
      status: 'closed',
      conversationId: session.conversationId,
      currentLineIndex: currentIndex,
      activeLine: null,
      activeDialogue: null,
    };
  }

  const nextLine = session.lines[nextIndex];
  const nextSpeaker = characters.find((c) => c.id === nextLine.speakerCharacterId);

  return {
    status: 'typing',
    conversationId: session.conversationId,
    currentLineIndex: nextIndex,
    activeLine: nextLine,
    activeDialogue: sanitizeDialogueForPublicDisplay(nextLine, nextSpeaker, false),
  };
}

/**
 * Return to previous line without re-triggering audio or actions.
 */
export function previousDialogueStep(
  session: ConversationSession,
  characters: CharacterOnScreen[] = []
): DialogueSessionState {
  if (!session.lines || session.lines.length === 0) {
    return {
      status: 'closed',
      conversationId: session.conversationId,
      currentLineIndex: 0,
      activeLine: null,
      activeDialogue: null,
    };
  }

  const prevIndex = Math.max(0, session.currentLineIndex - 1);
  const prevLine = session.lines[prevIndex];
  const speaker = characters.find((c) => c.id === prevLine.speakerCharacterId);

  return {
    status: 'complete', // Return to previous line already complete (no repeated animation)
    conversationId: session.conversationId,
    currentLineIndex: prevIndex,
    activeLine: prevLine,
    activeDialogue: sanitizeDialogueForPublicDisplay(prevLine, speaker, true),
  };
}
