import { Button, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight20Regular, CommentEdit20Regular, PersonFeedback20Regular } from '@fluentui/react-icons';
import type { CoreCaseId } from '../content/types';
import { cases } from '../content';
import { useLang } from '../i18n/i18n';
import { useStudy } from '../state/study';
import { SheenButton } from '../patterns/basics';
import { guide } from '../theme/constants';
import { CORE, roleSeg } from './parts';
import { FeedbackPartsPopover, feedbackOpened, type FeedbackResult } from './StudyFeedback';
import { useStudyNotice } from './notice';

const useStyles = makeStyles({
  // The end-of-case bar (board 9b): a guide element on the summary's white card, with the one question this break asks
  // (decision 4, never inside the measurement) and both ways on. Its one sheen is the bar's main action.
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: '16px',
    rowGap: '12px',
    paddingInline: '18px',
    paddingBlock: '14px',
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${guide.cardEdge}`,
    background: guide.card,
    '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
  },
  text: { display: 'flex', gap: '12px', alignItems: 'flex-start', flex: '1 1 380px', minWidth: 0 },
  icon: { color: guide.ink, flexShrink: 0, marginTop: '2px', display: 'inline-flex' },
  q: { ...typographyStyles.body1Strong, margin: 0 },
  why: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  quiet: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  actions: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
});

/**
 * The end of a case (screen 18, board 9b): one optional question about the case's screens, asked once, after page 2 is
 * sent and any reply is shown, with the way back to the overview beside it. Once asked, the bar keeps only the way on.
 */
export function CaseEndPrompt({ caseId, onContinue }: { caseId: CoreCaseId; onContinue: () => void }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const notice = useStudyNotice();
  const role = study.role ?? 'gp';
  const asked = study.state.prompts[caseId];
  const next = CORE[CORE.indexOf(caseId) + 1];
  const side = `${roleSeg(role)}/${caseId}/saken`;
  const onResult = (r: FeedbackResult) => {
    // Answered only once S9 is open; a form that is not ready leaves the question standing.
    if (feedbackOpened(r)) study.setPrompt(caseId, 'sent');
    notice(r);
  };
  const goOn = () => {
    if (!asked) study.setPrompt(caseId, 'later');
    onContinue();
  };
  return !asked ? (
    <section className={cls.bar} aria-labelledby={`prompt-${caseId}`} data-case-prompt={caseId}>
      <div className={cls.text}>
        <span className={cls.icon} aria-hidden="true">
          <PersonFeedback20Regular />
        </span>
        <div>
          <p className={cls.q} id={`prompt-${caseId}`}>
            {next ? s('casePromptQuestion', { name: cases[next].patient.name.split(' ')[0] }) : s('casePromptQuestionLast')}
          </p>
          <p className={cls.why}>{s('casePromptWhy')}</p>
        </div>
      </div>
      {/* Board 9b: the feedback is the bar's main action, the way on beside it (Meridian: the main action first). */}
      <div className={cls.actions}>
        <FeedbackPartsPopover
          side={side}
          trigger={
            <SheenButton icon={<CommentEdit20Regular />} data-prompt-feedback="">
              {s('feedback')}
            </SheenButton>
          }
          back={() => document.querySelector<HTMLElement>('[data-prompt-feedback]')}
          onResult={onResult}
        />
        <Button size="large" icon={<ArrowRight20Regular />} iconPosition="after" onClick={goOn}>
          {s('toHome')}
        </Button>
      </div>
    </section>
  ) : (
    <section className={cls.bar} aria-label={s('toHome')} data-case-prompt-done={caseId}>
      <p className={cls.quiet}>{s('promptAlways')}</p>
      <SheenButton icon={<ArrowRight20Regular />} iconPosition="after" onClick={goOn}>
        {s('toHome')}
      </SheenButton>
    </section>
  );
}
