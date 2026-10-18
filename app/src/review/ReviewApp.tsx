import {
  Button,
  Link,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Switch,
  ToggleButton,
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import {
  ArrowCounterclockwise20Regular,
  ArrowSwap20Regular,
  ArrowDownload16Regular,
  BookOpen20Regular,
  ChatMultiple20Filled,
  ChatMultiple20Regular,
  CheckmarkCircle16Regular,
  CommentEdit20Regular,
  DataPie20Filled,
  DataPie20Regular,
  DesignIdeas20Regular,
  Info20Regular,
  Map20Filled,
  Map20Regular,
  CalendarLtr20Filled,
  CalendarLtr20Regular,
  DocumentText20Filled,
  DocumentText20Regular,
  PeopleCommunity20Filled,
  PeopleCommunity20Regular,
  QuestionCircle20Regular,
  PersonFeedback20Filled,
  PersonFeedback20Regular,
} from '@fluentui/react-icons';
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CaseId, Role } from '../content/types';
import { cases, pattern, v5 } from '../content';
import { useLang } from '../i18n/i18n';
import { getConfig } from '../engine/forms';
import { Redirect, RouterLink, navigate, useRoute } from '../router/router';
import { ReviewProvider, useReview } from '../state/review';
import type { ReviewerRole } from '../state/types';
import { ReviewWorkProvider, useWork } from '../state/work';
import { ChoiceGroup } from '../patterns/ChoiceGroup';
import { StartButton, useSelectedToggle } from '../patterns/basics';
import { Actions, Body, IntroPage, Muted, PageCard } from '../patterns/layout';
import { NoticeBar, useNotice } from '../patterns/notice';
import { Silent, focusAfterOverlay } from '../patterns/announce';
import { AppShell, type NavItem } from '../shell/AppShell';
import { ConfirmDialog, GlossaryBody, HelpMenu, LanguageToggle, Paragraphs, Wordmark, type HelpItem } from '../shell/HeaderParts';
import { PageHeading } from '../shell/PageHeading';
import { CaseRoute } from '../case/CaseRoutes';
import { goToOtherSide, otherSidePath } from '../case/CaseChrome';
import { ListPage } from '../case/lists';
import { NotesDrawer, NotesPill, NotesProvider } from '../patterns/notes';
import { caseStatus } from '../engine/flow';
import { PatternView } from '../overview/PatternView';
import { SharedView, type ThreadLink } from '../overview/SharedView';
import { V5View } from '../overview/V5View';
import { TourView, type TourPosition } from '../tour/Tour';
import { FormHostProvider, useFormHost } from '../study/formHost';
import { FormPanel, formTitle, type FormPanelActions } from '../study/FormPanel';
import { downloadPreviewCsv } from '../study/PreviewForm';
import { OVERVIEW_SCREENS, REVIEW_CASES, VIEW_SECTIONS, partOf, pathOfSide, screenOf, sectionsFor, sideLabel, sideOf } from './sections';

