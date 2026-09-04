import type { CharacterPosition } from '../../../types';

export type SelectedEntity =
  | { type: 'character'; id: string }
  | { type: 'prop'; id: string };

export function getSlotPositionPercent(pos: CharacterPosition): number {
  switch (pos) {
    case 'left':
      return 20;
    case 'center-left':
      return 40;
    case 'center-right':
      return 60;
    case 'right':
      return 80;
    default:
      return 50;
  }
}
