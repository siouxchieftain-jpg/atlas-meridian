import { describe, expect, it } from 'vitest';
import { atlasBrand, atlasLightTheme, meridianOverrides } from '../../src/theme/atlasTheme';
import { band, mediaQueryOrder, mq, neutralBar, size } from '../../src/theme/constants';

/** WCAG relative luminance of a #RRGGBB colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('Meridian theme', () => {
  it('keeps Fluent lavender at brand 80 (settled)', () => {
    expect(atlasBrand[80]).toBe('#7160E8');
    expect(atlasLightTheme.colorBrandBackground).toBe('#7160E8');
  });

  it('applies every listed override, and the list matches the theme', () => {
    for (const [key, value] of Object.entries(meridianOverrides)) {
      expect(atlasLightTheme[key as keyof typeof atlasLightTheme], key).toBe(value);
    }
  });

  it('puts links and brand text on brand 60, which passes AA on white (G-10)', () => {
    expect(atlasLightTheme.colorBrandForegroundLink).toBe(atlasBrand[60]);
    expect(atlasLightTheme.colorBrandForeground1).toBe(atlasBrand[60]);
    expect(contrast(atlasBrand[60], '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    // Brand 80 is a fill colour, not a text colour: white text on it must pass AA.
    expect(contrast('#FFFFFF', atlasBrand[80])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Meridian constants', () => {
  it('draws the grey zone from 40 to 60 per cent of the band', () => {
    expect(band.greyZoneStart).toBe(0.4);
    expect(band.greyZoneEnd).toBe(0.6);
  });

  it('marks the system with the brand colour and the clinician with the text colour', () => {
    expect(band.systemMarker.colour).toBe(atlasBrand[80]);
    expect(band.ownMarker.colour).toBe(atlasLightTheme.colorNeutralForeground1);
  });

  it('keeps the proportion bar in greys only, never status colours (B1)', () => {
    for (const c of neutralBar) {
      const [r, g, b] = [1, 3, 5].map((i) => c.slice(i, i + 2));
      expect(r === g && g === b, c).toBe(true);
    }
  });

  it('uses the settled sizes', () => {
    expect(size).toMatchObject({ header: 48, rail: 48, nav: 260, atlasPanel: 320, formPanel: 440, contentMin: 640 });
  });

  it('registers every size-class query with the renderer, in the right order', () => {
    const queries = Object.values(mq).map((q) => q.replace(/^@media /, ''));
    expect([...queries].sort()).toEqual([...mediaQueryOrder].sort());
    // min-width queries ascend, then max-width queries descend, so later rules win at the right widths.
    const mins = mediaQueryOrder.filter((q) => q.includes('min-width')).map((q) => parseInt(q.match(/\d+/)![0], 10));
    const maxs = mediaQueryOrder.filter((q) => q.includes('max-width')).map((q) => parseInt(q.match(/\d+/)![0], 10));
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
    expect(maxs).toEqual([...maxs].sort((a, b) => b - a));
  });
});
