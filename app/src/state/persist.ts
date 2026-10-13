/**
 * Browser storage that never throws. Storage can be missing or blocked
 * (private windows, locked-down PCs); the app then runs from memory.
 */

export function readJSON<V>(key: string): V | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? undefined : (JSON.parse(raw) as V);
  } catch {
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep running from memory */
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
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
