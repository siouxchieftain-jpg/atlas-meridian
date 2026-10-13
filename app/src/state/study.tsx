import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CaseId, CoreCaseId, Role } from '../content/types';
import { readJSON, writeJSON } from './persist';
import { isStudienavn, makeStudienavn } from '../engine/studienavn';
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
  type RoleChoice,
  type StepId,
  type StudyState,
} from './types';

export const STUDY_KEY = 'atlas.study.v1';
/** The three records that survive a reset, a store migration and a redeploy. */
export const KEEP_KEY = 'atlas.study.keep';
/** Written when a form opens, read by sendt.html. */
export const PENDING_KEY = 'atlas.study.pending';
/** Written by sendt.html when Nettskjema's receipt button brings the participant back. */
export const SENDT_KEY = 'atlas.study.sendt';

interface KeepRecord {
  ledger: StudyState['ledger'];
  visAtlas: StudyState['visAtlas'];
  roleChoice?: RoleChoice;
  intervju?: Intervju;
  /** Kept like the role: every form after S1 must carry the same study name. */
  studienavn?: string;
}

export function initialStudy(): StudyState {
  return {
    v: 1,
    furthest: 'velkommen',
    ledger: {},
    visAtlas: {},
    page1: {},
    phase: {},
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: false },
    extra: {},
  };
}

const STEP_FORM: Partial<Record<StepId, FormStep>> = {
  'om-deg': 'S1',
  helhet: 'S2',
  kari: 'S3',
  erlend: 'S4',
  astrid: 'S5',
  avslutning: 'S6',
};

/** Rebuild a coherent state from the main store and the keep record. */
export function loadStudy(): StudyState {
  const stored = readJSON<StudyState>(STUDY_KEY);
  const keep = readJSON<KeepRecord>(KEEP_KEY);
  let s: StudyState = stored && stored.v === 1 ? { ...initialStudy(), ...stored } : initialStudy();
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
  // Every step whose form is in the ledger is behind the participant.
  let minIndex = STEP_ORDER.indexOf(s.furthest);
  STEP_ORDER.forEach((step, i) => {
    const f = STEP_FORM[step];
    if (f && s.ledger[f] && i + 1 > minIndex) minIndex = i + 1;
  });
  const furthest = STEP_ORDER[Math.min(minIndex, STEP_ORDER.length - 1)];
  if (furthest !== s.furthest) {
    s = { ...s, furthest };
    if (s.ledger.S2) s = { ...s, tour: { ...s.tour, done: true } };
  }
  return s;
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
  setExtra: (patch: Partial<StudyState['extra']>) => void;
  setPendingTab: (p: StudyState['pendingTab']) => void;
  setPreviewRun: () => void;
  resetUnsent: () => void;
}

const StudyContext = createContext<StudyApi | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudyState>(() => loadStudy());

  useEffect(() => {
    writeJSON(STUDY_KEY, state);
    const keep: KeepRecord = { ledger: state.ledger, visAtlas: state.visAtlas };
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
      setExtra: (patch) => update((s) => ({ ...s, extra: { ...s.extra, ...patch } })),
      setPendingTab: (p) => update((s) => ({ ...s, pendingTab: p })),
      setPreviewRun: () => update((s) => (s.previewRun ? s : { ...s, previewRun: true })),
      resetUnsent: () =>
        update((s) => {
          // Keep: the sent ledger, the «Vis ATLAS» record, and the role answers once S1 is sent.
          const fresh = initialStudy();
          const kept: StudyState = {
            ...fresh,
            ledger: s.ledger,
            visAtlas: s.visAtlas,
            roleChoice: s.ledger.S1 ? s.roleChoice : undefined,
            intervju: s.ledger.S1 ? s.intervju : undefined,
            studienavn: s.ledger.S1 ? s.studienavn : undefined,
            route: s.ledger.S1 ? s.route : undefined,
            previewRun: s.previewRun,
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
          if (s.ledger.S2) kept.tour = { ...s.tour, done: true };
          // Recompute the furthest step from the ledger.
          let idx = 0;
          STEP_ORDER.forEach((step, i) => {
            const f = STEP_FORM[step];
            if (f && s.ledger[f]) idx = Math.max(idx, i + 1);
          });
          if (s.ledger.S1 && idx < stepIndex('omvisning')) idx = stepIndex('omvisning');
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
