import { Button, SearchBox, makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { ArrowRight16Regular, CheckmarkCircle16Filled, LockClosed16Regular } from '@fluentui/react-icons';
import { useEffect, useState, type ReactNode } from 'react';
import type { CoreCaseId, Role } from '../content/types';
import { cases, ordinary } from '../content';
import { formatDateWithWeekday, formatDayMonth, useLang } from '../i18n/i18n';
import { DPS_TODAY, GP_TODAY } from '../engine/clock';
import { navigate } from '../router/router';
import { useStudy } from '../state/study';
import { SrOnly, StatusChip } from '../patterns/basics';
import { Breadcrumbs, PageCard } from '../patterns/layout';
import { PageHeading } from '../shell/PageHeading';
import { focusAfterOverlay, useAtlasAnnounce } from '../patterns/announce';
import { HOME_PATH } from './controller';
import { Deadlines } from './homeParts';
import { CORE, caseInProgress, currentCase } from './parts';
import { StudyCard } from './StudyCard';
import { TourStartDialog } from './TourStart';

/**
 * The list the cases start from (3.4, boards 4a and 4b): «Timeliste i dag» for the GP, «Mottatte henvisninger» for DPS.
 * The study card on the left holds the study's next step; the cases sit in the first row of cards, the rest of the day
 * (the GP's ordinary appointments) in the second. The start page leads here with «Gå til timelisten».
 */
const useStyles = makeStyles({
  head: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', columnGap: '24px', rowGap: '10px' },
  headText: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  sub: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  search: { flex: '0 1 360px', minWidth: '240px', maxWidth: '100%' },
  // The study card and the cards: side by side from 760 px of the page's width, stacked below.
  body: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '24px' },
  studyCol: { flex: '1 1 272px', maxWidth: '320px', minWidth: 0, display: 'flex' },
  cardsCol: { flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' },
  // Each row of cards fills the width: three across on a laptop, fewer as the column narrows.
  grid: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 228px), 1fr))' },
  gridDps: { gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' },
  item: { display: 'flex', minWidth: 0 },
  // The referrals' list lends its items to the grid around it, so «Frister» can share the grid without joining the list.
  contents: { display: 'contents' },
  card: {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingInline: '18px',
    paddingBlockStart: '16px',
    paddingBlockEnd: '14px',
    minWidth: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  // The case that is next: a brand edge, as a selected or current item is marked across ATLAS.
  cardNow: { border: `1px solid ${tokens.colorBrandStroke1}`, boxShadow: tokens.shadow4, '@media (forced-colors: active)': { border: '2px solid Highlight' } },
  cardQuiet: { backgroundColor: tokens.colorNeutralBackground2 },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
  time: { ...typographyStyles.body1Strong, fontVariantNumeric: 'tabular-nums' },
  timeQuiet: { ...typographyStyles.body1, color: tokens.colorNeutralForeground3, fontVariantNumeric: 'tabular-nums' },
  received: { ...typographyStyles.caption1Strong, color: tokens.colorNeutralForeground1 },
  tag: {
    ...typographyStyles.caption1Strong,
    paddingInline: '8px',
    paddingBlock: '1px',
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
  },
  tagNow: { color: tokens.colorBrandForeground1, border: `1px solid ${tokens.colorBrandStroke2}`, backgroundColor: tokens.colorBrandBackground2 },
  routine: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  who: { display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 },
  avatar: {
    flex: '0 0 36px',
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.caption1Strong,
  },
  avatarQuiet: { backgroundColor: tokens.colorNeutralBackground4, color: tokens.colorNeutralForeground3 },
  whoText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  name: { ...typographyStyles.subtitle2, margin: 0, fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300, overflowWrap: 'anywhere' },
  nameQuiet: { color: tokens.colorNeutralForeground2 },
  visit: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, overflowWrap: 'anywhere' },
  text: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  chips: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '8px', rowGap: '4px' },
  date: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  foot: {
    marginBlockStart: 'auto',
    paddingBlockStart: '10px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    minHeight: '28px',
    display: 'flex',
    alignItems: 'center',
  },
  open: { minWidth: 0, paddingInline: 0, height: '28px', ...typographyStyles.body1Strong },
  later: { display: 'inline-flex', alignItems: 'center', gap: '6px', ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  done: { display: 'inline-flex', alignItems: 'center', gap: '6px', ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  note: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground3 },
  empty: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
});

