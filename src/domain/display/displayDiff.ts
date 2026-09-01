import type { CategoryDiff, DisplayState, PublishCategoryKey } from '../../types';

/**
 * Calculates how many distinct categories have pending changes between stagedState and liveState.
 */
export function calculatePendingChangesCount(
  liveState: DisplayState,
  stagedState: DisplayState,
  operationMode: 'live' | 'staging'
): number {
  if (operationMode === 'live') return 0;
  let count = 0;

  if (stagedState.currentSceneId !== liveState.currentSceneId || stagedState.backgroundUrl !== liveState.backgroundUrl) {
    count++;
  }
  if (JSON.stringify(stagedState.characters) !== JSON.stringify(liveState.characters)) {
    count++;
  }
  if (stagedState.weather !== liveState.weather || stagedState.weatherIntensity !== liveState.weatherIntensity) {
    count++;
  }
  if (stagedState.lighting !== liveState.lighting) {
    count++;
  }
  if (
    stagedState.locationBanner.text !== liveState.locationBanner.text ||
    stagedState.locationBanner.subtitle !== liveState.locationBanner.subtitle ||
    stagedState.locationBanner.visible !== liveState.locationBanner.visible
  ) {
    count++;
  }
  if (
    stagedState.ambientAudioUrl !== liveState.ambientAudioUrl ||
    stagedState.ambientPlaying !== liveState.ambientPlaying ||
    stagedState.ambientVolume !== liveState.ambientVolume
  ) {
    count++;
  }
  if (stagedState.isBlackout !== liveState.isBlackout) {
    count++;
  }

  return count;
}

/**
 * Computes individual category diffs with human-readable summary badges for visual inspection.
 */
