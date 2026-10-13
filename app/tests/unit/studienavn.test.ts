import { describe, expect, it } from 'vitest';
import { ADJEKTIV, DYR, isStudienavn, makeStudienavn } from '../../src/engine/studienavn';

describe('study name', () => {
  it('reads «Adjektiv dyr NN»', () => {
    expect(makeStudienavn([0, 0, 17])).toBe('Rolig elg 27');
    expect(makeStudienavn([ADJEKTIV.length + 9, DYR.length + 8, 89])).toBe('Glad ørn 99');
  });

  it('always makes a name the check accepts, with a two-digit number', () => {
    for (let i = 0; i < 500; i++) {
      const name = makeStudienavn();
      expect(isStudienavn(name), name).toBe(true);
      expect(Number(name.split(' ')[2])).toBeGreaterThanOrEqual(10);
      expect(Number(name.split(' ')[2])).toBeLessThanOrEqual(99);
    }
  });

  it('rejects anything else', () => {
    for (const v of [undefined, '', 'Rolig elg', 'Rolig elg 7', 'Rolig elg 100', 'Sint elg 27', 'Rolig ulv 27', 'rolig elg 27', 42]) {
      expect(isStudienavn(v), String(v)).toBe(false);
    }
  });

  it('has 28 800 names, so 21 participants rarely share one', () => {
    const n = ADJEKTIV.length * DYR.length * 90;
    expect(n).toBe(28800);
    // Birthday bound for 21 people.
    expect((21 * 20) / 2 / n).toBeLessThan(0.01);
  });
});