/** A patient matches the search by name, or by the start of the national identity number (as review mode). */
export function matches(query: string, name: string, fnr: string): boolean {
  const needle = query.trim().toLocaleLowerCase('nb');
  if (!needle) return true;
  const digits = needle.replace(/\D/g, '');
  return name.toLocaleLowerCase('nb').includes(needle) || (digits !== '' && fnr.replace(/\D/g, '').startsWith(digits));
}

/** The case's short summary for its card: the briefing's first line without the name and age that open it. */
function summary(text: string): string {
  // «100 %» never breaks between the number and its sign.
  return text.replace(/^[^.]*\d[^.]*\.\s*/, '').replace(/(\d) %/g, '$1\u00a0%');
}

export function ListPage() {
  const cls = useStyles();
  const { s, lang } = useLang();
  const study = useStudy();
  const announce = useAtlasAnnounce();
  const role: Role = study.role ?? 'gp';
  const [query, setQuery] = useState('');
  const [tourCard, setTourCard] = useState(false);
  const title = s(role === 'gp' ? 'timelisteTitle' : 'navQueue');
  const all = role === 'gp' ? [...CORE.map((c) => cases[c].patient), ...ordinary] : CORE.map((c) => cases[c].patient);
  const found = all.filter((p) => matches(query, p.name, p.fnr)).length;
  // How many match is said once typing pauses (G-28), through the app's one announcer (G-32).
  useEffect(() => {
    if (!query.trim()) return;
    const id = window.setTimeout(() => announce(found ? s('homeSearchFound', { n: found, m: all.length }) : s('noMatches')), 1000);
    return () => window.clearTimeout(id);
  }, [query, found, all.length, announce, s]);
  const day = formatDateWithWeekday(role === 'gp' ? GP_TODAY : DPS_TODAY, lang);
  const sub =
    role === 'gp'
      ? s('listSubGp', { date: day, n: CORE.length + ordinary.length, m: CORE.length })
      : s('listSubDps', { date: day, n: CORE.length });
  return (
    <PageCard>
      <Breadcrumbs items={[{ label: s('navHome'), to: HOME_PATH }, { label: title }]} label={s('breadcrumbs')} />
      <div className={cls.head}>
        <div className={cls.headText}>
          <PageHeading title={title}>{title}</PageHeading>
          <p className={cls.sub}>{sub}</p>
        </div>
        <SearchBox
          className={cls.search}
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          placeholder={s('searchPatients')}
          aria-label={s('searchPatients')}
          dismiss={{ 'aria-label': s('clearSearch') }}
          data-list-search=""
        />
      </div>
      <div className={cls.body}>
        <div className={cls.studyCol}>
          <StudyCard onStartTour={() => setTourCard(true)} />
        </div>
        <div className={cls.cardsCol}>
          {role === 'gp' ? <GpCards query={query} /> : <DpsCards query={query} />}
          {found === 0 && <p className={cls.empty}>{s('noMatches')}</p>}
          <p className={cls.note}>{s(role === 'gp' ? 'listNoteGp' : 'listSortedDps')}</p>
        </div>
      </div>
      <TourStartDialog
        open={tourCard}
        onClose={() => {
          setTourCard(false);
          focusAfterOverlay(() => document.querySelector<HTMLElement>('[data-start-tour]') ?? document.querySelector<HTMLElement>('main h1'));
        }}
      />
    </PageCard>
  );
}

