import {
  Button,
  Tab,
  TabList,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronRight16Regular, History20Regular, Note16Regular, Pill20Regular } from '@fluentui/react-icons';
import { useId, useState, type ReactNode } from 'react';
import type { CaseContent, PreviousReferral } from '../content/types';
import { formatDate, useLang } from '../i18n/i18n';
import { Panel, ProvenanceChip, StatusChip } from '../patterns/basics';

const useStyles = makeStyles({
  profile: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  pRow: { display: 'flex', flexDirection: 'column', gap: '2px' },
  pLabelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalXS, flexWrap: 'wrap' },
  pLabel: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground2 },
  pValue: { ...typographyStyles.body1, margin: 0 },
  mono: { ...typographyStyles.caption1, fontFamily: tokens.fontFamilyMonospace },
  context: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  tabsWrap: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, minWidth: 0 },
  tabs: { flexWrap: 'wrap' },
  self: {
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
  },
  selfHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  selfTitle: { ...typographyStyles.body1Strong, display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  selfList: { margin: `${tokens.spacingVerticalS} 0 0`, display: 'flex', flexDirection: 'column' },
  selfRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalXS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    ...typographyStyles.body1,
  },
  selfA: { ...typographyStyles.body1Strong, textAlign: 'end' },
  noteHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  noteTitle: { ...typographyStyles.subtitle2, margin: 0 },
  noteText: {
    ...typographyStyles.body1,
    whiteSpace: 'pre-line',
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalM,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: { width: '100%', borderCollapse: 'collapse', ...typographyStyles.body1 },
  th: { textAlign: 'start', ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground2, paddingBlock: tokens.spacingVerticalXS, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  td: { paddingBlock: tokens.spacingVerticalS, borderBottom: `1px solid ${tokens.colorNeutralStroke3}`, verticalAlign: 'top', paddingInlineEnd: tokens.spacingHorizontalM },
  tableWrap: { overflowX: 'auto' },
  hist: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  histItem: {
    display: 'grid',
    gridTemplateColumns: 'minmax(110px, max-content) 1fr',
    columnGap: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
    '@media only screen and (max-width: 479px)': { gridTemplateColumns: '1fr' },
  },
  histDate: { color: tokens.colorNeutralForeground3, fontVariantNumeric: 'tabular-nums' },
  prev: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  prevMeta: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  prevText: { ...typographyStyles.body1, margin: 0 },
  prevNote: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
});

export function ProfileRail({ content }: { content: CaseContent }) {
  const cls = useStyles();
  const { s, t } = useLang();
  return (
    <Panel aria-label={s('profile')}>
      <div className={cls.profile}>
        <h2 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('profile')}</h2>
        <div className={cls.pRow}>
          <div className={cls.pLabelRow}>
            <span className={cls.pLabel}>{s('fnr')}</span>
            <ProvenanceChip source="record" />
          </div>
          <span className={cls.mono}>{content.patient.fnr}</span>
        </div>
        {content.gp.profile.map((row, i) => (
          <div key={i} className={cls.pRow}>
            <div className={cls.pLabelRow}>
              <span className={cls.pLabel}>{t(row.label)}</span>
              <ProvenanceChip source={row.source} />
            </div>
            <p className={cls.pValue}>{t(row.value)}</p>
          </div>
        ))}
        <p className={cls.context}>{s('profileContext')}</p>
      </div>
    </Panel>
  );
}

