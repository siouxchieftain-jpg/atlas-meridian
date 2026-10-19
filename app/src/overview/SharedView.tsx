import { Tab, TabList, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ChatMultiple20Regular, DataUsage20Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import type { CaseId } from '../content/types';
import { cases, shared, vocab } from '../content';
import { formatDate, useLang } from '../i18n/i18n';
import { RouterLink } from '../router/router';
import { DesignNote, ProvenanceChip, RoleAvatar } from '../patterns/basics';
import { useWidth } from '../patterns/useWidth';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  panel: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  intro: { ...typographyStyles.body1, margin: 0, maxWidth: '72ch', color: tokens.colorNeutralForeground2 },
  meta: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: tokens.spacingHorizontalM },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  statValue: { ...typographyStyles.subtitle1, fontVariantNumeric: 'tabular-nums' },
  statLabel: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  h2: { ...typographyStyles.subtitle2, margin: 0 },
  // The area's figures and the reasons on the left, the changes in the criteria on the right, when the panel is wide
  // (1,280 px, a big screen); one under the other on a laptop (3.4.1).
  split: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', rowGap: tokens.spacingVerticalL, columnGap: '48px', alignItems: 'start' },
  splitWide: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' },
  col: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, minWidth: 0 },
  // A reason and its share stay within reach of each other on a wide screen.
  reasons: { maxWidth: '640px' },
  rows: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
  },
  logItem: {
    display: 'grid',
    gridTemplateColumns: 'minmax(110px, max-content) minmax(0, 100ch)',
    columnGap: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
    '@media only screen and (max-width: 479px)': { gridTemplateColumns: '1fr' },
  },
  date: { color: tokens.colorNeutralForeground3, fontVariantNumeric: 'tabular-nums' },
  empty: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px dashed ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground2,
  },
  post: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'flex-start' },
  postBody: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  postMeta: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, display: 'flex', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  postWho: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground1 },
  postText: {
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  thread: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  note: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
});

export interface ThreadLink {
  caseId: CaseId;
  to: string;
  status: string;
}

export function Kalibrering({ noData, notes }: { noData?: boolean; notes?: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const k = shared.kalibrering;
  const [splitRef, splitWidth] = useWidth<HTMLDivElement>();
  const wide = splitWidth >= 1280;
  return (
    <div className={cls.panel} data-section="kalibrering">
      {!noData && (
        <div className={cls.meta}>
          <ProvenanceChip source="fictional" />
        </div>
      )}
      {!noData && <p className={cls.intro}>{t(k.intro)}</p>}
      <div ref={splitRef} className={mergeClasses(cls.split, wide && cls.splitWide)} data-split={wide ? '' : undefined}>
        <div className={cls.col}>
          {noData ? (
            <p className={cls.empty}>
              <strong>{s('noDataTitle')}.</strong> {s('noDataKalibrering')}
            </p>
          ) : (
            <>
              <section aria-label={s('catchment')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 className={cls.h2}>{s('catchment')}</h2>
                <div className={cls.stats}>
                  {k.catchment.map((c) => (
                    <div key={c.label.nb} className={cls.stat}>
                      <span className={cls.statValue}>{t(c.value)}</span>
                      <span className={cls.statLabel}>{t(c.label)}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section aria-label={s('commonReasons')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h2 className={cls.h2}>{s('commonReasons')}</h2>
                <ul className={mergeClasses(cls.rows, cls.reasons)}>
                  {k.commonReasons.map((r) => (
                    <li key={r.reason} className={cls.row}>
                      <span>{t(vocab.reasons[r.reason])}</span>
                      <span>{t(r.share)}</span>
                    </li>
                  ))}
                </ul>
                <p className={cls.note}>{s('patternReasonsNote')}</p>
              </section>
            </>
          )}
        </div>
        <section aria-label={s('criteriaLog')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className={cls.h2}>{s('criteriaLog')}</h2>
          <ul className={cls.rows}>
            {k.criteriaLog.map((e) => (
              <li key={e.date} className={cls.logItem}>
                <span className={cls.date}>{formatDate(e.date, lang)}</span>
                <span>{t(e.text)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <DesignNote id="kalibrering" show={!!notes} />
    </div>
  );
}

export function SharedDialog({ threads, notes, onOpenThread }: { threads: ThreadLink[]; notes?: boolean; onOpenThread?: (caseId: CaseId) => void }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const d = shared.dialog;
  return (
    <div className={cls.panel} data-section="delt-dialog">
      <p className={cls.intro}>{t(d.intro)}</p>
      <section aria-label={s('threads')} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className={cls.h2}>{s('threads')}</h2>
        {threads.length === 0 ? (
          <p className={cls.note}>{s('noThreadYet')}</p>
        ) : (
          <ul className={cls.rows} style={{ gap: 8 }}>
            {threads.map((th) => (
              <li key={th.caseId}>
                {onOpenThread ? (
                  <button type="button" className={cls.thread} style={{ width: '100%', font: 'inherit', cursor: 'pointer', background: 'transparent', textAlign: 'start' }} onClick={() => onOpenThread(th.caseId)}>
                    <span>{s('patientAge', { name: cases[th.caseId].patient.name, age: cases[th.caseId].patient.age })}</span>
                    <span className={cls.note}>{th.status}</span>
                  </button>
                ) : (
                  <RouterLink to={th.to} className={cls.thread}>
                    <span>{s('patientAge', { name: cases[th.caseId].patient.name, age: cases[th.caseId].patient.age })}</span>
                    <span className={cls.note}>{th.status}</span>
                  </RouterLink>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label={s('discussion')} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className={cls.meta}>
          <h2 className={cls.h2}>
            {s('discussion')}: {t(d.discussion.title)}
          </h2>
        </div>
        <ol className={cls.rows} style={{ gap: 12 }}>
          {d.discussion.posts.map((p, i) => (
            <li key={i} className={cls.post}>
              <RoleAvatar role={p.role} size={28} />
              <div className={cls.postBody}>
                <span className={cls.postMeta}>
                  <span className={cls.postWho}>{t(p.role === 'gp' ? vocab.roles.gpTeam : vocab.roles.dps)}</span>
                  <span>{formatDate(p.date, lang)}</span>
                </span>
                <p className={cls.postText}>{t(p.text)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <DesignNote id="delt-dialog" show={!!notes} />
    </div>
  );
}

/** Delt oversikt with its two sections, Kalibrering and Dialog. */
export function SharedView({
  initialTab = 'kalibrering',
  noData,
  threads,
  notes,
  headingId,
}: {
  initialTab?: 'kalibrering' | 'dialog';
  noData?: boolean;
  threads: ThreadLink[];
  notes?: boolean;
  headingId?: string;
}) {
  const cls = useStyles();
  const { s } = useLang();
  const [tab, setTab] = useState<'kalibrering' | 'dialog'>(initialTab);
  return (
    <div className={cls.root}>
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as 'kalibrering' | 'dialog')} aria-labelledby={headingId}>
        <Tab value="kalibrering" icon={<DataUsage20Regular />}>
          {s('kalibrering')}
        </Tab>
        <Tab value="dialog" icon={<ChatMultiple20Regular />}>
          {s('dialogTab')}
        </Tab>
      </TabList>
      {tab === 'kalibrering' ? <Kalibrering noData={noData} notes={notes} /> : <SharedDialog threads={threads} notes={notes} />}
    </div>
  );
}
