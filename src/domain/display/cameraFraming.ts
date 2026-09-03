import type { CharacterOnScreen, CameraTransform } from '../../types';

export interface FramingViewportOptions {
  viewportWidth?: number; // e.g. 1920 or 1024
  viewportHeight?: number; // e.g. 1080 or 768
  hasActiveDialogue?: boolean;
  dialogueHeightPx?: number; // Safe zone for dialogue
  hasActiveInitiative?: boolean;
  initiativeHeightPx?: number; // Safe zone for combat ribbon
  hasActiveBanner?: boolean;
  bannerHeightPx?: number; // Safe zone for location title
  safePaddingPct?: number; // Padding around bounds (default 6%)
  minZoom?: number; // default 1.0
  maxZoom?: number; // default 2.2
}

export interface GroupFramingResult {
  camera: CameraTransform;
  fitsWithinBounds: boolean;
  warning?: string;
  calculatedZoom: number;
  groupBoundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

/**
 * Pure mathematical calculation of group framing bounding box and camera focal point.
 * Accounts for safe areas (dialogue subtitles, initiative ribbons, location banners).
 */
export function calculateGroupFraming(
  characters: CharacterOnScreen[],
  options: FramingViewportOptions = {}
): GroupFramingResult {
  const {
    viewportWidth: _viewportWidth = 1920,
    viewportHeight = 1080,
    hasActiveDialogue = false,
    dialogueHeightPx = 160,
    hasActiveInitiative = false,
    initiativeHeightPx = 70,
    hasActiveBanner = false,
    bannerHeightPx = 80,
    safePaddingPct = 6,
    minZoom = 1.0,
    maxZoom = 2.2,
  } = options;

  // 1. Fallback if no characters
  if (!characters || characters.length === 0) {
    return {
      camera: { focalPoint: { x: 50, y: 50 }, zoom: 1.0 },
      fitsWithinBounds: true,
      calculatedZoom: 1.0,
      groupBoundingBox: { minX: 50, maxX: 50, minY: 50, maxY: 50, width: 0, height: 0 },
    };
  }

  // 2. Compute individual character world bounding boxes (unzoomed)
  // Standard character dimensions relative to stage: width ~18%, height ~45% at scale 1.0
  let groupMinX = 100;
  let groupMaxX = 0;
  let groupMinY = 100;
  let groupMaxY = 0;

  for (const char of characters) {
    const posX = char.normalizedX ?? 50;
    const posY = char.normalizedY ?? 85;
    const scale = char.scale ?? 1.0;

    const charWidth = 18 * scale;
    const charHeight = 45 * scale;

    const charLeft = posX - charWidth / 2;
    const charRight = posX + charWidth / 2;
    const charTop = Math.max(0, posY - charHeight);
    const charBottom = posY;

    if (charLeft < groupMinX) groupMinX = charLeft;
    if (charRight > groupMaxX) groupMaxX = charRight;
    if (charTop < groupMinY) groupMinY = charTop;
    if (charBottom > groupMaxY) groupMaxY = charBottom;
  }

  const groupWidth = Math.max(10, groupMaxX - groupMinX);
  const groupHeight = Math.max(10, groupMaxY - groupMinY);
  const groupCenterX = (groupMinX + groupMaxX) / 2;
  const groupCenterY = (groupMinY + groupMaxY) / 2;

  // 3. Compute usable screen area percentages
  let topSafeMarginPct = safePaddingPct;
  if (hasActiveInitiative) {
    topSafeMarginPct += (initiativeHeightPx / viewportHeight) * 100;
  } else if (hasActiveBanner) {
    topSafeMarginPct += (bannerHeightPx / viewportHeight) * 100;
  }

  let bottomSafeMarginPct = safePaddingPct;
  if (hasActiveDialogue) {
    bottomSafeMarginPct += (dialogueHeightPx / viewportHeight) * 100;
  }

  const usableWidthPct = Math.max(20, 100 - safePaddingPct * 2);
  const usableHeightPct = Math.max(20, 100 - topSafeMarginPct - bottomSafeMarginPct);

  // Usable area visual center
  const usableCenterX = 50;
  const usableCenterY = topSafeMarginPct + usableHeightPct / 2;

  // 4. Calculate ideal zoom to contain group
  const zoomX = usableWidthPct / groupWidth;
  const zoomY = usableHeightPct / groupHeight;
  const rawIdealZoom = Math.min(zoomX, zoomY);

  const fitsWithinBounds = rawIdealZoom >= 1.0;
  const clampedZoom = Number(Math.max(minZoom, Math.min(maxZoom, rawIdealZoom)).toFixed(2));

  // 5. Calculate focal point to align GroupCenter with UsableCenter:
  // Target: UsableCenter = Focal + (GroupCenter - Focal) * Zoom
  // => Focal = (UsableCenter - GroupCenter * Zoom) / (1 - Zoom)
  let focalX = 50;
  let focalY = 50;

  if (Math.abs(clampedZoom - 1.0) > 0.02) {
    focalX = (usableCenterX - groupCenterX * clampedZoom) / (1 - clampedZoom);
    focalY = (usableCenterY - groupCenterY * clampedZoom) / (1 - clampedZoom);
  } else {
    focalX = groupCenterX;
    focalY = groupCenterY;
  }

  // Clamp focal point strictly to [0, 100]
  focalX = Math.max(0, Math.min(100, Number(focalX.toFixed(1))));
  focalY = Math.max(0, Math.min(100, Number(focalY.toFixed(1))));

  let warning: string | undefined;
  if (!fitsWithinBounds) {
    warning = 'El grupo está demasiado disperso para encuadrarlo completo sin recortar bordes.';
  }

  return {
    camera: {
      focalPoint: { x: focalX, y: focalY },
      zoom: clampedZoom,
    },
    fitsWithinBounds,
    warning,
    calculatedZoom: clampedZoom,
    groupBoundingBox: {
      minX: Number(groupMinX.toFixed(1)),
      maxX: Number(groupMaxX.toFixed(1)),
      minY: Number(groupMinY.toFixed(1)),
      maxY: Number(groupMaxY.toFixed(1)),
      width: Number(groupWidth.toFixed(1)),
      height: Number(groupHeight.toFixed(1)),
    },
  };
}
