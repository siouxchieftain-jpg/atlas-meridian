import {
  Button,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
  useRestoreFocusTarget,
} from '@fluentui/react-components';
import { Checkmark12Filled, ChevronDown16Regular, Dismiss20Regular, People16Regular, Stethoscope20Regular, TaskListLtr20Regular } from '@fluentui/react-icons';
import { useId, useState } from 'react';
import { StudyMap } from './pages';
import { useLang } from '../i18n/i18n';
import { useStudy } from '../state/study';
import { SrOnly, StudyNameMark } from '../patterns/basics';
import { casesDone, partOf, partTwoLabel, type StudyPart } from './parts';

const useStyles = makeStyles({
  role: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
    whiteSpace: 'nowrap',
    '@media only screen and (max-width: 639px)': { display: 'none' },
  },
  roleIcon: { display: 'inline-flex', color: tokens.colorNeutralForeground2 },
  // The part pills are one button since 3.8: it opens the study map as a panel over the page (Jishnu, 24 November).
  mapButton: { minHeight: '36px', paddingInline: '6px', columnGap: '6px', fontWeight: 'inherit', borderRadius: tokens.borderRadiusXLarge },
  chev: { display: 'inline-flex', color: tokens.colorNeutralForeground2 },
  // Under 640 px there is room for neither the pills nor the line: the map's icon says where the button leads.
  narrowIcon: { display: 'inline-flex', color: tokens.colorNeutralForeground2, '@media only screen and (min-width: 640px)': { display: 'none' } },
  mapLead: { ...typographyStyles.body1, margin: 0, marginBottom: tokens.spacingVerticalL, color: tokens.colorNeutralForeground2 },
  // The three parts of the study as quiet pills, the current one outlined (board 8b).
  pills: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'none',
    alignItems: 'center',
    gap: '6px',
    '@media only screen and (min-width: 1180px)': { display: 'flex' },
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minHeight: '28px',
    paddingInlineStart: '6px',
    paddingInlineEnd: '12px',
    borderRadius: tokens.borderRadiusCircular,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  pillNow: {
    ...typographyStyles.caption1Strong,
    color: tokens.colorBrandForeground1,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
    '@media (forced-colors: active)': { border: '2px solid Highlight' },
  },
  num: {
    width: '18px',
    height: '18px',
    borderRadius: tokens.borderRadiusCircular,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...typographyStyles.caption2Strong,
    color: tokens.colorNeutralForeground2,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    boxSizing: 'border-box',
  },
  numNow: { border: 'none', backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand },
  numDone: { border: `1px solid ${tokens.colorNeutralStroke1}`, color: tokens.colorNeutralForeground1 },
  sep: { width: '14px', height: '1px', backgroundColor: tokens.colorNeutralStroke1, flexShrink: 0 },
  // The study name as the participant's account, at the end of the header as in Microsoft 365 (ATLAS 3.3).
  account: { minWidth: '32px', width: '32px', height: '32px', padding: 0, marginInlineStart: tokens.spacingHorizontalXS },
  accountPop: { maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  accountHead: { display: 'flex', alignItems: 'center', gap: '12px' },
  accountWho: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  accountLabel: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  accountName: { ...typographyStyles.subtitle2, margin: 0, overflowWrap: 'anywhere' },
  accountText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground1 },
  accountRole: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  // Between 640 and 1180 px there is no room for the pills: one line says where the participant is.
  compact: {
    display: 'none',
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
    whiteSpace: 'nowrap',
    '@media only screen and (min-width: 640px) and (max-width: 1179px)': { display: 'inline' },
  },
});

/** The role beside the wordmark, with its icon (G-22: `stethoscope` the GP, `people` DPS). */
export function RoleLabel() {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  if (!study.role) return null;
  return (
    <span className={cls.role}>
      <span className={cls.roleIcon} aria-hidden="true">
        {study.role === 'gp' ? <Stethoscope20Regular fontSize={16} /> : <People16Regular />}
      </span>
      {study.role === 'gp' ? s('roleGp') : s('roleDps')}
    </span>
  );
}

