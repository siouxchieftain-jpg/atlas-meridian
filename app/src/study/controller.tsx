import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { CaseId, CoreCaseId } from '../content/types';
import { cases } from '../content';
import { useLang } from '../i18n/i18n';
import { STEP_CASE, buildFormUrl, feedbackLocked, formKeyFor, getConfig, prefersNewTab, previewFlag, stegValue, studyLocked } from '../engine/forms';
import { navigate } from '../router/router';
import { readJSON, writeJSON } from '../state/persist';
import { PENDING_KEY, SENDT_KEY, stepIndex, useStudy } from '../state/study';
import { CASE_FORM, type FormStep, type StepId } from '../state/types';
import type { StudyWorkActions } from '../state/work';
import { useAtlasAnnounce } from '../patterns/announce';
import { useFormHost, type CaseFormStage, type FormRoute, type OpenForm } from './formHost';

/** The start page: home between the steps, where the participant lands (v3.1; the start page since 3.4). */
export const HOME_PATH = '/studie/hjem';

/** The list the cases start from: «Timeliste i dag» for the GP, «Mottatte henvisninger» for DPS (boards 4a and 4b, 3.4). */
export const LIST_PATH = '/studie/liste';

/** Where each study step lives. */
export const STEP_PATH: Record<StepId, string> = {
  velkommen: '/studie/velkommen',
  'om-deg': '/studie/om-deg',
  omvisning: '/studie/omvisning',
  helhet: '/studie/helhet',
  kari: '/studie/sak/kari',
  erlend: '/studie/sak/erlend',
  astrid: '/studie/sak/astrid',
  avslutning: '/studie/avslutning',
  ekstra: '/studie/ekstra',
  takk: '/studie/takk',
};

export const STEP_FORM: Partial<Record<StepId, FormStep>> = {
  'om-deg': 'S1',
  helhet: 'S2',
  kari: 'S3',
  erlend: 'S4',
  astrid: 'S5',
  avslutning: 'S6',
};

const CASE_NEXT: Record<CoreCaseId, StepId> = { kari: 'erlend', erlend: 'astrid', astrid: 'helhet' };

export type FormStatus = 'sent' | 'skipped' | 'open' | 'notready' | 'closed';

export interface StudyController {
  routeFor: (step: FormStep) => FormRoute;
  openStepForm: (step: FormStep, opts?: { stage?: CaseFormStage; show?: boolean; force?: boolean }) => void;
  formStatus: (step: FormStep) => FormStatus;
  skipForm: (step: FormStep) => void;
  confirmSent: (step: FormStep) => void;
  confirmPage1: (caseId: CoreCaseId) => void;
  answerAnyway: (step: FormStep) => void;
  openTab: () => void;
  stepDone: (step: FormStep) => boolean;
  goToStep: (step: StepId) => void;
  currentPath: () => string;
  /**
   * S9, the feedback form, about one part of one screen. It never replaces a step form that is open (its answers would
   * be lost, a case form's page 1 among them): then it opens in a new tab instead.
   */
  openFeedback: (side: string, seksjon: string) => 'panel' | 'tab' | 'preview' | 'notready';
  work: StudyWorkActions;
}

const Ctx = createContext<StudyController | null>(null);

function isCore(caseId: CaseId): caseId is CoreCaseId {
  return caseId === 'kari' || caseId === 'erlend' || caseId === 'astrid';
}