export function computeCategoryDiffs(
  liveState: DisplayState,
  stagedState: DisplayState
): CategoryDiff[] {
  const list: CategoryDiff[] = [];

  // Background / Scene
  const bgChanged =
    liveState.currentSceneId !== stagedState.currentSceneId ||
    liveState.backgroundUrl !== stagedState.backgroundUrl;
  if (bgChanged) {
    list.push({
      key: 'background',
      label: 'Escenario y Fondo',
      icon: 'Image',
      hasChanged: true,
      liveSummary: liveState.sceneName || 'Escenario actual',
      stagedSummary: stagedState.sceneName || 'Nuevo escenario',
    });
  }

  // Characters on screen
  const liveCharsStr = JSON.stringify(
    liveState.characters.map((c) => ({ id: c.id, pos: c.position, spk: c.isSpeaking, exp: c.activeExpression }))
  );
  const stagedCharsStr = JSON.stringify(
    stagedState.characters.map((c) => ({ id: c.id, pos: c.position, spk: c.isSpeaking, exp: c.activeExpression }))
  );
  const charsChanged = liveCharsStr !== stagedCharsStr;
  if (charsChanged) {
    const added = stagedState.characters.filter((sc) => !liveState.characters.some((lc) => lc.id === sc.id));
    const removed = liveState.characters.filter((lc) => !stagedState.characters.some((sc) => sc.id === lc.id));
    let desc = `${stagedState.characters.length} NPCs`;
    if (added.length > 0) desc += ` (+${added.map((c) => c.name).join(', ')})`;
    if (removed.length > 0) desc += ` (-${removed.map((c) => c.name).join(', ')})`;

    list.push({
      key: 'characters',
      label: 'Personajes en Escena',
      icon: 'Users',
      hasChanged: true,
      liveSummary: `${liveState.characters.length} NPCs en pantalla`,
      stagedSummary: desc,
    });
  }

  // Weather
  const weatherChanged =
    liveState.weather !== stagedState.weather ||
    liveState.weatherIntensity !== stagedState.weatherIntensity;
  if (weatherChanged) {
    list.push({
      key: 'weather',
      label: 'Clima y Partículas',
      icon: 'CloudRain',
      hasChanged: true,
      liveSummary: `${liveState.weather} (${Math.round(liveState.weatherIntensity * 100)}%)`,
      stagedSummary: `${stagedState.weather} (${Math.round(stagedState.weatherIntensity * 100)}%)`,
    });
  }

  // Lighting
  const lightingChanged = liveState.lighting !== stagedState.lighting;
  if (lightingChanged) {
    list.push({
      key: 'lighting',
      label: 'Filtro de Iluminación',
      icon: 'Sun',
      hasChanged: true,
      liveSummary: liveState.lighting,
      stagedSummary: stagedState.lighting,
    });
  }

  // Location Banner
  const bannerChanged =
    liveState.locationBanner.text !== stagedState.locationBanner.text ||
    liveState.locationBanner.subtitle !== stagedState.locationBanner.subtitle ||
    liveState.locationBanner.visible !== stagedState.locationBanner.visible;
  if (bannerChanged) {
    list.push({
      key: 'locationBanner',
      label: 'Cartel de Ubicación',
      icon: 'BookOpen',
      hasChanged: true,
      liveSummary: liveState.locationBanner.visible ? liveState.locationBanner.text : '(Oculto)',
      stagedSummary: stagedState.locationBanner.visible ? stagedState.locationBanner.text : '(Oculto)',
    });
  }

  // Ambient Audio
  const audioChanged =
    liveState.ambientAudioUrl !== stagedState.ambientAudioUrl ||
    liveState.ambientPlaying !== stagedState.ambientPlaying ||
    liveState.ambientVolume !== stagedState.ambientVolume;
  if (audioChanged) {
    list.push({
      key: 'ambientAudio',
      label: 'Música y Audio Ambiental',
      icon: 'Music',
      hasChanged: true,
      liveSummary: liveState.ambientPlaying ? 'En reproducción' : 'Pausado / Sin audio',
      stagedSummary: stagedState.ambientPlaying
        ? `Reproduciendo (${Math.round(stagedState.ambientVolume * 100)}%)`
        : 'Pausado',
    });
  }

  // Blackout
  const blackoutChanged = liveState.isBlackout !== stagedState.isBlackout;
  if (blackoutChanged) {
    list.push({
      key: 'blackout',
      label: 'Blackout (Pánico)',
      icon: 'EyeOff',
      hasChanged: true,
      liveSummary: liveState.isBlackout ? 'Blackout Activo' : 'Pantalla Normal',
      stagedSummary: stagedState.isBlackout ? 'Blackout Activo' : 'Pantalla Normal',
    });
  }

  return list;
}

/**
 * Merges selected category keys from stagedState into liveState, returning the new merged DisplayState.
 */
export function mergeSelectiveState(
  liveState: DisplayState,
  stagedState: DisplayState,
  selectedKeys: PublishCategoryKey[]
): DisplayState {
  const merged: DisplayState = { ...liveState };

  if (selectedKeys.includes('background')) {
    merged.currentSceneId = stagedState.currentSceneId;
    merged.sceneName = stagedState.sceneName;
    merged.backgroundUrl = stagedState.backgroundUrl;
  }
  if (selectedKeys.includes('characters')) {
    merged.characters = stagedState.characters;
  }
  if (selectedKeys.includes('weather')) {
    merged.weather = stagedState.weather;
    merged.weatherIntensity = stagedState.weatherIntensity;
  }
  if (selectedKeys.includes('lighting')) {
    merged.lighting = stagedState.lighting;
  }
  if (selectedKeys.includes('locationBanner')) {
    merged.locationBanner = stagedState.locationBanner;
  }
  if (selectedKeys.includes('ambientAudio')) {
    merged.ambientAudioUrl = stagedState.ambientAudioUrl;
    merged.ambientPlaying = stagedState.ambientPlaying;
    merged.ambientVolume = stagedState.ambientVolume;
  }
  if (selectedKeys.includes('blackout')) {
    merged.isBlackout = stagedState.isBlackout;
  }

  return merged;
}
