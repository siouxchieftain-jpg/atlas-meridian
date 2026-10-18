import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowLeft16Regular, Beaker16Regular, ChevronRight12Regular, Clock16Regular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { RouterLink } from '../router/router';
import { GuideSurface } from './basics';
import { size } from '../theme/constants';

/**
 * Page-level layout pieces shared by both modes. Clinical views sit on white
 * cards on the frame wash; guide surfaces (dawn) are only for welcome, tour,
 * briefings, sent and summary pages (B6).
 */
const useStyles = makeStyles({
  page: {
    marginBlockStart: `${size.panelInset}px`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: 'clamp(16px, 3vw, 32px)',
    paddingBlock: 'clamp(16px, 3vw, 28px)',
    minWidth: 0,
    boxSizing: 'border-box',
    minHeight: `calc(100dvh - var(--atlas-header-h, 48px) - ${size.panelInset * 2}px - 66px)`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
    '@media print': { boxShadow: 'none', minHeight: 0 },
  },
  narrowCol: { maxWidth: '880px' },
  guideWrap: {
    marginBlockStart: `${size.panelInset}px`,
    minHeight: `calc(100dvh - var(--atlas-header-h, 48px) - ${size.panelInset * 2}px - 66px)`,
    display: 'flex',
    flexDirection: 'column',
  },
  // On the dawn, captions use foreground 2: foreground 3 falls to 3.3 to 4.4:1 there (WCAG 1.4.3, G-24).
  guideInner: { flexGrow: 1, boxShadow: tokens.shadow2, '& [data-muted]': { color: tokens.colorNeutralForeground2 } },
  eyebrow: { ...typographyStyles.caption1Strong, color: tokens.colorBrandForeground1, margin: 0 },
  meta: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  metaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingInline: tokens.spacingHorizontalS,
    minHeight: '24px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.72)',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    ...typographyStyles.caption1,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  crumbs: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    margin: 0,
    padding: 0,
    listStyle: 'none',
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground2,
  },
  crumbLink: {
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    borderRadius: tokens.borderRadiusSmall,
    ':hover': { color: tokens.colorBrandForegroundLinkHover, textDecoration: 'underline' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  crumbCurrent: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    ...typographyStyles.body1,
    alignSelf: 'flex-start',
    ':hover': { color: tokens.colorBrandForegroundLinkHover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px', borderRadius: tokens.borderRadiusSmall },
  },
  actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  lead: { ...typographyStyles.body2, margin: 0, color: tokens.colorNeutralForeground1, maxWidth: '68ch' },
  body: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground1, maxWidth: '72ch' },
  muted: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground3 },
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  card: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: tokens.spacingHorizontalXL,
    paddingBlock: tokens.spacingVerticalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
});

/** A clinical or study page: one white card in the content area. */
export function PageCard({ children, narrow, className }: { children: ReactNode; narrow?: boolean; className?: string }) {
  const cls = useStyles();
  return <div className={mergeClasses(cls.page, className)}>{narrow ? <div className={mergeClasses(cls.stack, cls.narrowCol)}>{children}</div> : children}</div>;
}

/** A guide surface page (dawn): welcome, tour, briefing, sent, summary. */
export function GuidePage({ children, wide, after }: { children: ReactNode; wide?: boolean; after?: ReactNode }) {
  const cls = useStyles();
  return (
    <div className={cls.guideWrap}>
      <GuideSurface wide={wide} className={cls.guideInner}>
        {children}
      </GuideSurface>
      {after}
    </div>
  );
}

/** A white card that follows a guide surface (for example «Om vignetten»). */
export function Card({ children, className, 'aria-label': ariaLabel }: { children: ReactNode; className?: string; 'aria-label'?: string }) {
  const cls = useStyles();
  return (
    <section className={mergeClasses(cls.card, className)} aria-label={ariaLabel}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  const cls = useStyles();
  return <p className={cls.eyebrow}>{children}</p>;
}

export function MetaChips({ time, fictional, practice }: { time?: string; fictional?: string; practice?: string }) {
  const cls = useStyles();
  return (
    <div className={cls.meta}>
      {time && (
        <span className={cls.metaChip}>
          <Clock16Regular aria-hidden="true" />
          {time}
        </span>
      )}
      {fictional && (
        <span className={cls.metaChip}>
          <Beaker16Regular aria-hidden="true" />
          {fictional}
        </span>
      )}
      {practice && (
        <span className={cls.metaChip}>
          <Beaker16Regular aria-hidden="true" />
          {practice}
        </span>
      )}
    </div>
  );
}

export interface Crumb {
  label: string;
  to?: string;
}

/** Breadcrumb: links for the path, the last item is the current page. */
export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  const cls = useStyles();
  return (
    <nav aria-label={label}>
      <ol className={cls.crumbs}>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {c.to && !last ? (
                <RouterLink to={c.to} className={cls.crumbLink}>
                  {c.label}
                </RouterLink>
              ) : (
                <span className={last ? cls.crumbCurrent : undefined} aria-current={last ? 'page' : undefined}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight12Regular aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  const cls = useStyles();
  return (
    <RouterLink to={to} className={cls.back}>
      <ArrowLeft16Regular aria-hidden="true" />
      {children}
    </RouterLink>
  );
}

export function Actions({ children, className }: { children: ReactNode; className?: string }) {
  const cls = useStyles();
  return <div className={mergeClasses(cls.actions, className)}>{children}</div>;
}

export function Lead({ children }: { children: ReactNode }) {
  const cls = useStyles();
  return <p className={cls.lead}>{children}</p>;
}

export function Body({ children, className }: { children: ReactNode; className?: string }) {
  const cls = useStyles();
  return <p className={mergeClasses(cls.body, className)}>{children}</p>;
}

export function Muted({ children, id }: { children: ReactNode; id?: string }) {
  const cls = useStyles();
  return (
    <p className={cls.muted} id={id} data-muted="">
      {children}
    </p>
  );
}

export function Stack({ children, className }: { children: ReactNode; className?: string }) {
  const cls = useStyles();
  return <div className={mergeClasses(cls.stack, className)}>{children}</div>;
}
