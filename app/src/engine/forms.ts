import type { CoreCaseId, FormKey, Role } from '../content/types';
import type { FormStep, Intervju, RoleChoice } from '../state/types';
import { readSession, removeSession, writeSession } from '../state/persist';
import { rolleValue } from '../state/study';

/** Runtime configuration, edited by the owner in public/atlas-config.json. */
export interface AtlasConfig {
  /** Nettskjema addresses, for example https://nettskjema.no/a/123456. Empty = not ready. */
  forms: Partial<Record<FormKey, string>>;
  /** The information letter Velkommen links to. */
  informationLetter?: string;
  /** Contact lines shown on Velkommen. */
  contact?: { nb: string; en: string };
}

export const NETTSKJEMA_ORIGIN = 'https://nettskjema.no';

let config: AtlasConfig = { forms: {} };
let loaded = false;

export async function loadConfig(): Promise<AtlasConfig> {
  if (loaded) return config;
  try {
    const res = await fetch(`./atlas-config.json?v=${encodeURIComponent(__ATLAS_VERSJON__)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as Partial<AtlasConfig>;
      const forms: AtlasConfig['forms'] = {};
      Object.entries(json.forms ?? {}).forEach(([k, v]) => {
        if (typeof v === 'string' && v.trim()) forms[k as FormKey] = v.trim();
      });
      const contact = json.contact && (json.contact.nb?.trim() || json.contact.en?.trim()) ? json.contact : undefined;
      const informationLetter = json.informationLetter?.trim() ? json.informationLetter.trim() : undefined;
      config = { forms, informationLetter, contact };
    }
  } catch {
    config = { forms: {} };
  }
  loaded = true;
  return config;
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
  fields.versjon = __ATLAS_VERSJON__;
  return fields;
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
