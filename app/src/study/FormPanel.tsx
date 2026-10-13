import {
  Button,
  Link,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Spinner,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { Dismiss20Regular, Eye20Regular, Form20Regular, Open16Regular } from '@fluentui/react-icons';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/i18n';
import { size } from '../theme/constants';
import { findForm, PreviewForm } from './PreviewForm';
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
  quiet: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
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
}

/** Decide inline or overlay from the measured shell width, never a fixed media query. */
function useInline(visible: boolean, atlasInline: boolean): { inline: boolean; left: number } {
  const [inline, setInline] = useState(false);
  const [mainLeft, setMainLeft] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const main = document.getElementById('main');
      const left = main ? main.getBoundingClientRect().left : 0;
      setMainLeft(left);
      const available = window.innerWidth - left;
      // The form sits beside the ATLAS panel whenever the case column keeps 520 px, so the panel
      // never covers ATLAS on a 1366 px laptop (WCAG 2.4.11, AX-01).
      const need = size.formPanel + (atlasInline ? size.contentMinWithAtlas + size.atlasPanel : size.contentMin);
      setInline(available >= need);
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [atlasInline]);
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
  const { inline } = useInline(!!form && visible, host.atlasInline);
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
        className={mergeClasses(cls.panel, cls.focusable, !inline && cls.overlay, (!visible || held) && cls.hidden)}
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
        <div className={cls.head}>
          <Form20Regular aria-hidden="true" />
          <h2 className={cls.title} ref={headRef} tabIndex={-1} aria-describedby={caseForm && stage === 'rest' ? `${panelId}-rest` : undefined}>
            {actions.title}
          </h2>
          {!inline && (
            <Button appearance="subtle" icon={<Dismiss20Regular />} aria-label={s('formHide')} onClick={hidePanel} />
          )}
        </div>
        <div className={cls.body} ref={bodyRef}>
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
                      : s('formGoOn')}
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
                className={cls.frame}
                src={form.url}
                title={actions.title}
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
          {form.route === 'preview' && (
            <PreviewForm
              key={form.id}
              formKey={form.formKey}
              locked={form.locked}
              onPageChange={host.previewPageChanged}
              onSent={host.previewSent}
            />
          )}
          {/* Said once when the form opens, as one sentence (the bar would read its button too, r4A-05). */}
          {form.route === 'notready' && (
            <Silent>
              <FormNotReadyBar />
            </Silent>
          )}
        </div>
        {form.route !== 'notready' && (
          <div className={cls.foot}>
            {showPage1 && actions.onPage1 && (
              <>
                <div className={cls.footRow}>
                  <Button
                    appearance={actions.page1Confirmed || (form.pageChanges === 0 && form.route !== 'tab') ? 'secondary' : 'primary'}
                    disabledFocusable={actions.page1Confirmed}
                    onClick={() => {
                      if (actions.page1Confirmed) return;
                      // No page change seen in a form ATLAS can watch (panel or preview): ask once more, so ATLAS is
                      // not opened over an unanswered page 1. A form in a new tab cannot be watched, so it asks once.
                      const watched = form.route === 'panel' || form.route === 'preview';
                      if (watched && form.pageChanges === 0 && askAgainFor !== form.id) {
                        setAskAgainFor(form.id);
                        return;
                      }
                      actions.onPage1?.();
                      setAskAgainFor(null);
                      window.requestAnimationFrame(() => showAtlasRef.current?.focus());
                    }}
                  >
                    {askAgainFor === form.id && !actions.page1Confirmed && form.pageChanges === 0 ? s('formPage1ConfirmAgain') : s('formPage1Confirm')}
                  </Button>
                  {actions.onShowAtlas && (
                    <Button
                      ref={showAtlasRef}
                      appearance={actions.canShowAtlas ? 'primary' : 'secondary'}
                      icon={<Eye20Regular />}
                      disabledFocusable={!actions.canShowAtlas}
                      aria-describedby={!actions.canShowAtlas ? `${panelId}-atlas-reason` : undefined}
                      onClick={() => actions.canShowAtlas && actions.onShowAtlas?.()}
                    >
                      {s('showAtlas')}
                    </Button>
                  )}
                </div>
                {form.pageChanges > 0 && !actions.page1Confirmed && <span className={cls.quiet}>{s('formMovedOn')}</span>}
                <span className={cls.quiet} role="status">
                  {/* Once the form has moved on, the «kan ikke se» line gives way to «har gått videre» (R2GP-03). */}
                  {askAgainFor === form.id && !actions.page1Confirmed && form.pageChanges === 0 ? s('formPage1NotMoved') : ''}
                </span>
                {actions.onShowAtlas && !actions.canShowAtlas && (
                  <span className={cls.quiet} id={`${panelId}-atlas-reason`}>
                    {s('showAtlasReason')}
                  </span>
                )}
              </>
            )}
            <div className={cls.footRow}>
              {showSentConfirm && form.route !== 'preview' && <Button onClick={actions.onConfirmSent}>{s('formSentConfirm')}</Button>}
              {form.route === 'panel' && tabUrl && (
                <Button appearance="subtle" icon={<Open16Regular />} onClick={openTab}>
                  {s('formOpenTab')}
                </Button>
              )}
            </div>
            {actions.onSkip && (
              <Link as="button" className={cls.quiet} onClick={actions.onSkip}>
                {s('formSkip')}
              </Link>
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
