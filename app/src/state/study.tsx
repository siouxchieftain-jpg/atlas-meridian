import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CaseId, CoreCaseId, Role } from '../content/types';
import { readJSON, writeJSON } from './persist';
import { isStudienavn, makeStudienavn } from '../engine/studienavn';
import { getConfig } from '../engine/forms';
import {
  STEP_ORDER,
  emptyDps,
  emptyGp,
  type CasePhase,
  type DpsWork,
  type FormStep,
  type GpWork,
  type Intervju,
  type LedgerEntry,
  type PromptKey,
  type RoleChoice,
  type StepId,
  type StudyState,
} from './types';

/** v3.1 starts a fresh store: its step order differs from v3's, so a v3 record is never read into it. */
export const STUDY_KEY = 'atlas.study.v2';
/** The three records that survive a reset, a store migration and a redeploy. */
export const KEEP_KEY = 'atlas.study.keep.v2';
/** Written when a form opens, read by sendt.html. */
export const PENDING_KEY = 'atlas.study.pending';
/** Written by sendt.html when Nettskjema's receipt button brings the participant back. */
export const SENDT_KEY = 'atlas.study.sendt';

interface KeepRecord {
  round?: StudyState['round'];
  ledger: StudyState['ledger'];
  visAtlas: StudyState['visAtlas'];
  roleChoice?: RoleChoice;
  intervju?: Intervju;
  /** Kept like the role: every form after S1 must carry the same study name. */
  studienavn?: string;
}

export function initialStudy(): StudyState {
  return {
    v: 2,
    furthest: 'velkommen',
    ledger: {},
    visAtlas: {},
    page1: {},
    phase: {},
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: false },
    extra: {},
    prompts: {},
    feedbackSent: [],
  };
}

/** The tour comes before every case, so a case form or S2 in the ledger means the tour was done. */
function tourDoneByLedger(ledger: StudyState['ledger']): boolean {
  return !!(ledger.S3 || ledger.S4 || ledger.S5 || ledger.S2);
}

const STEP_FORM: Partial<Record<StepId, FormStep>> = {
  'om-deg': 'S1',
  helhet: 'S2',
  kari: 'S3',
  erlend: 'S4',
  astrid: 'S5',
  avslutning: 'S6',
};

/**
 * Rebuild a coherent state from the main store and the keep record, for the round the site runs (read from the
 * configuration, so the configuration must be loaded first).
 */
export function loadStudy(round: NonNullable<StudyState['round']> = getConfig().round): StudyState {
  // A session belongs to the round it began in. Once the round is switched (the pilot ends), a session from the other
  // round starts afresh: going on would send its forms to the other set, under a study name made for that round. A
  // session with no round recorded is taken as this round's.
  const ours = <T extends { round?: StudyState['round'] }>(r: T | undefined) => (r && (r.round === undefined || r.round === round) ? r : undefined);
  const stored = ours(readJSON<StudyState>(STUDY_KEY));
  const keep = ours(readJSON<KeepRecord>(KEEP_KEY));
  let s: StudyState = stored && stored.v === 2 ? { ...initialStudy(), ...stored } : initialStudy();
  if (keep) {
    s = {
      ...s,
      ledger: { ...keep.ledger, ...s.ledger },
      visAtlas: { ...keep.visAtlas, ...s.visAtlas },
    };
    if (keep.ledger?.S1) {
      s.roleChoice = s.roleChoice ?? keep.roleChoice;
      s.intervju = s.intervju ?? keep.intervju;
      s.studienavn = s.studienavn ?? keep.studienavn;
    }
  }
  // A role chosen before study names existed gets one now, so its next form carries it.
  if (s.roleChoice && !isStudienavn(s.studienavn)) s = { ...s, studienavn: makeStudienavn() };
  // Every step whose form is in the ledger is behind the participant, except a case still under way: after its form
  // is sent or skipped the case goes on (the reply, the plan, the summary), and it ends only when its phase is done.
  // A case form in the ledger with no phase at all comes from the keep record alone: that case counts as done.
  let minIndex = STEP_ORDER.indexOf(s.furthest);
  STEP_ORDER.forEach((step, i) => {
    const f = STEP_FORM[step];
    if (!f || !s.ledger[f]) return;
    if (step === 'kari' || step === 'erlend' || step === 'astrid') {
      const phase = s.phase[step];
      if (phase === undefined) s = { ...s, phase: { ...s.phase, [step]: 'done' } };
      else if (phase !== 'done') return;
    }
    if (i + 1 > minIndex) minIndex = i + 1;
  });
  const furthest = STEP_ORDER[Math.min(minIndex, STEP_ORDER.length - 1)];
  if (furthest !== s.furthest) s = { ...s, furthest };
  if (tourDoneByLedger(s.ledger) && !s.tour.done) s = { ...s, tour: { ...s.tour, started: true, done: true } };
  return { ...s, round };
}

