import { Button, MessageBar, MessageBarActions, MessageBarBody, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { Form20Regular } from '@fluentui/react-icons';
import { useEffect } from 'react';
import { useLang } from '../i18n/i18n';
import type { FormStep } from '../state/types';
import { Silent } from '../patterns/announce';
import { Actions, Body, Muted } from '../patterns/layout';
import { useFormHost } from './formHost';
import { FormNotReadyBar } from './FormPanel';
import { useStudyController } from './controller';

const useStyles = makeStyles({
  formCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  formHead: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, ...typographyStyles.body1Strong },
});

/* ---------- The form block on a step page ---------- */

export function FormStepCard({ step, autoOpen, intro }: { step: FormStep; autoOpen?: boolean; intro?: string }) {
  const cls = useStyles();
  const { s } = useLang();
  const ctl = useStudyController();
  const host = useFormHost();
  const status = ctl.formStatus(step);
  useEffect(() => {
    if (autoOpen && status === 'closed') ctl.openStepForm(step);
  }, [autoOpen, status, step, ctl]);
  return (
    <section className={cls.formCard} aria-label={s('formStatusTitle')} data-form-step={step}>
      <span className={cls.formHead}>
        <Form20Regular aria-hidden="true" />
        {s('formStatusTitle')}
      </span>
      {intro && status !== 'sent' && <Body>{intro}</Body>}
      {/* States that last: said once when the form is sent or skipped, not again on every visit (G-32, R3A-04). */}
      <Silent>
        {status === 'sent' && (
          <MessageBar intent="success">
            <MessageBarBody>{s('formStepDone')}</MessageBarBody>
          </MessageBar>
        )}
        {status === 'skipped' && (
          <MessageBar intent="info">
            <MessageBarBody>{s('formStepSkipped')}</MessageBarBody>
            <MessageBarActions>
              <Button size="small" onClick={() => ctl.answerAnyway(step)}>
                {s('formAnswerAnyway')}
              </Button>
            </MessageBarActions>
          </MessageBar>
        )}
        {/* Once only: while the panel shows this form, the panel says it is not ready (R2A-11). */}
        {status === 'notready' && !(host.form?.step === step && host.visible) && <FormNotReadyBar />}
      </Silent>
      {status === 'open' && (
        <Actions>
          <Body>{host.form?.route === 'tab' ? s('formIsOpenTab') : s('formIsOpenPanel')}</Body>
          {!host.visible && <Button onClick={host.show}>{s('formShow')}</Button>}
        </Actions>
      )}
      {status === 'closed' && (
        <Actions>
          <Button appearance="primary" icon={<Form20Regular />} onClick={() => ctl.openStepForm(step, { show: true })}>
            {s('formOpenButton')}
          </Button>
        </Actions>
      )}
    </section>
  );
}

/** «Send eller hopp over skjemaet …», except for a form that is not ready, which can be neither (r4A-05). */
export function FormWaiting({ step }: { step: FormStep }) {
  const { s } = useLang();
  const ctl = useStudyController();
  return ctl.formStatus(step) === 'notready' ? null : <Muted>{s('formWaiting')}</Muted>;
}