const useStyles = makeStyles({
  roleSwitch: { display: 'inline-flex', gap: '2px', '@media only screen and (max-width: 639px)': { display: 'none' } },
  tab: {
    position: 'fixed',
    // Beside an inline form panel, not under it: the variable is the inline panel's width, else 0 (r5A-01).
    // The page column keeps room for both (AppShell's mainCol padding).
    right: 'var(--atlas-form-inline, 0px)',
    // Centred in the height below the header, so the label has the window and stays on one line at 400 % (r6A-05),
    // and the tab never covers «Hjelp» at the top of the page (r7A-07).
    top: 'var(--atlas-header-full-h, 48px)',
    bottom: 0,
    marginBlock: 'auto',
    height: 'fit-content',
    zIndex: 880,
    // Meridian's launcher: the icon upright on top, the label read from the bottom up.
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalS,
    width: '36px',
    minWidth: '36px',
    borderRadius: `${tokens.borderRadiusLarge} 0 0 ${tokens.borderRadiusLarge}`,
    paddingBlock: tokens.spacingVerticalM,
    paddingInline: 0,
    boxShadow: tokens.shadow8,
    '@media print': { display: 'none' },
    // Below 300 px of height (400 % zoom) the tab does without its icon and most of its padding, so the whole label fits
    // below the header, also with text spacing (r8A-03).
    '@media (min-height: 220px) and (max-height: 300px)': { paddingBlock: tokens.spacingVerticalXXS, '& .fui-Button__icon': { display: 'none' } },
    // Below 220 px of height (400 % on a 768 or 720 px high screen) the label cannot fit under the header: the tab shows its
    // icon only, and the label stays its name (r9A-07).
    '@media (max-height: 219px)': { paddingBlock: tokens.spacingVerticalS },
  },
  tabLabel: {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    whiteSpace: 'nowrap',
    fontWeight: tokens.fontWeightSemibold,
    '@media (max-height: 300px)': { fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200 },
    '@media (max-height: 219px)': { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)' },
  },
  openNow: { ...typographyStyles.caption1Strong, color: tokens.colorBrandForeground1, marginInlineStart: tokens.spacingHorizontalS, whiteSpace: 'nowrap' },
  // The list scrolls inside its own box, sized to the window: Fluent clears the surface's max-height while it
  // repositions, which would throw a scrolled surface back to its top on every role change (r4A-03).
  pop: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxWidth: '320px',
    maxHeight: 'calc(100dvh - 56px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    // Room for the focus rings of the radios and buttons inside the scrolling box.
    padding: '2px',
  },
  // Fluent's autoSize sets overflow-x inline; the surface holds nothing wider than itself but the arrow, so it never scrolls
  // sideways (r9A-05).
  popSurface: { overflowY: 'auto', overflowX: 'hidden !important' as 'hidden', boxSizing: 'border-box' },
  popTitle: { ...typographyStyles.body1Strong, margin: 0 },
  secList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  overview: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  overviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
  },
  given: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  overviewWhat: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  code: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200, color: tokens.colorNeutralForeground3, overflowWrap: 'anywhere' },
  h3: { ...typographyStyles.subtitle2, margin: 0, marginBlockStart: tokens.spacingVerticalS },
  lookList: { margin: 0, paddingInlineStart: tokens.spacingHorizontalXL, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, ...typographyStyles.body1 },
  overviewSection: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  screens: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  screenRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXXS,
    paddingBlock: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
  },
  screenName: { flexBasis: '180px', flexGrow: 1, minWidth: 0 },
  caseLinks: { display: 'flex', flexWrap: 'wrap', gap: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalM}` },
  caseLink: { color: tokens.colorBrandForegroundLink, whiteSpace: 'nowrap', ':hover': { color: tokens.colorBrandForegroundLinkHover } },
  partsCount: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
});

const REVIEWER_ROLES: { value: ReviewerRole; key: 'reviewerFastlege' | 'reviewerDps' | 'reviewerVeileder' | 'reviewerEkstern' }[] = [
  { value: 'Fastlege', key: 'reviewerFastlege' },
  { value: 'DPS-kliniker', key: 'reviewerDps' },
  { value: 'Veileder', key: 'reviewerVeileder' },
  { value: 'Ekstern fagperson', key: 'reviewerEkstern' },
];

/** Review mode: free roaming, both roles, design notes, per-section feedback. */
export function ReviewApp() {
  return (
    <ReviewProvider>
      <FormHostProvider>
        <ReviewShell />
      </FormHostProvider>
    </ReviewProvider>
  );
}

function roleSeg(role: Role): 'fastlege' | 'dps' {
  return role === 'gp' ? 'fastlege' : 'dps';
}

/** The same place on the other side, for the role switch. */
function counterpart(path: string[], to: Role): string {
  const [, role, a, caseId, view] = path;
  const from: Role = role === 'dps' ? 'dps' : 'gp';
  if (a === 'sak' && caseId && caseId in cases) {
    const other = otherSidePath(caseId as CaseId, from, view);
    if (other && from !== to) return other;
  }
  if (a === 'delt' || a === 'omvisning' || a === 'to-fastleger') return `/gjennomgang/${roleSeg(to)}/${a}`;
  return to === 'gp' ? '/gjennomgang/fastlege/timeliste' : '/gjennomgang/dps/mottatte';
}

function ReviewShell() {
  const cls = useStyles();
  const sel = useSelectedToggle();
  const { s, t } = useLang();
  const review = useReview();
  const host = useFormHost();
  const { notice, show: showNotice, clear: clearNotice, bind: bindNotice } = useNotice();
  const route = useRoute();
  const [confirmRestart, setConfirmRestart] = useState(false);
  const restartBtn = useRef<HTMLButtonElement>(null);
  const path = route.path;
  const here = `/${path.join('/')}`;
  const hereRef = useRef(here);
  hereRef.current = here;
  const seg = path[1];
  const viewer: Role | null = seg === 'fastlege' ? 'gp' : seg === 'dps' ? 'dps' : null;

  useEffect(() => {
    if (viewer && viewer !== review.state.view) review.setView(viewer);
  }, [viewer, review]);

  // Feedback forms: mark the part as given when the form is sent.
  useEffect(
    () =>
      host.register({
        onSent: (form) => {
          if (!form.review) return;
          if (form.formKey === 'R2') review.markWrapUp();
          else review.markFeedback(`${form.locked.side}#${form.locked.seksjon}`);
          host.close();
          // Confirmed on the page the feedback was about (no toast, G-15).
          if (form.formKey !== 'R2') showNotice('feedbackThanks', hereRef.current);
        },
      }),
    [host, review, showNotice, s],
  );

  const current = viewer ?? review.state.view;
  const base = `/gjennomgang/${roleSeg(current)}`;
  const nav: NavItem[] =
    current === 'gp'
      ? [
          // G-22: `calendar_ltr` is the Timeliste, `document_text` the referrals.
          { key: 'liste', label: s('navTimeliste'), to: `${base}/timeliste`, icon: <CalendarLtr20Regular />, iconActive: <CalendarLtr20Filled />, match: [`${base}/timeliste`, `${base}/sak`] },
          { key: 'monster', label: s('navPattern'), to: `${base}/monster`, icon: <DataPie20Regular />, iconActive: <DataPie20Filled />, match: [`${base}/monster`] },
          { key: 'delt', label: s('navShared'), to: `${base}/delt`, icon: <PeopleCommunity20Regular />, iconActive: <PeopleCommunity20Filled />, match: [`${base}/delt`] },
          { key: 'omvisning', label: s('reviewTour'), to: `${base}/omvisning`, icon: <Map20Regular />, iconActive: <Map20Filled />, match: [`${base}/omvisning`] },
          { key: 'v5', label: s('reviewV5'), to: `${base}/to-fastleger`, icon: <ChatMultiple20Regular />, iconActive: <ChatMultiple20Filled />, match: [`${base}/to-fastleger`] },
          { key: 'feedback', label: s('feedbackOverview'), to: '/gjennomgang/tilbakemeldinger', icon: <PersonFeedback20Regular />, iconActive: <PersonFeedback20Filled />, match: ['/gjennomgang/tilbakemeldinger'] },
        ]
      : [
          { key: 'liste', label: s('navQueue'), to: `${base}/mottatte`, icon: <DocumentText20Regular />, iconActive: <DocumentText20Filled />, match: [`${base}/mottatte`, `${base}/sak`] },
          { key: 'delt', label: s('navShared'), to: `${base}/delt`, icon: <PeopleCommunity20Regular />, iconActive: <PeopleCommunity20Filled />, match: [`${base}/delt`] },
          { key: 'omvisning', label: s('reviewTour'), to: `${base}/omvisning`, icon: <Map20Regular />, iconActive: <Map20Filled />, match: [`${base}/omvisning`] },
          { key: 'v5', label: s('reviewV5'), to: `${base}/to-fastleger`, icon: <ChatMultiple20Regular />, iconActive: <ChatMultiple20Filled />, match: [`${base}/to-fastleger`] },
          { key: 'feedback', label: s('feedbackOverview'), to: '/gjennomgang/tilbakemeldinger', icon: <PersonFeedback20Regular />, iconActive: <PersonFeedback20Filled />, match: ['/gjennomgang/tilbakemeldinger'] },
        ];

  const help: HelpItem[] = [
    { key: 'tour', label: s('reviewTour'), icon: <Map20Regular />, onSelect: () => navigate(`${base}/omvisning`) },
    { key: 'how', label: s('helpHowItWorks'), icon: <QuestionCircle20Regular />, dialog: { title: s('helpHowItWorks'), body: <Paragraphs items={[s('reviewHow1'), s('reviewHow2'), s('reviewHow3'), s('reviewHow4'), s('reviewHow5')]} /> } },
    { key: 'glossary', label: s('helpGlossary'), icon: <BookOpen20Regular />, dialog: { title: s('helpGlossary'), body: <GlossaryBody /> } },
    { key: 'about', label: s('helpAboutPrototype'), icon: <Info20Regular />, dialog: { title: s('helpAboutPrototype'), body: <AboutReview /> } },
    { key: 'meridian', label: s('helpMeridian'), icon: <DesignIdeas20Regular />, href: './meridian/' },
  ];

  const form = host.form;
  const actions: FormPanelActions | null = useMemo(() => {
    if (!form) return null;
    // R1's heading names the part it is about, so a switch of parts is heard in the heading itself (r7A-05).
    const part = form.formKey === 'R1' && form.locked.side ? partOf(form.locked.side, form.locked.seksjon) : undefined;
    return {
      title: `${s('formPanel')}: ${formTitle(form.formKey, form.formKey, t)}${part ? ` · ${s(part.label)}` : ''}`,
      onConfirmSent: () => {
        if (form.formKey === 'R2') review.markWrapUp();
        else review.markFeedback(`${form.locked.side}#${form.locked.seksjon}`);
        host.close();
        if (form.formKey !== 'R2') showNotice('feedbackThanks', hereRef.current);
      },
      onSkip: () => host.close(),
    };
  }, [form, host, review, s, t, showNotice]);

  return (
    <NotesProvider on={review.state.notes}>
      <AppShell
        headerStart={
          <>
            <Wordmark to="/gjennomgang" extra={s('reviewModeLabel')} />
            <div className={cls.roleSwitch} role="group" aria-label={s('roleSwitch')}>
              <ToggleButton size="small" appearance="subtle" className={mergeClasses(current === 'gp' && sel.on)} checked={current === 'gp'} onClick={() => (current === 'gp' ? navigate(counterpart(path, 'gp')) : goToOtherSide(counterpart(path, 'gp')))}>
                {s('roleGp')}
              </ToggleButton>
              <ToggleButton size="small" appearance="subtle" className={mergeClasses(current === 'dps' && sel.on)} checked={current === 'dps'} onClick={() => (current === 'dps' ? navigate(counterpart(path, 'dps')) : goToOtherSide(counterpart(path, 'dps')))}>
                {s('roleDps')}
              </ToggleButton>
            </div>
          </>
        }
        headerEnd={
          <>
            <NotesPill place="header" onToggle={(on) => review.setNotes(on)} />
            <HelpMenu items={help} />
            <LanguageToggle />
            <Button
              ref={restartBtn}
              appearance="subtle"
              icon={<ArrowCounterclockwise20Regular />}
              aria-label={s('restart')}
              title={s('restart')}
              onClick={() => setConfirmRestart(true)}
            />
          </>
        }
        notice={<NoticeBar notice={notice} onDismiss={clearNotice} onBind={bindNotice} />}
        nav={nav}
        navExpandedDefault
        navEnd={(wide) => <NotesPill place="rail" wide={wide} onToggle={(on) => review.setNotes(on)} />}
        formPanel={<FormPanel actions={actions} />}
      >
        <ReviewRoutes path={path} />
      </AppShell>
      {/* Merknader's drawer: it slides in over the navigation column. */}
      <NotesDrawer
        onClose={() => {
          review.setNotes(false);
          // Back to whichever Merknader switch shows at this width.
          focusAfterOverlay(() => [...document.querySelectorAll<HTMLElement>('[data-notes-pill]')].find((el) => el.offsetParent !== null) ?? null);
        }}
      />
      <FeedbackTab path={path} />
      <ConfirmDialog
        open={confirmRestart}
        title={s('restartTitle')}
        body={s('restartBody')}
        confirmLabel={s('confirm')}
        onCancel={() => {
          setConfirmRestart(false);
          // Back to the button that opened the dialog (2.4.3, R2A-03).
          focusAfterOverlay(() => restartBtn.current);
        }}
        onConfirm={() => {
          setConfirmRestart(false);
          // An open feedback form stays, with what was typed in it: the restart is about the cases, not the feedback (r7A-06).
          review.restart();
          navigate('/gjennomgang');
          showNotice('restartDone', '/gjennomgang');
          // The landing's heading, once the dialog has gone (it held focus during the route change).
          focusAfterOverlay(() => document.querySelector<HTMLElement>('main h1'));
        }}
      />
    </NotesProvider>
  );
}

