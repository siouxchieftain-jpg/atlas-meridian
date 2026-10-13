import { makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { v5 } from '../content';
import { useLang } from '../i18n/i18n';
import { Panel } from '../patterns/basics';
import { PatternView } from './PatternView';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  intro: { ...typographyStyles.body1, margin: 0, maxWidth: '72ch' },
  patient: {
    ...typographyStyles.body1Strong,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  cols: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', columnGap: tokens.spacingHorizontalL, rowGap: 0 },
  // Each GP is one column of eight rows on the shared row tracks (subgrid): the name, the two lines about them, the
  // figures' period, outcomes, reasons, quarters and the footnote line up across the two columns.
  col: {
    display: 'grid',
    gridRow: 'span 8',
    gridTemplateRows: 'subgrid',
    rowGap: tokens.spacingVerticalM,
    alignContent: 'start',
    minWidth: 0,
    marginBlockEnd: tokens.spacingVerticalL,
  },
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  exp: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  note: { ...typographyStyles.body1, margin: 0 },
  sideLabel: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  purpose: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorBrandStroke2}`,
    backgroundColor: tokens.colorBrandBackground2,
  },
});

/** V5: what fastlege A and fastlege B each see of their own Mitt henvisningsmønster, side by side (GP-side view). */
export function V5View({ showPurpose }: { showPurpose?: boolean }) {
  const cls = useStyles();
  const { s, t } = useLang();
  return (
    <div className={cls.root} data-section="v5">
      <p className={cls.intro}>{t(v5.intro)}</p>
      <p className={cls.patient}>{t(v5.patientLine)}</p>
      <p className={cls.sideLabel}>{s('v5SideLabel')}</p>
      <div className={cls.cols}>
        {v5.gps.map((g) => (
          <Panel key={g.id} flat as="article" className={cls.col} aria-label={t(g.label)}>
            <h2 className={cls.h2}>{t(g.label)}</h2>
            <p className={cls.exp}>{t(g.experience)}</p>
            <p className={cls.note}>{t(g.note)}</p>
            <PatternView data={g.pattern} compact subgrid />
          </Panel>
        ))}
      </div>
      {showPurpose && (
        <p className={cls.purpose}>
          <strong>{s('casePurpose')}:</strong> {t(v5.purpose)}
        </p>
      )}
    </div>
  );
}
