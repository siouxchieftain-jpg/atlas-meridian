import {
  Button,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ArrowUp16Filled, Dismiss20Regular, Eye20Regular, Form20Regular, Open16Regular } from '@fluentui/react-icons';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/i18n';
import { guide, size } from '../theme/constants';
import { NextMark } from '../patterns/basics';
import { findForm, PreviewForm } from './PreviewForm';
import { BrowseForm } from './browse';
import { browseFlag } from '../state/persist';
import { useFormHost } from './formHost';
import { buildFormUrl, getConfig } from '../engine/forms';
import { focusInView, Silent, useAtlasAnnounce } from '../patterns/announce';

const useStyles = makeStyles({
  panel: {
    position: 'fixed',
    top: 'var(--atlas-header-h, 48px)',
    right: 0,
    bottom: 0,
    width: `${size.formPanel}px`,
    maxWidth: '100vw',
    zIndex: 900,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    '@media (forced-colors: active)': { borderLeft: '1px solid CanvasText' },
    '@media print': { display: 'none' },
    // Below 500 px of height (400 % zoom) the head, form and buttons scroll as one area,
    // so the form is never squeezed between a fixed head and a fixed footer (WCAG 1.4.10).
    '@media (max-height: 500px)': { display: 'block', overflowY: 'auto' },
  },
  overlay: { boxShadow: tokens.shadow28 },
  // Beside the page (3.8, F43, F101): the panel is part of the page and scrolls with it, so the window is the one
  // scroll area. Its heading and its foot stay in view as the page scrolls; the form takes the height it needs.
  inlinePanel: {
    position: 'absolute',
    bottom: 'auto',
    minHeight: 'calc(100dvh - var(--atlas-header-h, 48px))',
    '@media (max-height: 500px)': { display: 'flex', overflowY: 'visible' },
  },
  inlineHead: {
    position: 'sticky',
    top: 'var(--atlas-header-h, 48px)',
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    '@media (max-height: 500px)': { position: 'static' },
  },
  inlineBody: { overflowY: 'visible' },
  inlineFoot: {
    position: 'sticky',
    bottom: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    '@media (max-height: 500px)': { position: 'static' },
  },
  // The form stays loaded under the next-step card, so nothing in it is lost (RI-2).
  frameAway: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', visibility: 'hidden' },
  next: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: '16px',
    marginBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
  nextEyebrow: { ...typographyStyles.caption1Strong, color: tokens.colorBrandForeground1, margin: 0 },
  nextLine: { ...typographyStyles.subtitle2, margin: 0 },
  nextQuiet: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  fallback: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 4px' },
  fallbackBtn: { ...typographyStyles.caption1, minWidth: 0, paddingInline: tokens.spacingHorizontalXS, fontWeight: tokens.fontWeightRegular },
  // Focus lands on the panel itself only when it comes back scrolled to a place (r5A-03).
  focusable: { ':focus': { outline: 'none' }, ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' } },
  // The hidden state repeats inside the short-height query, or the query's display: block wins
  // and the form stays over ATLAS at 400 % zoom (R3A-01). The aside also carries the hidden attribute.
  hidden: { display: 'none', '@media (max-height: 500px)': { display: 'none' } },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    minHeight: '48px',
    boxSizing: 'border-box',
  },
  title: { ...typographyStyles.subtitle2, margin: 0, flexGrow: 1, minWidth: 0, ':focus': { outline: 'none' } },
  body: {
    flexGrow: 1,
    overflowY: 'auto',
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalS,
    '@media (max-height: 500px)': { overflowY: 'visible' },
  },
  frame: { width: '100%', border: 'none', display: 'block', minHeight: '360px' },
  foot: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  footRow: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  info: { ...typographyStyles.body1, margin: 0 },
  // 3.8: the next press is in Nettskjema's own form, below: a coral line that points up to it.
  point: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
    paddingInline: '10px',
    paddingBlock: '6px',
    borderRadius: tokens.borderRadiusMedium,
    borderLeft: `3px solid ${guide.coral}`,
    backgroundColor: 'rgba(245,158,133,0.14)',
    ...typographyStyles.body1Strong,
    '& svg': { flexShrink: 0, color: guide.ink },
  },
  quiet: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  skip: { alignSelf: 'flex-start', minWidth: 0, paddingInline: tokens.spacingHorizontalXS, marginInlineStart: `calc(-1 * ${tokens.spacingHorizontalXS})`, fontWeight: tokens.fontWeightRegular },
  toggle: {
    position: 'fixed',
    right: tokens.spacingHorizontalL,
    bottom: tokens.spacingVerticalL,
    zIndex: 899,
    boxShadow: tokens.shadow8,
    '@media print': { display: 'none' },
  },
  held: {
    position: 'fixed',
    bottom: tokens.spacingVerticalL,
    zIndex: 899,
    maxWidth: 'min(360px, calc(100vw - 32px))',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    boxShadow: tokens.shadow8,
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
    '@media print': { display: 'none' },
  },
  notice: { marginBottom: tokens.spacingVerticalS },
});

