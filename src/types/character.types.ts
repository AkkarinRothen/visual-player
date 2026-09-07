import type { TacticalTeam } from './combat.types';

export type CharacterPosition = 'left' | 'center-left' | 'center-right' | 'right';

export interface CharacterExpression {
  name: string;
  avatarUrl: string;
}

export interface VisualStateVariant {
  id: string; // Stable identifier
  name: string; // Human-readable label (e.g. "Abierto", "Cerrado", "Herido", "En llamas")
  assetUrl: string;
  anchor?: 'bottom-center' | 'center';
  offsetPercent?: { x: number; y: number };
  scaleModifier?: number; // Multiplicative factor (default 1.0, non-accumulative)
}

export type TransitionAnimationType = 'instant' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up';

export interface ElementTransitionDirective {
  transitionId: string;
  targetId: string; // instanceId
  targetType: 'character' | 'prop';
  direction: 'enter' | 'exit' | 'move';
  animation: TransitionAnimationType;
  durationMs: number; // 200 - 1200ms (default 500ms)
  targetRevision?: number;
}

export interface Character {
  id: string;
  name: string;
  roleOrTitle: string;
  defaultAvatarUrl: string;
  expressions?: Record<string, string>;
  expressionAnchors?: Record<string, number>; // Anchor calibration (0-50%) per expression key or avatar URL
  visualStates?: VisualStateVariant[];
  bio?: string;
  tags?: string[];
  maxHp?: number;
}

export type ShadowPreset = 'soft-ellipse' | 'elongated' | 'none';

export interface CharacterOnScreen {
  id: string;
  instanceId?: string; // Stable unique ID for screen instance
  characterId?: string;
  name: string;
  privateLabel?: string; // DM-only private instance label (e.g. "Guardia puerta", sanitized from Mesa)
  avatarUrl: string;
  position: CharacterPosition;
  normalizedX?: number; // 0-100% (center-bottom anchor)
  normalizedY?: number; // 0-100% (bottom ground line anchor)
  scale?: number; // 0.15 - 2.5 (default 1.0)
  displayStyle?: 'auto' | 'standee' | 'token'; // Visual representation: automatic from scene, forced standee, or circular VTT token
  tokenSizeInCells?: number; // Tactical grid footprint in cells (default 1 for 1x1, 2 for 2x2 large creature)
  isFlipped?: boolean; // Horizontal mirror (default false)
  zIndex?: number; // Stacking layer 1-50 (default 1)
  isLocked?: boolean; // Prevent accidental drag
  isSpeaking: boolean;
  presence?: 'on_stage' | 'in_reserve'; // Presence dimension: on screen vs ready in reserve
  isHidden?: boolean; // Visibility dimension: temporarily hidden from players without losing position
  visualAnchorOffsetY?: number; // Visual ground anchor offset 0-50% (compensates bottom transparent padding)
  instanceVariantAnchors?: Record<string, number>; // Per-instance calibration overrides per expression key
  activeExpression?: string;
  visualStateId?: string;
  statusBadge?: string;
  tacticalTeam?: TacticalTeam;
  nameplatePosition?: 'auto' | 'bottom' | 'top' | 'side'; // Adaptive or manual tag position
  shadowPreset?: ShadowPreset; // Depth ground shadow preset (default: 'soft-ellipse')
  revelation?: CharacterRevelationState;
}

export interface CharacterRevelationState {
  isAppearanceRevealed: boolean; // False => projected as silhouette/darkened outline
  isIdentityRevealed: boolean;   // False => projected with publicAlias (e.g. "Desconocido")
  silhouetteUrl?: string;        // Specific silhouette asset URL
  publicAlias?: string;          // Public placeholder name e.g. "Figura Encapuchada"
}

export interface PresetCharacterVisual {
  id: string;
  characterId?: string;
  name: string;
  avatarUrl: string;
  activeExpression?: string;
  normalizedX: number;
  normalizedY: number;
  scale: number;
  isFlipped?: boolean;
  zIndex: number;
  position?: CharacterPosition;
}
