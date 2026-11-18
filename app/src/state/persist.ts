/**
 * «Se deg rundt» (3.7): a second tab where the participant can go through ATLAS
 * again without forms. Everything it stores lives in this tab's sessionStorage
 * under its own prefix, so the real study in the other tab is never touched.
 */
const BROWSE_KEY = 'atlas.browse';
const BROWSE_PREFIX = 'atlas.browse:';

export function browseFlag(): boolean {
  try {
    return window.sessionStorage.getItem(BROWSE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Starts browse mode in this tab, with the language of the study it came from. */
export function startBrowse(): void {
  try {
    if (window.sessionStorage.getItem(BROWSE_KEY) === '1') return;
    window.sessionStorage.setItem(BROWSE_KEY, '1');
    const lang = window.localStorage.getItem('atlas.settings.lang');
    if (lang != null) window.sessionStorage.setItem(BROWSE_PREFIX + 'atlas.settings.lang', lang);
  } catch {
    /* ignore */
  }
}

/** In browse mode: removes this tab's browse keys that match (keys given without the prefix). */
export function clearBrowseKeys(match: (key: string) => boolean): void {
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(BROWSE_PREFIX) && match(key.slice(BROWSE_PREFIX.length)))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

function store(): Storage {
  return browseFlag() ? window.sessionStorage : window.localStorage;
}

function k(key: string): string {
  return browseFlag() ? BROWSE_PREFIX + key : key;
}

/**
 * Browser storage that never throws. Storage can be missing or blocked
 * (private windows, locked-down PCs); the app then runs from memory.
 */

export function readJSON<V>(key: string): V | undefined {
  try {
    const raw = store().getItem(k(key));
    return raw == null ? undefined : (JSON.parse(raw) as V);
  } catch {
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    store().setItem(k(key), JSON.stringify(value));
  } catch {
    /* storage unavailable: keep running from memory */
  }
}

export function removeKey(key: string): void {
  try {
    store().removeItem(k(key));
  } catch {
    /* ignore */
  }
}

export function readSession<V>(key: string): V | undefined {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw == null ? undefined : (JSON.parse(raw) as V);
  } catch {
    return undefined;
  }
}

export function writeSession(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function removeSession(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
