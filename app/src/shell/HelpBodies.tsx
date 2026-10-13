import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import {
  ArrowDown16Regular,
  ArrowRight16Regular,
  Beaker20Regular,
  DataBarVertical20Regular,
  History20Regular,
  PanelRight20Regular,
  Send20Regular,
  SkipForwardTab20Regular,
  Tag20Regular,
} from '@fluentui/react-icons';
import { Fragment, type ReactNode } from 'react';
import { useLang } from '../i18n/i18n';
import type { StepId } from '../state/types';
import { guide } from '../theme/constants';

const useStyles = makeStyles({
  stack: { display: 'flex', flexDirection: 'column', gap: '26px' },
  block: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  h3: { ...typographyStyles.subtitle2, margin: 0 },
  note: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  // The nine steps: a row on a wide dialog, a list on a narrow one.
  steps: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: tokens.spacingVerticalS,
    '@media (min-width: 900px)': { gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: '4px' },
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
    '@media (min-width: 900px)': { flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' },
  },
  stepNow: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground1 },
  stepNum: {
    flex: '0 0 28px',
    width: '28px',
    height: '28px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    ...typographyStyles.caption1Strong,
    color: tokens.colorNeutralForeground1,
  },
  stepNumNow: { border: 'none', background: guide.mark, boxShadow: `0 0 0 3px ${guide.peach}` },
  // A long compound breaks only where a soft hyphen allows it («Helhets-inntrykk»).
  stepLabel: { minWidth: 0, overflowWrap: 'break-word', hyphens: 'manual' },
  here: { display: 'block', ...typographyStyles.caption1Strong, color: guide.ink },
  // One case's form: four stages, in a row on a wide dialog.
  flow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: tokens.spacingVerticalS,
    alignItems: 'stretch',
    '@media (min-width: 640px)': { gridTemplateColumns: 'minmax(0, 1fr) 16px minmax(0, 1fr) 16px minmax(0, 1fr) 16px minmax(0, 1fr)', gap: '6px' },
  },
  stage: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: '10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  stageAtlas: { backgroundColor: tokens.colorBrandBackground2, border: `1px solid ${tokens.colorBrandStroke2}` },
  stageWho: { ...typographyStyles.caption1Strong, color: guide.ink },
  stageWhoAtlas: { color: tokens.colorBrandForeground1 },
  stageTitle: { ...typographyStyles.body1Strong },
  stageText: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  arrow: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tokens.colorNeutralForeground3 },
  arrowWide: { display: 'none', '@media (min-width: 640px)': { display: 'inline-flex' } },
  arrowNarrow: { '@media (min-width: 640px)': { display: 'none' } },
  rows: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  row: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'flex-start' },
  rowIcon: {
    flex: '0 0 32px',
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: '#FFF0E8',
    color: guide.ink,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { ...typographyStyles.body1, margin: 0, paddingBlockStart: '5px' },
  intro: { ...typographyStyles.body1, margin: 0 },
  tiles: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: '12px',
    border: `1px solid ${guide.cardEdge}`,
    background: guide.card,
  },
  tileTitle: { ...typographyStyles.body1Strong, margin: 0 },
  tileText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
});

const STUDY_STEPS: StepId[] = ['velkommen', 'om-deg', 'omvisning', 'helhet', 'kari', 'erlend', 'astrid', 'avslutning', 'ekstra'];
const STEP_KEY = {
  velkommen: 'stepVelkommen',
  'om-deg': 'stepOmDeg',
  omvisning: 'stepOmvisning',
  helhet: 'stepHelhet',
  kari: 'stepKari',
  erlend: 'stepErlend',
  astrid: 'stepAstrid',
  avslutning: 'stepAvslutning',
  ekstra: 'stepEkstra',
} as const;

/** Where a narrow column may break a long Norwegian compound. */
function softHyphens(label: string): string {
  return label.replace('Helhetsinntrykk', 'Helhets\u00ADinntrykk').replace('Avslutning', 'Avslut\u00ADning');
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  const cls = useStyles();
  return (
    <div className={cls.row}>
      <span className={cls.rowIcon} aria-hidden="true">
        {icon}
      </span>
      <p className={cls.rowText}>{children}</p>
    </div>
  );
}

