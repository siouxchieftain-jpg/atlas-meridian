import {
  Button,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  Tooltip,
  makeStaticStyles,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
  useArrowNavigationGroup,
} from '@fluentui/react-components';
import { Dismiss20Regular, Navigation20Regular, PanelLeftContract20Regular, PanelLeftExpand20Regular } from '@fluentui/react-icons';
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { useLang } from '../i18n/i18n';
import { RouterLink, useRoute } from '../router/router';
import { atlasFrameWash, size } from '../theme/constants';
import { readJSON, writeJSON } from '../state/persist';
import { focusAfterOverlay } from '../patterns/announce';

export interface NavItem {
  key: string;
  label: string;
  to: string;
  icon: ReactElement;
  iconActive: ReactElement;
  /** Matches when the current path starts with any of these. */
  match: string[];
}

// The document scrolls, so the scroll padding belongs on the root: a focused
// control never ends up under the sticky header (WCAG 2.4.11, G-05). Below
// 500 px of height (400 % zoom, a phone on its side) the header and banner
// scroll away with the page instead of covering it (WCAG 1.4.10).
const useGlobalStyles = makeStaticStyles({
  html: { scrollPaddingTop: 'calc(var(--atlas-header-h, 48px) + 8px)' },
  '@media (max-height: 500px)': { html: { scrollPaddingTop: '8px' } },
  // Review-only controls never reach paper.
  '@media print': { '[data-no-print]': { display: 'none' } },
});

const useStyles = makeStyles({
  app: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    background: atlasFrameWash,
    color: tokens.colorNeutralForeground1,
    '@media (forced-colors: active)': { background: 'Canvas' },
    '@media print': { background: '#FFFFFF' },
  },
  skip: {
    position: 'absolute',
    left: '8px',
    top: '-48px',
    zIndex: 2000,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorBrandForegroundLink,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow8,
    ':focus': { top: '8px' },
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    background: atlasFrameWash,
    // Below 500 px of height the header scrolls with the page and sits under the form panel (R2A-04).
    // An inline form panel then starts at the top of the window, so the header keeps its controls
    // out from under it, as the page column does (r4A-01). The variable is 0 unless the panel is inline.
    '@media (max-height: 500px)': { position: 'static', zIndex: 'auto', paddingInlineEnd: 'var(--atlas-form-inline, 0px)' },
    '@media (forced-colors: active)': { background: 'Canvas', borderBottom: '1px solid CanvasText' },
    '@media print': { display: 'none' },
  },
  headerRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXXS,
    minHeight: `${size.header}px`,
    paddingInline: tokens.spacingHorizontalS,
    boxSizing: 'border-box',
    '@media only screen and (min-width: 640px)': { paddingInline: tokens.spacingHorizontalM },
  },
  body: { display: 'flex', flexGrow: 1, minHeight: 0 },
  rail: {
    display: 'none',
    boxSizing: 'border-box',
    flexShrink: 0,
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXS,
    width: `${size.rail}px`,
    paddingBlock: tokens.spacingVerticalS,
    position: 'sticky',
    top: 'var(--atlas-header-h, 48px)',
    alignSelf: 'flex-start',
    maxHeight: 'calc(100dvh - var(--atlas-header-h, 48px))',
    '@media only screen and (min-width: 640px)': { display: 'flex' },
    '@media print': { display: 'none' },
  },
  navWide: {
    '@media only screen and (min-width: 1366px)': {
      width: `${size.nav}px`,
      alignItems: 'stretch',
      paddingInline: tokens.spacingHorizontalS,
    },
  },
  railLink: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalS,
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    textDecoration: 'none',
    ':hover': { backgroundColor: tokens.colorSubtleBackgroundHover, color: tokens.colorNeutralForeground2BrandHover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '1px' },
  },
  railLinkWide: {
    '@media only screen and (min-width: 1366px)': {
      width: 'auto',
      // A label that needs more room (text spacing, WCAG 1.4.12) wraps instead of being cut (R2A-12).
      height: 'auto',
      minHeight: '40px',
      justifyContent: 'flex-start',
      paddingInline: tokens.spacingHorizontalS,
      ...typographyStyles.body1,
    },
  },
  railActive: {
    backgroundColor: tokens.colorSubtleBackgroundSelected,
    color: tokens.colorNeutralForeground1,
    '::before': {
      content: '""',
      position: 'absolute',
      left: '-4px',
      top: '10px',
      bottom: '10px',
      width: '4px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: tokens.colorCompoundBrandStroke,
    },
    '@media (forced-colors: active)': { outline: '2px solid Highlight' },
  },
  railIcon: { display: 'inline-flex', fontSize: '20px', flexShrink: 0, color: 'inherit' },
  railActiveIcon: { color: tokens.colorNeutralForeground2BrandSelected },
  railText: {
    display: 'none',
    '@media only screen and (min-width: 1366px)': { display: 'inline', minWidth: 0, overflowWrap: 'anywhere' },
  },
  railToggle: {
    display: 'none',
    '@media only screen and (min-width: 1366px)': { display: 'inline-flex', alignSelf: 'flex-start', marginTop: 'auto' },
  },
  // With tools at its foot, the column is as tall as the window, so they sit at the bottom of it.
  railFull: { height: 'calc(100dvh - var(--atlas-header-h, 48px))' },
  // Tools at the foot of the navigation column (review mode: Merknader), above the collapse toggle.
  navEnd: { marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: tokens.spacingVerticalS, paddingBlockStart: tokens.spacingVerticalM },
  navEndWide: { '@media only screen and (min-width: 1366px)': { alignItems: 'stretch' } },
  railToggleAfterEnd: { '@media only screen and (min-width: 1366px)': { marginTop: 0 } },
  // The main landmark and the footer share one column; the footer sits outside <main> (1.3.1).
  mainCol: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    paddingInline: `${size.panelInset}px calc(${size.panelInset}px + var(--atlas-form-inline, 0px) + var(--atlas-edge-tab, 0px))`,
  },
  main: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    paddingBlockEnd: tokens.spacingVerticalS,
    ':focus': { outline: 'none' },
  },
  content: { flexGrow: 1, minWidth: 0, maxWidth: `${size.contentMax}px`, width: '100%' },
  notice: { maxWidth: `${size.contentMax}px`, paddingBlockStart: `${size.panelInset}px`, '@media print': { display: 'none' } },
  footer: {
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground3,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalM,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    columnGap: tokens.spacingHorizontalXXXL,
    rowGap: tokens.spacingVerticalM,
    maxWidth: `${size.contentMax}px`,
    boxSizing: 'border-box',
  },
  footerText: { display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '960px', minWidth: 0, flex: '1 1 480px' },
  footerNote: { color: tokens.colorNeutralForeground2, marginBlockStart: tokens.spacingVerticalXS },
  // UiA's rule: clear space at least the width of its symbol around the logo (about 28 px at this size).
  footerEnd: { display: 'flex', alignItems: 'flex-end', paddingInlineEnd: tokens.spacingHorizontalS, paddingBlockEnd: tokens.spacingVerticalL },
  drawerLink: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minHeight: '44px',
    paddingInline: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    ...typographyStyles.body1,
    ':hover': { backgroundColor: tokens.colorSubtleBackgroundHover },
  },
  drawerActive: { backgroundColor: tokens.colorSubtleBackgroundSelected, fontWeight: tokens.fontWeightSemibold },
  hamburger: { '@media only screen and (min-width: 640px)': { display: 'none' } },
});