/** What a case's card says at its foot: open it, go on, done, or wait (for the tour, or for its turn). */
function CaseFoot({ caseId, nameId }: { caseId: CoreCaseId; nameId: string }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const role: Role = study.role ?? 'gp';
  const st = study.state;
  const n = CORE.indexOf(caseId) + 1;
  if (st.phase[caseId] === 'done')
    return (
      <span className={cls.done}>
        <CheckmarkCircle16Filled aria-hidden="true" />
        {s('chipDone')}
      </span>
    );
  if (!st.tour.done)
    return (
      <span className={cls.later}>
        <LockClosed16Regular aria-hidden="true" />
        {n === 1 ? s('homeAfterTour') : s('listLaterInStudy')}
      </span>
    );
  if (caseId === currentCase(st))
    return (
      <Button
        appearance="transparent"
        className={cls.open}
        icon={<ArrowRight16Regular />}
        iconPosition="after"
        aria-describedby={nameId}
        onClick={() => navigate(`/studie/sak/${caseId}`)}
        data-list-open={caseId}
      >
        {caseInProgress(st, caseId) ? s('continueCase') : role === 'gp' ? s('listOpenCase') : s('listOpenReferral')}
      </Button>
    );
  return (
    <span className={cls.later}>
      <LockClosed16Regular aria-hidden="true" />
      {s('listLaterInStudy')}
    </span>
  );
}