function openFeedback(host: ReturnType<typeof useFormHost>, reviewer: ReviewerRole, side: string, seksjon: string) {
  const address = getConfig().forms.R1;
  host.open({
    step: 'S1',
    formKey: 'R1',
    locked: { rolle: reviewer, side, seksjon, versjon: __ATLAS_VERSJON__ },
    route: address ? 'panel' : 'preview',
    review: true,
    force: true,
  });
}

function openWrapUp(host: ReturnType<typeof useFormHost>, reviewer: ReviewerRole) {
  const address = getConfig().forms.R2;
  host.open({
    step: 'S1',
    formKey: 'R2',
    locked: { rolle: reviewer, versjon: __ATLAS_VERSJON__ },
    route: address ? 'panel' : 'preview',
    review: true,
    force: true,
  });
}

function ReviewerPicker() {
  const { s } = useLang();
  const review = useReview();
  const locked = review.state.feedbackSent.length > 0 || review.state.wrapUpSent === true;
  return (
    <>
      <ChoiceGroup<ReviewerRole>
        legend={s('reviewYourRole')}
        layout="row"
        value={review.state.reviewer}
        disabled={locked}
        onChange={review.setReviewer}
        choices={REVIEWER_ROLES.map((r) => ({ value: r.value, label: s(r.key) }))}
      />
      {locked && <Muted>{s('reviewerLocked')}</Muted>}
    </>
  );
}

