import type { Campaign, SavedConversation } from '../../../types';

export interface ConversationEditorModalProps {
  isOpen: boolean;
  campaign: Campaign;
  conversation?: SavedConversation | null;
  onSave: (conversation: SavedConversation) => Promise<void>;
  onClose: () => void;
}
