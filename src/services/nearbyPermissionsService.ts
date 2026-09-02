/**
 * nearbyPermissionsService.ts
 *
 * Gestión de permisos Android requeridos por Google Nearby Connections
 * de forma progresiva, contextual y específica por rol.
 *
 * La solicitud de permisos ocurre solo cuando el usuario elige la
 * opción "Conexión local Android", nunca al iniciar la app.
 *
 * Estados tipados: not_required | not_requested | granted |
 *                  denied_can_retry | denied_permanently |
 *                  restricted | unavailable
 */

import { Capacitor } from '@capacitor/core';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type PermissionState =
  | 'not_required'
  | 'not_requested'
  | 'granted'
  | 'denied_can_retry'
  | 'denied_permanently'
  | 'restricted'
  | 'unavailable';

export type NearbyPermission =
  | 'BLUETOOTH_SCAN'
  | 'BLUETOOTH_CONNECT'
  | 'BLUETOOTH_ADVERTISE'
  | 'NEARBY_WIFI_DEVICES'
  | 'ACCESS_FINE_LOCATION'
  | 'ACCESS_COARSE_LOCATION'
  | 'CHANGE_WIFI_STATE'
  | 'ACCESS_WIFI_STATE';

export type RolePermissions = Record<NearbyPermission, PermissionState>;

export interface PermissionCheckResult {
  role: 'display' | 'master';
  apiLevel: number;
  permissions: RolePermissions;
  canProceed: boolean;
  missingCritical: NearbyPermission[];
  permanentlyDenied: NearbyPermission[];
}

export interface PermissionRationale {
  permission: NearbyPermission;
  title: string;
  explanation: string;
  isPermanentlyDenied: boolean;
}

// ─────────────────────────────────────────────
// Permisos necesarios por API level y rol
// ─────────────────────────────────────────────

/** Permisos críticos para Nearby en Android 12+ (API 31+) */
const PERMISSIONS_API_31_PLUS: NearbyPermission[] = [
  'BLUETOOTH_SCAN',
  'BLUETOOTH_CONNECT',
  'BLUETOOTH_ADVERTISE',
  'NEARBY_WIFI_DEVICES',
];

/** Permisos críticos para Nearby en Android < 12 (API < 31) */
const PERMISSIONS_API_BELOW_31: NearbyPermission[] = [
  'ACCESS_FINE_LOCATION',
  'ACCESS_WIFI_STATE',
  'CHANGE_WIFI_STATE',
];

/** Permisos opcionales siempre requeridos */
const PERMISSIONS_ALL: NearbyPermission[] = ['ACCESS_WIFI_STATE', 'CHANGE_WIFI_STATE'];

const RATIONALE_TEXT: Record<NearbyPermission, { title: string; explanation: string }> = {
  BLUETOOTH_SCAN: {
    title: 'Detectar dispositivos cercanos',
    explanation: 'Necesario para que tu celular encuentre la Tablet del DM sin Internet.',
  },
  BLUETOOTH_CONNECT: {
    title: 'Conectar con dispositivos cercanos',
    explanation: 'Necesario para establecer la conexión local entre celular y Tablet.',
  },
  BLUETOOTH_ADVERTISE: {
    title: 'Anunciar la sala en red local',
    explanation: 'Necesario para que la Tablet sea visible para los celulares cercanos.',
  },
  NEARBY_WIFI_DEVICES: {
    title: 'Usar Wi-Fi para conexión local',
    explanation:
      'Permite la transferencia de alta velocidad de datos de campaña sin necesitar Internet.',
  },
  ACCESS_FINE_LOCATION: {
    title: 'Ubicación para redes locales',
    explanation:
      'Android require acceso a ubicación para escanear Wi-Fi y encontrar dispositivos cercanos (no guarda tu ubicación).',
  },
  ACCESS_COARSE_LOCATION: {
    title: 'Ubicación aproximada para redes locales',
    explanation:
      'Requerido por Android para acceder a redes Wi-Fi locales y encontrar el dispositivo del DM.',
  },
  CHANGE_WIFI_STATE: {
    title: 'Administrar conexión Wi-Fi',
    explanation:
      'Permite que la app use la red local para comunicarse con la Tablet del DM.',
  },
  ACCESS_WIFI_STATE: {
    title: 'Ver estado del Wi-Fi',
    explanation: 'Necesario para verificar que la red local está disponible.',
  },
};

// ─────────────────────────────────────────────
// Historial local (sobrevive recargas de página)
// ─────────────────────────────────────────────

const HISTORY_KEY = 'vp_nearby_perm_history';

function getPermissionHistory(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
  } catch {
    return {};
  }
}

