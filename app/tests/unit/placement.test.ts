import { describe, expect, it } from 'vitest';
import { POSITIONS, positionIndex, positionKey } from '../../src/engine/placement';
import { mentionedCriteria } from '../../src/engine/criteria';
import { band } from '../../src/theme/constants';
import { cases } from '../../src/content';

describe('the seven named positions on the band', () => {
  it('names each position by its own words, in order', () => {
    POSITIONS.forEach((p, i) => {
      expect(positionKey(p.value)).toBe(p.key);
      expect(positionIndex(p.value)).toBe(i);
    });
    const values = POSITIONS.map((p) => p.value);
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('puts the three middle positions inside the grey zone and the others outside it', () => {
    const inZone = (v: number) => v >= band.greyZoneStart * 100 && v <= band.greyZoneEnd * 100;
    expect(POSITIONS.map((p) => inZone(p.value))).toEqual([false, false, true, true, true, false, false]);
  });

  it('names every scripted placement', () => {
    for (const c of Object.values(cases)) {
      for (const p of [c.gp.systemReading?.placement, c.gp.dpsScript.placement, c.dps?.systemReading?.placement, c.dps?.gpUncertainty?.placement]) {
        if (p === undefined) continue;
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(100);
        expect(positionIndex(p)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('Informasjonsguiden', () => {
  it('reads Norwegian and English text for the five criteria, and never invents one', () => {
    expect(mentionedCriteria('')).toEqual([]);
    expect(mentionedCriteria('PHQ-9 i dag: 14. Sykemeldt i to uker.')).toEqual(['alvorlighet', 'funksjon', 'varighet']);
    expect(mentionedCriteria('Low mood for three months, off work, tried sertraline. No self-harm.')).toEqual([
      'alvorlighet',
      'funksjon',
      'varighet',
      'behandling',
      'risiko',
    ]);
  });

  it('finds four of five criteria in Kari’s note, as the case is written', () => {
    expect(mentionedCriteria(cases.kari.gp.note.text.nb)).toHaveLength(4);
    expect(mentionedCriteria(cases.kari.gp.note.text.en)).toEqual(mentionedCriteria(cases.kari.gp.note.text.nb));
  });
});
