import {
  Button,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  makeStyles,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { Dismiss20Regular, PanelRight20Regular } from '@fluentui/react-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLang } from '../i18n/i18n';
import { useFormHostOptional } from '../study/formHost';
import { focusAfterOverlay } from '../patterns/announce';
import { size } from '../theme/constants';
import { vocab } from '../content';

const useStyles = makeStyles({
  // The case and its ATLAS panel reach down to the footer when the case is shorter than the window (ATLAS 3.3): the
  // case column stretches and its last card grows; the panel keeps its own height, so it stays sticky.
  root: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'stretch',
    gap: `${size.panelInset}px`,
    paddingBlockStart: `${size.panelInset}px`,
    minWidth: 0,
    // Print stacks the case and then the ATLAS panel (the screen queries do not apply on paper).
    '@media print': { display: 'block' },
  },
  main: { flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: `${size.panelInset}px`, '& > :last-child': { flexGrow: 1 } },
  side: {
    alignSelf: 'flex-start',
    display: 'none',
    flexShrink: 0,
    width: `${size.atlasPanel}px`,
    position: 'sticky',
    top: 'calc(var(--atlas-header-h, 48px) + 8px)',
    maxHeight: 'calc(100dvh - var(--atlas-header-h, 48px) - 16px)',
    overflowY: 'auto',
    '@media only screen and (min-width: 1024px)': { display: 'block' },
    '@media print': { display: 'block', position: 'static', maxHeight: 'none', width: 'auto', marginBlockStart: `${size.panelInset}px`, breakInside: 'avoid-page' },
  },
  sideCard: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalL,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  sideHead: { display: 'flex', flexDirection: 'column', gap: '2px' },
  sideTitle: { ...typographyStyles.subtitle1, margin: 0 },
  sideCaption: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  openBtn: {
    alignSelf: 'flex-start',
    '@media only screen and (min-width: 1024px)': { display: 'none' },
    '@media print': { display: 'none' },
  },
  compactBand: { '@media only screen and (min-width: 1024px)': { display: 'none' }, '@media print': { display: 'none' } },
  // Without the ATLAS panel (the case-only state in the study) the panels keep the same 8 px between them.
  noSideRoot: {
    flexGrow: 1,
    paddingBlockStart: `${size.panelInset}px`,
    display: 'flex',
    flexDirection: 'column',
    gap: `${size.panelInset}px`,
    minWidth: 0,
    '& > :last-child': { flexGrow: 1 },
  },
});

/** The ATLAS panel's header: the name and the caption on every instance. */
export function AtlasPanelHead() {
  const cls = useStyles();
  const { s, t } = useLang();
  return (
    <div className={cls.sideHead}>
      <h2 className={cls.sideTitle}>{s('atlasPanel')}</h2>
      <span className={cls.sideCaption}>{t(vocab.band.caption)}</span>
    </div>
  );
}

/**
 * A clinical view with the ATLAS side panel: inline from 1024 px (320 px),
 * an end overlay below. On narrow screens a compact summary sits at the top
 * of the content so uncertainty stays visible (G-01).
 */
export function CaseLayout({
  children,
  side,
  compactSummary,
  sideLabel,
}: {
  children: ReactNode;
  /** The ATLAS panel's content, or a placeholder in the «Uten ATLAS» state. Omit for views without it. */
  side?: ReactNode;
  compactSummary?: ReactNode;
  sideLabel?: string;
}) {
  const cls = useStyles();
  const { s } = useLang();
  const host = useFormHostOptional();
  const [open, setOpen] = useState(false);
  const openBtn = useRef<HTMLButtonElement>(null);
  const label = sideLabel ?? s('atlasPanel');
  // Closed by the reader (Escape or the close button): focus goes back to «Vis ATLAS-panelet» (2.4.3, R2A-01).
  // Closed because the form panel opened: the form panel takes focus instead.
  const closeByReader = () => {
    setOpen(false);
    focusAfterOverlay(() => openBtn.current);
  };

  useEffect(() => {
    if (!host) return;
    host.setAtlasInline(!!side);
    return () => host.setAtlasInline(false);
  }, [host, side ? 1 : 0]);

  // Opening the form panel below 1024 px closes the ATLAS overlay.
  useEffect(() => {
    if (host?.visible && window.innerWidth < 1024) setOpen(false);
  }, [host?.visible]);

  if (!side) return <div className={cls.noSideRoot}>{children}</div>;

  return (
    <div className={cls.root}>
      <div className={cls.main}>
        <Button ref={openBtn} className={cls.openBtn} icon={<PanelRight20Regular />} onClick={() => setOpen(true)}>
          {s('atlasPanelOpen')}
        </Button>
        {compactSummary && <div className={cls.compactBand}>{compactSummary}</div>}
        {children}
      </div>
      {/* The sticky panel scrolls on its own: whatever takes focus in it is brought into view, read-only
          text boxes included, which the browser does not scroll to by itself (2.4.11, R2A-05). */}
      <aside className={cls.side} aria-label={label} onFocus={(e) => (e.target as HTMLElement).scrollIntoView?.({ block: 'nearest' })}>
        <div className={cls.sideCard}>{side}</div>
      </aside>
      <OverlayDrawer
        open={open}
        onOpenChange={(_, d) => (d.open ? setOpen(true) : closeByReader())}
        position="end"
        size="small"
        // Modal below 1024 px: focus stays in the panel, Escape closes it from anywhere in it,
        // and focus returns to «Vis ATLAS-panelet» (WCAG 2.4.3, 2.4.11).
        modalType="modal"
        aria-label={label}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={<Button appearance="subtle" aria-label={s('atlasPanelClose')} icon={<Dismiss20Regular />} onClick={closeByReader} />}
          >
            {label}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>{side}</div>
        </DrawerBody>
      </OverlayDrawer>
    </div>
  );
}

export const caseLayoutStyles = useStyles;
