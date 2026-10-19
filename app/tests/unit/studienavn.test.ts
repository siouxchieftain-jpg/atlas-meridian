import { describe, expect, it } from 'vitest';
import { ADJEKTIV, DYR, DYR_TIDLIGERE, isStudienavn, makeStudienavn } from '../../src/engine/studienavn';

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
    for (const v of [undefined, '', 'Rolig elg', 'Rolig elg 7', 'Rolig elg 100', 'Sint elg 27', 'Rolig hund 27', 'rolig elg 27', 42]) {
      expect(isStudienavn(v), String(v)).toBe(false);
    }
  });

  it('keeps a name given before 3.4 valid, but never makes one with an animal that has no exact emoji', () => {
    // The state renames a participant whose stored name fails the check: a name already in their forms must pass.
    for (const dyr of DYR_TIDLIGERE) expect(isStudienavn(`Ivrig ${dyr} 87`), dyr).toBe(true);
    for (let i = 0; i < 2000; i++) {
      const animal = makeStudienavn().split(' ')[1];
      expect((DYR_TIDLIGERE as readonly string[]).includes(animal), animal).toBe(false);
    }
  });

  it('has 28 800 names, so 21 participants rarely share one', () => {
    const n = ADJEKTIV.length * DYR.length * 90;
    expect(n).toBe(28800);
    // Birthday bound for 21 people.
    expect((21 * 20) / 2 / n).toBeLessThan(0.01);
  });
});

describe('the study name mark (3.4)', () => {
  it('has a picture of every animal a new name can hold, and none for an earlier one or a word that is no animal', async () => {
    const { studyNameAnimal } = await import('../../src/patterns/basics');
    for (const dyr of DYR) {
      const hit = studyNameAnimal(`Rolig ${dyr} 27`);
      expect(hit?.animal, dyr).toBe(dyr);
      expect(hit?.url, dyr).toBeTruthy();
    }
    // An earlier name keeps its initials: a puffin is never shown as a penguin.
    for (const dyr of DYR_TIDLIGERE) expect(studyNameAnimal(`Ivrig ${dyr} 87`), dyr).toBeUndefined();
    expect(studyNameAnimal('Rolig hund 27')).toBeUndefined();
    expect(studyNameAnimal('')).toBeUndefined();
    // «gås» is written «gas» on disk.
    expect(studyNameAnimal('Rolig gås 27')?.animal).toBe('gås');
    // Loading the patterns module pulls in Fluent: give a busy machine room.
  }, 30_000);
});
