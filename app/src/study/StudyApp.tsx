import { Button, MessageBar, MessageBarActions, MessageBarBody, makeStyles, tokens } from '@fluentui/react-components';
import {
  ArrowDownload16Regular,
  BookOpen20Regular,
  Dismiss16Regular,
  Info20Regular,
  ArrowCounterclockwise20Regular,
  Map20Regular,
  CalendarLtr20Filled,
  CalendarLtr20Regular,
  DocumentText20Filled,
  DocumentText20Regular,
  QuestionCircle20Regular,
  TaskListLtr20Filled,
  TaskListLtr20Regular,
} from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import type { CaseId, CoreCaseId } from '../content/types';
import { useLang } from '../i18n/i18n';
import { previewFlag, setPreviewFlag } from '../engine/forms';
import { Redirect, navigate, useRoute } from '../router/router';
import { removeKey } from '../state/persist';
import { KEEP_KEY, PENDING_KEY, SENDT_KEY, STUDY_KEY, StudyProvider, stepIndex, useStudy } from '../state/study';
import { CASE_FORM, STEP_ORDER } from '../state/types';
import { StudyWorkProvider } from '../state/work';
import { NoticeBar, useNotice } from '../patterns/notice';
import { Silent, focusAfterOverlay } from '../patterns/announce';
import { AppShell, type NavItem } from '../shell/AppShell';
import { ConfirmDialog, GlossaryBody, HelpMenu, LanguageToggle, Paragraphs, StepBadge, Wordmark, type HelpItem } from '../shell/HeaderParts';
import { CaseRoute, isCaseId } from '../case/CaseRoutes';
import { ListPage } from '../case/lists';
import { TourView, type TourPosition } from '../tour/Tour';
import { tour } from '../content';
import { downloadPreviewCsv } from './PreviewForm';
import { FormHostProvider, useFormHost } from './formHost';
import { FormPanel, formTitle, type FormPanelActions } from './FormPanel';
import { STEP_PATH, StudyControllerProvider, stepReachable, useStudyController } from './controller';
import { AvslutningPage, EkstraPage, HelhetPage, OmDegPage, StepperPage, TakkPage, V5Page, VelkommenPage } from './pages';
import { SheenButton } from '../patterns/basics';
import { Actions, Muted } from '../patterns/layout';

