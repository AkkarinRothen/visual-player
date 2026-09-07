import type { CharacterOnScreen, TacticalGridConfig } from '../../types';

export interface SnapResult {
  x: number;
  y: number;
  snapped: boolean;
  snapType?: 'grid' | 'ground';
}

/**
 * Determines whether a character should be visually presented as a circular VTT token
 * or as a full-body standee/sprite.
 */
export function shouldRenderAsToken(
  character: CharacterOnScreen,
  isTacticalGridEnabled: boolean
): boolean {
  if (character.displayStyle === 'token') return true;
  if (character.displayStyle === 'standee') return false;
  return isTacticalGridEnabled;
}

/**
 * Calculates a recommended character scale so that the token/standee
 * fits comfortably within a single grid cell.
 */
export function calculateCellScale(columns: number): number {
  const safeCols = Math.max(4, Math.min(30, columns || 10));
  // A 10-column grid fits nicely around scale ~0.35 - 0.40
  const idealScale = 3.6 / safeCols;
  return Math.max(0.15, Math.min(1.0, Math.round(idealScale * 100) / 100));
}

/**
 * Snaps normalized coordinates (0-100%) to the nearest cell center in a grid.
 */
export function snapToCellCenter(
  x: number,
  y: number,
  columns: number,
  rows?: number
): { x: number; y: number } {
  const safeCols = Math.max(2, columns || 10);
  const safeRows = rows && rows > 0 ? rows : Math.max(2, Math.round((safeCols * 9) / 16));

  const stepX = 100 / safeCols;
  const stepY = 100 / safeRows;

  const snappedX = Math.round(Math.round(x / stepX) * stepX * 10) / 10;
  const snappedY = Math.round(Math.round(y / stepY) * stepY * 10) / 10;

  return {
    x: Math.max(0, Math.min(100, snappedX)),
    y: Math.max(0, Math.min(100, snappedY)),
  };
}

/**
 * Snaps all given characters to their closest grid cell center.
 * Optionally adjusts their scale to fit the cell.
 */
export function snapCharactersToGrid(
  characters: CharacterOnScreen[],
  columns: number,
  adjustScale = false
): CharacterOnScreen[] {
  if (!characters || characters.length === 0) return [];
  const recommendedScale = adjustScale ? calculateCellScale(columns) : undefined;

  return characters.map((char) => {
    const currentX = char.normalizedX ?? 50;
    const currentY = char.normalizedY ?? 15;
    const { x, y } = snapToCellCenter(currentX, currentY, columns);
    return {
      ...char,
      normalizedX: x,
      normalizedY: y,
      scale: recommendedScale !== undefined ? recommendedScale : char.scale,
    };
  });
}

/**
 * Arranges characters into a tactical JRPG-style two-party battle rank formation.
 * Allies/party are positioned on the left side facing right.
 * Enemies/opponents are positioned on the right side facing left.
 */
export function alignBattleRanks(
  characters: CharacterOnScreen[],
  _columns = 12
): CharacterOnScreen[] {
  if (!characters || characters.length === 0) return [];

  const hasExplicitTeams = characters.some(
    (c) => c.tacticalTeam === 'allies' || c.tacticalTeam === 'enemies'
  );

  const leftTeam = characters.filter((c, idx) =>
    hasExplicitTeams
      ? c.tacticalTeam === 'allies' || (!c.tacticalTeam && idx < Math.ceil(characters.length / 2))
      : idx < Math.ceil(characters.length / 2)
  );

  const rightTeam = characters.filter((c, idx) =>
    hasExplicitTeams
      ? c.tacticalTeam === 'enemies' || (!c.tacticalTeam && idx >= Math.ceil(characters.length / 2))
      : idx >= Math.ceil(characters.length / 2)
  );

  const totalCount = characters.length;
  // Scale dynamically based on army density
  const rankScale =
    totalCount <= 2 ? 0.55 : totalCount <= 4 ? 0.42 : totalCount <= 6 ? 0.32 : 0.24;

  const positionTeam = (
    team: CharacterOnScreen[],
    isRightSide: boolean
  ): CharacterOnScreen[] => {
    const count = team.length;
    if (count === 0) return [];

    return team.map((char, index) => {
      // Staggering into columns: front line vs back line
      const row = index % 3;
      const col = Math.floor(index / 3);

      // Y distribution: centered ground lines
      const ySpacing = count <= 3 ? 12 : 10;
      const baseGroundY = 10;
      const posY = baseGroundY + row * ySpacing;

      // X distribution
      let posX: number;
      if (!isRightSide) {
        // Left side: backline col=0 at ~18%, frontline col=1 at ~30%
        posX = col === 0 ? (count <= 3 ? 24 : 18) : 32 + (col - 1) * 10;
      } else {
        // Right side: frontline col=1 at ~68%, backline col=0 at ~82%
        posX = col === 0 ? (count <= 3 ? 76 : 82) : 68 - (col - 1) * 10;
      }

      return {
        ...char,
        normalizedX: Math.round(posX),
        normalizedY: Math.round(posY),
        scale: rankScale,
        isFlipped: isRightSide,
      };
    });
  };

  const processedLeft = positionTeam(leftTeam, false);
  const processedRight = positionTeam(rightTeam, true);

  // Preserve initial ordering by id
  const map = new Map<string, CharacterOnScreen>();
  [...processedLeft, ...processedRight].forEach((c) => map.set(c.id, c));
  return characters.map((orig) => map.get(orig.id) || orig);
}

