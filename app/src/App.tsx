import { Suspense, lazy, useEffect, useState } from 'react';
import { Spinner } from '@fluentui/react-components';
import { useLang } from './i18n/i18n';
import { previewFlag, setPreviewFlag } from './engine/forms';
import { Redirect, useRoute } from './router/router';
import { loadStudy, stepIndex } from './state/study';
import { StudyApp } from './study/StudyApp';

// Review mode is its own chunk, so the study entry loads only what participants use.
const ReviewApp = lazy(() => import('./review/ReviewApp').then((m) => ({ default: m.ReviewApp })));

/** True when this browser holds a participant's study progress (not a reviewer's preview run). */
function participantInProgress(): boolean {
  const s = loadStudy();
  if (s.previewRun) return false;
  return s.roleChoice !== undefined || Object.keys(s.ledger).length > 0 || stepIndex(s.furthest) > 0;
}

/** The review chunk's loading state: nothing for the first 300 ms, then a labelled spinner (G-12, MF-14). */
function LoadingReview() {
  const { s } = useLang();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), 300);
    return () => window.clearTimeout(id);
  }, []);
  return show ? <Spinner style={{ marginTop: 96 }} label={s('loadingReview')} labelPosition="below" /> : null;
}

/**
 * Two modes at two addresses (F-18): the site root opens the study, review
 * mode lives at #/gjennomgang and is never linked from study mode. A
 * participant who edits the address to review mode returns to their own
 * current step.
 */
export function App() {
  const route = useRoute();
  const [first] = route.path;
  // The preview flag is kept for the browser session once seen (Constraints).
  if (route.query.has('forhandsvisning') && !previewFlag()) setPreviewFlag(true);
  if (first === 'studie') return <StudyApp />;
  if (first === 'gjennomgang') {
    if (participantInProgress() && !previewFlag()) return <Redirect to="/studie" />;
    return (
      <Suspense fallback={<LoadingReview />}>
        <ReviewApp />
      </Suspense>
    );
  }
  return <Redirect to="/studie" />;
}
