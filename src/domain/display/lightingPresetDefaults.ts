import type { LightingApplyMode, SceneLight, SceneLightingPreset } from '../../types';

export const DEFAULT_LIGHTING_PRESETS: SceneLightingPreset[] = [
  {
    id: 'preset-warm-tavern',
    name: 'Taberna Cálida',
    description: 'Fogón crepitante y antorchas ámbar de pared con atmósfera acogedora',
    lightingFilter: 'torch_flicker',
    transitionDurationMs: 800,
    lights: [
      {
        id: 'light-tavern-hearth',
        name: 'Fogón Central',
        preset: 'torch',
        color: '#ff8822',
        intensity: 1.2,
        radiusPct: 35,
        normalizedX: 50,
        normalizedY: 65,
        flicker: true,
        visible: true,
      },
      {
        id: 'light-tavern-left',
        name: 'Antorcha Izquierda',
        preset: 'candle',
        color: '#ffaa44',
        intensity: 0.8,
        radiusPct: 20,
        normalizedX: 18,
        normalizedY: 35,
        flicker: true,
        visible: true,
      },
      {
        id: 'light-tavern-right',
        name: 'Antorcha Derecha',
        preset: 'candle',
        color: '#ffaa44',
        intensity: 0.8,
        radiusPct: 20,
        normalizedX: 82,
        normalizedY: 35,
        flicker: true,
        visible: true,
      },
    ],
  },
  {
    id: 'preset-moonlit-ruins',
    name: 'Ruinas bajo la Luna',
    description: 'Haz cenital plateado frío y reflejos nocturnos etéreos',
    lightingFilter: 'night',
    transitionDurationMs: 1000,
    lights: [
      {
        id: 'light-moon-overhead',
        name: 'Luz Cenital de Luna',
        preset: 'moonlight',
        color: '#99ccff',
        intensity: 1.1,
        radiusPct: 45,
        normalizedX: 50,
        normalizedY: 25,
        flicker: false,
        visible: true,
      },
      {
        id: 'light-moon-ground',
        name: 'Reflejo de Suelo',
        preset: 'moonlight',
        color: '#6699dd',
        intensity: 0.6,
        radiusPct: 30,
        normalizedX: 45,
        normalizedY: 75,
        flicker: false,
        visible: true,
      },
    ],
  },
  {
    id: 'preset-arcane-shrine',
    name: 'Santuario Arcano',
    description: 'Orbe rúnico pulsante púrpura y fuegos fatuos flotantes cian',
    lightingFilter: 'mystic_violet',
    transitionDurationMs: 1200,
    lights: [
      {
        id: 'light-arcane-orb',
        name: 'Orbe Rúnico',
        preset: 'magic',
        color: '#cc33ff',
        intensity: 1.3,
        radiusPct: 38,
        normalizedX: 50,
        normalizedY: 45,
        flicker: true,
        visible: true,
      },
      {
        id: 'light-wisp-cyan-1',
        name: 'Fuego Fatuo Alfa',
        preset: 'magic',
        color: '#00ffff',
        intensity: 0.9,
        radiusPct: 18,
        normalizedX: 28,
        normalizedY: 30,
        flicker: true,
        visible: true,
      },
      {
        id: 'light-wisp-cyan-2',
        name: 'Fuego Fatuo Beta',
        preset: 'magic',
        color: '#00eeff',
        intensity: 0.9,
        radiusPct: 18,
        normalizedX: 72,
        normalizedY: 60,
        flicker: true,
        visible: true,
      },
    ],
  },
];

export function getDefaultLightingPresets(): SceneLightingPreset[] {
  return JSON.parse(JSON.stringify(DEFAULT_LIGHTING_PRESETS));
}

export function findLightingPreset(
  presets: SceneLightingPreset[] | undefined,
  presetId: string
): SceneLightingPreset | undefined {
  if (!presets || presets.length === 0) {
    return DEFAULT_LIGHTING_PRESETS.find((p) => p.id === presetId);
  }
  return presets.find((p) => p.id === presetId) || DEFAULT_LIGHTING_PRESETS.find((p) => p.id === presetId);
}

/**
 * Pure helper to apply a lighting preset to an existing set of lights.
 * In 'replace' mode, old lights are discarded and replaced with a clone of preset lights.
 * In 'merge' mode, existing lights are preserved and preset lights are appended idempotently
 * (avoiding duplicate lights with identical IDs or case-insensitive names).
 */
export function applyLightingPreset(
  currentLights: SceneLight[] = [],
  preset: SceneLightingPreset,
  mode: LightingApplyMode = 'replace'
): SceneLight[] {
  if (mode === 'replace') {
    return JSON.parse(JSON.stringify(preset.lights));
  }

  const existingIds = new Set(currentLights.map((l) => l.id));
  const existingNames = new Set(currentLights.map((l) => l.name.toLowerCase().trim()));
  const merged: SceneLight[] = [...currentLights];

  for (const presetLight of preset.lights) {
    const normName = presetLight.name.toLowerCase().trim();
    if (!existingIds.has(presetLight.id) && !existingNames.has(normName)) {
      merged.push({ ...presetLight });
      existingIds.add(presetLight.id);
      existingNames.add(normName);
    }
  }

  return merged;
}