const useStyles = makeStyles({
  banner: { paddingInline: tokens.spacingHorizontalS, paddingBlockEnd: tokens.spacingVerticalXS },
  // A label that does not fit wraps inside its button at 400 % with text spacing (r8A-06).
  bannerBtn: {
    minWidth: 0,
    maxWidth: '100%',
    height: 'auto',
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
    textAlign: 'start',
    '@media (max-width: 399px)': { width: '100%', justifyContent: 'flex-start' },
  },
  bannerActions: {
    '@media (max-width: 399px)': { display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%', boxSizing: 'border-box', rowGap: tokens.spacingVerticalS },
  },
});

/** Study mode: the participant's flow, with forms in the panel or a new tab. */
export function StudyApp() {
  return (
    <StudyProvider>
      <FormHostProvider>
        <StudyControllerProvider>
          <StudyShell />
        </StudyControllerProvider>
      </FormHostProvider>
    </StudyProvider>
  );
}

function PreviewBanner() {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  // A standing banner, not a status: silent, so it is not read out on every page load (R2A-08).
  return (
    <div className={cls.banner}>
      <Silent>
      <MessageBar intent="warning" layout="multiline">
        <MessageBarBody>{s('previewBanner')}</MessageBarBody>
        <MessageBarActions className={cls.bannerActions}>
          <Button size="small" className={cls.bannerBtn} icon={<ArrowDownload16Regular />} onClick={() => downloadPreviewCsv()}>
            {s('exportCsv')}
          </Button>
          <Button
            size="small"
            className={cls.bannerBtn}
            icon={<Dismiss16Regular />}
            onClick={() => {
              setPreviewFlag(false);
              if (study.state.previewRun) {
                [STUDY_KEY, KEEP_KEY, PENDING_KEY, SENDT_KEY].forEach(removeKey);
              }
              window.location.hash = '#/gjennomgang';
              window.location.reload();
            }}
          >
            {s('endPreview')}
          </Button>
        </MessageBarActions>
      </MessageBar>
      </Silent>
    </div>
  );
}

function StudyShell() {
  const { s, t } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const host = useFormHost();
  const { notice, show: showNotice, clear: clearNotice, bind: bindNotice } = useNotice();
  const route = useRoute();
  const [confirmReset, setConfirmReset] = useState(false);
  const preview = previewFlag();
  const st = study.state;

  // Progress made under the preview flag is a trial run (it never blocks review mode).
  useEffect(() => {
    if (preview && !st.previewRun && (st.roleChoice || stepIndex(st.furthest) > 0)) study.setPreviewRun();
  }, [preview, st.previewRun, st.roleChoice, st.furthest, study]);

  const furthest = st.furthest;
  const stepNo = furthest === 'takk' ? undefined : stepIndex(furthest) + 1;
  const roleLabel = study.role === 'gp' ? s('roleGp') : study.role === 'dps' ? s('roleDps') : undefined;

  const nav: NavItem[] = [
    { key: 'steg', label: s('stepperTitle'), to: '/studie/steg', icon: <TaskListLtr20Regular />, iconActive: <TaskListLtr20Filled />, match: ['/studie/steg'] },
  ];
  if (study.role && stepIndex(furthest) >= stepIndex('kari')) {
    nav.push({
      key: 'liste',
      label: study.role === 'gp' ? s('navTimeliste') : s('navQueue'),
      to: '/studie/liste',
      // G-22: `calendar_ltr` is the Timeliste, `document_text` the referrals.
      icon: study.role === 'gp' ? <CalendarLtr20Regular /> : <DocumentText20Regular />,
      iconActive: study.role === 'gp' ? <CalendarLtr20Filled /> : <DocumentText20Filled />,
      match: ['/studie/liste', '/studie/sak'],
    });
  }

  const help: HelpItem[] = [];
  if (st.tour.done) help.push({ key: 'tour', label: s('helpTourAgain'), icon: <Map20Regular />, onSelect: () => navigate('/studie/omvisning?igjen') });
  help.push({ key: 'how', label: s('helpHowItWorks'), icon: <QuestionCircle20Regular />, dialog: { title: s('helpHowItWorks'), body: <Paragraphs items={[s('helpHow1'), s('helpHow2'), s('helpHow3'), s('helpHow4'), s('helpHow5')]} /> } });
  help.push({ key: 'glossary', label: s('helpGlossary'), icon: <BookOpen20Regular />, dialog: { title: s('helpGlossary'), body: <GlossaryBody /> } });
  help.push({ key: 'about', label: s('helpAboutPrototype'), icon: <Info20Regular />, dialog: { title: s('helpAboutPrototype'), body: <Paragraphs items={[s('helpAbout1'), s('helpAbout2'), s('helpAbout3'), s('helpAbout4')]} /> } });
  if (stepIndex(furthest) > 0) help.push({ key: 'reset', label: s('helpResetUnsent'), icon: <ArrowCounterclockwise20Regular />, onSelect: () => setConfirmReset(true) });

  const form = host.form;
  const actions: FormPanelActions | null = useMemo(() => {
    if (!form) return null;
    return {
      title: `${s('formPanel')}: ${formTitle(form.formKey, form.step, t)}`,
      onConfirmSent: () => ctl.confirmSent(form.step),
      onSkip: () => ctl.skipForm(form.step),
      onPage1: form.caseId ? () => ctl.confirmPage1(form.caseId!) : undefined,
      page1Confirmed: form.caseId ? st.page1[form.caseId] === true : undefined,
      onOpenTab: ctl.openTab,
      onShowAtlas: form.caseId ? () => ctl.work.showAtlas(form.caseId!) : undefined,
      canShowAtlas: form.caseId ? ctl.work.canShowAtlas(form.caseId) : undefined,
    };
  }, [form, ctl, st.page1, s, t]);

  return (
    <StudyWorkProvider actions={ctl.work}>
      <AppShell
        headerStart={<Wordmark to={ctl.currentPath()} extra={preview ? s('previewForm') : undefined} />}
        headerEnd={
          <>
            <StepBadge roleLabel={roleLabel} step={stepNo} />
            <HelpMenu items={help} />
            <LanguageToggle />
          </>
        }
        banner={preview ? <PreviewBanner /> : undefined}
        notice={<NoticeBar notice={notice} onDismiss={clearNotice} onBind={bindNotice} />}
        nav={nav}
        navExpandedDefault={false}
        formPanel={<FormPanel actions={actions} />}
      >
        <StudyRoutes path={route.path} igjen={route.query.has('igjen')} />
      </AppShell>
      <ConfirmDialog
        open={confirmReset}
        fromHelp
        title={s('resetUnsentTitle')}
        body={s('resetUnsentBody')}
        confirmLabel={s('confirm')}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          host.close();
          study.resetUnsent();
          // Back to the current step; the notice confirms the reset on the page reached.
          navigate('/studie', { replace: true });
          showNotice('resetDone');
          // That page's heading, once the dialog has gone (it held focus during the route change).
          focusAfterOverlay(() => document.querySelector<HTMLElement>('main h1'));
        }}
      />
    </StudyWorkProvider>
  );
}

