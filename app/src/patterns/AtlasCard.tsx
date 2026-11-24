import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { Eye16Regular, LockClosed16Regular } from '@fluentui/react-icons';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { vocab } from '../content';
import { useLang } from '../i18n/i18n';
import { band } from '../theme/constants';

/**
 * ATLAS as one card on a case page (3.8, Jishnu 24 November): the same card in both states, so the participant sees where
 * ATLAS will be before it opens. Before «Vis ATLAS» it stands locked and faded and names only what is hidden; after, it
 * holds the boxes and their parts. The first time it opens on a case it arrives: it comes into view, fades in, and its
 * heading takes focus.
 */

/** Cases whose locked card was on screen: the next open card for that case arrives (once). */
const lockedSeen = new Set<string>();
export function markLockedSeen(caseId: string) {
  lockedSeen.add(caseId);
}
export function hasArrival(caseId: string): boolean {
  return lockedSeen.has(caseId);
}
export function clearArrival(caseId: string) {
  lockedSeen.delete(caseId);
}

const lavender = band.systemMarker.colour;

const useStyles = makeStyles({
  card: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: '14px 16px 16px',
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderTop: `4px solid ${lavender}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    scrollMarginTop: 'calc(var(--atlas-header-h, 48px) + 12px)',
    '@media (forced-colors: active)': { borderTop: '4px solid Highlight' },
  },
  locked: {
    borderTopStyle: 'dashed',
    borderRightStyle: 'dashed',
    borderBottomStyle: 'dashed',
    borderLeftStyle: 'dashed',
    borderTopColor: tokens.colorNeutralStroke1,
    backgroundColor: tokens.colorNeutralBackground2,
    boxShadow: 'none',
  },
  arrive: {
    animationName: {
      from: { opacity: 0, transform: 'translateY(10px)', boxShadow: `0 0 0 0 ${lavender}66` },
      '35%': { opacity: 1, transform: 'translateY(0)', boxShadow: `0 0 0 6px ${lavender}40` },
      to: { opacity: 1, transform: 'translateY(0)', boxShadow: tokens.shadow4 },
    },
    animationDuration: '1.6s',
    animationTimingFunction: 'ease-out',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  head: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  title: {
    ...typographyStyles.subtitle1,
    margin: 0,
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground1,
    ':focus': { outline: 'none' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  titleLocked: { color: tokens.colorNeutralForeground3 },
  caption: { ...typographyStyles.caption1Strong, color: tokens.colorBrandForeground1 },
  pill: {
    marginInlineStart: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 10px',
    borderRadius: tokens.borderRadiusCircular,
    ...typographyStyles.caption1Strong,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  pillLocked: { backgroundColor: tokens.colorNeutralBackground4, color: tokens.colorNeutralForeground2 },
  arrived: { ...typographyStyles.body1Strong, margin: 0, color: tokens.colorBrandForeground1 },
});

export function AtlasCard({
  on,
  arrive,
  children,
  locked,
  arriveLine,
}: {
  /** ATLAS is open on this case. */
  on: boolean;
  /** The first time it opens on this case: come into view, fade in, take focus. */
  arrive?: boolean;
  children?: ReactNode;
  /** Data attribute for the locked card (tests, review notes). */
  locked?: boolean;
  /** «ATLAS er nå på for denne saken.», until the participant starts on the parts (review R14). */
  arriveLine?: boolean;
}) {
  const cls = useStyles();
  const { s, t } = useLang();
  const headId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!arrive) return;
    // After the route's own focus move (the page heading), so the card's heading is where the participant lands.
    const id = window.setTimeout(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      rootRef.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      headRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(id);
  }, [arrive]);
  return (
    <section
      ref={rootRef}
      className={mergeClasses(cls.card, !on && cls.locked, arrive && cls.arrive)}
      aria-labelledby={headId}
      data-atlas-card={on ? 'on' : 'locked'}
      data-case-only={locked ? '' : undefined}
    >
      <div className={cls.head}>
        <h2 className={mergeClasses(cls.title, !on && cls.titleLocked)} id={headId} ref={headRef} tabIndex={-1}>
          ATLAS
        </h2>
        {/* Locked, the card names nothing of what ATLAS shows (review R1). */}
        {on && <span className={cls.caption}>{t(vocab.band.caption)}</span>}
        <span className={mergeClasses(cls.pill, !on && cls.pillLocked)}>
          {on ? <Eye16Regular aria-hidden="true" /> : <LockClosed16Regular aria-hidden="true" />}
          {on ? s('medAtlas') : s('utenAtlas')}
        </span>
      </div>
      {arriveLine && <p className={cls.arrived}>{s('atlasOnNow')}</p>}
      {children}
    </section>
  );
}
