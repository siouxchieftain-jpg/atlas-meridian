import type { CaseId } from '../content/types';
import { cases } from '../content';
import { viewAllowed, type CaseView } from '../engine/flow';
import { Redirect } from '../router/router';
import { useWork } from '../state/work';
import { DpsAssessment, DpsDialog } from './dpsViews';
import { GpConsultation, GpDialog, GpReferral } from './gpViews';
import { BriefingPage, DebriefPage, PlanPage, SentPage } from './pages';
import { useCaseStatus } from './useCaseStatus';

const VIEWS: CaseView[] = ['orientering', 'konsultasjon', 'henvisning', 'vurdering', 'sendt', 'dialog', 'plan', 'oppsummering'];
const GP_VIEWS: CaseView[] = ['orientering', 'konsultasjon', 'henvisning', 'sendt', 'dialog', 'plan', 'oppsummering'];
const DPS_VIEWS: CaseView[] = ['orientering', 'vurdering', 'sendt', 'dialog', 'oppsummering'];

export function isCaseId(x: string | undefined): x is CaseId {
  return !!x && x in cases;
}

/**
 * One case view, in either mode. Study mode redirects any view the phase does
 * not allow to the phase's own view (an edited address cannot skip ahead).
 */
export function CaseRoute({ caseId, view }: { caseId: string | undefined; view: string | undefined }) {
  const work = useWork();
  if (!isCaseId(caseId) || caseId === 'sofie') return <Redirect to={work.listPath} />;
  if (work.viewer === 'dps' && !cases[caseId].dps) return <Redirect to={work.listPath} />;
  return <CaseRouteInner caseId={caseId} view={view} />;
}

function CaseRouteInner({ caseId, view }: { caseId: CaseId; view: string | undefined }) {
  const work = useWork();
  const status = useCaseStatus(caseId);
  const gp = work.gp(caseId);
  const allowedForRole = work.viewer === 'gp' ? GP_VIEWS : DPS_VIEWS;
  const v = VIEWS.includes(view as CaseView) && allowedForRole.includes(view as CaseView) ? (view as CaseView) : undefined;
  if (work.mode === 'study') {
    const phase = work.phase(caseId);
    if (!v || !viewAllowed(v, work.viewer, caseId, phase, status, gp)) {
      const target = phase === 'debrief' || phase === 'done' ? 'oppsummering' : status.next;
      // A safety net: never redirect to the view itself (that would leave the page blank).
      if (target !== v) return <Redirect to={work.casePath(caseId, target)} />;
    }
  } else if (!v) {
    return <Redirect to={work.casePath(caseId, 'orientering')} />;
  }
  switch (v) {
    case 'orientering':
      return <BriefingPage caseId={caseId} />;
    case 'konsultasjon':
      return <GpConsultation caseId={caseId} />;
    case 'henvisning':
      return <GpReferral caseId={caseId} />;
    case 'vurdering':
      return <DpsAssessment caseId={caseId} />;
    case 'sendt':
      return <SentPage caseId={caseId} />;
    case 'dialog':
      return work.viewer === 'gp' ? <GpDialog caseId={caseId} /> : <DpsDialog caseId={caseId} />;
    case 'plan':
      return <PlanPage caseId={caseId} />;
    case 'oppsummering':
      return <DebriefPage caseId={caseId} />;
    default:
      return null;
  }
}
