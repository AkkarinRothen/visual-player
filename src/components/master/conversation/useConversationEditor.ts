import { useState, useCallback } from 'react';
import type { Campaign, SavedConversation, DialogueLine } from '../../../types';

interface UseConversationEditorProps {
  campaign: Campaign;
  conversation?: SavedConversation | null;
  onSave: (conversation: SavedConversation) => Promise<void>;
  onClose: () => void;
}

export function useConversationEditor({
  campaign,
  conversation,
  onSave,
  onClose,
}: UseConversationEditorProps) {
  // Title and Description
  const [title, setTitle] = useState<string>(() => conversation?.title || 'Nueva Conversación');
  const [description, setDescription] = useState<string>(() => conversation?.description || '');

  // Lines state
  const [lines, setLines] = useState<DialogueLine[]>(() => {
    if (conversation?.lines && conversation.lines.length > 0) {
      return JSON.parse(JSON.stringify(conversation.lines));
    }
    return [
      {
        id: `line-${Date.now()}-1`,
        speakerName: 'Narrador',
        text: 'La niebla se disipa revelando una silueta en el umbral...',
        style: 'narration',
      },
    ];
  });

  // Selected line index for editing
  const [selectedLineIndex, setSelectedLineIndex] = useState<number>(0);

  // Undo / Redo history
  const [history, setHistory] = useState<DialogueLine[][]>([]);
  const [future, setFuture] = useState<DialogueLine[][]>([]);

  // Local Rehearsal / Ensayo mode
  const [isRehearsalMode, setIsRehearsalMode] = useState<boolean>(false);
  const [rehearsalIndex, setRehearsalIndex] = useState<number>(0);

  // Push to history before modifying lines
  const pushHistory = useCallback(
    (newLines: DialogueLine[]) => {
      setHistory((prev) => [...prev.slice(-20), lines]);
      setFuture([]);
      setLines(newLines);
    },
    [lines]
  );

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture((f) => [lines, ...f]);
    setHistory((h) => h.slice(0, -1));
    setLines(prev);
    setSelectedLineIndex((cur) => (cur >= prev.length ? Math.max(0, prev.length - 1) : cur));
  }, [history, lines]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, lines]);
    setFuture((f) => f.slice(1));
    setLines(next);
  }, [future, lines]);

  // Add line
  const handleAddLine = useCallback(() => {
    const newLine: DialogueLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      speakerName: campaign.characters[0]?.name || 'Narrador',
      speakerCharacterId: campaign.characters[0]?.id,
      avatarUrl: campaign.characters[0]?.defaultAvatarUrl,
      text: '',
      style: 'speech',
      autoFocusSpeaker: true,
    };
    const next = [...lines, newLine];
    pushHistory(next);
    setSelectedLineIndex(next.length - 1);
  }, [campaign.characters, lines, pushHistory]);

  // Duplicate line
  const handleDuplicateLine = useCallback(
    (index: number) => {
      const target = lines[index];
      if (!target) return;
      const duplicated: DialogueLine = {
        ...JSON.parse(JSON.stringify(target)),
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      const next = [...lines.slice(0, index + 1), duplicated, ...lines.slice(index + 1)];
      pushHistory(next);
      setSelectedLineIndex(index + 1);
    },
    [lines, pushHistory]
  );

  // Delete line
  const handleDeleteLine = useCallback(
    (index: number) => {
      if (lines.length <= 1) return;
      const next = lines.filter((_, i) => i !== index);
      pushHistory(next);
      setSelectedLineIndex((prev) => Math.min(prev, next.length - 1));
    },
    [lines, pushHistory]
  );

  // Move line Up / Down
  const handleMoveLine = useCallback(
    (index: number, direction: 'up' | 'down') => {
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= lines.length) return;
      const next = [...lines];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      pushHistory(next);
      setSelectedLineIndex(targetIdx);
    },
    [lines, pushHistory]
  );

  // Update field of selected line
  const updateSelectedLine = useCallback(
    (updates: Partial<DialogueLine>) => {
      const next = lines.map((line, i) =>
        i === selectedLineIndex ? { ...line, ...updates } : line
      );
      pushHistory(next);
    },
    [lines, selectedLineIndex, pushHistory]
  );

  const currentSelectedLine = lines[selectedLineIndex] || lines[0];

  // Matching character for selected line
  const selectedCharTemplate = campaign.characters.find(
    (c) => c.id === currentSelectedLine?.speakerCharacterId
  );

  // Save handler
  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    const saved: SavedConversation = {
      id: conversation?.id || `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      sceneId: conversation?.sceneId,
      lines,
      createdAt: conversation?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await onSave(saved);
    onClose();
  }, [title, description, conversation, lines, onSave, onClose]);

  // Rehearsal mode dialogue projection object
  const rehearsalLine = lines[rehearsalIndex];
  const rehearsalDialogue = rehearsalLine
    ? {
        id: `reh-${rehearsalLine.id}`,
        speakerInstanceId: rehearsalLine.speakerCharacterId,
        speakerName: rehearsalLine.speakerName,
        text: rehearsalLine.text,
        avatarUrl: rehearsalLine.avatarUrl,
        activeExpression: rehearsalLine.activeExpression,
        style: rehearsalLine.style || 'speech',
        visible: true,
        autoFocusSpeaker: false,
      }
    : null;

  return {
    title,
    setTitle,
    description,
    setDescription,
    lines,
    selectedLineIndex,
    setSelectedLineIndex,
    history,
    future,
    isRehearsalMode,
    setIsRehearsalMode,
    rehearsalIndex,
    setRehearsalIndex,
    handleUndo,
    handleRedo,
    handleAddLine,
    handleDuplicateLine,
    handleDeleteLine,
    handleMoveLine,
    updateSelectedLine,
    currentSelectedLine,
    selectedCharTemplate,
    handleSave,
    rehearsalDialogue,
  };
}
