import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, T } from '../content/types';
import { S, type StringKey } from './strings';
import { readJSON, writeJSON } from '../state/persist';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Content text in the current language. */
  t: (text: T | undefined | null) => string;
  /** Interface string by key, with optional {{name}} replacements. */
  s: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue | null>(null);
const LANG_KEY = 'atlas.settings.lang';

function fill(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{{${k}}}`));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (readJSON<Lang>(LANG_KEY) === 'en' ? 'en' : 'nb'));

  useEffect(() => {
    document.documentElement.lang = lang === 'nb' ? 'nb' : 'en';
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writeJSON(LANG_KEY, next);
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (text) => (text ? text[lang] : ''),
      s: (key, vars) => fill(S[key][lang], vars),
    }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang outside LanguageProvider');
  return ctx;
}

/* ---------- Small numbers in words ---------- */

const NB_NUM = ['null', 'én', 'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'åtte', 'ni', 'ti', 'elleve', 'tolv', 'tretten', 'fjorten', 'femten'];
const EN_NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];

/** A number up to fifteen in words («seks», "six"); larger numbers stay as digits (Appendix C writing). */
export function numberWord(n: number, lang: Lang): string {
  const words = lang === 'nb' ? NB_NUM : EN_NUM;
  return n >= 0 && n < words.length ? words[n] : String(n);
}

/** The text with its first letter in upper case. */
export function capitalFirst(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

/* ---------- Dates on the fictional clock ---------- */

function toDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(lang: Lang, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = lang + JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(lang === 'nb' ? 'nb-NO' : 'en-GB', { timeZone: 'UTC', ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

/** «17. mars 2026» / "17 March 2026". */
export function formatDate(iso: string, lang: Lang): string {
  return fmt(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(iso));
}

/** «tirsdag 17. mars 2026» / "Tuesday 17 March 2026". */
export function formatDateWithWeekday(iso: string, lang: Lang): string {
  return fmt(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(iso));
}

/** «17. mars» / "17 March". */
export function formatDayMonth(iso: string, lang: Lang): string {
  return fmt(lang, { day: 'numeric', month: 'long' }).format(toDate(iso));
}

export function weekdayOf(iso: string): number {
  return toDate(iso).getUTCDay();
}

/** A language-tagged span for text left in the other language. */
export function Foreign({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <span lang={lang === 'nb' ? 'nb' : 'en'}>{children}</span>;
}
