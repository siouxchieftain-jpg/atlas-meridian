import type { CaseId } from '../content/types';
import { cases } from '../content';
import { caseStatus, type CaseStatus } from '../engine/flow';
import { useWork } from '../state/work';

/** The case's status for the viewer, recomputed from the stored work on every render. */
export function useCaseStatus(caseId: CaseId): CaseStatus {
  const work = useWork();
  return caseStatus({
    caseId,
    content: cases[caseId],
    viewer: work.viewer,
    mode: work.mode,
    gp: work.gp(caseId),
    dps: work.dps(caseId),
    gpPlayed: work.played('gp', caseId),
    dpsPlayed: work.played('dps', caseId),
    held: work.held(caseId),
    phase: work.phase(caseId),
    withoutAtlas: work.withoutAtlas(caseId),
  });
}
