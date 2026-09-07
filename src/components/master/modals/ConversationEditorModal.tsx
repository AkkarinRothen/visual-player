import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { Campaign, SavedConversation } from '../../../types';
import { useConversationEditor } from '../conversation/useConversationEditor';
import { ConversationHeader } from '../conversation/ConversationHeader';
import { ConversationLineList } from '../conversation/ConversationLineList';
import { ConversationRehearsalView } from '../conversation/ConversationRehearsalView';
import { ConversationLineForm } from '../conversation/ConversationLineForm';

export interface ConversationEditorModalProps {
  isOpen: boolean;
  campaign: Campaign;
  conversation?: SavedConversation | null;
  onSave: (conversation: SavedConversation) => Promise<void>;
  onClose: () => void;
}

export const ConversationEditorModal: React.FC<ConversationEditorModalProps> = ({
  isOpen,
  campaign,
  conversation,
  onSave,
  onClose,
}) => {
  const editor = useConversationEditor({
    campaign,
    conversation,
    onSave,
    onClose,
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md" />
        <Dialog.Content
          aria-describedby={undefined}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 outline-none"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        <Dialog.Title className="sr-only">
          {conversation ? 'Editar Conversación' : 'Nueva Conversación'}
        </Dialog.Title>
        {/* MODAL HEADER */}
        <ConversationHeader
          isEditing={Boolean(conversation)}
          historyLength={editor.history.length}
          futureLength={editor.future.length}
          onUndo={editor.handleUndo}
          onRedo={editor.handleRedo}
          isRehearsalMode={editor.isRehearsalMode}
          onToggleRehearsal={() => editor.setIsRehearsalMode(!editor.isRehearsalMode)}
          onSave={editor.handleSave}
          onClose={onClose}
        />

        {/* MODAL BODY */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT PANEL: CONVERSATION INFO & LINE LIST */}
          <ConversationLineList
            title={editor.title}
            onChangeTitle={editor.setTitle}
            description={editor.description}
            onChangeDescription={editor.setDescription}
            lines={editor.lines}
            selectedLineIndex={editor.selectedLineIndex}
            onSelectLine={editor.setSelectedLineIndex}
            onAddLine={editor.handleAddLine}
            onMoveLine={editor.handleMoveLine}
            onDuplicateLine={editor.handleDuplicateLine}
            onDeleteLine={editor.handleDeleteLine}
          />

          {/* RIGHT PANEL: SELECTED LINE DETAIL & LIVE REHEARSAL */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 overflow-y-auto p-3.5 sm:p-5">
            {editor.isRehearsalMode ? (
              <ConversationRehearsalView
                rehearsalIndex={editor.rehearsalIndex}
                totalLines={editor.lines.length}
                rehearsalDialogue={editor.rehearsalDialogue}
                onPrev={() => editor.setRehearsalIndex((prev) => Math.max(0, prev - 1))}
                onReset={() => editor.setRehearsalIndex(0)}
                onNext={() => editor.setRehearsalIndex((prev) => Math.min(editor.lines.length - 1, prev + 1))}
              />
            ) : (
              editor.currentSelectedLine && (
                <ConversationLineForm
                  selectedLineIndex={editor.selectedLineIndex}
                  currentSelectedLine={editor.currentSelectedLine}
                  campaign={campaign}
                  selectedCharTemplate={editor.selectedCharTemplate}
                  updateSelectedLine={editor.updateSelectedLine}
                />
              )
            )}
          </div>
        </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