/**
 * Opening a review form replaces the one that is open, and what was typed in it is lost: choosing the open form's own
 * part shows it again with its answers, and another part or the wrap-up asks first (r6A-01).
 */
function useOpenReviewForm(back: () => HTMLElement | null) {
  const { s, t } = useLang();
  const host = useFormHost();
  const [pending, setPending] = useState<{ open: string; next: string; go: () => void } | null>(null);
  const open = host.form?.review ? host.form : undefined;
  const label = (formKey: string, side: string | undefined, seksjon: string | undefined, short: boolean): string => {
    // The form's own title, as the panel shows it (r7A-09).
    if (formKey === 'R2') return formTitle('R2', s('wrapUp'), t);
    const part = side ? partOf(side, seksjon) : undefined;
    const partLabel = part ? s(part.label) : (seksjon ?? '');
    return short || !side ? partLabel : `${sideLabel(side, s)} · ${partLabel}`;
  };
  const isOpen = (formKey: 'R1' | 'R2', side?: string, seksjon?: string) =>
    !!open && open.formKey === formKey && (formKey === 'R2' || (open.locked.side === side && open.locked.seksjon === seksjon));
  const request = (target: { formKey: 'R1' | 'R2'; side?: string; seksjon?: string }, go: () => void) => {
    if (isOpen(target.formKey, target.side, target.seksjon)) {
      const wasVisible = host.visible;
      host.show();
      // A hidden panel comes back at its place on its own; a shown one takes focus on its heading.
      if (wasVisible) focusAfterOverlay(() => document.querySelector<HTMLElement>('[data-form-panel] h2'));
      return;
    }
    if (!open) {
      go();
      return;
    }
    // Both on the same screen: the parts' names are enough; otherwise each says its screen.
    const short = open.formKey === 'R1' && target.formKey === 'R1' && open.locked.side === target.side;
    setPending({ open: label(open.formKey, open.locked.side, open.locked.seksjon, short), next: label(target.formKey, target.side, target.seksjon, short), go });
  };
  const dialog = (
    <ConfirmDialog
      open={!!pending}
      title={s('feedbackSwitchTitle')}
      body={s('feedbackSwitchBody', { open: pending?.open ?? '', next: pending?.next ?? '' })}
      confirmLabel={s('feedbackSwitchConfirm')}
      icon={<ArrowSwap20Regular />}
      onCancel={() => {
        setPending(null);
        // A narrow window shows the form over the page, and over the tab: focus goes to the form's heading, which can be
        // seen (r7A-12).
        focusAfterOverlay(() =>
          document.documentElement.hasAttribute('data-form-overlay') ? document.querySelector<HTMLElement>('[data-form-panel] h2') ?? back() : back(),
        );
      }}
      onConfirm={() => {
        const go = pending?.go;
        setPending(null);
        go?.();
      }}
    />
  );
  return { request, isOpen, dialog };
}

