import { createContext, useContext, type ReactNode } from 'react';
import type { StringKey } from '../i18n/strings';
import { feedbackNotice, type FeedbackResult } from './StudyFeedback';

/** The study shell's notice bar, for components deep in a page: one confirmation where the action led (G-15). */
const NoticeContext = createContext<(key: StringKey) => void>(() => undefined);

export function StudyNoticeProvider({ show, children }: { show: (key: StringKey) => void; children: ReactNode }) {
  return <NoticeContext.Provider value={show}>{children}</NoticeContext.Provider>;
}

/** Says what happened when S9 did not open in the panel: it opened in a new tab, or it is not ready yet. */
export function useStudyNotice(): (r: FeedbackResult) => void {
  const show = useContext(NoticeContext);
  return (r) => {
    const key = feedbackNotice(r);
    if (key) show(key);
  };
}