export function SelfReport({ content, defaultOpen = false }: { content: CaseContent; defaultOpen?: boolean }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const [open, setOpen] = useState(defaultOpen);
  const listId = useId();
  const sr = content.gp.selfReport;
  if (!sr.rows.length) return null;
  return (
    <section className={cls.self} aria-label={s('selfReport')}>
      <div className={cls.selfHead}>
        <span className={cls.selfTitle}>
          {s('selfReport')}
          <ProvenanceChip source="selfReport" />
          <span style={{ ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 }}>{formatDate(sr.date, lang)}</span>
        </span>
        <Button
          appearance="transparent"
          size="small"
          icon={open ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(!open)}
        >
          {open ? s('hideAnswers') : s('showAnswers')}
        </Button>
      </div>
      <span style={{ ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 }}>{t(sr.intro)}</span>
      <dl className={cls.selfList} id={listId} hidden={!open}>
        {sr.rows.map((r, i) => (
          <div key={i} className={cls.selfRow}>
            <dt>{t(r.q)}</dt>
            <dd className={cls.selfA} style={{ margin: 0 }}>
              {t(r.a)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Notat, Legemidler, Historikk, with the self-report above the note. */
export function RecordTabs({ content, extraTop }: { content: CaseContent; extraTop?: ReactNode }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const [tab, setTab] = useState<'note' | 'meds' | 'history'>('note');
  const g = content.gp;
  return (
    <Panel aria-label={s('consultation')}>
      <div className={cls.tabsWrap}>
        <TabList className={cls.tabs} selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as typeof tab)} size="medium">
          <Tab value="note" icon={<Note16Regular />}>
            {s('tabNote')}
          </Tab>
          <Tab value="meds" icon={<Pill20Regular />}>
            {s('tabMeds')}
          </Tab>
          <Tab value="history" icon={<History20Regular />}>
            {s('tabHistory')}
          </Tab>
        </TabList>
        {extraTop}
        {tab === 'note' && (
          <div role="tabpanel" className={cls.tabsWrap}>
            <SelfReport content={content} />
            <div className={cls.noteHead}>
              <h2 className={cls.noteTitle}>{s('noteTitle')}</h2>
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <ProvenanceChip source="note" />
                <span style={{ ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 }}>{formatDate(g.note.date, lang)}</span>
              </span>
            </div>
            <p className={cls.noteText}>{t(g.note.text)}</p>
          </div>
        )}
        {tab === 'meds' && (
          <div role="tabpanel" className={cls.tabsWrap}>
            <div className={cls.noteHead}>
              <h2 className={cls.noteTitle}>{s('tabMeds')}</h2>
              <ProvenanceChip source="record" />
            </div>
            {g.meds.rows.length ? (
              <div className={cls.tableWrap} role="region" aria-label={s('tabMeds')} tabIndex={0}>
                <table className={cls.table}>
                  <thead>
                    <tr>
                      <th className={cls.th}>{s('medsColName')}</th>
                      <th className={cls.th}>{s('medsColDose')}</th>
                      <th className={cls.th}>{s('medsColPeriod')}</th>
                      <th className={cls.th}>{s('medsColStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.meds.rows.map((m, i) => (
                      <tr key={i}>
                        <td className={cls.td}>{t(m.name)}</td>
                        <td className={cls.td}>{t(m.dose)}</td>
                        <td className={cls.td}>{t(m.period)}</td>
                        <td className={cls.td}>{t(m.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={cls.prevText}>{s('none')}</p>
            )}
            <p className={cls.prevNote}>{t(g.meds.note)}</p>
          </div>
        )}
        {tab === 'history' && (
          <div role="tabpanel" className={cls.tabsWrap}>
            <div className={cls.noteHead}>
              <h2 className={cls.noteTitle}>{s('tabHistory')}</h2>
              <ProvenanceChip source="record" />
            </div>
            <ul className={cls.hist}>
              {g.history.map((h, i) => (
                <li key={i} className={cls.histItem}>
                  <span className={cls.histDate}>{formatDate(h.date, lang)}</span>
                  <span>{t(h.text)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function PreviousReferralCard({ prev, source }: { prev: PreviousReferral; source: 'record' | 'dpsRecord' }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  return (
    <section className={cls.prev} aria-label={s('previousReferral')}>
      <div className={cls.pLabelRow}>
        <h3 style={{ ...typographyStyles.subtitle2, margin: 0 }}>{s('previousReferral')}</h3>
        <ProvenanceChip source={source} />
      </div>
      <div className={cls.prevMeta}>
        <span>{s('previousSent', { date: formatDate(prev.sent, lang) })}</span>
        <span>{s('previousDecided', { date: formatDate(prev.decided, lang) })}</span>
        <StatusChip>{t(prev.outcome)}</StatusChip>
      </div>
      <p className={cls.prevText}>{t(prev.text)}</p>
      {prev.note && <p className={cls.prevNote}>{t(prev.note)}</p>}
    </section>
  );
}

export const recordStyles = useStyles;
export { mergeClasses };
