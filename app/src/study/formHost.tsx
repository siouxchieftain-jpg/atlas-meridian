import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { focusInView } from '../patterns/announce';
import type { CoreCaseId, FormKey } from '../content/types';
import type { FormStep } from '../state/types';
import { NETTSKJEMA_ORIGIN, buildFormUrl, getConfig, type LockedFields } from '../engine/forms';
import { writeJSON } from '../state/persist';
import { PENDING_KEY } from '../state/study';

/**
 * One form at a time is open. Its iframe is mounted once per opening and is
 * never re-created or moved: hiding the panel, switching between inline and
 * overlay, resizing and zoom only change its container's styles (RI-2).
 */
export type FormRoute = 'panel' | 'tab' | 'preview' | 'notready';

/** Case forms: page 1 (B1) → held (hidden during the ATLAS work) → rest (the last page). */
export type CaseFormStage = 'page1' | 'held' | 'rest';

export interface OpenForm {
  id: number;
  step: FormStep;
  formKey: FormKey;
  locked: LockedFields;
  route: FormRoute;
  /** The fixed iframe address (panel) or tab address. */
  url?: string;
  caseId?: CoreCaseId;
  stage?: CaseFormStage;
  /** Opened again after «Vis ATLAS» (steg ends in -etter). */
  reopened?: boolean;
  loaded: boolean;
  failed: boolean;
  /** The panel's form was sent (seen from the receipt), so no failure is shown after it. */
  sent?: boolean;
  timedOut: boolean;
  pageChanges: number;
  height: number;
  /** Review form: section and page context. */
  review?: boolean;
  /** S9, the study's feedback form: no step, never in the ledger, never the pending form sendt.html marks. */
  feedback?: boolean;
}

export interface OpenRequest {
  step: FormStep;
  formKey: FormKey;
  locked: LockedFields;
  route: FormRoute;
  caseId?: CoreCaseId;
  stage?: CaseFormStage;
  reopened?: boolean;
  /** Show the panel at once (default true). */
  show?: boolean;
  review?: boolean;
  feedback?: boolean;
  /** Re-create the form even if the same one is open (its locked values changed before anything was sent). */
  force?: boolean;
}

export interface FormEvents {
  onSent: (form: OpenForm, via: 'panel' | 'preview') => void;
}

export interface FormHostApi {
  form?: OpenForm;
  visible: boolean;
  open: (req: OpenRequest) => void;
  close: () => void;
  show: () => void;
  hide: () => void;
  setStage: (stage: CaseFormStage) => void;
  /** The case view reports whether its ATLAS panel sits inline (it narrows the room for the form). */
  setAtlasInline: (on: boolean) => void;
  atlasInline: boolean;
  /** Events from the preview form. */
  previewPageChanged: () => void;
  previewSent: () => void;
  markFailed: () => void;
  register: (events: FormEvents) => () => void;
}

const FormHostContext = createContext<FormHostApi | null>(null);

let nextId = 1;

