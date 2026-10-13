import { AnnounceProvider, useAnnounce } from '@fluentui/react-components';
import { useCallback, type ReactNode } from 'react';

/**
 * The app's one announcer (G-32): Fluent's AriaLiveAnnouncer in main.tsx.
 * MessageBars speak through it on their own; everything else that changes
 * without moving focus (a saved choice, a reading that appears, a new message)
 * calls this once, at the moment it happens. Visible status lines carry no
 * live-region role of their own, so nothing is announced twice.
 */
export function useAtlasAnnounce() {
  const { announce } = useAnnounce();
  return useCallback((text: string) => announce(text, { polite: true }), [announce]);
}

/**
 * Give focus back to `target` after an overlay (drawer, dialog) closes. Fluent
 * keeps an overlay mounted, and its focus trap active, while it animates out;
 * focus is set on the next frame and set again once the overlay has gone if it
 * fell to the page (WCAG 2.4.3).
 */
export function focusAfterOverlay(target: () => HTMLElement | null | undefined) {
  window.requestAnimationFrame(() => target()?.focus());
  window.setTimeout(() => {
    const active = document.activeElement;
    if (!active || active === document.body) target()?.focus();
  }, 450);
}

/**
 * Move focus without moving the page when the target is fully in view and nothing lies over it; otherwise bring it
 * to the middle of the window first. At 400 % zoom nothing is sticky, so a target can lie far below the window, or
 * partly under the floating «Vis skjemaet» (r5A-02, r6A-03, WCAG 2.4.7, 2.4.11).
 */
export function focusInView(el: HTMLElement | null | undefined) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const inside = r.top >= 0 && r.left >= 0 && r.bottom <= window.innerHeight && r.right <= window.innerWidth;
  const clear = (x: number, y: number) => {
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit));
  };
  // The middle of its first line and its far corner: what a reader looks at, and what a floating control would cover.
  const y = r.top + Math.min(r.height / 2, 12);
  if (inside && clear(r.left + Math.min(r.width / 2, 40), y) && clear(r.right - 2, r.bottom - 2)) {
    el.focus({ preventScroll: true });
    return;
  }
  el.scrollIntoView({ block: 'center', inline: 'nearest' });
  el.focus({ preventScroll: true });
}

const silent = { announce: () => undefined };

/**
 * A persistent banner is not a status change: a MessageBar inside this is not
 * announced when it mounts (Fluent's MessageBar announces itself otherwise).
 * Used for the preview banner, the preview note in review mode and the ATLAS
 * task bar, whose text is said once when ATLAS is shown (R2A-08).
 */
export function Silent({ children }: { children: ReactNode }) {
  return <AnnounceProvider value={silent}>{children}</AnnounceProvider>;
}

