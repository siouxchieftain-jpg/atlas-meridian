import { makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import type { CaseId } from '../content/types';
import { cases } from '../content';
import { useLang } from '../i18n/i18n';
import { Breadcrumbs, type Crumb } from '../patterns/layout';
import { PageHeading } from '../shell/PageHeading';
import { useWork } from '../state/work';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: tokens.spacingHorizontalXL,
    paddingBlock: tokens.spacingVerticalL,
    minWidth: 0,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  row: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', rowGap: tokens.spacingVerticalS },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.body1Strong,
    flexShrink: 0,
  },
  who: { display: 'flex', flexDirection: 'column', minWidth: 0, flexGrow: 1 },
  h1: { ...typographyStyles.title3 },
  side: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
  flag: {
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    paddingInline: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalXXS,
    margin: 0,
  },
});

/**
 * The case's title card: breadcrumb, the patient as the view's one h1, a
 * line under it and neutral chips. The document title never carries the
 * patient's name (G-04).
 */
export function CaseTitle({
  caseId,
  crumbs,
  docTitle,
  heading,
  sub,
  side,
}: {
  caseId: CaseId;
  crumbs: Crumb[];
  docTitle: string;
  /** Defaults to the patient's name and age. */
  heading?: string;
  sub?: ReactNode;
  side?: ReactNode;
}) {
  const cls = useStyles();
  const { s, t } = useLang();
  const work = useWork();
  const c = cases[caseId];
  // Study mode: the list crumb leads to the overview, and is named for it («Min dag», «Inntaket i dag»).
  const items = work.mode === 'study' && !work.sandbox
    ? crumbs.map((x, i) => (i === 0 && x.to === work.listPath ? { ...x, label: s(work.viewer === 'gp' ? 'homeGpTitle' : 'homeDpsTitle') } : x))
    : crumbs;
  return (
    <section className={cls.card} aria-label={s('patientLabel')}>
      <Breadcrumbs items={items} label={s('breadcrumbs')} />
      <div className={cls.row}>
        <span className={cls.avatar} aria-hidden="true">
          {c.patient.initials}
        </span>
        <div className={cls.who}>
          <PageHeading title={docTitle} className={cls.h1} sub={sub}>
            {heading ?? s('patientAge', { name: c.patient.name, age: c.patient.age })}
          </PageHeading>
        </div>
        {side && <div className={cls.side}>{side}</div>}
      </div>
      {/* A note for reviewers that a case's clinical details still await a clinician's check; never in the study. */}
      {c.draftFlag && work.mode === 'review' && (
        <p className={cls.flag}>
          <strong>{s('draftFlagLabel')}:</strong> {t(c.draftFlag)}
        </p>
      )}
    </section>
  );
}
