import type {
  CharacterOnScreen,
  CameraTransform,
  DialoguePresentationMode,
  DialogueAnchorCoordinates,
} from '../../types';

export interface ComputeBalloonGeometryOptions {
  speaker?: CharacterOnScreen | null;
  camera?: CameraTransform;
  preferredMode?: DialoguePresentationMode;
  textLength?: number;
  previousCoordinates?: DialogueAnchorCoordinates;
}

export interface ComputedDialogueGeometry {
  mode: DialoguePresentationMode;
  coordinates: DialogueAnchorCoordinates;
}

const DEFAULT_SAFE_BOUNDS = {
  minX: 8,
  maxX: 92,
  minY: 6,
  maxY: 94,
};

/**
 * Calculates responsive anchored balloon coordinates or selects visual-novel fallback.
 * Uses adaptive candidate evaluation (Top -> Side -> Bottom VN fallback) with hysteresis.
 */
export function computeDialogueGeometry(
  options: ComputeBalloonGeometryOptions
): ComputedDialogueGeometry {
  const {
    speaker,
    preferredMode = 'auto',
    previousCoordinates,
  } = options;

  // 1. Explicit fixed modes
  if (preferredMode === 'narration' || preferredMode === 'subtitle' || preferredMode === 'visual-novel') {
    return {
      mode: preferredMode,
      coordinates: {
        x: 50,
        y: 8,
        placement: 'bottom',
        tailDirection: 'none',
      },
    };
  }

  // 2. No speaker on screen: fallback to visual novel box
  if (!speaker) {
    return {
      mode: 'visual-novel',
      coordinates: {
        x: 50,
        y: 8,
        placement: 'bottom',
        tailDirection: 'none',
      },
    };
  }

  const normX = speaker.normalizedX ?? 50;
  const normY = speaker.normalizedY ?? 0;
  const scale = Math.max(0.4, Math.min(2.5, speaker.scale ?? 1.0));
  const isFlipped = Boolean(speaker.isFlipped);

  // Approximate character visual bounds in 16:9 stage percentages
  const approxFigureHeight = 26 * scale;
  const headTopY = normY + approxFigureHeight;

  // Estimated balloon box requirements
  const balloonHeightEst = 14;

  // Candidate 1: Top (above head)
  const topCandidateY = headTopY + 2;
  const canFitTop = (topCandidateY + balloonHeightEst) <= DEFAULT_SAFE_BOUNDS.maxY;

  // Candidate 2: Side (left or right)
  const sideXOffset = (14 * scale) + 8;
  const preferredSide = isFlipped ? 'right' : (normX > 50 ? 'left' : 'right');
  const sideCandidateX = preferredSide === 'left' ? normX - sideXOffset : normX + sideXOffset;
  const sideCandidateY = Math.max(DEFAULT_SAFE_BOUNDS.minY, Math.min(DEFAULT_SAFE_BOUNDS.maxY - balloonHeightEst, normY + approxFigureHeight * 0.5));
  const canFitSide = sideCandidateX >= DEFAULT_SAFE_BOUNDS.minX && sideCandidateX <= DEFAULT_SAFE_BOUNDS.maxX;

  // Hysteresis check: If previous coordinates were valid, retain placement if still within generous margins
  if (previousCoordinates && previousCoordinates.placement === 'top' && (topCandidateY + balloonHeightEst) <= (DEFAULT_SAFE_BOUNDS.maxY + 4)) {
    return {
      mode: 'balloon',
      coordinates: {
        x: Math.max(DEFAULT_SAFE_BOUNDS.minX + 8, Math.min(DEFAULT_SAFE_BOUNDS.maxX - 8, normX)),
        y: topCandidateY,
        placement: 'top',
        tailDirection: 'down',
      },
    };
  }

  if (previousCoordinates && (previousCoordinates.placement === 'left' || previousCoordinates.placement === 'right') && canFitSide) {
    return {
      mode: 'balloon',
      coordinates: {
        x: sideCandidateX,
        y: sideCandidateY,
        placement: preferredSide,
        tailDirection: preferredSide === 'left' ? 'right' : 'left',
      },
    };
  }

  // Evaluate Top
  if (canFitTop) {
    return {
      mode: 'balloon',
      coordinates: {
        x: Math.max(DEFAULT_SAFE_BOUNDS.minX + 8, Math.min(DEFAULT_SAFE_BOUNDS.maxX - 8, normX)),
        y: topCandidateY,
        placement: 'top',
        tailDirection: 'down',
      },
    };
  }

  // Evaluate Side
  if (canFitSide) {
    return {
      mode: 'balloon',
      coordinates: {
        x: sideCandidateX,
        y: sideCandidateY,
        placement: preferredSide,
        tailDirection: preferredSide === 'left' ? 'right' : 'left',
      },
    };
  }

  // Fallback: If figure is crowded or at screen boundary, fallback cleanly to bottom visual novel dock
  return {
    mode: 'visual-novel',
    coordinates: {
      x: 50,
      y: 8,
      placement: 'bottom',
      tailDirection: 'none',
    },
  };
}