const NAV_PREF = 'atlas.settings.navExpanded';

export function AppShell({
  headerStart,
  headerEnd,
  banner,
  notice,
  nav,
  navExpandedDefault,
  children,
  formPanel,
  footerExtra,
  navEnd,
}: {
  headerStart: ReactNode;
  headerEnd: ReactNode;
  banner?: ReactNode;
  /** Velkommen only: the credit line under the disclaimer and the UiA logo in the corner. */
  footerExtra?: { note?: ReactNode; end?: ReactNode };
  /** At the foot of the navigation column; told whether the column is wide. */
  navEnd?: (wide: boolean) => ReactNode;
  /** A confirmation where the action led (G-15): one MessageBar above the page. */
  notice?: ReactNode;
  nav: NavItem[];
  navExpandedDefault: boolean;
  children: ReactNode;
  formPanel?: ReactNode;
}) {
  useGlobalStyles();
  const cls = useStyles();
  const { s } = useLang();
  const route = useRoute();
  const path = `/${route.path.join('/')}`;
  const [drawer, setDrawer] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  // Closed by the reader: focus goes back to the menu button (2.4.3, R2A-01).
  const closeDrawerByReader = () => {
    setDrawer(false);
    focusAfterOverlay(() => menuBtn.current);
  };
  // Closed by choosing a page: focus goes to that page's heading once the drawer has gone (G-04, R3A-02).
  const closeDrawerByLink = () => {
    setDrawer(false);
    focusAfterOverlay(() => document.querySelector<HTMLElement>('#main h1'));
  };
  const [expanded, setExpanded] = useState<boolean>(() => readJSON<boolean>(NAV_PREF) ?? navExpandedDefault);
  const arrowNav = useArrowNavigationGroup({ axis: 'vertical' });

  useEffect(() => setDrawer(false), [path]);
  useEffect(() => {
    // The header can wrap on very narrow screens (or at 400 % zoom); everything sticky sits below its measured height.
    // Below 500 px of height the header scrolls away, so nothing is offset by it.
    const header = document.querySelector<HTMLElement>('[data-app-header]');
    const short = window.matchMedia('(max-height: 500px)');
    const set = () => {
      const h = `${header?.offsetHeight ?? size.header}px`;
      document.documentElement.style.setProperty('--atlas-header-h', short.matches ? '0px' : h);
      // The header's own height, also where it scrolls away: the review tab is centred below it (r7A-07).
      document.documentElement.style.setProperty('--atlas-header-full-h', h);
    };
    set();
    short.addEventListener('change', set);
    const ro = header ? new ResizeObserver(set) : null;
    if (header) ro?.observe(header);
    return () => {
      short.removeEventListener('change', set);
      ro?.disconnect();
    };
  }, []);

  const isActive = (item: NavItem) => item.match.some((m) => path === m || path.startsWith(`${m}/`));

  const footer = (
    <footer className={cls.footer}>
      <div className={cls.footerText}>
        <span lang="nb">{s('footerNb')}</span>
        <span lang="en">{s('footerEn')}</span>
        {footerExtra?.note && <span className={cls.footerNote}>{footerExtra.note}</span>}
      </div>
      {footerExtra?.end && <div className={cls.footerEnd}>{footerExtra.end}</div>}
    </footer>
  );

  return (
    <div className={cls.app}>
      <a className={cls.skip} href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {s('skipToContent')}
      </a>
      <header className={cls.header} data-app-header="">
        <div className={cls.headerRow}>
          {nav.length > 0 && (
            <Button
              ref={menuBtn}
              className={cls.hamburger}
              appearance="subtle"
              icon={<Navigation20Regular />}
              aria-label={s('navMenu')}
              onClick={() => setDrawer(true)}
            />
          )}
          {headerStart}
          <span style={{ flexGrow: 1 }} />
          {headerEnd}
        </div>
        {banner}
      </header>
      <div className={cls.body}>
        {nav.length > 0 && (
          <nav aria-label={s('mainNav')} className={mergeClasses(cls.rail, expanded && cls.navWide, !!navEnd && cls.railFull)} {...arrowNav}>
            {nav.map((item) => {
              const active = isActive(item);
              const link = (
                <RouterLink
                  key={item.key}
                  to={item.to}
                  className={mergeClasses(cls.railLink, expanded && cls.railLinkWide, active && cls.railActive)}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={mergeClasses(cls.railIcon, active && cls.railActiveIcon)} aria-hidden="true">
                    {active ? item.iconActive : item.icon}
                  </span>
                  {expanded && <span className={cls.railText}>{item.label}</span>}
                </RouterLink>
              );
              return expanded ? (
                <Tooltip key={item.key} content={item.label} relationship="label" positioning="after">
                  {link}
                </Tooltip>
              ) : (
                <Tooltip key={item.key} content={item.label} relationship="label" positioning="after">
                  {link}
                </Tooltip>
              );
            })}
            {navEnd && <div className={mergeClasses(cls.navEnd, expanded && cls.navEndWide)}>{navEnd(expanded)}</div>}
            <Button
              className={mergeClasses(cls.railToggle, !!navEnd && cls.railToggleAfterEnd)}
              appearance="subtle"
              icon={expanded ? <PanelLeftContract20Regular /> : <PanelLeftExpand20Regular />}
              aria-label={expanded ? s('navCollapse') : s('navExpand')}
              onClick={() => {
                setExpanded(!expanded);
                writeJSON(NAV_PREF, !expanded);
              }}
            />
          </nav>
        )}
        <div className={cls.mainCol}>
          <main id="main" tabIndex={-1} className={cls.main}>
            {notice && <div className={cls.notice}>{notice}</div>}
            <div className={cls.content}>{children}</div>
          </main>
          {footer}
        </div>
      </div>
      {formPanel}
      {nav.length > 0 && (
        <OverlayDrawer open={drawer} onOpenChange={(_, d) => (d.open ? setDrawer(true) : closeDrawerByReader())} position="start" size="small">
          <DrawerHeader>
            <DrawerHeaderTitle
              action={<Button appearance="subtle" aria-label={s('close')} icon={<Dismiss20Regular />} onClick={closeDrawerByReader} />}
            >
              {s('navMenu')}
            </DrawerHeaderTitle>
          </DrawerHeader>
          <DrawerBody>
            <nav aria-label={s('mainNav')} data-nav-drawer="">
              {nav.map((item) => {
                const active = isActive(item);
                return (
                  <RouterLink
                    key={item.key}
                    to={item.to}
                    className={mergeClasses(cls.drawerLink, active && cls.drawerActive)}
                    aria-current={active ? 'page' : undefined}
                    onClick={closeDrawerByLink}
                  >
                    <span aria-hidden="true" style={{ display: 'inline-flex', fontSize: 20 }}>
                      {active ? item.iconActive : item.icon}
                    </span>
                    {item.label}
                  </RouterLink>
                );
              })}
            </nav>
          </DrawerBody>
        </OverlayDrawer>
      )}
    </div>
  );
}
