import type { HandoutState } from '../../../types';

export type HandoutTouchMode = 'pan' | 'reveal-rect' | 'reveal-brush';
export type HandoutViewTab = 'library' | 'editor';

export interface DragRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HandoutViewerModalProps {
  isOpen: boolean;
  activeHandout?: HandoutState | null;
  savedHandouts?: HandoutState[];
  onProjectHandout: (handout: HandoutState) => Promise<void>;
  onDismissHandout: () => Promise<void>;
  onSaveHandouts?: (handouts: HandoutState[]) => Promise<void>;
  onDeleteHandout?: (handoutId: string) => Promise<void>;
  onClose: () => void;
}