/** Hjelp › Slik foregår evalueringen (study mode): the nine steps, one case's form, and three things to know. */
export function HowItWorksBody({ current }: { current?: StepId }) {
  const cls = useStyles();
  const { s } = useLang();
  const stages = [
    { atlas: false, title: s('helpFlow1Title'), text: s('helpFlow1Text') },
    { atlas: false, title: s('helpFlow2Title'), text: s('helpFlow2Text') },
    { atlas: true, title: s('helpFlow3Title'), text: s('helpFlow3Text') },
    { atlas: false, title: s('helpFlow4Title'), text: s('helpFlow4Text') },
  ];
  return (
    <div className={cls.stack}>
      <section className={cls.block} aria-label={s('helpStepsTitle')}>
        <h3 className={cls.h3}>{s('helpStepsTitle')}</h3>
        <ol className={cls.steps} aria-label={s('helpStepsList')}>
          {STUDY_STEPS.map((step, i) => {
            const now = step === current;
            return (
              <li key={step} className={mergeClasses(cls.step, now && cls.stepNow)} aria-current={now ? 'step' : undefined}>
                <span className={mergeClasses(cls.stepNum, now && cls.stepNumNow)} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={cls.stepLabel}>
                  {softHyphens(s(STEP_KEY[step as keyof typeof STEP_KEY]))}
                  {now && <span className={cls.here}>{s('helpYouAreHere')}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <p className={cls.note}>{s('helpStepsNote')}</p>
      </section>
      <section className={cls.block} aria-label={s('helpCaseFormTitle')}>
        <h3 className={cls.h3}>{s('helpCaseFormTitle')}</h3>
        <div className={cls.flow}>
          {stages.map((st, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span className={cls.arrow} aria-hidden="true">
                  <span className={cls.arrowWide}>
                    <ArrowRight16Regular />
                  </span>
                  <span className={cls.arrowNarrow}>
                    <ArrowDown16Regular />
                  </span>
                </span>
              )}
              <div className={mergeClasses(cls.stage, st.atlas && cls.stageAtlas)}>
                <span className={mergeClasses(cls.stageWho, st.atlas && cls.stageWhoAtlas)}>{st.atlas ? 'ATLAS' : s('helpFlowForm')}</span>
                <span className={cls.stageTitle}>{st.title}</span>
                <span className={cls.stageText}>{st.text}</span>
              </div>
            </Fragment>
          ))}
        </div>
      </section>
      <div className={cls.rows}>
        <Row icon={<PanelRight20Regular />}>{s('helpRowPanel')}</Row>
        <Row icon={<SkipForwardTab20Regular />}>{s('helpRowSkip')}</Row>
        <Row icon={<History20Regular />}>{s('helpHow5')}</Row>
      </div>
    </div>
  );
}

/** Hjelp › Om prototypen (study mode): what ATLAS is, in four tiles. */
export function AboutBody() {
  const cls = useStyles();
  const { s } = useLang();
  const tiles = [
    { icon: <Beaker20Regular />, title: s('helpAboutFictionalTitle'), text: s('helpAboutFictionalText') },
    { icon: <DataBarVertical20Regular />, title: s('helpAboutPlaceTitle'), text: s('helpAboutPlaceText') },
    { icon: <Tag20Regular />, title: s('helpAboutSourceTitle'), text: s('helpAboutSourceText') },
    { icon: <Send20Regular />, title: s('helpAboutLeavesTitle'), text: s('helpAboutLeavesText') },
  ];
  return (
    <div className={cls.stack}>
      <p className={cls.intro}>{s('helpAboutIntro')}</p>
      <div className={cls.tiles}>
        {tiles.map((x) => (
          <div key={x.title} className={cls.tile}>
            <span className={cls.rowIcon} aria-hidden="true">
              {x.icon}
            </span>
            <h3 className={cls.tileTitle}>{x.title}</h3>
            <p className={cls.tileText}>{x.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
