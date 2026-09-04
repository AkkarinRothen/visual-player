export interface DragState {
  isDragging: boolean;
  anchorId: string;
  startX: number;
  startY: number;
  pointerStartX: number;
  pointerStartY: number;
  currentX: number;
  currentY: number;
  initialPositions: Map<string, { x: number; y: number }>;
}

export type StageUnifiedItem =
  | { type: 'character'; id: string; name: string; zIndex: number; avatarUrl?: string; privateLabel?: string }
  | { type: 'prop'; id: string; name: string; zIndex: number; avatarUrl?: string; privateLabel?: string }
  | { type: 'occlusion'; id: string; name: string; zIndex: number; avatarUrl?: string; privateLabel?: string };

export interface OcclusionFormState {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}
