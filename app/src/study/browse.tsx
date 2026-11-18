import { Button, makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight20Regular, Dismiss16Regular, Open20Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useLang } from '../i18n/i18n';
import { guide } from '../theme/constants';
import { findForm } from './PreviewForm';

/**
 * «Se deg rundt» / Look around (3.7). After the three cases, a participant can
 * open ATLAS again in a new tab and go through it without forms: nothing is
 * sent, nothing can get stuck, and the study in the first tab is untouched
 * (its storage lives apart, see state/persist.ts). Offered only after the
 * cases, so the before/after design of the cases is not primed.
 */

export const BROWSE_PATH = '#/studie/se-rundt';

export function openBrowse(): void {
  window.open(`${window.location.pathname}${BROWSE_PATH}`, '_blank', 'noopener');
}

const useStyles = makeStyles({
  banner: {
    marginInline: tokens.spacingHorizontalS,
    marginBlockEnd: tokens.spacingVerticalXS,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalM,
    backgroundImage: guide.card,
    ...shorthands.border('1px', 'solid', guide.cardEdge),
    borderRadius: tokens.borderRadiusLarge,
    '@media (forced-colors: active)': { ...shorthands.border('1px', 'solid', 'CanvasText') },
  },
  bannerText: { ...typographyStyles.body1, margin: 0, flex: '1 1 24rem', minWidth: 0 },
  bannerStrong: { ...typographyStyles.body1Strong, color: guide.ink },
  invite: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    backgroundImage: guide.card,
    ...shorthands.border('1px', 'solid', guide.cardEdge),
    borderRadius: tokens.borderRadiusXLarge,
    '@media (forced-colors: active)': { ...shorthands.border('1px', 'solid', 'CanvasText') },
  },
  inviteTitle: { ...typographyStyles.subtitle2, margin: 0 },
  p: { ...typographyStyles.body1, margin: 0 },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    marginBlock: tokens.spacingVerticalM,
    backgroundImage: guide.card,
    ...shorthands.border('1px', 'solid', guide.cardEdge),
    borderRadius: tokens.borderRadiusXLarge,
    '@media (forced-colors: active)': { ...shorthands.border('1px', 'solid', 'CanvasText') },
  },
  formTitle: { ...typographyStyles.subtitle1, margin: 0 },
  row: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
});

/** The calm strip at the top of the browse tab. */
export function BrowseBanner() {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <div className={cls.banner}>
      <p className={cls.bannerText}>
        <span className={cls.bannerStrong}>{s('browseBannerLead')}</span> {s('browseBannerBody')}
      </p>
      <Button size="small" appearance="secondary" icon={<Dismiss16Regular />} onClick={() => window.close()}>
        {s('browseClose')}
      </Button>
    </div>
  );
}

/** What «Se deg rundt» is, with the button that opens it. On «Takk» and in Help. */
export function BrowseInvite({ heading = true }: { heading?: boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <section className={cls.invite} aria-label={s('browseTitle')}>
      {heading && <h2 className={cls.inviteTitle}>{s('browseTitle')}</h2>}
      <p className={cls.p}>{s('browseIntro')}</p>
      <div className={cls.row}>
        <Button appearance="primary" icon={<Open20Regular />} onClick={openBrowse}>
          {s('browseOpen')}
        </Button>
      </div>
    </section>
  );
}

/**
 * In the browse tab, where a form would open. A one-page form is skipped with
 * one press. A case form keeps the case's own buttons: «Gå videre» stands for
 * page 1, the panel's «Jeg har svart på side 1» and «Vis ATLAS» follow, and
 * «Ferdig med skjemaet» stands for the send.
 */
export function BrowseForm({
  formKey,
  caseForm,
  page1Done,
  onPageChange,
  onSent,
}: {
  formKey: string;
  caseForm: boolean;
  page1Done: boolean;
  onPageChange: () => void;
  onSent: () => void;
}) {
  const cls = useStyles();
  const { s } = useLang();
  const pages = findForm(formKey)?.pages.length ?? 1;
  // A case form reopened after ATLAS starts past page 1.
  const [moved, setMoved] = useState(page1Done);
  const twoStep = caseForm || pages > 1;
  return (
    <section className={cls.form} aria-label={s('browseFormTitle')}>
      <h3 className={cls.formTitle}>{s('browseFormTitle')}</h3>
      <p className={cls.p}>{s('browseFormBody')}</p>
      {!moved && (
        <div className={cls.row}>
          <Button
            appearance="primary"
            icon={<ArrowRight20Regular />}
            iconPosition="after"
            onClick={() => {
              onPageChange();
              if (twoStep) setMoved(true);
              else onSent();
            }}
          >
            {s('browseFormNext')}
          </Button>
        </div>
      )}
      {moved && (
        <>
          {caseForm && (
            <p className={cls.p} role="status">
              {page1Done ? s('browseFormRest') : s('browseFormCase', { page1: s('formPage1Confirm'), atlas: s('showAtlas') })}
            </p>
          )}
          <div className={cls.row}>
            <Button appearance={caseForm && !page1Done ? 'secondary' : 'primary'} onClick={onSent}>
              {s('browseFormDone')}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