/**
 * The study link opened again in a browser that holds a session (decision 11). Velkommen then asks first whether it is
 * the same person, so the next participant on a shared computer never goes on under someone else's study name. Only the
 * bare link: a reload or an address inside the study keeps its place.
 */
export function studyEntryPath(hash: string): string | null {
  const bare = hash.replace(/^#/, '').replace(/\/+$/, '');
  if (bare !== '' && bare !== '/studie') return null;
  return loadStudy().roleChoice ? '/studie/velkommen?tilbake' : null;
}

export function roleOf(choice: RoleChoice | undefined): Role | undefined {
  if (!choice) return undefined;
  return choice === 'fastlege' ? 'gp' : 'dps';
}

/**
 * The locked `rolle` value: two values only (Appendix E item 2). No choice yet
 * sends nothing (an empty value is never sent), never a guessed role.
 */
export function rolleValue(choice: RoleChoice | undefined): string {
  if (!choice) return '';
  return choice === 'fastlege' ? 'Fastlege' : 'DPS-inntak';
}

export function stepIndex(step: StepId): number {
  return STEP_ORDER.indexOf(step);
}

export interface StudyApi {
  state: StudyState;
  role: Role | undefined;
  /** The role card on Velkommen: sets the role and makes the study name. No change once S1 is sent. */
  chooseRole: (choice: RoleChoice) => void;
  setRole: (choice: RoleChoice, intervju: Intervju) => void;
  advanceTo: (step: StepId) => void;
  isReached: (step: StepId) => boolean;
  markForm: (form: FormStep, entry: LedgerEntry) => void;
  unmarkSkip: (form: FormStep) => void;
  setRoute: (route: 'panel' | 'tab') => void;
  setPhase: (caseId: CaseId, phase: CasePhase) => void;
  phaseOf: (caseId: CaseId) => CasePhase;
  setVisAtlas: (caseId: CoreCaseId) => void;
  setPage1: (caseId: CoreCaseId, value: boolean) => void;
  gp: (caseId: CaseId) => GpWork;
  dps: (caseId: CaseId) => DpsWork;
  updateGp: (caseId: CaseId, patch: Partial<GpWork> | ((w: GpWork) => Partial<GpWork>)) => void;
  updateDps: (caseId: CaseId, patch: Partial<DpsWork> | ((w: DpsWork) => Partial<DpsWork>)) => void;
  setTour: (patch: Partial<StudyState['tour']>) => void;
  /** The tour is done: the cases open, and the overview leads to Kari. */
  finishTour: () => void;
  setExtra: (patch: Partial<StudyState['extra']>) => void;
  /** A natural-break prompt was answered: asked once. */
  setPrompt: (key: PromptKey, value: 'sent' | 'later') => void;
  /** S9 was sent about this part. */
  markFeedback: (part: string) => void;
  setPendingTab: (p: StudyState['pendingTab']) => void;
  setPreviewRun: () => void;
  resetUnsent: () => void;
}

const StudyContext = createContext<StudyApi | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudyState>(() => loadStudy());

  useEffect(() => {
    // Every record carries its round, also after a reset that builds the state anew.
    const round = state.round ?? getConfig().round;
    writeJSON(STUDY_KEY, { ...state, round });
    const keep: KeepRecord = { round, ledger: state.ledger, visAtlas: state.visAtlas };
    if (state.ledger.S1) {
      keep.roleChoice = state.roleChoice;
      keep.intervju = state.intervju;
      keep.studienavn = state.studienavn;
    }
    writeJSON(KEEP_KEY, keep);
  }, [state]);

  const update = useCallback((fn: (s: StudyState) => StudyState) => setState((s) => fn(s)), []);

  const api = useMemo<StudyApi>(() => {
    const phaseOf = (caseId: CaseId): CasePhase => state.phase[caseId] ?? 'briefing';
    return {
      state,
      role: roleOf(state.roleChoice),
      chooseRole: (choice) =>
        update((s) => (s.ledger.S1 ? s : { ...s, roleChoice: choice, studienavn: isStudienavn(s.studienavn) ? s.studienavn : makeStudienavn() })),
      setRole: (choice, intervju) =>
        update((s) =>
          s.ledger.S1 ? s : { ...s, roleChoice: choice, intervju, studienavn: isStudienavn(s.studienavn) ? s.studienavn : makeStudienavn() },
        ),
      advanceTo: (step) =>
        update((s) => (stepIndex(step) > stepIndex(s.furthest) ? { ...s, furthest: step } : s)),
      isReached: (step) => stepIndex(step) <= stepIndex(state.furthest),
      markForm: (form, entry) =>
        update((s) => {
          const prev = s.ledger[form];
          if (prev && prev.status === 'sent') return s; // a sent step stays sent
          return { ...s, ledger: { ...s.ledger, [form]: entry } };
        }),
      unmarkSkip: (form) =>
        update((s) => {
          const prev = s.ledger[form];
          if (!prev || prev.status !== 'skipped') return s;
          const ledger = { ...s.ledger };
          delete ledger[form];
          return { ...s, ledger };
        }),
      setRoute: (route) => update((s) => ({ ...s, route })),
      setPhase: (caseId, phase) => update((s) => ({ ...s, phase: { ...s.phase, [caseId]: phase } })),
      phaseOf,
      setVisAtlas: (caseId) => update((s) => ({ ...s, visAtlas: { ...s.visAtlas, [caseId]: true } })),
      setPage1: (caseId, value) => update((s) => ({ ...s, page1: { ...s.page1, [caseId]: value } })),
      gp: (caseId) => state.gp[caseId] ?? emptyGp(),
      dps: (caseId) => state.dps[caseId] ?? emptyDps(),
      updateGp: (caseId, patch) =>
        update((s) => {
          const cur = s.gp[caseId] ?? emptyGp();
          const p = typeof patch === 'function' ? patch(cur) : patch;
          return { ...s, gp: { ...s.gp, [caseId]: { ...cur, ...p } } };
        }),
      updateDps: (caseId, patch) =>
        update((s) => {
          const cur = s.dps[caseId] ?? emptyDps();
          const p = typeof patch === 'function' ? patch(cur) : patch;
          return { ...s, dps: { ...s.dps, [caseId]: { ...cur, ...p } } };
        }),
      setTour: (patch) => update((s) => ({ ...s, tour: { ...s.tour, ...patch } })),
      finishTour: () =>
        update((s) => ({
          ...s,
          tour: { ...s.tour, started: true, done: true },
          furthest: stepIndex('kari') > stepIndex(s.furthest) ? 'kari' : s.furthest,
        })),
      setExtra: (patch) => update((s) => ({ ...s, extra: { ...s.extra, ...patch } })),
      setPrompt: (key, value) => update((s) => (s.prompts[key] ? s : { ...s, prompts: { ...s.prompts, [key]: value } })),
      markFeedback: (part) => update((s) => (s.feedbackSent.includes(part) ? s : { ...s, feedbackSent: [...s.feedbackSent, part] })),
      setPendingTab: (p) => update((s) => ({ ...s, pendingTab: p })),
      setPreviewRun: () => update((s) => (s.previewRun ? s : { ...s, previewRun: true })),
      resetUnsent: () =>
        update((s) => {
          // Keep: the sent ledger, the «Vis ATLAS» record, and the role answers once S1 is sent.
          const fresh = initialStudy();
          const kept: StudyState = {
            ...fresh,
            round: s.round,
            ledger: s.ledger,
            visAtlas: s.visAtlas,
            roleChoice: s.ledger.S1 ? s.roleChoice : undefined,
            intervju: s.ledger.S1 ? s.intervju : undefined,
            studienavn: s.ledger.S1 ? s.studienavn : undefined,
            route: s.ledger.S1 ? s.route : undefined,
            previewRun: s.previewRun,
            // Feedback already sent stays sent; a prompt already answered is not asked again.
            prompts: s.prompts,
            feedbackSent: s.feedbackSent,
          };
          // Cases whose form is in the ledger keep their work and stay done.
          (['kari', 'erlend', 'astrid'] as CoreCaseId[]).forEach((c) => {
            const f = ({ kari: 'S3', erlend: 'S4', astrid: 'S5' } as const)[c];
            if (s.ledger[f]) {
              kept.phase[c] = 'done';
              if (s.gp[c]) kept.gp[c] = s.gp[c];
              if (s.dps[c]) kept.dps[c] = s.dps[c];
            }
          });
          // The tour sends nothing, so a finished tour is never unfinished: it stays done, and the cases stay open.
          if (s.tour.done || tourDoneByLedger(s.ledger)) kept.tour = { ...s.tour, started: true, done: true };
          // Recompute the furthest step from the ledger.
          let idx = 0;
          STEP_ORDER.forEach((step, i) => {
            const f = STEP_FORM[step];
            if (f && s.ledger[f]) idx = Math.max(idx, i + 1);
          });
          if (s.ledger.S1 && idx < stepIndex('omvisning')) idx = stepIndex('omvisning');
          if (kept.tour.done && idx < stepIndex('kari')) idx = stepIndex('kari');
          kept.furthest = STEP_ORDER[Math.min(idx, STEP_ORDER.length - 1)];
          return kept;
        }),
    };
  }, [state, update]);

  return <StudyContext.Provider value={api}>{children}</StudyContext.Provider>;
}

export function useStudy(): StudyApi {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy outside StudyProvider');
  return ctx;
}

export function useStudyOptional(): StudyApi | null {
  return useContext(StudyContext);
}
