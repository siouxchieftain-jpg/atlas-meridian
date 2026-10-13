import { Button, MessageBar, MessageBarActions, MessageBarBody } from '@fluentui/react-components';
import { Dismiss16Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/i18n';
import type { StringKey } from '../i18n/strings';
import { useRoute } from '../router/router';
import { focusInView } from './announce';

export interface Notice {
  /** The string, not its text: a language switch shows the notice in the new language and does not announce it again (r7A-01). */
  key: StringKey;
  /** The page the notice belongs to; null until the page the action led to has settled. */
  path: string | null;
}

/**
 * A confirmation where the action led (Meridian Toast guidance, G-15, G-32):
 * one MessageBar at the top of that page instead of a toast. Fluent's
 * announcer reads it once when it appears; it goes when the reader closes it
 * or moves to another page.
 */
export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  /** Show the string `key` on `path`, or, without a path, on the page the app settles on next (after any redirect). */
  const show = useCallback((key: StringKey, path?: string) => setNotice({ key, path: path ?? null }), []);
  const clear = useCallback(() => setNotice(null), []);
  const bind = useCallback((path: string) => setNotice((n) => (n && n.path === null ? { ...n, path } : n)), []);
  return { notice, show, clear, bind };
}

export function NoticeBar({ notice, onDismiss, onBind }: { notice: Notice | null; onDismiss: () => void; onBind: (path: string) => void }) {
  const { s } = useLang();
  const route = useRoute();
  const here = `/${route.path.join('/')}`;
  const unbound = !!notice && notice.path === null;
  // Redirects settle within a frame or two; the notice then belongs to the page reached.
  useEffect(() => {
    if (!unbound) return;
    const id = window.setTimeout(() => onBind(here), 250);
    return () => window.clearTimeout(id);
  }, [unbound, here, onBind]);
  // Once shown, the notice goes when the reader moves to another page, so coming back neither shows nor
  // announces it again (r6A-02).
  const shown = useRef<Notice | null>(null);
  const visible = !!notice && notice.path !== null && notice.path === here;
  useEffect(() => {
    if (visible) shown.current = notice;
    else if (notice && shown.current === notice && notice.path !== here) onDismiss();
  }, [visible, notice, here, onDismiss]);
  if (!notice || (notice.path !== null && notice.path !== here)) return null;
  // Closing it gives focus to the page's heading rather than dropping it on the page (r7A-10).
  const close = () => {
    onDismiss();
    window.requestAnimationFrame(() => focusInView(document.querySelector<HTMLElement>('h1[tabindex="-1"]')));
  };
  return (
    <MessageBar intent="success" politeness="polite">
      <MessageBarBody>{s(notice.key)}</MessageBarBody>
      <MessageBarActions containerAction={<Button appearance="transparent" aria-label={s('close')} icon={<Dismiss16Regular />} onClick={close} />} />
    </MessageBar>
  );
}
