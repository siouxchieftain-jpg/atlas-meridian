import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';

/**
 * A small hash router. Routes look like `#/studie/sak/kari/konsultasjon` or
 * `#/gjennomgang/fastlege/timeliste`. A query after `?` is kept separately
 * (only the preview flag uses it).
 */
export interface Route {
  path: string[];
  query: URLSearchParams;
  raw: string;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const [p, q = ''] = raw.split('?');
  const path = (p ?? '').split('/').filter(Boolean).map((seg) => decodeURIComponent(seg));
  return { path, query: new URLSearchParams(q), raw };
}

let current: Route = parse(typeof window === 'undefined' ? '' : window.location.hash);
const listeners = new Set<() => void>();

function emit() {
  current = parse(window.location.hash);
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', emit);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

export function toHash(path: string): string {
  return path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
}

/** Navigate to a path such as `/studie/velkommen`. */
export function navigate(path: string, opts: { replace?: boolean } = {}): void {
  const hash = toHash(path);
  if (window.location.hash === hash) return;
  if (opts.replace) {
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, '', url);
    emit();
  } else {
    window.location.hash = hash;
  }
}

export function currentPath(): string {
  return `/${current.path.join('/')}`;
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  children: ReactNode;
}

/** A real link (so it works with the keyboard, middle-click and screen readers). */
export function RouterLink({ to, children, onClick, ...rest }: LinkProps) {
  const href = toHash(to);
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={href} onClick={handle} {...rest}>
      {children}
    </a>
  );
}

/** Redirect while rendering (used for guarded study routes). */
export function Redirect({ to }: { to: string }) {
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to]);
  return null;
}