/** Keeps a case form open in the right stage after a reload (Appendix A (1) and (4)). */
function CaseFormKeeper({ caseId }: { caseId: CoreCaseId }) {
  const study = useStudy();
  const ctl = useStudyController();
  const host = useFormHost();
  const step = CASE_FORM[caseId];
  const phase = study.phaseOf(caseId);
  const inLedger = !!study.state.ledger[step];
  const openStep = host.form?.step;
  useEffect(() => {
    if (inLedger || openStep === step) return;
    if (phase === 'uten') {
      // A fresh frame starts on page 1 again, so its confirmation starts over too.
      if (ctl.routeFor(step) === 'panel') study.setPage1(caseId, false);
      ctl.openStepForm(step, { stage: 'page1', show: true });
    } else if (phase === 'page2') {
      ctl.openStepForm(step, { stage: 'rest', show: true });
    }
  }, [inLedger, openStep, step, phase, caseId, ctl, study]);
  return null;
}

function StudyTourPage({ igjen }: { igjen: boolean }) {
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const role = study.role ?? 'gp';
  const parts = tour[role].parts;
  const replay = igjen || study.state.tour.done;
  const [local, setLocal] = useState<TourPosition | 'end'>({ part: 0, step: 0 });
  const stored = study.state.tour;
  const pos: TourPosition | 'end' = replay ? local : stored.part >= parts.length ? 'end' : { part: stored.part, step: stored.step };
  const onPos = (p: TourPosition | 'end') => {
    if (replay) setLocal(p);
    else if (p === 'end') study.setTour({ part: parts.length, step: 0 });
    else study.setTour({ part: p.part, step: p.step });
  };
  const ending = replay ? (
    <Actions>
      <SheenButton onClick={() => navigate(ctl.currentPath())}>{s('tourBackToStudy')}</SheenButton>
    </Actions>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: tokens.fontSizeBase500, lineHeight: tokens.lineHeightBase500, fontWeight: tokens.fontWeightSemibold }}>{s('navQuestion')}</h2>
      {/* Two answers to one question: equal buttons, so neither looks like the expected answer (B-02). */}
      <Actions>
        <Button
          size="large"
          onClick={() => {
            study.setTour({ done: true });
            ctl.goToStep('helhet');
          }}
        >
          {s('navYes')}
        </Button>
        <Button size="large" onClick={() => study.setTour({ part: 0, step: 0 })}>
          {s('navNo')}
        </Button>
      </Actions>
      <Muted>{s('navQuestionNote')}</Muted>
    </div>
  );
  return (
    <>
      {replay && <Muted>{s('tourReplayNote')}</Muted>}
      <TourView role={role} pos={pos} onPos={onPos} showReasons={false} ending={ending} notes={false} />
    </>
  );
}

function StudyRoutes({ path, igjen }: { path: string[]; igjen: boolean }) {
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const st = study.state;
  const furthest = st.furthest;
  const current = ctl.currentPath();
  const [, section, a, b] = path;
  const needsRole = !study.role;
  const guard = (step: (typeof STEP_ORDER)[number]) => stepReachable(furthest, step) && !(needsRole && stepIndex(step) > stepIndex('om-deg'));

  switch (section) {
    case undefined:
      return <Redirect to={current} />;
    case 'velkommen':
      return <VelkommenPage />;
    case 'om-deg':
      return guard('om-deg') ? <OmDegPage /> : <Redirect to={current} />;
    case 'omvisning':
      return guard('omvisning') ? <StudyTourPage igjen={igjen} /> : <Redirect to={current} />;
    case 'helhet':
      return guard('helhet') ? <HelhetPage /> : <Redirect to={current} />;
    case 'steg':
      return <StepperPage />;
    case 'liste': {
      if (!guard('kari')) return <Redirect to={current} />;
      const ids: CaseId[] = ['kari', 'erlend', 'astrid'];
      if (study.role === 'gp' && furthest === 'ekstra') ids.push('torbjorn');
      return (
        <ListPage
          caseIds={ids}
          openable={(c) => (c === 'torbjorn' ? furthest === 'ekstra' : stepReachable(furthest, c as 'kari'))}
          note={(c) => (c !== 'torbjorn' && !stepReachable(furthest, c as 'kari') ? s('laterInStudy') : undefined)}
        />
      );
    }
    case 'sak': {
      if (!isCaseId(a) || a === 'sofie') return <Redirect to={current} />;
      if (a === 'torbjorn') {
        if (furthest !== 'ekstra' || study.role !== 'gp') return <Redirect to={current} />;
        return <CaseRoute caseId={a} view={b} />;
      }
      if (!guard(a as 'kari')) return <Redirect to={current} />;
      return (
        <>
          <CaseFormKeeper caseId={a as CoreCaseId} />
          <CaseRoute caseId={a} view={b} />
        </>
      );
    }
    case 'avslutning':
      return guard('avslutning') ? <AvslutningPage /> : <Redirect to={current} />;
    case 'ekstra':
      if (furthest !== 'ekstra') return <Redirect to={current} />;
      if (a === 'to-fastleger') return <V5Page />;
      return <EkstraPage />;
    case 'takk':
      return guard('takk') ? <TakkPage /> : <Redirect to={current} />;
    default:
      return <Redirect to={current} />;
  }
}

export { STEP_PATH };
