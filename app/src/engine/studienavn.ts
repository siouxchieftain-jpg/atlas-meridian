/**
 * The study name: a random, friendly name such as «Rolig elg 27», made in the
 * browser when the participant chooses a role. It goes, locked, into every
 * study form, so one person's forms can be sorted together. It is never
 * written down anywhere else, and nobody holds a key to who has which name.
 *
 * 16 adjectives x 20 animals x 90 numbers gives 28 800 names: with 21
 * participants the chance that two share a name is under 1 %, and a shared
 * name shows up as two S1 answers with the same value.
 */

// Adjectives that take no -t before a neuter noun («et rolig ekorn»), so every pair reads right.
export const ADJEKTIV = [
  'Rolig',
  'Modig',
  'Livlig',
  'Flittig',
  'Nysgjerrig',
  'Vennlig',
  'Forsiktig',
  'Stødig',
  'Sindig',
  'Glad',
  'Trofast',
  'Fredelig',
  'Tålmodig',
  'Ivrig',
  'Lystig',
  'Hjertelig',
] as const;

export const DYR = [
  'elg',
  'ugle',
  'bever',
  'rev',
  'gaupe',
  'oter',
  'ekorn',
  'hare',
  'ørn',
  'lunde',
  'sel',
  'rein',
  'hjort',
  'grevling',
  'bjørn',
  'svane',
  'trane',
  'hval',
  'laks',
  'piggsvin',
] as const;

/** Three random integers from the browser's cryptographic source (Math.random as a fallback). */
function randomInts(): [number, number, number] {
  try {
    const a = new Uint32Array(3);
    globalThis.crypto.getRandomValues(a);
    return [a[0], a[1], a[2]];
  } catch {
    const r = () => Math.floor(Math.random() * 2 ** 32);
    return [r(), r(), r()];
  }
}

/** «Adjektiv dyr NN», for example «Rolig elg 27». */
export function makeStudienavn(ints: [number, number, number] = randomInts()): string {
  const [a, d, n] = ints;
  return `${ADJEKTIV[a % ADJEKTIV.length]} ${DYR[d % DYR.length]} ${10 + (n % 90)}`;
}

/** True for a value makeStudienavn could have made. */
export function isStudienavn(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = /^(\S+) (\S+) (\d{2})$/.exec(value);
  return !!m && (ADJEKTIV as readonly string[]).includes(m[1]) && (DYR as readonly string[]).includes(m[2]) && Number(m[3]) >= 10;
}
