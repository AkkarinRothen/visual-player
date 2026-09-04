/**
 * Centralized Application Versioning, Protocol Specification and Feature Capability Matrix
 */

export const APP_VERSION = '1.1.0';
export const BUILD_ID = '2026.09.04.1';
export const PROTOCOL_VERSION = 2;

export type AppCapability =
  | 'waypoints'
  | 'occlusion'
  | 'lighting_presets'
  | 'revelations'
  | 'dynamic_ducking'
  | 'combat_turn_timer'
  | 'scene_variants'
  | 'scene_props';

export const APP_CAPABILITIES: AppCapability[] = [
  'waypoints',
  'occlusion',
  'lighting_presets',
  'revelations',
  'dynamic_ducking',
  'combat_turn_timer',
  'scene_variants',
  'scene_props',
];

export interface VersionCompatibilityResult {
  status: 'compatible' | 'compatible_with_limitations' | 'incompatible';
  message: string;
  missingCapabilities: AppCapability[];
  isProtocolMismatch: boolean;
}

/**
 * Evaluates compatibility between Master (GM) and Display (Mesa).
 *
 * Rules:
 * 1. If protocol version differs: 'incompatible' (prevents commands from failing silently or corrupting display).
 * 2. If protocol matches and Display supports all GM required capabilities: 'compatible'.
 * 3. If protocol matches but Display lacks some capabilities used by GM: 'compatible_with_limitations'.
 */
export function evaluateVersionCompatibility(params: {
  localRole: 'master' | 'display';
  localProtocolVersion: number;
  remoteProtocolVersion?: number;
  localCapabilities: AppCapability[];
  remoteCapabilities?: string[];
  remoteAppVersion?: string;
}): VersionCompatibilityResult {
  const {
    localRole,
    localProtocolVersion,
    remoteProtocolVersion = 1,
    localCapabilities,
    remoteCapabilities = [],
    remoteAppVersion = '1.0.0',
  } = params;

  // 1. Check Protocol Compatibility
  if (remoteProtocolVersion !== localProtocolVersion) {
    return {
      status: 'incompatible',
      message: `Incompatibilidad de protocolo entre ${localRole === 'master' ? 'el Control GM' : 'la Mesa'} (proto v${localProtocolVersion}) y el dispositivo remoto (proto v${remoteProtocolVersion}, app v${remoteAppVersion}). Se requiere actualizar la app rezagada para evitar desincronización.`,
      missingCapabilities: [],
      isProtocolMismatch: true,
    };
  }

  // 2. Check Feature Capabilities
  const remoteCapSet = new Set(remoteCapabilities);
  const missingCapabilities = localCapabilities.filter((cap) => !remoteCapSet.has(cap));

  if (missingCapabilities.length > 0) {
    const labels: Record<AppCapability, string> = {
      waypoints: 'Puntos narrativos (waypoints)',
      occlusion: 'Oclusión detrás del decorado',
      lighting_presets: 'Presets de iluminación',
      revelations: 'Revelaciones progresivas',
      dynamic_ducking: 'Atenuación inteligente de audio (ducking)',
      combat_turn_timer: 'Temporizador de combate sincronizado',
      scene_variants: 'Variantes de escena',
      scene_props: 'Decorados interactivos (props)',
    };

    const readableMissing = missingCapabilities
      .map((c) => labels[c] || c)
      .slice(0, 3)
      .join(', ');

    return {
      status: 'compatible_with_limitations',
      message: `Mesa conectada en v${remoteAppVersion} (compatible con limitaciones). Funciones no disponibles en la Mesa: ${readableMissing}${missingCapabilities.length > 3 ? '...' : ''}. Se recomienda actualizar la Mesa al finalizar la sesión.`,
      missingCapabilities,
      isProtocolMismatch: false,
    };
  }

  return {
    status: 'compatible',
    message: 'Versiones de GM y Mesa 100% compatibles.',
    missingCapabilities: [],
    isProtocolMismatch: false,
  };
}