function GpCards({ query }: { query: string }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const study = useStudy();
  const st = study.state;
  const now = st.tour.done ? currentCase(st) : undefined;
  const studyCases = CORE.filter((c) => matches(query, cases[c].patient.name, cases[c].patient.fnr));
  const routine = ordinary.filter((o) => matches(query, o.name, o.fnr));
  return (
    <>
      <SrOnly as="h2">{s('listCasesLabel')}</SrOnly>
      {studyCases.length > 0 && (
        <ul className={cls.grid} aria-label={s('listCasesLabel')}>
          {studyCases.map((c) => {
            const x = cases[c];
            const n = CORE.indexOf(c) + 1;
            const nameId = `list-name-${c}`;
            return (
              <li key={c} className={cls.item}>
                <article className={mergeClasses(cls.card, c === now && cls.cardNow)} aria-labelledby={nameId} data-list-case={c}>
                  <div className={cls.cardTop}>
                    <span className={cls.time}>{x.gp.timeliste.time}</span>
                    <span className={mergeClasses(cls.tag, c === now && cls.tagNow)}>{s('listCaseTag', { n })}</span>
                  </div>
                  <div className={cls.who}>
                    <span className={cls.avatar} aria-hidden="true">
                      {x.patient.initials}
                    </span>
                    <span className={cls.whoText}>
                      <h3 id={nameId} className={cls.name}>
                        <SrOnly>{`${x.gp.timeliste.time}, `}</SrOnly>
                        {s('patientAge', { name: x.patient.name, age: x.patient.age })}
                      </h3>
                      <span className={cls.visit}>{t(x.gp.timeliste.visit)}</span>
                    </span>
                  </div>
                  <p className={cls.text}>{summary(t(x.gp.briefing.rows[0].value))}</p>
                  {x.gp.timeliste.chips.length > 0 && (
                    <div className={cls.chips}>
                      {x.gp.timeliste.chips.map((ch) => (
                        <StatusChip key={t(ch.label)}>{t(ch.label)}</StatusChip>
                      ))}
                    </div>
                  )}
                  <div className={cls.foot}>
                    <CaseFoot caseId={c} nameId={nameId} />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
      {routine.length > 0 && <SrOnly as="h2">{s('listRoutineLabel')}</SrOnly>}
      {routine.length > 0 && (
        <ul className={cls.grid} aria-label={s('listRoutineLabel')}>
          {routine.map((o) => (
            <li key={o.id} className={cls.item}>
              <article className={mergeClasses(cls.card, cls.cardQuiet)} aria-label={s('patientAge', { name: o.name, age: o.age })} data-list-routine={o.id}>
                <div className={cls.cardTop}>
                  <span className={cls.timeQuiet}>{o.time}</span>
                  <span className={cls.routine}>{s('listRoutineTag')}</span>
                </div>
                <div className={cls.who}>
                  <span className={mergeClasses(cls.avatar, cls.avatarQuiet)} aria-hidden="true">
                    {o.initials}
                  </span>
                  <span className={cls.whoText}>
                    <span className={mergeClasses(cls.name, cls.nameQuiet)}>{s('patientAge', { name: o.name, age: o.age })}</span>
                    <span className={cls.visit}>{t(o.visit)}</span>
                  </span>
                </div>
                <div className={cls.foot}>
                  <span className={cls.later}>{s('listRoutineClosed')}</span>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function DpsCards({ query }: { query: string }) {
  const cls = useStyles();
  const { s, t, lang } = useLang();
  const study = useStudy();
  const st = study.state;
  const now = st.tour.done ? currentCase(st) : undefined;
  // Newest first; the same day keeps the study's order (Meridian: the queue sorts by date received).
  const rows = CORE.filter((c) => matches(query, cases[c].patient.name, cases[c].patient.fnr)).sort((a, b) =>
    cases[b].dps!.queue.received.localeCompare(cases[a].dps!.queue.received),
  );
  const items: ReactNode[] = rows.map((c) => {
    const x = cases[c];
    const q = x.dps!.queue;
    const answered = x.dps!.returnSent;
    const n = CORE.indexOf(c) + 1;
    const nameId = `list-name-${c}`;
    // A case the participant has done reads as done: its «Ny …» chips and its deadline go (3.4).
    const done = st.phase[c] === 'done';
    return (
      <li key={c} className={cls.item}>
        <article className={mergeClasses(cls.card, c === now && cls.cardNow)} aria-labelledby={nameId} data-list-case={c}>
          <div className={cls.cardTop}>
            <span className={cls.received}>{s('listReceived', { date: formatDayMonth(q.received, lang) })}</span>
            <span className={mergeClasses(cls.tag, c === now && cls.tagNow)}>{s('listCaseTag', { n })}</span>
          </div>
          <div className={cls.who}>
            <span className={cls.avatar} aria-hidden="true">
              {x.patient.initials}
            </span>
            <span className={cls.whoText}>
              <h3 id={nameId} className={cls.name}>
                {s('patientAge', { name: x.patient.name, age: x.patient.age })}
              </h3>
              <span className={cls.visit}>{s('homeFromGp')}</span>
            </span>
          </div>
          <p className={cls.text}>{answered ? s('listAnsweredText', { date: formatDayMonth(answered.date, lang) }) : t(x.dps!.briefing.rows[0].value)}</p>
          {!done && (
            <div className={cls.chips}>
              {q.chips.map((ch) => (
                <StatusChip key={t(ch.label)} isNew={ch.isNew}>
                  {t(ch.label)}
                </StatusChip>
              ))}
              <span className={cls.date}>
                {answered ? s('listAssessed', { date: formatDayMonth(answered.date, lang) }) : s('deadline', { date: formatDayMonth(q.deadline, lang) })}
              </span>
            </div>
          )}
          <div className={cls.foot}>
            <CaseFoot caseId={c} nameId={nameId} />
          </div>
        </article>
      </li>
    );
  });
  // The referrals are a list of their own; «Frister» sits in the same grid as its own part, never a fourth referral.
  return (
    <>
      <SrOnly as="h2">{s('listReferralsLabel')}</SrOnly>
      <div className={mergeClasses(cls.grid, cls.gridDps)}>
        <ul className={cls.contents} role="list" aria-label={s('listReferralsLabel')}>
          {items}
        </ul>
        <div className={cls.item}>
          <Deadlines framed />
        </div>
      </div>
    </>
  );
}
