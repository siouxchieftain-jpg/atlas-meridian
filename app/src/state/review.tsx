import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CaseId, Role } from '../content/types';
import { readJSON, removeKey, writeJSON } from './persist';
import { emptyDps, emptyGp, type DpsWork, type GpWork, type ReviewState, type ReviewerRole } from './types';

export const REVIEW_KEY = 'atlas.review.v1';

export function initialReview(): ReviewState {
  return {
    v: 1,
    view: 'gp',
    notes: false,
    gp: {},
    dps: {},
    withoutAtlas: {},
    feedbackSent: [],
    noData: { pattern: false, kalibrering: false },
  };
}

function loadReview(): ReviewState {
  const stored = readJSON<ReviewState>(REVIEW_KEY);
  return stored && stored.v === 1 ? { ...initialReview(), ...stored } : initialReview();
}

export interface ReviewApi {
  state: ReviewState;
  setReviewer: (r: ReviewerRole) => void;
  setView: (role: Role) => void;
  setNotes: (on: boolean) => void;
  gp: (caseId: CaseId) => GpWork;
  dps: (caseId: CaseId) => DpsWork;
  /** True when someone has worked this side of the case in review mode. */
  played: (role: Role, caseId: CaseId) => boolean;
  updateGp: (caseId: CaseId, patch: Partial<GpWork> | ((w: GpWork) => Partial<GpWork>)) => void;
  updateDps: (caseId: CaseId, patch: Partial<DpsWork> | ((w: DpsWork) => Partial<DpsWork>)) => void;
  setWithoutAtlas: (role: Role, caseId: CaseId, on: boolean) => void;
  isWithoutAtlas: (role: Role, caseId: CaseId) => boolean;
  markFeedback: (sectionId: string) => void;
  markWrapUp: () => void;
  setNoData: (patch: Partial<ReviewState['noData']>) => void;
  restart: () => void;
}

const ReviewContext = createContext<ReviewApi | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReviewState>(() => loadReview());

  useEffect(() => {
    writeJSON(REVIEW_KEY, state);
  }, [state]);

  const update = useCallback((fn: (s: ReviewState) => ReviewState) => setState((s) => fn(s)), []);

  const api = useMemo<ReviewApi>(
    () => ({
      state,
      setReviewer: (reviewer) => update((s) => ({ ...s, reviewer })),
      setView: (view) => update((s) => ({ ...s, view })),
      setNotes: (notes) => update((s) => ({ ...s, notes })),
      gp: (caseId) => state.gp[caseId] ?? emptyGp(),
      dps: (caseId) => state.dps[caseId] ?? emptyDps(),
      played: (role, caseId) => {
        if (role === 'gp') {
          const w = state.gp[caseId];
          // «Ikke spør nå» and «Ikke svar nå» are played choices too: the other side then shows no example (r6F-02).
          // A saved draft is a played choice too: DPS then reads the example referral, and its summary says so (r9F-06).
          return !!w && (w.referral === 'sent' || w.referral === 'draft' || w.decisionSaved === true || w.messages.length > 0 || w.skippedMessage === true);
        }
        const w = state.dps[caseId];
        return !!w && (w.sent === true || w.answerSent === true || w.answerSkipped === true);
      },
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
      setWithoutAtlas: (role, caseId, on) =>
        update((s) => ({ ...s, withoutAtlas: { ...s.withoutAtlas, [`${role}:${caseId}`]: on } })),
      isWithoutAtlas: (role, caseId) => !!state.withoutAtlas[`${role}:${caseId}`],
      markFeedback: (id) =>
        update((s) => (s.feedbackSent.includes(id) ? s : { ...s, feedbackSent: [...s.feedbackSent, id] })),
      markWrapUp: () => update((s) => ({ ...s, wrapUpSent: true })),
      setNoData: (patch) => update((s) => ({ ...s, noData: { ...s.noData, ...patch } })),
      restart: () => {
        removeKey(REVIEW_KEY);
        // What was sent stays sent («Skjemaer som er sendt, påvirkes ikke.»): the parts given and the role
        // they were sent with are kept, so the role stays locked and the overview stays true (r4F-05).
        setState((s) => ({ ...initialReview(), reviewer: s.reviewer, feedbackSent: s.feedbackSent, wrapUpSent: s.wrapUpSent }));
      },
    }),
    [state, update],
  );

  return <ReviewContext.Provider value={api}>{children}</ReviewContext.Provider>;
}

export function useReview(): ReviewApi {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error('useReview outside ReviewProvider');
  return ctx;
}

export function useReviewOptional(): ReviewApi | null {
  return useContext(ReviewContext);
}
