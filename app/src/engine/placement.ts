import type { StringKey } from '../i18n/strings';

/**
 * Placement on the band, 0 (clearly outside the DPS criteria) to 100 (clearly
 * within). The participant chooses one of seven positions named in words; the
 * number is internal and is never shown or announced.
 */
export const POSITIONS: { value: number; key: StringKey }[] = [
  { value: 5, key: 'pos1' },
  { value: 27, key: 'pos2' },
  { value: 44, key: 'pos3' },
  { value: 50, key: 'pos4' },
  { value: 56, key: 'pos5' },
  { value: 73, key: 'pos6' },
  { value: 95, key: 'pos7' },
];

/** The words for any placement (scripted ones included). */
export function positionKey(p: number): StringKey {
  if (p < 15) return 'pos1';
  if (p < 40) return 'pos2';
  if (p < 48) return 'pos3';
  if (p <= 52) return 'pos4';
  if (p <= 60) return 'pos5';
  if (p <= 85) return 'pos6';
  return 'pos7';
}

/** The index (0 to 6) of the position a placement falls in. */
export function positionIndex(p: number): number {
  const key = positionKey(p);
  return POSITIONS.findIndex((x) => x.key === key);
}
