import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowLeft16Regular, Beaker16Regular, ChevronRight12Regular, Clock16Regular } from '@fluentui/react-icons';
import type { ReactNode } from 'react';
import { RouterLink } from '../router/router';
import { atlasDawn, size } from '../theme/constants';

/**
 * Page-level layout pieces shared by both modes, in Meridian's two registers: the work sits on white panels on the
 * frame wash, as in any Microsoft 365 app; the study around it (Velkommen, the study card, the tour, help, the end of
 * the study) is a guide surface with the dawn.
 */
const useStyles = makeStyles({
  // One panel padding everywhere: 16 px on a phone, 24 px from 640 px. A panel reaches down to the footer when its
  // content is shorter than the window, and grows with its content when it is longer (ATLAS 3.3: no empty band under a
  // short page). The content column is a flex column (AppShell), so the panel only has to grow.
  page: {
    flexGrow: 1,
    marginBlockStart: `${size.panelInset}px`,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    padding: tokens.spacingHorizontalL,
    minWidth: 0,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    '@media only screen and (min-width: 640px)': { padding: tokens.spacingHorizontalXXL },
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
    '@media print': { boxShadow: 'none' },
  },
  narrowCol: { maxWidth: '880px' },
  // An intro page (Takk, review mode's start): a guide surface with the dawn, down to the footer when it is short, then
  // any white cards after it.
  introWrap: { flexGrow: 1, marginBlockStart: `${size.panelInset}px`, display: 'flex', flexDirection: 'column', gap: `${size.panelInset}px` },
  intro: {
    flexGrow: 1,
    background: atlasDawn,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: 'clamp(16px, 5vw, 48px)',
    paddingBlock: 'clamp(24px, 5vw, 48px)',
    minWidth: 0,
    boxSizing: 'border-box',
    // On the dawn, captions use foreground 2: foreground 3 falls to 3.3 to 4.4:1 there (WCAG 1.4.3, G-24).
    '& [data-muted]': { color: tokens.colorNeutralForeground2 },
    '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
    '@media print': { background: '#FFFFFF', boxShadow: 'none' },
  },
  introColumn: { maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  introWide: { maxWidth: '1040px' },
  // On a working page an eyebrow is a quiet label in foreground 2; brand text that does nothing would read as a link.
  eyebrow: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground2, margin: 0 },
  eyebrowBrand: { color: tokens.colorBrandForeground1 },
  meta: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  metaChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    paddingInline: tokens.spacingHorizontalS,
    minHeight: '24px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
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
    padding: tokens.spacingHorizontalL,
    '@media only screen and (min-width: 640px)': { padding: tokens.spacingHorizontalXXL },
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

/** An intro page: Takk and review mode's start. A guide surface, then whatever follows it. */
export function IntroPage({ children, wide, after }: { children: ReactNode; wide?: boolean; after?: ReactNode }) {
  const cls = useStyles();
  return (
    <div className={cls.introWrap}>
      <section className={cls.intro} data-intro-page="" data-guide-surface="">
        <div className={mergeClasses(cls.introColumn, wide && cls.introWide)}>{children}</div>
      </section>
      {after}
    </div>
  );
}

/** A white card: a page's panel in a case's flow (for example «Om saken»), or one that follows an intro page. */
export function Card({ children, className, 'aria-label': ariaLabel }: { children: ReactNode; className?: string; 'aria-label'?: string }) {
  const cls = useStyles();
  return (
    <section className={mergeClasses(cls.card, className)} aria-label={ariaLabel}>
      {children}
    </section>
  );
}

/** A short label over a page title. `brand` is for Velkommen and the intro pages, the study's own voice. */
export function Eyebrow({ children, brand }: { children: ReactNode; brand?: boolean }) {
  const cls = useStyles();
  return <p className={mergeClasses(cls.eyebrow, brand && cls.eyebrowBrand)}>{children}</p>;
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
