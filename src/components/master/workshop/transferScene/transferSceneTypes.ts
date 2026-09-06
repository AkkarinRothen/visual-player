import type { Campaign, Scene } from '../../../../types';

export type TransferMode = 'repertoire' | 'staging';

export interface TransferredSessionInfo {
  id: string;
  name: string;
  mode: TransferMode;
}

export interface TransferSceneModalProps {
  scene: Scene | null;
  campaign?: Campaign | null;
  currentCampaignId?: string;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess?: (targetSessionName: string, mode: TransferMode) => void;
  onTransferred?: (targetSessionName: string, mode: TransferMode) => void;
  onOpenSession?: (sessionId: string) => void;
}
