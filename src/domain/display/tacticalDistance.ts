import { distance } from '@turf/distance';
import { point } from '@turf/helpers';

const METERS_PER_CELL = 1.5;
const METERS_PER_DEGREE_AT_EQUATOR = 111_320;

/**
 * Uses Turf's geodesic calculation on a tiny projected portion of the map.
 * The result is expressed in map cells, so it remains independent of screen pixels.
 */
export function tacticalDistanceInCells(
  from: { normalizedX?: number; normalizedY?: number },
  to: { normalizedX?: number; normalizedY?: number },
  columns: number,
): number {
  const cellsWide = Math.max(2, columns);
  const cellsHigh = Math.max(2, Math.round(cellsWide * 9 / 16));
  const dxCells = ((to.normalizedX ?? 50) - (from.normalizedX ?? 50)) / 100 * cellsWide;
  const dyCells = ((to.normalizedY ?? 0) - (from.normalizedY ?? 0)) / 100 * cellsHigh;
  const degreesPerCell = METERS_PER_CELL / METERS_PER_DEGREE_AT_EQUATOR;
  const kilometers = distance(point([0, 0]), point([dxCells * degreesPerCell, dyCells * degreesPerCell]), { units: 'kilometers' });
  return kilometers * 1000 / METERS_PER_CELL;
}
