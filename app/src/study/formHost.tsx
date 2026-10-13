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
  timedOut: boolean;
  pageChanges: number;
  height: number;
  /** Review form: section and page context. */
  review?: boolean;
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
    window.requestAnimationFrame(() => {
      const prev = lastOutside.current;
      const usable = prev && prev.isConnected && prev.getClientRects().length > 0 && !prev.closest('[hidden]');
      // A review form was opened from the «Gi tilbakemelding» tab, which is always in view: focus goes back to it,
      // and the page keeps its place (r6A-03).
      const tab = formRef.current?.review ? document.querySelector<HTMLElement>('[data-feedback-tab]') : null;
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
    if (address && route === 'panel') url = buildFormUrl(address, req.locked, true);
    if (address && route === 'tab') url = buildFormUrl(address, req.locked, false);
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
    };
    if (route === 'panel' || route === 'tab') {
      writeJSON(PENDING_KEY, { form: req.step, steg: req.locked.steg ?? '', at: new Date().toISOString() });
    }
    setForm(opened);
    setVisible(req.show !== false);
  }, []);

  // Messages from the embedded Nettskjema form: accepted only from nettskjema.no
  // and only from this panel's own iframe.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== NETTSKJEMA_ORIGIN) return;
      const frame = document.querySelector<HTMLIFrameElement>('iframe[data-form-frame]');
      if (!frame || e.source !== frame.contentWindow) return;
      const cur = formRef.current;
      if (!cur || cur.route !== 'panel') return;
      const data = e.data;
      if (typeof data === 'number' && Number.isFinite(data)) {
        setForm((f) => (f && f.id === cur.id ? { ...f, loaded: true, timedOut: false, height: Math.max(360, Math.min(4000, data)) } : f));
      } else if (data === 'scrollToStart') {
        setForm((f) => (f && f.id === cur.id ? { ...f, pageChanges: f.pageChanges + 1 } : f));
      } else if (data === 'submitFinished') {
        setForm((f) => (f && f.id === cur.id ? { ...f, failed: false } : f));
        emitSent(cur, 'panel');
      } else if (data === 'submitFailed') {
        setForm((f) => (f && f.id === cur.id ? { ...f, failed: true } : f));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
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
