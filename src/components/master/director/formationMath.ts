import type { CharacterOnScreen, StageWaypoint } from '../../../types';
import type { FormationType, SnapGuideLine } from './directorTypes';

const POSITION_PRECISION = 10;
const roundStage = (val: number) => Math.round(val * POSITION_PRECISION) / POSITION_PRECISION;

export interface FormationBounds {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface FormationUpdate {
  id: string;
  normalizedX: number;
  normalizedY: number;
}

/**
 * Calculates updated stage coordinates for selected characters arranged in a formation.
 * Positions are anchored around the anchor character (or centroid).
 * Elastic boundary compression guarantees all figures remain inside stage bounds.
 */
export function calculateFormationPositions(
  selectedCharacters: CharacterOnScreen[],
  anchorId: string,
  formation: FormationType | 'custom',
  customOffsets?: { dx: number; dy: number }[],
  bounds: FormationBounds = { minX: 5, maxX: 95, minY: 0, maxY: 70 }
): FormationUpdate[] {
  const n = selectedCharacters.length;
  if (n === 0) return [];
  if (n === 1) {
    const c = selectedCharacters[0];
    return [{ id: c.id, normalizedX: c.normalizedX ?? 50, normalizedY: c.normalizedY ?? 0 }];
  }

  const anchor = selectedCharacters.find((c) => c.id === anchorId) || selectedCharacters[0];
  const anchorX = anchor.normalizedX ?? 50;
  const anchorY = anchor.normalizedY ?? 0;

  const rawUpdates: { id: string; x: number; y: number }[] = [];

  if (formation === 'custom' && customOffsets && customOffsets.length >= n) {
    selectedCharacters.forEach((c, idx) => {
      const offset = customOffsets[idx] || { dx: 0, dy: 0 };
      rawUpdates.push({
        id: c.id,
        x: anchorX + offset.dx,
        y: anchorY + offset.dy,
      });
    });
  } else if (formation === 'line') {
    // Single horizontal row centered at anchorX, anchored at anchorY
    const step = Math.max(8, Math.min(14, 80 / n));
    selectedCharacters.forEach((c, idx) => {
      const offsetIndex = idx - (n - 1) / 2;
      rawUpdates.push({
        id: c.id,
        x: anchorX + offsetIndex * step,
        y: anchorY,
      });
    });
  } else if (formation === 'semicircle') {
    // Arc curving back/down around anchorX
    const radius = Math.min(22, 8 + n * 2.5);
    const maxAngleRad = (Math.PI / 180) * Math.min(65, 20 + n * 8);
    selectedCharacters.forEach((c, idx) => {
      const t = n === 1 ? 0 : (idx / (n - 1)) * 2 - 1; // from -1 to +1
      const angle = t * maxAngleRad;
      const dx = Math.sin(angle) * radius;
      const dy = (1 - Math.cos(angle)) * (radius * 0.5);
      rawUpdates.push({
        id: c.id,
        x: anchorX + dx,
        y: anchorY + dy,
      });
    });
  } else if (formation === 'flanks') {
    // Split into left wing, anchor at center, right wing
    const others = selectedCharacters.filter((c) => c.id !== anchor.id);
    const half = Math.ceil(others.length / 2);
    const leftWing = others.slice(0, half);
    const rightWing = others.slice(half);

    rawUpdates.push({ id: anchor.id, x: anchorX, y: anchorY });

    const step = 8;
    leftWing.forEach((c, idx) => {
      rawUpdates.push({
        id: c.id,
        x: anchorX - (10 + idx * step),
        y: anchorY + (idx + 1) * 2,
      });
    });

    rightWing.forEach((c, idx) => {
      rawUpdates.push({
        id: c.id,
        x: anchorX + (10 + idx * step),
        y: anchorY + (idx + 1) * 2,
      });
    });
  } else {
    // 'cluster' (Staggered 2-row squad)
    selectedCharacters.forEach((c, idx) => {
      const row = idx % 2; // 0 = front row, 1 = back row
      const col = Math.floor(idx / 2);
      const rowOffset = row === 0 ? 0 : 7;
      const colStep = 10;
      const totalInRow = Math.ceil(n / 2);
      const x = anchorX + (col - (totalInRow - 1) / 2) * colStep + (row === 1 ? 4 : 0);
      const y = anchorY + rowOffset;
      rawUpdates.push({ id: c.id, x, y });
    });
  }

  // ── Elastic Bounds Compression ──
  const minStageX = bounds.minX ?? 5;
  const maxStageX = bounds.maxX ?? 95;
  const minStageY = bounds.minY ?? 0;
  const maxStageY = bounds.maxY ?? 70;

  const currentMinX = Math.min(...rawUpdates.map((u) => u.x));
  const currentMaxX = Math.max(...rawUpdates.map((u) => u.x));
  const currentMinY = Math.min(...rawUpdates.map((u) => u.y));
  const currentMaxY = Math.max(...rawUpdates.map((u) => u.y));

  let scaleX = 1.0;
  if (currentMaxX > maxStageX || currentMinX < minStageX) {
    const spanRight = currentMaxX - anchorX;
    const spanLeft = anchorX - currentMinX;
    const availableRight = maxStageX - anchorX;
    const availableLeft = anchorX - minStageX;

    const factorRight = spanRight > 0 ? Math.min(1.0, availableRight / spanRight) : 1.0;
    const factorLeft = spanLeft > 0 ? Math.min(1.0, availableLeft / spanLeft) : 1.0;
    scaleX = Math.max(0.3, Math.min(factorRight, factorLeft));
  }

  let scaleY = 1.0;
  if (currentMaxY > maxStageY || currentMinY < minStageY) {
    const spanUp = currentMaxY - anchorY;
    const spanDown = anchorY - currentMinY;
    const availableUp = maxStageY - anchorY;
    const availableDown = anchorY - minStageY;

    const factorUp = spanUp > 0 ? Math.min(1.0, availableUp / spanUp) : 1.0;
    const factorDown = spanDown > 0 ? Math.min(1.0, availableDown / spanDown) : 1.0;
    scaleY = Math.max(0.3, Math.min(factorUp, factorDown));
  }

  return rawUpdates.map((u) => {
    const compressedX = anchorX + (u.x - anchorX) * scaleX;
    const compressedY = anchorY + (u.y - anchorY) * scaleY;
    const clampedX = Math.max(minStageX, Math.min(maxStageX, compressedX));
    const clampedY = Math.max(minStageY, Math.min(maxStageY, compressedY));
    return {
      id: u.id,
      normalizedX: roundStage(clampedX),
      normalizedY: roundStage(clampedY),
    };
  });
}

export interface MagneticSnapReferences {
  groundLineY?: number;
  waypoints?: StageWaypoint[];
  snapToCenter?: boolean;
  snapToThirds?: boolean;
  snapThreshold?: number; // In normalized percentage (default ~2.2%)
}

export interface MagneticSnapResult {
  snappedX: number;
  snappedY: number;
  guideLines: SnapGuideLine[];
}

/**
 * Evaluates whether current drag coordinates fall within the magnetic attraction threshold
 * of the ground line, center axis, rule of thirds, or scene waypoints.
 */
export function evaluateMagneticSnap(
  currentX: number,
  currentY: number,
  refs: MagneticSnapReferences
): MagneticSnapResult {
  const threshold = refs.snapThreshold ?? 2.2;
  let snappedX = currentX;
  let snappedY = currentY;
  const guideLines: SnapGuideLine[] = [];

  // 1. Center axis (50%)
  if (refs.snapToCenter !== false) {
    if (Math.abs(currentX - 50) <= threshold) {
      snappedX = 50;
      guideLines.push({ axis: 'x', position: 50, label: 'Centro (50%)' });
    }
  }

  // 2. Rule of thirds (33.3%, 66.7%)
  if (refs.snapToThirds !== false && guideLines.length === 0) {
    if (Math.abs(currentX - 33.3) <= threshold) {
      snappedX = 33.3;
      guideLines.push({ axis: 'x', position: 33.3, label: 'Tercio (33%)' });
    } else if (Math.abs(currentX - 66.7) <= threshold) {
      snappedX = 66.7;
      guideLines.push({ axis: 'x', position: 66.7, label: 'Tercio (67%)' });
    }
  }

  // 3. Ground line (Y = 0)
  const targetGround = 0;
  if (Math.abs(currentY - targetGround) <= threshold) {
    snappedY = targetGround;
    guideLines.push({ axis: 'y', position: targetGround, label: 'Suelo (0%)' });
  }

  // 4. Waypoints snap
  if (refs.waypoints && refs.waypoints.length > 0) {
    for (const wp of refs.waypoints) {
      if (guideLines.every((g) => g.axis !== 'x') && Math.abs(currentX - wp.normalizedX) <= threshold) {
        snappedX = wp.normalizedX;
        guideLines.push({ axis: 'x', position: wp.normalizedX, label: wp.name });
      }
      if (guideLines.every((g) => g.axis !== 'y') && Math.abs(currentY - wp.normalizedY) <= threshold) {
        snappedY = wp.normalizedY;
        guideLines.push({ axis: 'y', position: wp.normalizedY, label: wp.name });
      }
    }
  }

  return {
    snappedX: roundStage(snappedX),
    snappedY: roundStage(snappedY),
    guideLines,
  };
}