export interface FormPanelActions {
  /** «Jeg har sendt skjemaet» */
  onConfirmSent: () => void;
  /** «Hopp over skjemaet» (not offered when the form is not ready) */
  onSkip?: () => void;
  /** The skip link's words, when they are not «Hopp over skjemaet» (S9: «Lukk uten å sende»). */
  skipLabel?: string;
  /** «Jeg har svart på side 1» (case forms, stage page1) */
  onPage1?: () => void;
  page1Confirmed?: boolean;
  /** Open the form in a new tab; the address is built at the click (a case form opened again after «Vis ATLAS» carries -etter). */
  onOpenTab?: () => void;
  /** «Vis ATLAS» beside «Jeg har svart på side 1», so it is never hidden behind the panel. */
  onShowAtlas?: () => void;
  canShowAtlas?: boolean;
  /** The panel's title, for example «Skjema: Kari». */
  title: string;
  /** The case's first name, for the lines that name it («hvordan ATLAS hjalp deg med Kari»). */
  caseName?: string;
}

/** Decide inline or overlay from the measured shell width, never a fixed media query. */
function useInline(visible: boolean, atlasInline: boolean, caseForm: boolean): { inline: boolean; left: number } {
  const [inline, setInline] = useState(false);
  const [mainLeft, setMainLeft] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const main = document.getElementById('main');
      const left = main ? main.getBoundingClientRect().left : 0;
      setMainLeft(left);
      const available = window.innerWidth - left;
      // The form sits beside the ATLAS panel whenever the case column keeps 520 px, so the panel
      // never covers ATLAS on a 1366 px laptop (WCAG 2.4.11, AX-01). A case page without ATLAS narrows to
      // 520 px too (its profile stacks above the note), so at 1024 px page 1 sits beside the case it asks
      // about instead of over it (ATLAS 3.2).
      const column = atlasInline ? size.contentMinWithAtlas + size.atlasPanel : caseForm ? size.contentMinWithAtlas : size.contentMin;
      setInline(available >= size.formPanel + column);
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [atlasInline, caseForm]);
  useEffect(() => {
    document.documentElement.style.setProperty('--atlas-form-inline', inline && visible ? `${size.formPanel}px` : '0px');
    // Shown over the page (a narrow window): it covers the right edge, where the review tab sits (r7A-12).
    document.documentElement.toggleAttribute('data-form-overlay', !inline && visible);
  }, [inline, visible]);
  return { inline, left: mainLeft };
}

