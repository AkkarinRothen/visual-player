export interface SnapGuideLine {
  axis: 'x' | 'y';
  position: number;
  label?: string;
}

export interface DragState {
  isDragging: boolean;
  hasPassedTouchSlop: boolean;
  pointerClientX: number;
  pointerClientY: number;
  quickDropTarget: 'reserve' | 'hide' | 'remove' | null;
  snapGuideLines?: SnapGuideLine[];
  anchorId: string;
  startX: number;
  startY: number;
  pointerStartX: number;
  pointerStartY: number;
  currentX: number;
  currentY: number;
  initialPositions: Map<string, { x: number; y: number }>;
}

export type FormationType = 'line' | 'semicircle' | 'flanks' | 'cluster';

export interface CustomFormationPreset {
  id: string;
  name: string;
  relativeOffsets: { dx: number; dy: number }[];
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
