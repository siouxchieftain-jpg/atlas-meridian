import { Button, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight20Regular, CommentEdit20Regular, PersonFeedback20Regular } from '@fluentui/react-icons';
import type { CoreCaseId } from '../content/types';
import { cases } from '../content';
import { useLang } from '../i18n/i18n';
import { useStudy } from '../state/study';
import { StartButton } from '../patterns/basics';
import { Actions } from '../patterns/layout';
import { CORE, roleSeg } from './parts';
import { FeedbackPartsPopover, feedbackOpened, type FeedbackResult } from './StudyFeedback';
import { useStudyNotice } from './notice';

const useStyles = makeStyles({
  // A quiet bar: the one question this break asks (decision 4), never inside the measurement.
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: '16px',
    rowGap: '12px',
    paddingInline: '16px',
    paddingBlock: '14px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  text: { display: 'flex', gap: '12px', alignItems: 'flex-start', flex: '1 1 380px', minWidth: 0 },
  icon: { color: tokens.colorBrandForeground1, flexShrink: 0, marginTop: '2px', display: 'inline-flex' },
  q: { ...typographyStyles.body1Strong, margin: 0 },
  why: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  quiet: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
});

/**
 * The end of a case (screen 18): one optional question about the case's screens, asked once, after page 2 is sent and
 * any reply is shown. Then back to the overview.
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
  return (
    <>
      {!asked ? (
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
          <FeedbackPartsPopover
            side={side}
            trigger={
              <Button icon={<CommentEdit20Regular />} data-prompt-feedback="">
                {s('feedback')}
              </Button>
            }
            back={() => document.querySelector<HTMLElement>('[data-prompt-feedback]')}
            onResult={onResult}
          />
        </section>
      ) : (
        <p className={cls.quiet}>{s('promptAlways')}</p>
      )}
      <Actions>
        <StartButton
          icon={<ArrowRight20Regular />}
          iconPosition="after"
          onClick={() => {
            if (!asked) study.setPrompt(caseId, 'later');
            onContinue();
          }}
        >
          {s('toHome')}
        </StartButton>
      </Actions>
    </>
  );
}
