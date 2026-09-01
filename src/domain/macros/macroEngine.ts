import type { CinematicMacro, DisplayState, MacroStep } from '../../types';

/**
 * Pure function: applies a single MacroStep to a DisplayState without side-effects.
 */
export function applyStepToState(step: MacroStep, baseState: DisplayState): DisplayState {
  const next: DisplayState = { ...baseState };

  if (step.sceneId) next.currentSceneId = step.sceneId;
  if (step.backgroundUrl) next.backgroundUrl = step.backgroundUrl;
  if (step.weather !== undefined) next.weather = step.weather;
  if (step.weatherIntensity !== undefined) next.weatherIntensity = step.weatherIntensity;
  if (step.lighting !== undefined) next.lighting = step.lighting;
  if (step.blackout !== undefined) next.isBlackout = step.blackout;
  if (step.locationBanner) next.locationBanner = step.locationBanner;

  if (step.charactersToAdd && step.charactersToAdd.length > 0) {
    const existingIds = next.characters.map((c) => c.id);
    const additions = step.charactersToAdd.filter((c) => !existingIds.includes(c.id));
    next.characters = [...next.characters, ...additions];
  }

  if (step.charactersToRemove && step.charactersToRemove.length > 0) {
    next.characters = next.characters.filter((c) => !step.charactersToRemove?.includes(c.id));
  }

  if (step.speakerId) {
    next.characters = next.characters.map((c) => ({
      ...c,
      isSpeaking: c.id === step.speakerId,
    }));
  }

  if (step.ambientAudioUrl !== undefined) {
    next.ambientAudioUrl = step.ambientAudioUrl;
    next.ambientPlaying = step.ambientPlaying ?? true;
    if (step.ambientVolume !== undefined) next.ambientVolume = step.ambientVolume;
  }

  return next;
}

/**
 * Pure function: accumulates all steps of a CinematicMacro onto a base DisplayState.
 * Used for loading a macro directly into staging/draft mode.
 */
export function accumulateMacroToState(
  macro: CinematicMacro,
  baseState: DisplayState
): DisplayState {
  let state = { ...baseState };
  for (const step of macro.steps) {
    state = applyStepToState(step, state);
  }
  return state;
}