/** The right-edge «Gi tilbakemelding» tab: pick the part of this screen, then R1 opens in the panel. */
function FeedbackTab({ path }: { path: string[] }) {
  const cls = useStyles();
  const { s } = useLang();
  const review = useReview();
  const host = useFormHost();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  // The role is chosen first and confirmed with a button: an arrow key moves between radios without
  // committing a role (WCAG 3.2.2, R2A-07).
  const [pending, setPending] = useState<ReviewerRole | undefined>(undefined);
  const tabRef = useRef<HTMLButtonElement>(null);
  const forms = useOpenReviewForm(() => tabRef.current);
  const side = sideOf(path);
  // The tab sits on the right edge; the content keeps room for it. Set before the screens' own effects run, and kept
  // between screens, so a heading brought into view is measured in the column it will have (r9A-03).
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--atlas-edge-tab', side ? '36px' : '0px');
  }, [side]);
  useEffect(() => () => document.documentElement.style.setProperty('--atlas-edge-tab', '0px'), []);
  // Below 220 px of height the tab shows its icon only; a tooltip then names it on hover and focus (r10A-01, G-17).
  const [iconOnly, setIconOnly] = useState(() => window.matchMedia('(max-height: 219px)').matches);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-height: 219px)');
    const on = () => setIconOnly(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  if (!side) return null;
  const { key: screenKey, caseId: tabCase } = screenOf(side);
  const tabGp = tabCase ? review.gp(tabCase) : undefined;
  // The GP's referral screen shows the new referral after «Henvis på nytt» (as GpReferral decides, r9F-01).
  const second = screenKey === 'fastlege/henvisning' && !!tabGp && tabGp.referral === 'sent' && tabGp.planSaved === true && tabGp.plan === 'henvisPaNytt';
  const sections = sectionsFor(side, second);
  const reviewer = review.state.reviewer;
  return (
    <>
    {/* autoSize keeps the surface inside the window at 400 % zoom; it scrolls when it is taller (R3A-03). */}
    <Popover
      open={open}
      onOpenChange={(_, d) => setOpen(d.open)}
      positioning={{ position: 'before', autoSize: true, overflowBoundaryPadding: 8 }}
      withArrow
      trapFocus
    >
      <PopoverTrigger disableButtonEnhancement>
        <Tooltip content={s('feedback')} relationship="label" positioning="before" withArrow visible={iconOnly && tip && !open} onVisibleChange={(_, d) => setTip(d.visible)}>
          <Button ref={tabRef} className={cls.tab} appearance="primary" icon={<CommentEdit20Regular />} data-feedback-tab="">
            <span className={cls.tabLabel}>{s('feedback')}</span>
          </Button>
        </Tooltip>
      </PopoverTrigger>
      <PopoverSurface aria-labelledby={titleId} className={cls.popSurface}>
        <div className={cls.pop}>
          {!reviewer ? (
            <>
              <p className={cls.popTitle} id={titleId}>
                {s('feedbackRoleFirst')}
              </p>
              <ChoiceGroup<ReviewerRole>
                legend={s('reviewYourRole')}
                layout="column"
                value={pending}
                onChange={setPending}
                choices={REVIEWER_ROLES.map((r) => ({ value: r.value, label: s(r.key) }))}
              />
              <div>
                <Button
                  appearance="primary"
                  disabledFocusable={!pending}
                  onClick={() => {
                    if (!pending) return;
                    review.setReviewer(pending);
                    // The picker gives way to the list of parts: focus moves to its first part.
                    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-feedback-part]')?.focus());
                  }}
                >
                  {s('useThisRole')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className={cls.popTitle} id={titleId}>
                {s('feedbackPick')}
              </p>
              <ul className={cls.secList}>
                {sections.map((sec) => {
                  const given = review.state.feedbackSent.includes(`${side}#${sec.id}`);
                  const isOpen = forms.isOpen('R1', side, sec.id);
                  return (
                    <li key={sec.id}>
                      <Button
                        appearance="subtle"
                        data-feedback-part={sec.id}
                        icon={given ? <CheckmarkCircle16Regular /> : undefined}
                        style={{ justifyContent: 'flex-start', width: '100%', textAlign: 'start' }}
                        onClick={() => {
                          setOpen(false);
                          forms.request({ formKey: 'R1', side, seksjon: sec.id }, () => openFeedback(host, reviewer, side, sec.id));
                        }}
                      >
                        {s(sec.label)}
                        {/* The part whose form is open: choosing it shows that form again, with its answers (r6A-01). */}
                        {isOpen && <span className={cls.openNow}>{s('feedbackOpenNow')}</span>}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </PopoverSurface>
    </Popover>
    {forms.dialog}
    </>
  );
}

function Landing() {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <IntroPage>
      <PageHeading title={s('reviewTitle')}>
        {s('reviewTitle')}
      </PageHeading>
      <Body>{s('reviewIntro1')}</Body>
      <Body>{s('reviewIntro2')}</Body>
      <Body>{s('reviewIntro3')}</Body>
      <section aria-labelledby="look-for">
        <h2 id="look-for" className={cls.h2}>
          {s('reviewLookTitle')}
        </h2>
        <ul className={cls.lookList}>
          {(['reviewLook1', 'reviewLook2', 'reviewLook3', 'reviewLook4', 'reviewLook5'] as const).map((k) => (
            <li key={k}>{s(k)}</li>
          ))}
        </ul>
      </section>
      <ReviewerPicker />
      {/* Two equal choices: the same size and weight (Meridian). */}
      <Actions>
        <Button onClick={() => navigate('/gjennomgang/fastlege/timeliste')}>{s('reviewStartGp')}</Button>
        <Button onClick={() => navigate('/gjennomgang/dps/mottatte')}>{s('reviewStartDps')}</Button>
      </Actions>
      <div>
        <Link href="#/studie?forhandsvisning">{s('reviewTryStudy')}</Link>
        <Muted>{s('reviewTryStudyNote')}</Muted>
      </div>
      <div>
        <Link href="./meridian/" target="_blank" rel="noopener">
          {s('meridianLink')}
        </Link>
      </div>
    </IntroPage>
  );
}

/** «Om prototypen» in review mode: what it is, and what it deliberately does not do (SV-11). */
function AboutReview() {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <>
      <Paragraphs items={[s('helpAbout1'), s('helpAbout2'), s('helpAbout3'), s('helpAbout4')]} />
      <h3 className={cls.h3}>{s('helpAboutNotTitle')}</h3>
      <ul className={cls.lookList}>
        {(['helpAboutNot1', 'helpAboutNot2', 'helpAboutNot3', 'helpAboutNot4', 'helpAboutNot5', 'helpAboutNot6'] as const).map((k) => (
          <li key={k}>{s(k)}</li>
        ))}
      </ul>
    </>
  );
}

/** The screens of one role with the number of parts given feedback, per case (SV-09). */
function ScreenRows({ role }: { role: 'fastlege' | 'dps' }) {
  const cls = useStyles();
  const { s } = useLang();
  const review = useReview();
  const given = review.state.feedbackSent;
  const count = (side: string) => {
    const parts = sectionsFor(side);
    const n = parts.filter((p) => given.includes(`${side}#${p.id}`)).length;
    return { n, m: parts.length };
  };
  const plain = (view: string) => {
    const side = `${role}/${view}`;
    const { n, m } = count(side);
    const label = sideLabel(side, s);
    return (
      <li key={side} className={cls.screenRow}>
        <span className={cls.screenName}>{label.split(' · ').slice(1).join(' · ')}</span>
        <span className={cls.caseLinks}>
          <RouterLink to={pathOfSide(side)} className={cls.caseLink} aria-label={s('partsGivenLabel', { screen: label, n: String(n), m: String(m) })}>
            {s('openScreen')} <span className={cls.partsCount}>{s('partsGiven', { n: String(n), m: String(m) })}</span>
          </RouterLink>
        </span>
      </li>
    );
  };
  const screens = OVERVIEW_SCREENS[role];
  return (
    <ul className={cls.screens}>
      {screens.before.map(plain)}
      {screens.caseViews.map((view) => {
        const key = `${role}/${view}`;
        const screen = sideLabel(key, s).split(' · ').slice(1).join(' · ');
        return (
          <li key={key} className={cls.screenRow}>
            <span className={cls.screenName}>{screen}</span>
            <span className={cls.caseLinks}>
              {REVIEW_CASES[role].map((caseId) => {
                const side = `${role}/${caseId}/${view}`;
                const { n, m } = count(side);
                return (
                  <RouterLink
                    key={caseId}
                    to={pathOfSide(side)}
                    className={cls.caseLink}
                    aria-label={s('partsGivenLabel', { screen: sideLabel(side, s), n: String(n), m: String(m) })}
                  >
                    {cases[caseId].patient.name.split(' ')[0]} <span className={cls.partsCount}>{s('partsGiven', { n: String(n), m: String(m) })}</span>
                  </RouterLink>
                );
              })}
            </span>
          </li>
        );
      })}
      {screens.after.map(plain)}
    </ul>
  );
}

function FeedbackOverview() {
  const cls = useStyles();
  const { s } = useLang();
  const review = useReview();
  const host = useFormHost();
  const reviewer = review.state.reviewer;
  const forms = getConfig().forms;
  const preview = !forms.R1 || !forms.R2;
  const wrapUpBtn = useRef<HTMLButtonElement>(null);
  const reviewForms = useOpenReviewForm(() => wrapUpBtn.current);
  const given = review.state.feedbackSent;
  return (
    <PageCard narrow>
      <PageHeading title={s('feedbackOverview')}>{s('feedbackOverview')}</PageHeading>
      <Body>{s('feedbackOverviewIntro')}</Body>
      {preview && (
        <Silent>
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody>{s('reviewPreviewNote')}</MessageBarBody>
            <MessageBarActions>
              <Button size="small" icon={<ArrowDownload16Regular />} onClick={() => downloadPreviewCsv('atlas-gjennomgang.csv')}>
                {s('exportCsv')}
              </Button>
            </MessageBarActions>
          </MessageBar>
        </Silent>
      )}
      <ReviewerPicker />
      <Actions>
        <Button
          ref={wrapUpBtn}
          appearance="primary"
          disabledFocusable={!reviewer}
          onClick={() => reviewer && reviewForms.request({ formKey: 'R2' }, () => openWrapUp(host, reviewer))}
        >
          {s('wrapUpButton')}
        </Button>
      </Actions>
      {reviewForms.dialog}
      {review.state.wrapUpSent && (
        <MessageBar intent="success" politeness="polite">
          <MessageBarBody>{s('wrapUpDone')}</MessageBarBody>
        </MessageBar>
      )}
      <section aria-labelledby="parts-given" className={cls.overviewSection}>
        <h2 id="parts-given" className={cls.h2}>
          {s('feedbackPartsTitle')}
        </h2>
        {given.length === 0 ? (
          <Muted>{s('feedbackNoneYet')}</Muted>
        ) : (
          <ul className={cls.overview}>
            {given.map((id) => {
              const [side, sec] = id.split('#');
              const part = (VIEW_SECTIONS[screenOf(side).key] ?? []).find((x) => x.id === sec);
              return (
                <li key={id} className={cls.overviewRow}>
                  <span className={cls.overviewWhat}>
                    <span>
                      {sideLabel(side, s)}
                      {part ? ` · ${s(part.label)}` : ''}
                    </span>
                    {/* The value the form receives as `side#seksjon`; a code, so it keeps its Norwegian form. */}
                    <code className={cls.code} lang="nb">
                      {id}
                    </code>
                  </span>
                  <span className={cls.given}>
                    <CheckmarkCircle16Regular aria-hidden="true" />
                    {s('feedbackGiven')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby="screens" className={cls.overviewSection}>
        <h2 id="screens" className={cls.h2}>
          {s('feedbackScreensTitle')}
        </h2>
        <Muted>{s('feedbackScreensIntro')}</Muted>
        <h3 className={cls.h3}>{s('roleGp')}</h3>
        <ScreenRows role="fastlege" />
        <h3 className={cls.h3}>{s('roleDps')}</h3>
        <ScreenRows role="dps" />
      </section>
    </PageCard>
  );
}

function NoDataToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const { s } = useLang();
  // A switch keeps one label; its state says whether it is on (Fluent switch guidance, MF-15).
  return (
    <div>
      <Switch label={s('showNoData')} checked={on} onChange={(_, d) => onChange(d.checked)} />
    </div>
  );
}

function PatternPage() {
  const { s } = useLang();
  const review = useReview();
  const work = useWork();
  return (
    <PageCard>
      <PageHeading title={s('patternTitle')}>{s('patternTitle')}</PageHeading>
      <NoDataToggle on={review.state.noData.pattern} onChange={(v) => review.setNoData({ pattern: v })} />
      <PatternView data={pattern} noData={review.state.noData.pattern} session notes={work.notes} />
    </PageCard>
  );
}

function useThreads(): ThreadLink[] {
  const work = useWork();
  const { t } = useLang();
  const ids: CaseId[] = ['kari', 'erlend', 'astrid'];
  return ids
    .map((caseId) => {
      const st = caseStatus({
        caseId,
        content: cases[caseId],
        viewer: work.viewer,
        mode: work.mode,
        gp: work.gp(caseId),
        dps: work.dps(caseId),
        gpPlayed: work.played('gp', caseId),
        dpsPlayed: work.played('dps', caseId),
        held: work.held(caseId),
        phase: work.phase(caseId),
        withoutAtlas: work.withoutAtlas(caseId),
      });
      const said = st.thread.messages.filter((m) => m.outcome !== 'skip' && m.outcome !== 'newReferral');
      if (said.length === 0) return null;
      const last = said[said.length - 1];
      const text = typeof last.text === 'string' ? last.text : t(last.text);
      return { caseId, to: work.casePath(caseId, 'dialog'), status: text.length > 60 ? `${text.slice(0, 57)}…` : text || last.date };
    })
    .filter((x): x is ThreadLink => !!x);
}

function SharedPage() {
  const { s } = useLang();
  const review = useReview();
  const work = useWork();
  const threads = useThreads();
  return (
    <PageCard>
      <PageHeading title={s('sharedTitle')}>{s('sharedTitle')}</PageHeading>
      <NoDataToggle on={review.state.noData.kalibrering} onChange={(v) => review.setNoData({ kalibrering: v })} />
      <SharedView noData={review.state.noData.kalibrering} threads={threads} notes={work.notes} />
    </PageCard>
  );
}

function ReviewTourPage({ role }: { role: Role }) {
  const { s } = useLang();
  const review = useReview();
  const [pos, setPos] = useState<TourPosition | 'end'>({ part: 0, step: 0 });
  return (
    <TourView
      key={role}
      role={role}
      pos={pos}
      onPos={setPos}
      showReasons={review.state.notes}
      notes={review.state.notes}
      ending={
        <Actions>
          <StartButton onClick={() => navigate(role === 'gp' ? '/gjennomgang/fastlege/timeliste' : '/gjennomgang/dps/mottatte')}>{s('reviewBack')}</StartButton>
        </Actions>
      }
    />
  );
}

function V5ReviewPage() {
  const { t } = useLang();
  const review = useReview();
  return (
    <PageCard>
      <PageHeading title={t(v5.title)}>{t(v5.title)}</PageHeading>
      <V5View showPurpose={review.state.notes} />
    </PageCard>
  );
}

function RoleRoutes({ role, path }: { role: Role; path: string[] }) {
  const [, , a, b, c] = path;
  const all: CaseId[] = role === 'gp' ? ['kari', 'erlend', 'astrid', 'torbjorn'] : ['kari', 'erlend', 'astrid'];
  const list = role === 'gp' ? 'timeliste' : 'mottatte';
  switch (a) {
    case 'timeliste':
    case 'mottatte':
      if (a !== list) return <Redirect to={`/gjennomgang/${roleSeg(role)}/${list}`} />;
      return <ListPage caseIds={all} openable={() => true} />;
    case 'sak':
      return <CaseRoute caseId={b} view={c} />;
    case 'monster':
      return role === 'gp' ? <PatternPage /> : <Redirect to="/gjennomgang/dps/mottatte" />;
    case 'delt':
      return <SharedPage />;
    case 'omvisning':
      // Keyed by role: each side's tour starts at its own first step (SV-19).
      return <ReviewTourPage key={role} role={role} />;
    case 'to-fastleger':
      return <V5ReviewPage />;
    default:
      return <Redirect to={`/gjennomgang/${roleSeg(role)}/${list}`} />;
  }
}

function ReviewRoutes({ path }: { path: string[] }) {
  const seg = path[1];
  if (!seg) return <Landing />;
  if (seg === 'tilbakemeldinger') return <FeedbackOverview />;
  if (seg === 'fastlege' || seg === 'dps') {
    const role: Role = seg === 'fastlege' ? 'gp' : 'dps';
    return (
      <ReviewWorkProvider viewer={role}>
        <RoleRoutes role={role} path={path} />
      </ReviewWorkProvider>
    );
  }
  return <Redirect to="/gjennomgang" />;
}

