import type { CoreCaseId, FormKey, Role } from '../content/types';
import type { FormStep, Intervju, RoleChoice } from '../state/types';
import { readSession, removeSession, writeSession } from '../state/persist';
import { rolleValue } from '../state/study';

/** The pilot round answers into its own copy of the study forms; the study round into the study forms. */
export type Round = 'pilot' | 'study';

/** The study's own forms. R1 and R2 (review mode) are the same in both rounds. */
export const STUDY_FORM_KEYS: FormKey[] = ['S1', 'S2.fastlege', 'S2.dps', 'S3', 'S4.fastlege', 'S4.dps', 'S5.fastlege', 'S5.dps', 'S6', 'S7.fastlege', 'S8', 'S9'];

/** Runtime configuration, edited by the owner in public/atlas-config.json. */
export interface AtlasConfig {
  /**
   * The addresses in use, for example https://nettskjema.no/a/123456. Empty = not ready. In the pilot round the
   * study forms come from `pilotForms`, so no pilot answer ever lands in a study form.
   */
  forms: Partial<Record<FormKey, string>>;
  /** «pilot» until the owner switches to «study» in atlas-config.json. A missing value is the study round. */
  round: Round;
  /** The first day of the study (ISO date), shown in the closed message. */
  opens?: string;
  /** The last day the study takes answers (ISO date). After it, Velkommen says the study has ended (study round only). */
  closes?: string;
  /** The information letter Velkommen links to. */
  informationLetter?: string;
  /** Contact lines shown on Velkommen. */
  contact?: { nb: string; en: string };
}

export const NETTSKJEMA_ORIGIN = 'https://nettskjema.no';

let config: AtlasConfig = { forms: {}, round: 'study' };
let loaded = false;

/** The file as the owner writes it. */
interface ConfigFile {
  round?: string;
  forms?: Record<string, unknown>;
  pilotForms?: Record<string, unknown>;
  studyPeriod?: { opens?: unknown; closes?: unknown };
  informationLetter?: string;
  contact?: { nb?: string; en?: string };
}

const isoDate = (v: unknown): string | undefined => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : undefined);

/** The configuration from the file's shape: the round picks the study forms; R1 and R2 come from `forms` in both rounds. */
export function resolveConfig(json: ConfigFile): AtlasConfig {
  const round: Round = json.round === 'pilot' ? 'pilot' : 'study';
  const pick = (set: Record<string, unknown> | undefined, k: string) => {
    const v = set?.[k];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };
  const forms: AtlasConfig['forms'] = {};
  const keys = new Set([...Object.keys(json.forms ?? {}), ...STUDY_FORM_KEYS]);
  keys.forEach((k) => {
    const study = (STUDY_FORM_KEYS as string[]).includes(k);
    const v = study && round === 'pilot' ? pick(json.pilotForms, k) : pick(json.forms, k);
    if (v) forms[k as FormKey] = v;
  });
  const contact = json.contact && (json.contact.nb?.trim() || json.contact.en?.trim()) ? { nb: json.contact.nb ?? '', en: json.contact.en ?? '' } : undefined;
  const informationLetter = json.informationLetter?.trim() ? json.informationLetter.trim() : undefined;
  return { forms, round, opens: isoDate(json.studyPeriod?.opens), closes: isoDate(json.studyPeriod?.closes), informationLetter, contact };
}

export async function loadConfig(): Promise<AtlasConfig> {
  if (loaded) return config;
  try {
    const res = await fetch(`./atlas-config.json?v=${encodeURIComponent(__ATLAS_VERSJON__)}`, { cache: 'no-store' });
    if (res.ok) config = resolveConfig((await res.json()) as ConfigFile);
  } catch {
    config = { forms: {}, round: 'study' };
  }
  loaded = true;
  return config;
}

/** The locked `versjon`: the build, and «-pilot» on every answer collected in the pilot round. */
export function versjonValue(): string {
  return config.round === 'pilot' ? `${__ATLAS_VERSJON__}-pilot` : __ATLAS_VERSJON__;
}

/**
 * True once the study's last day has passed: Velkommen then says the study has ended and starts nothing. Never in the
 * pilot round, and never without a closing date.
 */
export function studyClosed(today: string = osloToday()): boolean {
  return config.round === 'study' && !!config.closes && today > config.closes;
}

