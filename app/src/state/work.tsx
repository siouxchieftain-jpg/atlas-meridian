import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { navigate } from '../router/router';
import type { CaseId, CoreCaseId, Role } from '../content/types';
import { useReviewOptional } from './review';
import { useStudyOptional } from './study';
import type { CasePhase, DpsWork, GpWork } from './types';

export type Mode = 'study' | 'review';

/**
 * What a clinical screen needs, the same in both modes. Study mode: only the
 * participant's role is editable and the other side is scripted. Review mode:
 * both sides can be played; a side nobody has played is scripted and
 * labelled «Eksempelsvar».
 */
export interface WorkApi {
  mode: Mode;
  /** The role whose screens are shown. */
  viewer: Role;
  /** Base path for links: `/studie` or `/gjennomgang/fastlege`. */
  base: string;
  /** The path of a case view, for example `/studie/sak/kari/konsultasjon`. */
  casePath: (caseId: CaseId, view?: string) => string;
  /** The list for the viewer's role (Timeliste or Mottatte henvisninger). */
  listPath: string;
  /** Go to a path. The tour's live frames never leave the tour, so their sandbox ignores it. */
  go: (path: string) => void;
  /** The tour's live frames: controls that would lead out of the frame are not shown (R3F-03). */
  sandbox?: boolean;
  gp: (caseId: CaseId) => GpWork;
  dps: (caseId: CaseId) => DpsWork;
  updateGp: (caseId: CaseId, patch: Partial<GpWork> | ((w: GpWork) => Partial<GpWork>)) => void;
  updateDps: (caseId: CaseId, patch: Partial<DpsWork> | ((w: DpsWork) => Partial<DpsWork>)) => void;
  played: (role: Role, caseId: CaseId) => boolean;
  /** Study: the case's phase. Review: always past the case-only state unless toggled. */
  phase: (caseId: CaseId) => CasePhase;
  /** The case is shown in its «Uten ATLAS» state. */
  withoutAtlas: (caseId: CaseId) => boolean;
  /** The other side's reply is held (study mode, before the last form page is sent). */
  held: (caseId: CaseId) => boolean;
  /** Design notes (Merknader) are shown. Never in study mode. */
  notes: boolean;
  /** Study: «Vis ATLAS» can be pressed (page 1 confirmed, or the form sent or skipped). */
  canShowAtlas: (caseId: CoreCaseId) => boolean;
  /** Study: «Vis ATLAS». Review: show the case with ATLAS. */
  showAtlas: (caseId: CaseId) => void;
  /** Review only: show the case in its «Uten ATLAS» state. */
  hideAtlas?: (caseId: CaseId) => void;
  /** The participant's own work on the case is done (Appendix A (3)): the page-2 moment. */
  ownDecision: (caseId: CaseId) => void;
  /** Study: the case's form is sent (a sent step stays sent, and its decisions become read-only). */
  formSent: (caseId: CaseId) => boolean;
  /** The briefing's start action: study opens the case-only moment and the form; review opens the case. */
  startCase: (caseId: CaseId) => void;
  /** The case is finished: study moves to the summary; review simply goes there. */
  toSummary: (caseId: CaseId) => void;
  /** Study: leave the summary for the next step. Review: back to the list. */
  finishCase: (caseId: CaseId) => void;
}

const WorkContext = createContext<WorkApi | null>(null);

const HELD_PHASES: CasePhase[] = ['briefing', 'uten', 'atlas', 'page2'];

export interface StudyWorkActions {
  startCase: (caseId: CaseId) => void;
  canShowAtlas: (caseId: CoreCaseId) => boolean;
  showAtlas: (caseId: CaseId) => void;
  ownDecision: (caseId: CaseId) => void;
  formSent: (caseId: CaseId) => boolean;
  toSummary: (caseId: CaseId) => void;
  finishCase: (caseId: CaseId) => void;
}

export function StudyWorkProvider({ actions, children }: { actions: StudyWorkActions; children: ReactNode }) {
  const study = useStudyOptional();
  if (!study) throw new Error('StudyWorkProvider needs StudyProvider');
  const api = useMemo<WorkApi>(() => {
    const viewer: Role = study.role ?? 'gp';
    return {
      mode: 'study',
      viewer,
      base: '/studie',
      casePath: (caseId, view) => `/studie/sak/${caseId}${view ? `/${view}` : ''}`,
      // v3.1: the overview («Min dag», «Inntaket i dag») is where a case is opened from and returned to.
      listPath: '/studie/hjem',
      go: (path) => navigate(path),
      gp: study.gp,
      dps: study.dps,
      updateGp: study.updateGp,
      updateDps: study.updateDps,
      played: (role) => role === viewer,
      phase: study.phaseOf,
      withoutAtlas: (caseId) => {
        const p = study.phaseOf(caseId);
        return p === 'uten' || p === 'briefing';
      },
      held: (caseId) => HELD_PHASES.includes(study.phaseOf(caseId)),
      notes: false,
      ...actions,
    };
  }, [study, actions]);
  return <WorkContext.Provider value={api}>{children}</WorkContext.Provider>;
}

export function ReviewWorkProvider({ viewer, children }: { viewer: Role; children: ReactNode }) {
  const review = useReviewOptional();
  if (!review) throw new Error('ReviewWorkProvider needs ReviewProvider');
  const api = useMemo<WorkApi>(() => {
    const base = `/gjennomgang/${viewer === 'gp' ? 'fastlege' : 'dps'}`;
    return {
      mode: 'review',
      viewer,
      base,
      casePath: (caseId, view) => `${base}/sak/${caseId}${view ? `/${view}` : ''}`,
      listPath: viewer === 'gp' ? `${base}/timeliste` : `${base}/mottatte`,
      go: (path) => navigate(path),
      gp: review.gp,
      dps: review.dps,
      updateGp: review.updateGp,
      updateDps: review.updateDps,
      played: review.played,
      phase: (caseId) => (review.isWithoutAtlas(viewer, caseId) ? 'uten' : 'reply'),
      withoutAtlas: (caseId) => review.isWithoutAtlas(viewer, caseId),
      held: () => false,
      notes: review.state.notes,
      canShowAtlas: () => true,
      showAtlas: (caseId) => review.setWithoutAtlas(viewer, caseId, false),
      hideAtlas: (caseId) => review.setWithoutAtlas(viewer, caseId, true),
      startCase: (caseId) =>
        navigate(
          `${base}/sak/${caseId}/${viewer === 'dps' ? 'vurdering' : caseId === 'erlend' && !review.isWithoutAtlas(viewer, caseId) ? 'henvisning' : 'konsultasjon'}`,
        ),
      ownDecision: () => undefined,
      formSent: () => false,
      toSummary: (caseId) => navigate(`${base}/sak/${caseId}/oppsummering`),
      finishCase: () => navigate(viewer === 'gp' ? `${base}/timeliste` : `${base}/mottatte`),
    };
  }, [review, viewer]);
  return <WorkContext.Provider value={api}>{children}</WorkContext.Provider>;
}

/** A sandbox for the tour's live frames: local state, nothing saved, review-like rules. */
export function SandboxWorkProvider({ value, children }: { value: WorkApi; children: ReactNode }) {
  return <WorkContext.Provider value={value}>{children}</WorkContext.Provider>;
}

export function useWork(): WorkApi {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWork outside a work provider');
  return ctx;
}

export function useWorkOptional(): WorkApi | null {
  return useContext(WorkContext);
}