function recordPermissionDenied(permission: NearbyPermission) {
  const history = getPermissionHistory();
  history[permission] = (history[permission] || 0) + 1;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getDenialCount(permission: NearbyPermission): number {
  return getPermissionHistory()[permission] || 0;
}

// ─────────────────────────────────────────────
// Plugin Bridge (Capacitor)
// ─────────────────────────────────────────────

interface NearbyPermissionsPlugin {
  checkNearbyPermissions(): Promise<{ permissions: Record<string, string> }>;
  requestNearbyPermissions(opts: { permissions: string[] }): Promise<{ results: Record<string, string> }>;
  getApiLevel(): Promise<{ level: number }>;
  shouldShowRationale(opts: { permission: string }): Promise<{ show: boolean }>;
}

function getNearbyPlugin(): NearbyPermissionsPlugin | null {
  if (!Capacitor.isNativePlatform()) return null;
  // This bridges to the native VisualPlayerNearbyPlugin
  return (window as any)?.Capacitor?.Plugins?.VisualPlayerNearby as NearbyPermissionsPlugin ?? null;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

class NearbyPermissionsService {
  private cachedApiLevel: number | null = null;

  async getAndroidApiLevel(): Promise<number> {
    if (this.cachedApiLevel !== null) return this.cachedApiLevel;
    const plugin = getNearbyPlugin();
    if (!plugin) {
      this.cachedApiLevel = 30; // Safe default for non-native
      return this.cachedApiLevel;
    }
    try {
      const { level } = await plugin.getApiLevel();
      this.cachedApiLevel = level;
      return level;
    } catch {
      this.cachedApiLevel = 30;
      return this.cachedApiLevel;
    }
  }

  /** Devuelve la lista de permisos necesarios según API level y rol */
  async getRequiredPermissions(role: 'display' | 'master'): Promise<NearbyPermission[]> {
    if (!Capacitor.isNativePlatform()) return [];
    const apiLevel = await this.getAndroidApiLevel();
    const required: Set<NearbyPermission> = new Set(PERMISSIONS_ALL);

    const levelPermissions =
      apiLevel >= 31 ? PERMISSIONS_API_31_PLUS : PERMISSIONS_API_BELOW_31;
    levelPermissions.forEach((p) => required.add(p));

    // Display role also needs ADVERTISE
    if (role === 'display' && apiLevel >= 31) {
      required.add('BLUETOOTH_ADVERTISE');
    }

    return Array.from(required);
  }

  /** Comprueba el estado actual de los permisos sin solicitarlos */
  async checkPermissionsForRole(role: 'display' | 'master'): Promise<PermissionCheckResult> {
    const apiLevel = await this.getAndroidApiLevel();
    const requiredPerms = await this.getRequiredPermissions(role);

    if (!Capacitor.isNativePlatform()) {
      const permissions = this.buildNotRequiredMap();
      return {
        role,
        apiLevel,
        permissions,
        canProceed: true,
        missingCritical: [],
        permanentlyDenied: [],
      };
    }

    const plugin = getNearbyPlugin();
    let nativeStates: Record<string, string> = {};

    if (plugin) {
      try {
        const result = await plugin.checkNearbyPermissions();
        nativeStates = result.permissions;
      } catch {
        // Plugin not yet available
      }
    }

    const permissions: Partial<RolePermissions> = {};
    const missingCritical: NearbyPermission[] = [];
    const permanentlyDenied: NearbyPermission[] = [];

    for (const perm of Object.keys(RATIONALE_TEXT) as NearbyPermission[]) {
      const isRequired = requiredPerms.includes(perm);
      if (!isRequired) {
        permissions[perm] = 'not_required';
        continue;
      }
      const nativeState = nativeStates[perm];

      if (!nativeState || nativeState === 'not_requested') {
        permissions[perm] = 'not_requested';
        missingCritical.push(perm);
      } else if (nativeState === 'granted') {
        permissions[perm] = 'granted';
      } else if (nativeState === 'unavailable') {
        permissions[perm] = 'unavailable';
        missingCritical.push(perm);
      } else if (nativeState === 'restricted') {
        permissions[perm] = 'restricted';
        missingCritical.push(perm);
      } else {
        // Denied - check if permanent
        const denials = getDenialCount(perm);
        const isPermanent = denials >= 2;
        permissions[perm] = isPermanent ? 'denied_permanently' : 'denied_can_retry';
        if (isPermanent) {
          permanentlyDenied.push(perm);
        }
        missingCritical.push(perm);
      }
    }

    return {
      role,
      apiLevel,
      permissions: permissions as RolePermissions,
      canProceed: missingCritical.length === 0,
      missingCritical,
      permanentlyDenied,
    };
  }

  /** Solicita los permisos necesarios para el rol dado */
  async requestPermissionsForRole(
    role: 'display' | 'master'
  ): Promise<PermissionCheckResult> {
    const required = await this.getRequiredPermissions(role);
    const plugin = getNearbyPlugin();

    if (!plugin || !Capacitor.isNativePlatform()) {
      return this.checkPermissionsForRole(role);
    }

    try {
      const { results } = await plugin.requestNearbyPermissions({ permissions: required });

      // Record denials for permanent detection
      for (const perm of required) {
        if (results[perm] === 'denied') {
          recordPermissionDenied(perm as NearbyPermission);
        }
      }
    } catch (err) {
      console.warn('[NearbyPermissions] Request failed:', err);
    }

    // Re-check after request
    return this.checkPermissionsForRole(role);
  }

  /** Devuelve el texto de rationale para mostrar antes del diálogo del sistema */
  getRationale(permission: NearbyPermission): PermissionRationale {
    const text = RATIONALE_TEXT[permission];
    const isPermanentlyDenied = getDenialCount(permission) >= 2;
    return {
      permission,
      title: text.title,
      explanation: text.explanation,
      isPermanentlyDenied,
    };
  }

  /** Detecta si el fallback a WebRTC está disponible (siempre true si hay Internet) */
  async isWebRTCFallbackAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://dns.google/resolve?name=visual-player.vercel.app&type=A', {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private buildNotRequiredMap(): RolePermissions {
    const map: Partial<RolePermissions> = {};
    for (const perm of Object.keys(RATIONALE_TEXT) as NearbyPermission[]) {
      map[perm] = 'not_required';
    }
    return map as RolePermissions;
  }

  /** Resetea el historial de rechazos (para testing) */
  resetDenialHistory() {
    localStorage.removeItem(HISTORY_KEY);
  }
}

export const nearbyPermissionsService = new NearbyPermissionsService();