/** Today's date in Norway (YYYY-MM-DD), so the study closes at Norwegian midnight whatever the computer's clock zone. */
export function osloToday(now: Date = new Date()): string {
  try {
    // sv-SE writes dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function getConfig(): AtlasConfig {
  return config;
}

/* ---------- Which form a step uses ---------- */

export function formKeyFor(step: FormStep, role: Role): FormKey {
  const r = role === 'gp' ? 'fastlege' : 'dps';
  switch (step) {
    case 'S1':
      return 'S1';
    case 'S2':
      return `S2.${r}` as FormKey;
    case 'S3':
      return 'S3';
    case 'S4':
      return `S4.${r}` as FormKey;
    case 'S5':
      return `S5.${r}` as FormKey;
    case 'S6':
      return 'S6';
    case 'S7':
      return 'S7.fastlege';
    case 'S8':
      return 'S8';
    case 'S9':
      return 'S9';
  }
}

export const STEP_CASE: Partial<Record<FormStep, CoreCaseId>> = { S3: 'kari', S4: 'erlend', S5: 'astrid' };
export const STEP_VIGNETT: Partial<Record<FormStep, string>> = { S3: 'V1', S4: 'V3', S5: 'V4', S7: 'V2', S8: 'V5' };

/** `steg` value: S1 … S8, with `-etter` for a case form opened after «Vis ATLAS». */
export function stegValue(step: FormStep, visAtlas: Partial<Record<CoreCaseId, boolean>>): string {
  const c = STEP_CASE[step];
  return c && visAtlas[c] ? `${step}-etter` : step;
}

export interface LockedFields {
  [codebook: string]: string;
}

/**
 * The locked context for a study form. Values are Norwegian in both languages.
 * `studienavn` (the random study name) sorts one person's forms together; it
 * is empty only before a role is chosen, and an empty value is never sent.
 */
export function studyLocked(
  step: FormStep,
  roleChoice: RoleChoice | undefined,
  intervju: Intervju | undefined,
  visAtlas: Partial<Record<CoreCaseId, boolean>>,
  studienavn?: string,
): LockedFields {
  const fields: LockedFields = {
    rolle: rolleValue(roleChoice),
    intervju: intervju ?? 'Vil ikke svare',
    studienavn: studienavn ?? '',
    steg: stegValue(step, visAtlas),
  };
  const vignett = STEP_VIGNETT[step];
  if (vignett) fields.vignett = vignett;
  fields.versjon = versjonValue();
  return fields;
}

/**
 * The locked context for S9, the feedback form: who (role and study name), where (`side`, the screen, and `seksjon`,
 * the part) and the build. No step, so one person can send it as often as they like.
 */
export function feedbackLocked(roleChoice: RoleChoice | undefined, studienavn: string | undefined, side: string, seksjon: string): LockedFields {
  return { rolle: rolleValue(roleChoice), studienavn: studienavn ?? '', side, seksjon, versjon: versjonValue() };
}

/**
 * Build the address for a Nettskjema form with locked, pre-filled fields:
 * `CB<codebook>=<value>&LCK<codebook>=true`. Values use encodeURIComponent
 * (never URLSearchParams, which writes spaces as +). Empty values are never
 * sent. The new-tab address never carries embed=1.
 */
export function buildFormUrl(address: string, locked: LockedFields, embed: boolean): string {
  const parts: string[] = [];
  if (embed) parts.push('embed=1');
  Object.entries(locked).forEach(([k, v]) => {
    if (v === undefined || v === null || String(v).trim() === '') return;
    parts.push(`CB${k}=${encodeURIComponent(String(v))}`);
    parts.push(`LCK${k}=true`);
  });
  const sep = address.includes('?') ? '&' : '?';
  return `${address}${sep}${parts.join('&')}`;
}

/* ---------- Preview forms ---------- */

const PREVIEW_KEY = 'atlas.preview';

/** True when the address carried `?forhandsvisning` in this browser session. */
export function previewFlag(): boolean {
  return readSession<boolean>(PREVIEW_KEY) === true;
}

export function setPreviewFlag(on: boolean): void {
  if (on) writeSession(PREVIEW_KEY, true);
  else removeSession(PREVIEW_KEY);
}

/** Safari (and iOS browsers) start on the new-tab route: sending from a frame may need a third-party cookie. */
export function prefersNewTab(): boolean {
  const ua = navigator.userAgent;
  const isSafari = /Safari\//.test(ua) && !/(Chrome|Chromium|Edg|OPR|Firefox)\//.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  return isSafari || isIOS;
}