export function StudyControllerProvider({ children }: { children: ReactNode }) {
  const study = useStudy();
  const host = useFormHost();
  const { s, t } = useLang();
  const announce = useAtlasAnnounce();
  const ref = useRef(study);
  ref.current = study;
  const hostRef = useRef(host);
  hostRef.current = host;

  const routeFor = useCallback((step: FormStep): FormRoute => {
    const st = ref.current.state;
    const role = ref.current.role ?? 'gp';
    if (previewFlag()) return 'preview';
    const address = getConfig().forms[formKeyFor(step, role)];
    if (!address) return 'notready';
    if (step === 'S1') return prefersNewTab() ? 'tab' : 'panel';
    // Every later form, S9 among them, follows S1: the panel where S1 was sent in the panel, else a new tab.
    if (st.route === 'panel' && !prefersNewTab()) return 'panel';
    return 'tab';
  }, []);

  const openStepForm = useCallback(
    (step: FormStep, opts: { stage?: CaseFormStage; show?: boolean; force?: boolean } = {}) => {
      const st = ref.current.state;
      const role = ref.current.role ?? 'gp';
      const caseId = STEP_CASE[step];
      const locked = studyLocked(step, st.roleChoice, st.intervju, st.visAtlas, st.studienavn);
      const route = routeFor(step);
      hostRef.current.open({
        step,
        formKey: formKeyFor(step, role),
        locked,
        route,
        caseId,
        stage: caseId ? opts.stage ?? 'page1' : undefined,
        reopened: !!caseId && !!st.visAtlas[caseId],
        show: opts.show,
        force: opts.force,
      });
      if (route === 'tab') ref.current.setPendingTab({ form: step, steg: locked.steg, at: new Date().toISOString() });
    },
    [routeFor],
  );

  /** What happens after a form is sent or skipped (the flow continues the same way). */
  const afterFormDone = useCallback((step: FormStep) => {
    const st = ref.current.state;
    const h = hostRef.current;
    if (h.form?.step === step) h.close();
    ref.current.setPendingTab(undefined);
    const caseId = STEP_CASE[step];
    if (caseId) {
      const phase = st.phase[caseId] ?? 'briefing';
      if (phase === 'page2') ref.current.setPhase(caseId, 'reply');
    }
    if (step === 'S7' && (st.phase.torbjorn ?? 'briefing') === 'page2') ref.current.setPhase('torbjorn', 'reply');
    if (step === 'S8') ref.current.setExtra({ v5Seen: true });
  }, []);

  const markSent = useCallback(
    (step: FormStep, via: 'panel' | 'tab' | 'confirm' | 'preview', steg: string) => {
      const st = ref.current.state;
      if (st.ledger[step]?.status === 'sent') return;
      ref.current.markForm(step, { status: 'sent', at: new Date().toISOString(), steg, via });
      if (step === 'S1') ref.current.setRoute(via === 'panel' || via === 'preview' ? 'panel' : 'tab');
      // Said once, here, at the send itself (no toast, G-15, G-32). The page's «Dette steget er sendt.»
      // bar is silent, so it is not said again on every later visit (R3A-04).
      announce(STEP_CASE[step] || step === 'S7' ? s('formSentToast') : s('formStepDone'));
      afterFormDone(step);
    },
    [afterFormDone, announce, s],
  );

  // Events from the form host: "submitFinished" from the panel's own iframe, or a preview send.
  // S9 (feedback) is no step: StudyShell takes its sends.
  useEffect(
    () =>
      host.register({
        onSent: (form: OpenForm, via) => {
          if (form.review || form.feedback) return;
          markSent(form.step, via === 'preview' ? 'preview' : 'panel', form.locked.steg ?? form.step);
        },
      }),
    [host, markSent],
  );

  // sendt.html (Nettskjema's receipt button) writes SENDT_KEY; the storage event reaches this window.
  useEffect(() => {
    const check = () => {
      const sent = readJSON<{ form: FormStep; steg: string; at: string; sentAt?: string }>(SENDT_KEY);
      if (!sent?.form) return;
      const st = ref.current.state;
      if (sent.form === 'S9' || st.ledger[sent.form]?.status === 'sent') return;
      const open = hostRef.current.form;
      const matches = (open && open.step === sent.form) || st.pendingTab?.form === sent.form;
      if (!matches) return;
      markSent(sent.form, open?.route === 'panel' ? 'panel' : 'tab', sent.steg || sent.form);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SENDT_KEY) check();
    };
    window.addEventListener('storage', onStorage);
    check();
    return () => window.removeEventListener('storage', onStorage);
  }, [markSent]);

  const api = useMemo<StudyController>(() => {
    const st = study.state;
    const formStatus = (step: FormStep): FormStatus => {
      const entry = st.ledger[step];
      if (entry) return entry.status;
      if (host.form?.step === step) return host.form.route === 'notready' ? 'notready' : 'open';
      return routeFor(step) === 'notready' ? 'notready' : 'closed';
    };
    const stepDone = (step: FormStep) => !!st.ledger[step];
    // Between the steps the participant is at home; a case in progress is where they left it.
    const currentPath = () => {
      const f = st.furthest;
      if (f === 'omvisning') return st.tour.started && !st.tour.done ? STEP_PATH.omvisning : HOME_PATH;
      if (f === 'kari' || f === 'erlend' || f === 'astrid') {
        const phase = st.phase[f] ?? 'briefing';
        return phase === 'briefing' || phase === 'done' ? HOME_PATH : STEP_PATH[f];
      }
      return STEP_PATH[f];
    };
    const goToStep = (step: StepId) => {
      study.advanceTo(step);
      navigate(STEP_PATH[step]);
    };
    const caseEntry = (caseId: CaseId) => `/studie/sak/${caseId}`;

    const work: StudyWorkActions = {
      startCase: (caseId) => {
        const phase = st.phase[caseId] ?? 'briefing';
        if (phase === 'briefing') {
          if (isCore(caseId)) {
            study.setPhase(caseId, 'uten');
            study.setPage1(caseId, false);
            const step = CASE_FORM[caseId];
            if (!st.ledger[step]) openStepForm(step, { stage: 'page1' });
          } else {
            study.setPhase(caseId, 'atlas');
          }
        }
        navigate(caseEntry(caseId));
      },
      canShowAtlas: (caseId) => {
        const step = CASE_FORM[caseId];
        if (st.ledger[step]) return true;
        if (formStatus(step) === 'notready') return false;
        return st.page1[caseId] === true;
      },
      showAtlas: (caseId) => {
        if (!isCore(caseId)) return;
        const step = CASE_FORM[caseId];
        const can = !!st.ledger[step] || (st.page1[caseId] === true && formStatus(step) !== 'notready');
        if (!can) return;
        study.setVisAtlas(caseId);
        study.setPhase(caseId, 'atlas');
        const held = host.form?.step === step && !st.ledger[step];
        if (held) {
          host.setStage('held');
          host.hide();
        }
        const role = study.role ?? 'gp';
        // The ATLAS task is said once, here; its bar on the case pages is silent (R2A-08).
        const task = role === 'dps' ? cases[caseId].dps?.atlasTask : cases[caseId].gp.atlasTask;
        if (task) announce(held ? `${t(task)} ${s('formRestLater')}.` : t(task));
        navigate(`/studie/sak/${caseId}/${role === 'dps' ? 'vurdering' : caseId === 'erlend' ? 'henvisning' : 'konsultasjon'}`);
      },
      ownDecision: (caseId) => {
        const phase = st.phase[caseId] ?? 'briefing';
        if (phase !== 'atlas') return;
        const step: FormStep | undefined = isCore(caseId) ? CASE_FORM[caseId] : caseId === 'torbjorn' ? 'S7' : undefined;
        if (!step) return;
        if (st.ledger[step]) {
          study.setPhase(caseId, 'reply');
          return;
        }
        study.setPhase(caseId, 'page2');
        if (host.form?.step === step) {
          if (isCore(caseId)) host.setStage('rest');
          host.show();
        } else {
          openStepForm(step, { stage: 'rest', show: true });
        }
      },
      formSent: (caseId) => {
        const step: FormStep | undefined = isCore(caseId) ? CASE_FORM[caseId] : caseId === 'torbjorn' ? 'S7' : undefined;
        return !!step && st.ledger[step]?.status === 'sent';
      },
      toSummary: (caseId) => {
        study.setPhase(caseId, 'debrief');
        navigate(`/studie/sak/${caseId}/oppsummering`);
      },
      finishCase: (caseId) => {
        study.setPhase(caseId, 'done');
        // After cases 1 and 2 the day goes on from the list, where the next case is marked «Nå»; after case 3 the
        // participant lands on the start page, where the last part starts (3.4: one page less before every case).
        if (isCore(caseId)) {
          const next = CASE_NEXT[caseId];
          study.advanceTo(next);
          navigate(next === 'helhet' ? HOME_PATH : LIST_PATH);
        } else navigate('/studie/ekstra');
      },
    };

    return {
      routeFor,
      openStepForm,
      formStatus,
      skipForm: (step) => {
        const steg = host.form?.step === step ? host.form.locked.steg ?? step : stegValue(step, st.visAtlas);
        study.markForm(step, { status: 'skipped', at: new Date().toISOString(), steg, via: 'skip' });
        if (step === 'S1') study.setRoute('tab');
        announce(s('formStepSkipped'));
        afterFormDone(step);
      },
      confirmSent: (step) => {
        const open = host.form;
        markSent(step, open?.route === 'tab' ? 'tab' : 'confirm', open?.locked.steg ?? step);
      },
      confirmPage1: (caseId) => study.setPage1(caseId, true),
      answerAnyway: (step) => {
        study.unmarkSkip(step);
        const caseId = STEP_CASE[step];
        openStepForm(step, { stage: caseId ? (st.visAtlas[caseId] ? 'rest' : 'page1') : undefined, show: true });
      },
      openTab: () => {
        const open = host.form;
        if (!open || (open.route !== 'tab' && open.route !== 'panel')) return;
        const address = getConfig().forms[open.formKey];
        if (!address) return;
        // S9 is no step: its tab is never the pending form that sendt.html marks.
        if (open.feedback) {
          window.open(buildFormUrl(address, open.locked, false), '_blank', 'noopener');
          return;
        }
        // Built at the click: a case form opened again after «Vis ATLAS» carries its -etter value.
        const locked = open.caseId ? studyLocked(open.step, st.roleChoice, st.intervju, st.visAtlas, st.studienavn) : open.locked;
        window.open(buildFormUrl(address, locked, false), '_blank', 'noopener');
        writeJSON(PENDING_KEY, { form: open.step, steg: locked.steg ?? '', at: new Date().toISOString() });
        study.setPendingTab({ form: open.step, steg: locked.steg ?? open.step, at: new Date().toISOString() });
      },
      stepDone,
      goToStep,
      currentPath,
      openFeedback: (side, seksjon) => {
        const role = study.role ?? 'gp';
        const formKey = formKeyFor('S9', role);
        const locked = feedbackLocked(st.roleChoice, st.studienavn, side, seksjon);
        const address = getConfig().forms[formKey];
        const open = host.form;
        // A step form still open (shown, held during the ATLAS work, or waiting for its tab): S9 goes to a tab of its own.
        const stepFormOpen = !!open && open.step !== 'S9' && !open.review && !st.ledger[open.step];
        if (stepFormOpen && !previewFlag()) {
          if (!address) return 'notready';
          window.open(buildFormUrl(address, locked, false), '_blank', 'noopener');
          return 'tab';
        }
        const route = routeFor('S9');
        // No address yet: say so and open nothing (an empty panel would only hold its place).
        if (route === 'notready') return 'notready';
        host.open({ step: 'S9', formKey, locked, route, feedback: true, force: true });
        return route;
      },
      work,
    };
  }, [study, host, routeFor, openStepForm, afterFormDone, markSent, announce, s, t]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStudyController(): StudyController {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudyController outside StudyControllerProvider');
  return ctx;
}

/** True when a study step is reachable now. Takk closes Ekstra (the reasons open there). */
export function stepReachable(furthest: StepId, step: StepId): boolean {
  if (step === 'ekstra') return furthest === 'ekstra';
  return stepIndex(step) <= stepIndex(furthest);
}