export function FormHostProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<OpenForm | undefined>();
  const [visible, setVisible] = useState(false);
  const [atlasInline, setAtlasInline] = useState(false);
  const listeners = useRef(new Set<FormEvents>());
  const formRef = useRef<OpenForm | undefined>(undefined);
  formRef.current = form;

  // Keyboard focus: when the panel hides or closes with focus inside it (the
  // Nettskjema frame included), focus returns to where it was before the panel,
  // or to the view's heading, never to the end of the page (G-04, WCAG 2.4.3).
  const lastOutside = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest && !t.closest('[data-form-panel]') && !t.closest('.fui-Toaster')) lastOutside.current = t;
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);
  const returnFocus = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    const inPanel = !active || active === document.body || !!active.closest('[data-form-panel]');
    if (!inPanel) return;
    // Read before the frame: by then a closed form is gone from the ref.
    const fromTab = !!(formRef.current?.review || formRef.current?.feedback);
    window.requestAnimationFrame(() => {
      const prev = lastOutside.current;
      const usable = prev && prev.isConnected && prev.getClientRects().length > 0 && !prev.closest('[hidden]');
      // A review or feedback form was opened from the «Gi tilbakemelding» tab, which is always in view: focus goes back
      // to it, and the page keeps its place (r6A-03).
      const tab = fromTab ? document.querySelector<HTMLElement>('[data-feedback-tab]') : null;
      const target = usable ? prev : tab ?? document.querySelector<HTMLElement>('#main h1') ?? document.getElementById('main');
      focusInView(target);
    });
  }, []);

  const emitSent = useCallback((f: OpenForm, via: 'panel' | 'preview') => {
    listeners.current.forEach((l) => l.onSent(f, via));
  }, []);

  const open = useCallback((req: OpenRequest) => {
    const cur = formRef.current;
    if (cur && cur.step === req.step && cur.formKey === req.formKey && !req.force) {
      // Already open: never re-create it. Only stage and visibility change.
      setForm({ ...cur, stage: req.stage ?? cur.stage });
      if (req.show !== false) setVisible(true);
      return;
    }
    const address = getConfig().forms[req.formKey];
    let route = req.route;
    if ((route === 'panel' || route === 'tab') && !address) route = 'notready';
    let url: string | undefined;
    if (address && route === 'panel') url = buildFormUrl(address, req.locked, true, req.formKey);
    if (address && route === 'tab') url = buildFormUrl(address, req.locked, false, req.formKey);
    const opened: OpenForm = {
      id: nextId++,
      step: req.step,
      formKey: req.formKey,
      locked: req.locked,
      route,
      url,
      caseId: req.caseId,
      stage: req.stage,
      reopened: req.reopened,
      loaded: route !== 'panel',
      failed: false,
      timedOut: false,
      pageChanges: 0,
      height: 640,
      review: req.review,
      feedback: req.feedback,
    };
    // sendt.html marks the pending form as sent; feedback is never a pending step (it could be taken for one).
    if ((route === 'panel' || route === 'tab') && !req.feedback && !req.review) {
      writeJSON(PENDING_KEY, { form: req.step, steg: req.locked.steg ?? '', at: new Date().toISOString() });
    }
    setForm(opened);
    setVisible(req.show !== false);
  }, []);

  // Messages from the embedded Nettskjema form: accepted only from nettskjema.no
  // and only from this panel's own iframe.
  //
  // Nettskjema's embed posts "submitFailed" after every send that succeeds (3.8, F38): it posts "submitFinished" only
  // when the answer's response carries `status: "success"`, which the submission response does not. A send that
  // succeeds is told apart by the receipt: on success alone Nettskjema moves to its receipt page and posts
  // "scrollToStart" with it. A real failure (a network error) posts "submitFailed" with no page change and shows
  // Nettskjema's own retry dialog. So "submitFailed" waits a moment for its "scrollToStart"; only without one is it a
  // failure.
  const pendingFail = useRef<{ id: number; timer: number } | null>(null);
  const lastPageChange = useRef<{ id: number; at: number } | null>(null);
  useEffect(() => {
    // Nettskjema posts the receipt's "scrollToStart" and "submitFailed" for one send in the same moment, in either order.
    // A page change the participant made comes long before a send (a page has to be answered), and a real failure
    // comes after a request that failed, so a short window before and a longer one after tell them apart.
    const SEND_WINDOW = 2500;
    const RECEIPT_BEFORE = 200;
    const sent = (cur: OpenForm) => {
      if (pendingFail.current) window.clearTimeout(pendingFail.current.timer);
      pendingFail.current = null;
      setForm((f) => (f && f.id === cur.id ? { ...f, failed: false, sent: true } : f));
      emitSent(cur, 'panel');
    };
    const askHeight = () => {
      const frame = document.querySelector<HTMLIFrameElement>('iframe[data-form-frame]');
      // Nettskjema answers "resize" with the page's height at once, instead of within its one-second beat.
      frame?.contentWindow?.postMessage('resize', NETTSKJEMA_ORIGIN);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== NETTSKJEMA_ORIGIN) return;
      const frame = document.querySelector<HTMLIFrameElement>('iframe[data-form-frame]');
      if (!frame || e.source !== frame.contentWindow) return;
      const cur = formRef.current;
      if (!cur || cur.route !== 'panel') return;
      const data = e.data;
      if (typeof data === 'number' && Number.isFinite(data)) {
        // 3.8.2 (F135): the cap was 6000 px, and the merged closing form runs to about 10,500 px in the panel, so its
        // «Neste» fell below the cut. 20,000 px still guards against a runaway value.
        setForm((f) => (f && f.id === cur.id ? { ...f, loaded: true, timedOut: false, height: Math.max(360, Math.min(20000, data)) } : f));
      } else if (data === 'scrollToStart') {
        lastPageChange.current = { id: cur.id, at: Date.now() };
        setForm((f) => (f && f.id === cur.id ? { ...f, pageChanges: f.pageChanges + 1 } : f));
        window.setTimeout(askHeight, 50);
        // The receipt's page change after a "submitFailed": the send went through.
        if (pendingFail.current?.id === cur.id) sent(cur);
      } else if (data === 'submitFinished') {
        sent(cur);
      } else if (data === 'submitFailed') {
        const recent = lastPageChange.current;
        // The receipt's page change came first: the send went through.
        if (recent && recent.id === cur.id && Date.now() - recent.at < RECEIPT_BEFORE) {
          sent(cur);
          return;
        }
        if (pendingFail.current) window.clearTimeout(pendingFail.current.timer);
        const timer = window.setTimeout(() => {
          pendingFail.current = null;
          setForm((f) => (f && f.id === cur.id && !f.sent ? { ...f, failed: true } : f));
        }, SEND_WINDOW);
        pendingFail.current = { id: cur.id, timer };
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      if (pendingFail.current) window.clearTimeout(pendingFail.current.timer);
    };
  }, [emitSent]);

  // Watchdog: a panel form that sends no height message within 10 seconds did not load.
  useEffect(() => {
    if (!form || form.route !== 'panel' || form.loaded) return;
    const id = form.id;
    const timer = window.setTimeout(() => {
      setForm((f) => (f && f.id === id && !f.loaded ? { ...f, timedOut: true } : f));
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [form?.id, form?.loaded, form?.route]);

  const api = useMemo<FormHostApi>(
    () => ({
      form,
      visible,
      open,
      close: () => {
        returnFocus();
        setForm(undefined);
        setVisible(false);
      },
      show: () => setVisible(true),
      hide: () => {
        returnFocus();
        setVisible(false);
      },
      setStage: (stage) => {
        // «Vis ATLAS» holds the panel out of sight; focus must not stay in it.
        if (stage === 'held') returnFocus();
        setForm((f) => (f ? { ...f, stage } : f));
      },
      setAtlasInline,
      atlasInline,
      previewPageChanged: () => setForm((f) => (f ? { ...f, pageChanges: f.pageChanges + 1 } : f)),
      previewSent: () => {
        const cur = formRef.current;
        if (cur) emitSent(cur, 'preview');
      },
      markFailed: () => setForm((f) => (f ? { ...f, failed: true } : f)),
      register: (events) => {
        listeners.current.add(events);
        return () => listeners.current.delete(events);
      },
    }),
    [form, visible, open, atlasInline, emitSent, returnFocus],
  );

  return <FormHostContext.Provider value={api}>{children}</FormHostContext.Provider>;
}

export function useFormHost(): FormHostApi {
  const ctx = useContext(FormHostContext);
  if (!ctx) throw new Error('useFormHost outside FormHostProvider');
  return ctx;
}

export function useFormHostOptional(): FormHostApi | null {
  return useContext(FormHostContext);
}
