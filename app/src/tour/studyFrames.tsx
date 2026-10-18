import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowDown16Regular, ArrowRight16Regular, CommentEdit16Regular, LockClosed12Regular, QuestionCircle16Regular } from '@fluentui/react-icons';
import { Fragment } from 'react';
import type { Role } from '../content/types';
import { instrument } from '../content';
import { useLang } from '../i18n/i18n';
import type { StringKey } from '../i18n/strings';
import { useStudyOptional } from '../state/study';
import { guide } from '../theme/constants';

/**
 * The frames of «Slik foregår studien»: drawings of the study's own parts (the overview, a case's path, the stop page,
 * the study name). They show where things are, never a patient, and nothing in them can be pressed.
 */
const STUDY_FRAMES = new Set(['studyMap', 'studyCase', 'studyStop', 'studyName']);
export const isStudyFrame = (frame: string): boolean => STUDY_FRAMES.has(frame);

const useStyles = makeStyles({
  stack: { display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 },
  // The overview in miniature: a header strip, the study card, the day's list, the side cards and the feedback tab.
  map: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.9fr) minmax(0, 1.6fr) minmax(0, 1fr)',
    gridTemplateRows: '26px 100px',
    gap: '8px',
    padding: '10px',
    paddingInlineEnd: '30px',
    borderRadius: '10px',
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  mapHead: {
    gridColumn: '1 / -1',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingInline: '8px',
    borderRadius: '6px',
    backgroundColor: tokens.colorNeutralBackground1,
    ...typographyStyles.caption2Strong,
    color: tokens.colorNeutralForeground2,
  },
  mapPills: { display: 'flex', gap: '4px', marginInline: 'auto' },
  mapPill: { width: '34px', height: '8px', borderRadius: '4px', backgroundColor: tokens.colorNeutralStroke2 },
  mapPillNow: { backgroundColor: tokens.colorBrandStroke1 },
  mapCard: { position: 'relative', borderRadius: '6px', backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorNeutralStroke3}` },
  mapStudy: { backgroundColor: tokens.colorNeutralBackground1, border: `1px solid ${tokens.colorBrandStroke2}` },
  mapLines: { display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px' },
  mapLine: { height: '6px', borderRadius: '3px', backgroundColor: tokens.colorNeutralStroke3 },
  mapTab: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-20%)',
    width: '18px',
    height: '64px',
    borderRadius: '6px 0 0 6px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'inline-flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingBlockStart: '6px',
    boxSizing: 'border-box',
  },
  marker: {
    position: 'absolute',
    top: '-8px',
    left: '-8px',
    width: '20px',
    height: '20px',
    borderRadius: tokens.borderRadiusCircular,
    background: guide.mark,
    border: `1px solid ${guide.cardEdge}`,
    ...typographyStyles.caption1Strong,
    color: tokens.colorNeutralForeground1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  markerHead: { position: 'static', marginInlineEnd: '2px' },
  markerTab: { top: '-10px', left: '-12px' },
  legend: { margin: 0, paddingInlineStart: '22px', display: 'flex', flexDirection: 'column', gap: '4px', ...typographyStyles.body1 },
  legendTitle: { ...typographyStyles.body1Strong },
  // A case's path: six stages, in a row where there is room.
  flow: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: '6px' },
  flowItem: { display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 150px', minWidth: 0 },
  stage: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingInline: '10px',
    paddingBlock: '8px',
    borderRadius: '10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    alignSelf: 'stretch',
    minWidth: 0,
  },
  stageAtlas: { backgroundColor: tokens.colorBrandBackground2, border: `1px solid ${tokens.colorBrandStroke2}` },
  stageForm: { backgroundColor: '#FFF8F4', border: `1px solid ${guide.cardEdge}` },
  stageWho: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground2 },
  stageWhoForm: { color: guide.ink },
  stageWhoAtlas: { color: tokens.colorBrandForeground1 },
  stageTitle: { ...typographyStyles.body1Strong },
  stageText: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  arrow: { color: tokens.colorNeutralForeground3, display: 'inline-flex', flexShrink: 0 },
  // The stop page as the form shows it.
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    borderRadius: '10px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    maxWidth: '560px',
  },
  formTop: { display: 'flex', justifyContent: 'space-between', gap: '8px', ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  stop: { ...typographyStyles.body1Strong, margin: 0, padding: '12px', borderRadius: tokens.borderRadiusMedium, border: `1px solid ${tokens.colorNeutralStroke1}` },
  formNav: { display: 'flex', justifyContent: 'space-between', gap: '8px' },
  fakeBtn: {
    ...typographyStyles.body1Strong,
    paddingInline: '12px',
    paddingBlock: '4px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground3,
  },
  locked: { display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px', borderRadius: tokens.borderRadiusMedium, backgroundColor: tokens.colorNeutralBackground3 },
  lockedHead: { ...typographyStyles.caption1Strong },
  lockedRow: { display: 'flex', alignItems: 'center', gap: '6px', ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  lockedName: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1, backgroundColor: '#FFF1E9', paddingInline: '4px', borderRadius: tokens.borderRadiusSmall },
  caption: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
});

/** «Oversikten»: where things are, numbered, with what each is for. */
export function FrameStudyMap({ role }: { role: Role }) {
  const cls = useStyles();
  const { s } = useLang();
  const marker = (n: number, extra?: string) => (
    <span className={mergeClasses(cls.marker, extra)} aria-hidden="true">
      {n}
    </span>
  );
  const lines = (n: number) => (
    <div className={cls.mapLines}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={cls.mapLine} style={{ width: `${92 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
  return (
    <div className={cls.stack}>
      <div className={cls.map} aria-hidden="true">
        <div className={cls.mapHead}>
          ATLAS
          <span className={cls.mapPills}>
            {marker(1, cls.markerHead)}
            <span className={mergeClasses(cls.mapPill, cls.mapPillNow)} />
            <span className={cls.mapPill} />
            <span className={cls.mapPill} />
          </span>
          {marker(5, cls.markerHead)}
          <QuestionCircle16Regular />
        </div>
        <div className={mergeClasses(cls.mapCard, cls.mapStudy)}>
          {marker(2)}
          {lines(4)}
        </div>
        <div className={cls.mapCard}>
          {marker(3)}
          {lines(7)}
        </div>
        <div className={cls.mapCard}>{lines(5)}</div>
        <span className={cls.mapTab}>
          {marker(4, cls.markerTab)}
          <CommentEdit16Regular />
        </span>
      </div>
      <ol className={cls.legend}>
        <li>
          <span className={cls.legendTitle}>{s('studyMapParts')}:</span> {s('studyMapPartsText')}
        </li>
        <li>
          <span className={cls.legendTitle}>{s('studyMapCard')}:</span> {s('studyMapCardText')}
        </li>
        <li>
          <span className={cls.legendTitle}>{s(role === 'gp' ? 'timelisteTitle' : 'navQueue')}:</span> {s(role === 'gp' ? 'studyMapListGp' : 'studyMapListDps')}
        </li>
        <li>
          <span className={cls.legendTitle}>{s('feedback')}:</span> {s('studyMapFeedbackText')}
        </li>
        <li>
          <span className={cls.legendTitle}>{s('help')}:</span> {s('studyMapHelpText')}
        </li>
      </ol>
    </div>
  );
}

/** «Slik går en sak»: the path of one case, from the briefing to the summary. */
export function FrameStudyCase() {
  const cls = useStyles();
  const { s } = useLang();
  const stages: { who: 'atlas' | 'form' | 'case'; title: StringKey; text: StringKey }[] = [
    { who: 'case', title: 'studyFlowBriefTitle', text: 'studyFlowBriefText' },
    { who: 'form', title: 'helpFlow1Title', text: 'helpFlow1Text' },
    { who: 'form', title: 'helpFlow2Title', text: 'helpFlow2Text' },
    { who: 'atlas', title: 'helpFlow3Title', text: 'helpFlow3Text' },
    { who: 'form', title: 'helpFlow4Title', text: 'helpFlow4Text' },
    { who: 'case', title: 'studyFlowSummaryTitle', text: 'studyFlowSummaryText' },
  ];
  return (
    <ol className={cls.flow} aria-label={s('studyFlowLabel')}>
      {stages.map((st, i) => (
        <li key={st.title} className={cls.flowItem}>
          {i > 0 && (
            <span className={cls.arrow} aria-hidden="true">
              <ArrowRight16Regular />
            </span>
          )}
          <span className={mergeClasses(cls.stage, st.who === 'atlas' && cls.stageAtlas, st.who === 'form' && cls.stageForm)}>
            <span className={mergeClasses(cls.stageWho, st.who === 'form' && cls.stageWhoForm, st.who === 'atlas' && cls.stageWhoAtlas)}>
              {st.who === 'atlas' ? 'ATLAS' : st.who === 'form' ? s('helpFlowForm') : s('studyFlowCase')}
            </span>
            <span className={cls.stageTitle}>{s(st.title)}</span>
            <span className={cls.stageText}>{s(st.text)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** «Stoppsiden i skjemaet»: page 2 of a case form, in the form's own words. */
export function FrameStudyStop() {
  const cls = useStyles();
  const { s, t } = useLang();
  const stop = instrument.forms.find((f) => f.key === 'S3')?.pages[1]?.items[0];
  return (
    <div className={cls.stack}>
      <div className={cls.form} aria-label={s('studyStopLabel')} role="group">
        <div className={cls.formTop}>
          <span>{s('helpFlowForm')}</span>
          <span>{s('previewPageOf', { n: 2, total: 3 })}</span>
        </div>
        <p className={cls.stop}>{stop ? t(stop.text) : ''}</p>
        <div className={cls.formNav} aria-hidden="true">
          <span className={cls.fakeBtn}>{s('previous')}</span>
          <span className={cls.fakeBtn}>{s('next')}</span>
        </div>
      </div>
      <p className={cls.caption}>
        <ArrowDown16Regular aria-hidden="true" style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
        {s('studyStopCaption')}
      </p>
    </div>
  );
}

/** «Studienavnet»: the locked fields at the top of a form, with the participant's own study name when there is one. */
export function FrameStudyName({ role }: { role: Role }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudyOptional();
  const name = study?.state.studienavn ?? s('studyNameExample');
  const rows: { label: string; value: string; mark?: boolean }[] = [
    { label: s('studyNameRole'), value: role === 'gp' ? 'Fastlege' : 'DPS-inntak' },
    { label: s('studyNameName'), value: name, mark: true },
    { label: s('studyNameStep'), value: 'S3' },
  ];
  return (
    <div className={cls.stack}>
      <div className={cls.form} role="group" aria-label={s('studyNameLabel')}>
        <div className={cls.formTop}>
          <span>{s('helpFlowForm')}</span>
          <span>{s('previewPageOf', { n: 1, total: 3 })}</span>
        </div>
        <div className={cls.locked}>
          <span className={cls.lockedHead}>{t(instrument.lockedHeading)}</span>
          {rows.map((r) => (
            <Fragment key={r.label}>
              <span className={cls.lockedRow}>
                <LockClosed12Regular aria-hidden="true" />
                {r.label}:{' '}
                <strong lang="nb" className={r.mark ? cls.lockedName : undefined}>
                  {r.value}
                </strong>
              </span>
            </Fragment>
          ))}
        </div>
      </div>
      <p className={cls.caption}>{s('studyNameCaption')}</p>
    </div>
  );
}