export function FormPanel({ actions }: { actions: FormPanelActions | null }) {
  const cls = useStyles();
  const host = useFormHost();
  const { s } = useLang();
  const { form, visible } = host;
  const { inline } = useInline(!!form && visible, host.atlasInline, !!form?.caseId);
  const panelId = useId();
  const headRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const showAtlasRef = useRef<HTMLButtonElement>(null);
  // «Jeg har svart på side 1» asks once more when ATLAS has seen no page change in the form.
  const [askAgainFor, setAskAgainFor] = useState<number | null>(null);
  const shownId = form && visible && !(form.caseId && form.stage === 'held') ? form.id : null;
  const shownStage = form?.stage;

  // When the panel opens, or a case form reaches its page-2 moment, it starts at its top, with the
  // heading and the instruction in view, and focus moves to the heading (WCAG 2.4.3, 2.4.11). Below
  // 500 px of height the whole panel scrolls and would otherwise keep page 1's scroll (r4A-02).
  // Showing the same form again after «Skjul skjemaet» keeps its place.
  const startedAt = useRef('');
  const announce = useAtlasAnnounce();
  const notReady = form?.route === 'notready';
  // Read at the moment the panel opens; a language switch does not move focus or speak again.
  const latest = useRef({ announce, s, notReady });
  useLayoutEffect(() => {
    latest.current = { announce, s, notReady };
  });
  // What «Skjul skjemaet» or Escape leaves: the scroll (which a hidden element loses) and the control in use (r5A-03).
  const leftAt = useRef<{ key: string; panel: number; body: number; active: HTMLElement | null } | null>(null);
  const hidePanel = () => {
    const active = document.activeElement as HTMLElement | null;
    leftAt.current = {
      key: startedAt.current,
      panel: panelRef.current?.scrollTop ?? 0,
      body: bodyRef.current?.scrollTop ?? 0,
      active: active && panelRef.current?.contains(active) ? active : null,
    };
    host.hide();
  };
  useEffect(() => {
    if (shownId === null) return;
    const key = `${shownId}:${shownStage ?? ''}`;
    const fresh = startedAt.current !== key;
    startedAt.current = key;
    if (fresh && latest.current.notReady) latest.current.announce(latest.current.s('formNotReady'));
    const back = !fresh && leftAt.current?.key === key ? leftAt.current : null;
    leftAt.current = null;
    const id = window.requestAnimationFrame(() => {
      if (fresh || back) {
        if (panelRef.current) panelRef.current.scrollTop = back?.panel ?? 0;
        if (bodyRef.current) bodyRef.current.scrollTop = back?.body ?? 0;
      }
      // Back to the control in use when it is in view; else the heading when it is in view; else the panel
      // itself at the kept place. A new form or stage starts at its heading.
      const before = back?.active;
      if (before?.isConnected && !before.closest('[hidden]') && isInView(before)) before.focus({ preventScroll: true });
      else if (back && headRef.current && !isInView(headRef.current)) panelRef.current?.focus({ preventScroll: true });
      else focusInView(headRef.current);
    });
    return () => window.cancelAnimationFrame(id);
  }, [shownId, shownStage]);

  // A new page in the form starts at its top (Nettskjema's "scrollToStart"). Beside the page, the panel scrolls with the
  // window, so the window goes to the form's top; over the page, the panel's own area does (3.8, F43).
  const pageChanges = form?.pageChanges ?? 0;
  useEffect(() => {
    if (shownId === null || pageChanges === 0) return;
    if (inline) {
      const top = panelRef.current ? panelRef.current.getBoundingClientRect().top + window.scrollY : 0;
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--atlas-header-h')) || 0;
      if (window.scrollY > top - header) window.scrollTo({ top: Math.max(0, top - header) });
    } else {
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
      if (panelRef.current) panelRef.current.scrollTop = 0;
    }
  }, [pageChanges]);

  // The stop page (3.8, F20, F45, F74, F103): when page 1 has moved on in a form ATLAS can watch, ATLAS takes it as
  // answered and covers the form's stop page with one action, named: «Trykk nå: Vis ATLAS».
  // The practice form (preview) is watched the same way, so it too has one action at each moment.
  const atStop =
    !!form && !!form.caseId && form.stage === 'page1' && (form.route === 'panel' || form.route === 'preview') && form.pageChanges > 0 && !browseFlag();
  // Where the form stood when the rest of it was asked for: until it moves on from there, ATLAS names the next press.
  const restAt = useRef<{ id: number; at: number } | null>(null);
  if (form && form.stage === 'rest' && restAt.current?.id !== form.id) restAt.current = { id: form.id, at: form.pageChanges };
  const restStart = form && restAt.current?.id === form.id ? restAt.current.at : 0;
  // «Endre svarene på side 1» shows the form again until it moves on once more; then the card is back (3.8 review S6).
  const [peek, setPeek] = useState<{ id: number; at: number } | null>(null);
  // From the stop page each move is one page: an even number of moves since then is the stop page again (back to page 1
  // and on), an odd number is page 1 or page 3 (gone on past the stop page on purpose).
  const peekMoves = form && peek?.id === form.id ? form.pageChanges - peek.at : -1;
  const peeking = peekMoves >= 0 && !(peekMoves > 0 && peekMoves % 2 === 0);
  const showCard = atStop && !peeking;
  const page1Confirmed = !!actions?.page1Confirmed;
  const onPage1 = actions?.onPage1;
  useEffect(() => {
    if (atStop && !page1Confirmed) onPage1?.();
  }, [atStop, page1Confirmed, onPage1]);
  // When the card appears, focus moves to its one action and the card is said once (3.8 review S5).
  const cardBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!showCard) return;
    latest.current.announce(`${latest.current.s('stopPage1Done')} ${latest.current.s('pressNow', { what: latest.current.s('showAtlas') })}`);
    const id = window.requestAnimationFrame(() => cardBtn.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [showCard]);

  // The panel's foot stays at the bottom of the window beside the page: the page keeps that much room at its bottom, so a
  // control brought into view is never under the foot (WCAG 2.4.11).
  const footRef = useRef<HTMLDivElement>(null);
  const footShown = shownId !== null && inline;
  useEffect(() => {
    const root = document.documentElement;
    const el = footRef.current;
    if (!footShown || !el) {
      root.style.scrollPaddingBottom = '';
      return;
    }
    // The panel's heading sticks under the app's header too: the page keeps that room at its top as well.
    const head = el.closest('[data-form-panel]')?.firstElementChild as HTMLElement | null;
    const set = () => {
      root.style.scrollPaddingBottom = `${Math.ceil(el.getBoundingClientRect().height) + 8}px`;
      if (head) root.style.scrollPaddingTop = `calc(var(--atlas-header-h, 48px) + ${Math.ceil(head.getBoundingClientRect().height) + 8}px)`;
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    if (head) ro.observe(head);
    return () => {
      ro.disconnect();
      root.style.scrollPaddingBottom = '';
      root.style.scrollPaddingTop = '';
    };
  }, [footShown]);

  // An overlay panel covers part of the page: Escape hides it from anywhere, unless a dialog,
  // menu or popover is open and the key belongs to that (AX-01).
  const overlayShown = shownId !== null && !inline;
  useEffect(() => {
    if (!overlayShown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-form-panel], [role="dialog"], [role="menu"], [role="listbox"], .fui-PopoverSurface')) return;
      hidePanel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlayShown, host]);

  if (!form || !actions) return null;
  const caseForm = !!form.caseId;
  const stage = form.stage;
  const held = caseForm && stage === 'held';
  const tabUrl =
    form.route === 'tab' || form.route === 'panel'
      ? buildFormUrl(getConfig().forms[form.formKey] ?? '', form.locked, false)
      : undefined;
  const openTab = () => {
    if (actions.onOpenTab) actions.onOpenTab();
    else if (tabUrl) window.open(tabUrl, '_blank', 'noopener');
  };
  const showSentConfirm = !caseForm || stage === 'rest';
  const showPage1 = caseForm && stage === 'page1';

  return (
    <>
      {!visible && !held && (
        <Button className={cls.toggle} appearance="primary" icon={<Form20Regular />} onClick={host.show}>
          {s('formShow')}
        </Button>
      )}

      <aside
        ref={panelRef}
        tabIndex={-1}
        className={mergeClasses(cls.panel, cls.focusable, !inline && cls.overlay, inline && cls.inlinePanel, (!visible || held) && cls.hidden)}
        hidden={!visible || held}
        aria-label={actions.title}
        data-form-panel=""
        data-inline={inline ? 'true' : 'false'}
        onKeyDown={(e) => {
          // Escape hides an overlay panel, as its close button does; the form stays as it is.
          if (e.key === 'Escape' && !inline) {
            e.stopPropagation();
            hidePanel();
          }
        }}
      >
        <div className={mergeClasses(cls.head, inline && cls.inlineHead)}>
          <Form20Regular aria-hidden="true" />
          <h2 className={cls.title} ref={headRef} tabIndex={-1} aria-describedby={caseForm && stage === 'rest' ? `${panelId}-rest` : undefined}>
            {actions.title}
          </h2>
          {!inline && (
            <Button appearance="subtle" icon={<Dismiss20Regular />} aria-label={s('formHide')} onClick={hidePanel} />
          )}
        </div>
        <div className={mergeClasses(cls.body, inline && cls.inlineBody)} ref={bodyRef}>
          {caseForm && stage === 'rest' && (
            // Read with the panel heading, which takes focus as the panel opens: one utterance with the
            // saved choice, not a second announcement (G-32, R3A-04).
            <Silent>
              <MessageBar intent="info" className={cls.notice}>
                <MessageBarBody id={`${panelId}-rest`}>
                  {/* «Opened again» only while nothing in this form has been answered yet; after page 1 it is «go on» (R2GP-05). */}
                  {form.reopened && form.pageChanges === 0
                    ? s('formReopened')
                    : findForm(form.formKey)?.pages.length === 1
                      ? s('formAnswerNow')
                      : form.pageChanges <= restStart
                        ? s('formGoOnNext')
                        : s('formTurnToAtlas', { name: actions.caseName ?? '' })}
                </MessageBarBody>
              </MessageBar>
            </Silent>
          )}
          {form.failed && (
            <MessageBar intent="error" className={cls.notice}>
              <MessageBarBody>{s('formFailed')}</MessageBarBody>
              {tabUrl && (
                <MessageBarActions>
                  <Button size="small" onClick={openTab}>
                    {s('formOpenTab')}
                  </Button>
                </MessageBarActions>
              )}
            </MessageBar>
          )}
          {showCard && (
            <section className={cls.next} aria-labelledby={`${panelId}-next`} data-next-step="show-atlas">
              <p className={cls.nextEyebrow}>{s('nextStepEyebrow')}</p>
              <p className={cls.nextQuiet}>{s('stopPage1Done')}</p>
              <p className={cls.nextLine} id={`${panelId}-next`}>
                {s('pressNow', { what: s('showAtlas') })}
              </p>
              <NextMark on>
                <Button
                  ref={cardBtn}
                  appearance="primary"
                  icon={<Eye20Regular />}
                  disabledFocusable={!actions.canShowAtlas}
                  onClick={() => actions.canShowAtlas && actions.onShowAtlas?.()}
                  data-press-now=""
                >
                  {s('showAtlas')}
                </Button>
              </NextMark>
              <p className={cls.nextQuiet}>{s('stopRestLater')}</p>
              <div>
                <Button appearance="transparent" size="small" className={cls.fallbackBtn} onClick={() => setPeek({ id: form.id, at: form.pageChanges })}>
                  {s('stopChangePage1')}
                </Button>
              </div>
            </section>
          )}
          {form.route === 'panel' && form.url && (
            <>
              {!form.loaded && !form.timedOut && <Spinner size="small" label={s('formLoading')} delay={1000} />}
              {form.timedOut && (
                <MessageBar intent="warning" className={cls.notice}>
                  <MessageBarBody>{s('formNotLoaded')}</MessageBarBody>
                  {tabUrl && (
                    <MessageBarActions>
                      <Button size="small" onClick={openTab}>
                        {s('formOpenTab')}
                      </Button>
                    </MessageBarActions>
                  )}
                </MessageBar>
              )}
              <iframe
                key={form.id}
                data-form-frame=""
                className={mergeClasses(cls.frame, showCard && cls.frameAway)}
                src={form.url}
                title={actions.title}
                // The panel or the page scrolls, never the form inside it: Nettskjema reports its height (3.8, F43).
                scrolling="no"
                style={{ height: `${form.height}px` }}
              />
            </>
          )}
          {form.route === 'tab' && (
            <div>
              <p className={cls.info}>{s('formNewTabHelp')}</p>
              <p>
                <Button appearance="primary" icon={<Open16Regular />} onClick={openTab}>
                  {s('formOpenTabButton')}
                </Button>
              </p>
            </div>
          )}
          {form.route === 'preview' && browseFlag() && (
            <BrowseForm
              key={form.id}
              formKey={form.formKey}
              caseForm={!!actions.onPage1}
              page1Done={!!actions.page1Confirmed}
              onPageChange={host.previewPageChanged}
              onSent={host.previewSent}
            />
          )}
          {form.route === 'preview' && !browseFlag() && (
            <div className={mergeClasses(showCard && cls.frameAway)}>
              <PreviewForm
                key={form.id}
                formKey={form.formKey}
                locked={form.locked}
                onPageChange={host.previewPageChanged}
                onSent={host.previewSent}
                markForward={!showCard}
              />
            </div>
          )}
          {/* Said once when the form opens, as one sentence (the bar would read its button too, r4A-05). */}
          {form.route === 'notready' && (
            <Silent>
              <FormNotReadyBar />
            </Silent>
          )}
        </div>
        {form.route !== 'notready' && (
          <div className={mergeClasses(cls.foot, inline && cls.inlineFoot)} ref={footRef}>
            {/* One main action at each moment (3.8, F33, F50): in a form ATLAS can watch, the next press is in the form
                itself, or on the stop card; the panel's own buttons are quiet ways out for when ATLAS cannot see. */}
            {peeking && atStop && (
              <p className={cls.info} role="status">
                {/* At the stop page the way back is «Forrige side»; after a move, only «Neste side» brings the card back (review R1). */}
                {peekMoves === 0 ? s('stopPeekLine') : s('stopPeekLineAfter')}
              </p>
            )}
            {showPage1 && actions.onPage1 && (form.route === 'panel' || form.route === 'preview') && !atStop && (
              <>
                {form.route === 'panel' ? (
                  // The form's own buttons cannot be marked (they are Nettskjema's): this line, in the foot under the form, points up to them.
                  <p className={cls.point} role="status">
                    <ArrowUp16Filled aria-hidden="true" />
                    {s('pressNowInForm', { what: s('formNextPage') })}
                  </p>
                ) : (
                  <p className={cls.info} role="status">
                    {s('pressNow', { what: s('next') })}
                  </p>
                )}
                <span className={cls.fallback}>
                  {askAgainFor === form.id && !actions.page1Confirmed ? s('formPage1NotMoved') : s('formPage1Fallback')}
                  <Button
                    appearance="transparent"
                    size="small"
                    className={cls.fallbackBtn}
                    onClick={() => {
                      if (actions.page1Confirmed) return;
                      if (form.pageChanges === 0 && askAgainFor !== form.id) {
                        setAskAgainFor(form.id);
                        return;
                      }
                      actions.onPage1?.();
                      setAskAgainFor(null);
                    }}
                  >
                    {askAgainFor === form.id ? s('formPage1ConfirmAgain') : s('formPage1Confirm')}
                  </Button>
                </span>
                {actions.page1Confirmed && actions.onShowAtlas && (
                  <div className={cls.footRow}>
                    <Button ref={showAtlasRef} appearance="primary" icon={<Eye20Regular />} onClick={() => actions.canShowAtlas && actions.onShowAtlas?.()}>
                      {s('showAtlas')}
                    </Button>
                  </div>
                )}
              </>
            )}
            {showPage1 && actions.onPage1 && form.route === 'tab' && (
              // A form in a new tab: ATLAS cannot see it move, so the two presses stay here, in order.
              <>
                <p className={cls.info} role="status">
                  {actions.page1Confirmed ? s('pressNow', { what: s('showAtlas') }) : s('pressNow', { what: s('formPage1Confirm') })}
                </p>
                <div className={cls.footRow}>
                  {!actions.page1Confirmed && (
                    <Button
                      appearance="primary"
                      onClick={() => {
                        const watched = form.route === 'preview';
                        if (watched && form.pageChanges === 0 && askAgainFor !== form.id) {
                          setAskAgainFor(form.id);
                          return;
                        }
                        actions.onPage1?.();
                        setAskAgainFor(null);
                        window.requestAnimationFrame(() => showAtlasRef.current?.focus());
                      }}
                    >
                      {askAgainFor === form.id && form.pageChanges === 0 ? s('formPage1ConfirmAgain') : s('formPage1Confirm')}
                    </Button>
                  )}
                  {actions.onShowAtlas && actions.page1Confirmed && (
                    <Button ref={showAtlasRef} appearance="primary" icon={<Eye20Regular />} onClick={() => actions.canShowAtlas && actions.onShowAtlas?.()}>
                      {s('showAtlas')}
                    </Button>
                  )}
                </div>
                <span className={cls.quiet} role="status">
                  {askAgainFor === form.id && !actions.page1Confirmed && form.pageChanges === 0 ? s('formPage1NotMoved') : ''}
                </span>
              </>
            )}
            {showSentConfirm && form.route === 'tab' && (
              <div className={cls.footRow}>
                <Button appearance="primary" onClick={actions.onConfirmSent}>
                  {s('formSentConfirm')}
                </Button>
              </div>
            )}
            {showSentConfirm && form.route === 'panel' && (
              <span className={cls.fallback}>
                {s('formSentFallback')}
                <Button appearance="transparent" size="small" className={cls.fallbackBtn} onClick={actions.onConfirmSent}>
                  {s('formSentConfirm')}
                </Button>
                {tabUrl && (
                  <Button appearance="transparent" size="small" className={cls.fallbackBtn} icon={<Open16Regular />} onClick={openTab}>
                    {s('formOpenTab')}
                  </Button>
                )}
              </span>
            )}
            {actions.onSkip && !browseFlag() && !showCard && (
              // A quiet way past the form, at least 24 px tall (G-02).
              <Button appearance="transparent" size="small" className={cls.skip} onClick={actions.onSkip}>
                {actions.skipLabel ?? s('formSkip')}
              </Button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

/**
 * A form without an address cannot be answered. The warning says what can be done: load the page
 * again (the address may have been added since), or contact the project when its contact is set (R2A-11).
 */
export function FormNotReadyBar() {
  const { s, t } = useLang();
  const contact = getConfig().contact;
  return (
    <MessageBar intent="warning" layout="multiline">
      <MessageBarBody>
        {s('formNotReady')} {contact ? s('formNotReadyContact', { contact: t(contact) }) : ''}
      </MessageBarBody>
      <MessageBarActions>
        <Button size="small" onClick={() => window.location.reload()}>
          {s('formNotReadyReload')}
        </Button>
      </MessageBarActions>
    </MessageBar>
  );
}

function isInView(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

export function formTitle(formKey: string, fallback: string, t: (x: { nb: string; en: string }) => string): string {
  const f = findForm(formKey);
  return f ? t(f.title) : fallback;
}
