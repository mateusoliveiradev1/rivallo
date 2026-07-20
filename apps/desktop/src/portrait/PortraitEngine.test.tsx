import { describe, expect, it } from 'vitest';

import { defaultPortraitRecipe, portraitSvg, randomizePortrait } from './PortraitEngine.js';

describe('PortraitEngine', () => {
  it('renders the same original SVG for the same serialized recipe', () => {
    const recipe = randomizePortrait(defaultPortraitRecipe(), 'all', 42_4242);
    const restored = JSON.parse(JSON.stringify(recipe)) as typeof recipe;
    expect(portraitSvg(restored)).toBe(portraitSvg(recipe));
    expect(portraitSvg(recipe)).toContain('Retrato procedural Rivallo');
    expect(recipe.rendererVersion).toBe(2);
  });

  it('creates visual variation for different seeds without nationality input', () => {
    const first = randomizePortrait(defaultPortraitRecipe(), 'all', 10);
    const second = randomizePortrait(defaultPortraitRecipe(), 'all', 11);
    expect(portraitSvg(first)).not.toBe(portraitSvg(second));
    expect(Object.keys(first)).not.toContain('nationality');
  });

  it('respects face, hair and clothing locks during controlled randomization', () => {
    const current = {
      ...defaultPortraitRecipe(),
      locks: { face: true, hair: true, clothing: true, accessories: false, background: false },
    };
    const next = randomizePortrait(current, 'all', 9_999);
    expect(next.faceShape).toBe(current.faceShape);
    expect(next.skinTone).toBe(current.skinTone);
    expect(next.hairStyle).toBe(current.hairStyle);
    expect(next.clothing).toBe(current.clothing);
    expect(next.background).not.toBe('');
  });
});