/** «Bli kjent» · «Tre pasienter · 1 av 3 ferdig» · «Avslutning»: where the participant is, in three parts. */
export function StudyProgress({ here }: { here?: string }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const st = study.state;
  const role = study.role ?? 'gp';
  const now = partOf(st.furthest);
  const done = casesDone(st);
  const label = (p: StudyPart): string => {
    if (p === 1) return s('partIntro');
    if (p === 3) return s('partEnd');
    const base = s(partTwoLabel(role));
    return now === 2 && done > 0 ? `${base} · ${s('partCasesDone', { n: done })}` : base;
  };
  const parts: StudyPart[] = [1, 2, 3];
  const [open, setOpen] = useState(false);
  // Closing the panel (X, Escape, «Fortsett») puts focus back on this button (2.4.3).
  const restoreFocus = useRestoreFocusTarget();
  return (
    <>
      <Button
        appearance="subtle"
        className={cls.mapButton}
        aria-label={`${s('mapOpen')}: ${s('partCompact', { n: now, title: label(now) })}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        data-study-map-open=""
        {...restoreFocus}
      >
      <span className={cls.narrowIcon} aria-hidden="true">
        <TaskListLtr20Regular />
      </span>
      <ol className={cls.pills} aria-hidden="true" data-study-progress="">
        {parts.map((p) => {
          const isNow = p === now;
          const isDone = p < now;
          return (
            <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-current={isNow ? 'step' : undefined}>
              {p > 1 && <span className={cls.sep} aria-hidden="true" />}
              <span className={mergeClasses(cls.pill, isNow && cls.pillNow)}>
                <span className={mergeClasses(cls.num, isNow && cls.numNow, isDone && cls.numDone)} aria-hidden="true">
                  {isDone ? <Checkmark12Filled /> : p}
                </span>
                {label(p)}
                {isDone && <SrOnly>{`, ${s('stepStatusDone').toLowerCase()}`}</SrOnly>}
              </span>
            </li>
          );
        })}
      </ol>
      <span className={cls.compact} aria-hidden="true">
        {s('partCompact', { n: now, title: label(now) })}
      </span>
      <span className={cls.chev} aria-hidden="true">
        <ChevronDown16Regular />
      </span>
      </Button>
      <OverlayDrawer
        open={open}
        onOpenChange={(_, d) => setOpen(d.open)}
        position="end"
        modalType="modal"
        style={{ width: 'min(400px, 100vw)' }}
        aria-label={s('stepperTitle')}
        data-study-map=""
      >
        <DrawerHeader>
          <DrawerHeaderTitle action={<Button appearance="subtle" aria-label={s('mapClose')} icon={<Dismiss20Regular />} onClick={() => setOpen(false)} />}>
            {s('stepperTitle')}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          <p className={cls.mapLead}>{s('mapLead')}</p>
          <div style={{ paddingBottom: 24 }}>
            <StudyMap inPanel here={here} onGo={() => setOpen(false)} />
          </div>
        </DrawerBody>
      </OverlayDrawer>
    </>
  );
}

/**
 * The study name as the participant's account, at the end of the header, as an account picture is in Microsoft 365:
 * the name's mark opens a card with the name, the role and what the name is for. It is there once ATLAS has made the
 * name (the role is chosen), and never names a person.
 */
export function StudyAccount() {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const titleId = useId();
  const name = study.state.studienavn;
  if (!name || !study.role) return null;
  return (
    <Popover withArrow positioning="below-end" trapFocus>
      <PopoverTrigger disableButtonEnhancement>
        <Button appearance="subtle" shape="circular" className={cls.account} aria-label={s('accountLabel', { name })} data-study-account="">
          <StudyNameMark name={name} size={28} />
        </Button>
      </PopoverTrigger>
      <PopoverSurface aria-labelledby={titleId} tabIndex={-1}>
        <div className={cls.accountPop}>
          <div className={cls.accountHead}>
            <StudyNameMark name={name} size={40} />
            <span className={cls.accountWho}>
              <span className={cls.accountLabel}>{s('omDegNameTitle')}</span>
              <p className={cls.accountName} id={titleId} lang="nb">
                {name}
              </p>
            </span>
          </div>
          <p className={cls.accountRole}>{s(study.role === 'gp' ? 'omDegAsGp' : 'omDegAsDps')}</p>
          <p className={cls.accountText}>{s('omDegNameLead')}</p>
        </div>
      </PopoverSurface>
    </Popover>
  );
}
