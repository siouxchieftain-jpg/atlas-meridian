import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { useEffect, useRef, type ReactNode } from 'react';
import { useRoute } from '../router/router';
import { focusInView } from '../patterns/announce';

const useStyles = makeStyles({
  h1: {
    ...typographyStyles.title3,
    margin: 0,
    color: tokens.colorNeutralForeground1,
    // The heading takes focus programmatically on route change (tabIndex -1); it is not a control, so no ring.
    ':focus': { outline: 'none' },
    ':focus-visible': { outline: 'none' },
    // A long Norwegian compound («Mitt henvisningsmønster») wraps instead of running past a 320 px window (r7A-02).
    overflowWrap: 'anywhere',
    hyphens: 'auto',
  },
  // The guide pages' large title steps down below 480 px, as the G-01 type ramp does for narrow windows (r7A-02).
  guide: { ...typographyStyles.title1, '@media (max-width: 479px)': { ...typographyStyles.title2 } },
  sub: { ...typographyStyles.body1, color: tokens.colorNeutralForeground3, margin: 0 },
});

let routeChanged = false;

/**
 * A reload that should leave focus on the new page's heading (after «Fjern ATLAS-data», R3F-02)
 * marks its history entry. The mark is read once, before any redirect replaces the entry, and removed.
 */
export const FOCUS_HEADING_ON_LOAD = 'atlasFocusHeading';
let focusOnLoad = false;
if (typeof window !== 'undefined') {
  const state: unknown = window.history.state;
  if (state && typeof state === 'object' && (state as Record<string, unknown>)[FOCUS_HEADING_ON_LOAD] === true) {
    focusOnLoad = true;
    window.history.replaceState(null, '', window.location.href);
  }
}

/**
 * One h1 per view (G-04). It takes focus on every route change, and the
 * document title becomes "<view> · ATLAS" (never a patient's name).
 */
export function PageHeading({
  children,
  title,
  sub,
  guide,
  className,
}: {
  children: ReactNode;
  /** The document title part; never a patient name. */
  title: string;
  sub?: ReactNode;
  guide?: boolean;
  className?: string;
}) {
  const cls = useStyles();
  const ref = useRef<HTMLHeadingElement>(null);
  const route = useRoute();
  useEffect(() => {
    document.title = `${title} · ATLAS`;
  }, [title]);
  useEffect(() => {
    // Move focus to the heading after a route change (not on the first load), unless focus is inside the form panel or a dialog.
    if (!routeChanged) {
      routeChanged = true;
      if (focusOnLoad) {
        focusOnLoad = false;
        focusInView(ref.current);
      }
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    // A page chosen in the navigation drawer starts at its top too; the drawer gives focus to this
    // heading once it has closed, since its focus trap holds focus until then (R3A-02).
    const fromNavDrawer = !!active?.closest('[data-nav-drawer]');
    if (!fromNavDrawer && active && (active.closest('[data-form-panel]') || active.closest('[role="dialog"]'))) return;
    // A new page starts at its top, so nothing above the heading (the case bar, «Vis ATLAS») is left
    // under the sticky header and banner (R2GP-06); focus goes to the heading without another scroll.
    window.scrollTo({ top: 0 });
    if (fromNavDrawer) return;
    focusInView(ref.current);
  }, [route.raw]);
  return (
    <div>
      <h1 ref={ref} tabIndex={-1} className={mergeClasses(cls.h1, guide && cls.guide, className)}>
        {children}
      </h1>
      {sub && <p className={cls.sub}>{sub}</p>}
    </div>
  );
}
