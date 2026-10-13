/**
 * Interface strings live in src/content/strings.json, Norwegian (bokmål) first
 * and English second, so the owner can change a string by editing one data
 * file. Copy rules (checked by scripts/check-content.mjs): no em dash, no
 * advice in ATLAS's voice, study texts speak for «prosjektet», never «vi».
 */
import strings from '../content/strings.json';

export type StringKey = keyof typeof strings;
export const S: Record<StringKey, { nb: string; en: string }> = strings;
