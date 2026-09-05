export type TouchMode = 'characters' | 'viewport' | 'background';
export type DpadPreset = 'fine' | 'normal' | 'coarse';
export type ComposerBottomTab = 'background' | 'characters' | 'layers' | 'fx';

export const getDpadDeltas = (preset: DpadPreset) => {
  switch (preset) {
    case 'fine':
      return { dx: 1 / 1920, dy: 1 / 1080 };
    case 'coarse':
      return { dx: 20 / 1920, dy: 20 / 1080 };
    case 'normal':
    default:
      return { dx: 5 / 1920, dy: 5 / 1080 };
  }
};
