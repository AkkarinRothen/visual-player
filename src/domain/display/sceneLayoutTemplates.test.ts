import { describe, expect, it } from 'vitest';
import { applySceneLayoutTemplate } from './sceneLayoutTemplates';
import type { CharacterOnScreen } from '../../types';

const figures: CharacterOnScreen[] = [0, 1, 2, 3].map((index) => ({
  id: `figure-${index}`, name: `Figura ${index}`, avatarUrl: 'token.png', position: 'center-left', isSpeaking: true,
}));

describe('scene layout templates', () => {
  it('keeps every figure while creating opposing JRPG sides', () => {
    const layout = applySceneLayoutTemplate(figures, 'jrpg-battle');
    expect(layout.map((item) => item.id)).toEqual(figures.map((item) => item.id));
    expect(layout[0].normalizedX).toBeLessThan(50);
    expect(layout[3].normalizedX).toBeGreaterThan(50);
    expect(layout.every((item) => !item.isSpeaking)).toBe(true);
  });

  it('makes compact grid-ready tokens for a tactical map', () => {
    const layout = applySceneLayoutTemplate(figures, 'tactical-map');
    expect(layout.every((item) => item.scale === 0.42)).toBe(true);
    expect(new Set(layout.map((item) => `${item.normalizedX},${item.normalizedY}`)).size).toBe(4);
  });
});