/**
 * Distributes characters in a single horizontal line along a specific ground Y position.
 */
export function distributeHorizontally(
  characters: CharacterOnScreen[],
  targetGroundY = 10
): CharacterOnScreen[] {
  if (!characters || characters.length === 0) return [];
  const n = characters.length;
  if (n === 1) {
    return [
      {
        ...characters[0],
        normalizedX: 50,
        normalizedY: targetGroundY,
      },
    ];
  }

  const leftMargin = 16;
  const rightMargin = 84;
  const availableWidth = rightMargin - leftMargin;
  const step = availableWidth / (n - 1);

  // Adaptive scale to prevent visual clipping when many characters are on the same line
  const autoScale =
    n <= 3 ? 0.7 : n <= 5 ? 0.5 : n <= 8 ? 0.35 : 0.25;

  return characters.map((char, index) => ({
    ...char,
    normalizedX: Math.round(leftMargin + index * step),
    normalizedY: targetGroundY,
    scale: char.scale !== undefined && char.scale < autoScale ? char.scale : autoScale,
  }));
}

/**
 * Computes contextual magnetic snapping during drag or on pointer up.
 * 1. If grid is active: snaps to nearest grid cell center if within magnet threshold.
 * 2. If grid is inactive: snaps Y to nearest nearby character's ground line (Y) if within 4%.
 */
export function findContextualMagneticSnap(
  dragX: number,
  dragY: number,
  allCharacters: CharacterOnScreen[],
  currentCharId: string,
  gridConfig?: TacticalGridConfig
): SnapResult {
  // 1. Grid snapping if tactical grid is enabled
  if (gridConfig?.enabled) {
    const cols = Math.max(2, gridConfig.columns || 10);
    const rows = Math.max(2, Math.round((cols * 9) / 16));
    const stepX = 100 / cols;
    const stepY = 100 / rows;

    const cellCenter = snapToCellCenter(dragX, dragY, cols, rows);
    const distX = Math.abs(dragX - cellCenter.x);
    const distY = Math.abs(dragY - cellCenter.y);

    // Magnetic radius = 45% of cell size
    const magnetRadiusX = stepX * 0.45;
    const magnetRadiusY = stepY * 0.45;

    if (distX <= magnetRadiusX && distY <= magnetRadiusY) {
      return {
        x: cellCenter.x,
        y: cellCenter.y,
        snapped: true,
        snapType: 'grid',
      };
    }
  }

  // 2. Ground line alignment with peer characters
  const peerCharacters = allCharacters.filter(
    (c) => c.id !== currentCharId && c.normalizedY !== undefined
  );

  if (peerCharacters.length > 0) {
    let closestPeer: CharacterOnScreen | null = null;
    let minDeltaY = Infinity;

    for (const peer of peerCharacters) {
      const peerY = peer.normalizedY ?? 0;
      const deltaY = Math.abs(dragY - peerY);
      if (deltaY < minDeltaY) {
        minDeltaY = deltaY;
        closestPeer = peer;
      }
    }

    // Magnet threshold: 3.5% vertical tolerance
    if (closestPeer && minDeltaY <= 3.5) {
      return {
        x: dragX,
        y: closestPeer.normalizedY ?? dragY,
        snapped: true,
        snapType: 'ground',
      };
    }
  }

  return {
    x: dragX,
    y: dragY,
    snapped: false,
  };
}
