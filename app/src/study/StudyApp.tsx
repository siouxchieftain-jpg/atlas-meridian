import { Button, MessageBar, MessageBarActions, MessageBarBody, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import {
  ArrowDownload16Regular,
  ArrowRight20Regular,
  BookOpen20Regular,
  CalendarLtr20Filled,
  CalendarLtr20Regular,
  CommentEdit20Regular,
  DocumentBulletList20Filled,
  DocumentBulletList20Regular,
  Dismiss16Regular,
  Home20Filled,
  Home20Regular,
  Info20Regular,
  ArrowCounterclockwise20Regular,
  Map20Regular,
  QuestionCircle20Regular,
  TaskListLtr20Filled,
  TaskListLtr20Regular,
} from '@fluentui/react-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CoreCaseId } from '../content/types';
import { tourParts } from '../content';
import { useLang } from '../i18n/i18n';
import { getConfig, previewFlag, setPreviewFlag, studyClosed } from '../engine/forms';
import { Redirect, navigate, useRoute } from '../router/router';
import { removeKey } from '../state/persist';
import { KEEP_KEY, PENDING_KEY, SENDT_KEY, STUDY_KEY, StudyProvider, stepIndex, useStudy } from '../state/study';
import { CASE_FORM, STEP_ORDER } from '../state/types';
import { StudyWorkProvider } from '../state/work';
import { NoticeBar, useNotice } from '../patterns/notice';
import { Silent, focusAfterOverlay } from '../patterns/announce';
import { AppShell, type NavItem } from '../shell/AppShell';
import { ConfirmDialog, GlossaryBody, HelpMenu, LanguageToggle, Wordmark, type HelpItem } from '../shell/HeaderParts';
import { AboutBody, HowItWorksBody } from '../shell/HelpBodies';
import { CaseRoute, isCaseId } from '../case/CaseRoutes';
import { TourView, type TourPosition } from '../tour/Tour';
import { partOf as sectionOf } from '../review/sections';
import { downloadPreviewCsv } from './PreviewForm';
import { FormHostProvider, useFormHost } from './formHost';
import { FormPanel, formTitle, type FormPanelActions } from './FormPanel';
import { HOME_PATH, LIST_PATH, STEP_PATH, StudyControllerProvider, stepReachable, useStudyController } from './controller';
import { ListPage } from './ListPage';
import { AvslutningPage, EkstraPage, HelhetPage, OmDegPage, StepperPage, TakkPage, V5Page, VelkommenPage } from './pages';
import { HomePage } from './HomePage';
import { RoleLabel, StudyAccount, StudyProgress } from './StudyHeader';
import { StudyFeedbackTab, feedbackOpened, useStudyFeedback } from './StudyFeedback';
import { StudyNoticeProvider, useStudyNotice } from './notice';
import { CORE, casesDone, partOf, roleSeg } from './parts';
import { SheenButton } from '../patterns/basics';
import { Actions, Body, Muted } from '../patterns/layout';
import { guide } from '../theme/constants';

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
  tourEnd: { display: 'flex', flexDirection: 'column', gap: '10px' },
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  prompt: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingInline: '14px',
    paddingBlock: '10px',
    borderRadius: '10px',
    border: `1px solid ${guide.cardEdge}`,
    background: guide.card,
    '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
  },
  promptQ: { ...typographyStyles.body1Strong, margin: 0 },
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
  const here = `/${route.path.join('/')}`;
  const hereRef = useRef(here);
  hereRef.current = here;

  // Progress made under the preview flag is a trial run (it never blocks review mode).
  useEffect(() => {
    if (preview && !st.previewRun && (st.roleChoice || stepIndex(st.furthest) > 0)) study.setPreviewRun();
  }, [preview, st.previewRun, st.roleChoice, st.furthest, study]);

  // S9, the feedback form: a send marks the part, closes the panel and says thank you on the page it was about.
  useEffect(
    () =>
      host.register({
        onSent: (form) => {
          if (!form.feedback) return;
          study.markFeedback(`${form.locked.side}#${form.locked.seksjon}`);
          host.close();
          showNotice('feedbackThanks', hereRef.current);
        },
      }),
    [host, study, showNotice],
  );

  const furthest = st.furthest;
  const atHome = stepIndex(furthest) >= stepIndex('omvisning');

  const nav: NavItem[] = [];
  if (atHome) {
    nav.push({ key: 'hjem', label: s('navHome'), to: HOME_PATH, icon: <Home20Regular />, iconActive: <Home20Filled />, match: [HOME_PATH] });
    // The list the cases start from; a case belongs to it, as a document belongs to its folder.
    const gp = (study.role ?? 'gp') === 'gp';
    nav.push({
      key: 'liste',
      label: s(gp ? 'timelisteTitle' : 'navQueue'),
      to: LIST_PATH,
      icon: gp ? <CalendarLtr20Regular /> : <DocumentBulletList20Regular />,
      iconActive: gp ? <CalendarLtr20Filled /> : <DocumentBulletList20Filled />,
      match: [LIST_PATH, '/studie/sak'],
    });
  }
  nav.push({ key: 'steg', label: s('stepperTitle'), to: '/studie/steg', icon: <TaskListLtr20Regular />, iconActive: <TaskListLtr20Filled />, match: ['/studie/steg'] });

  const help: HelpItem[] = [];
  if (st.tour.done) help.push({ key: 'tour', label: s('helpTourAgain'), icon: <Map20Regular />, onSelect: () => navigate('/studie/omvisning?igjen') });
  help.push({
    key: 'how',
    label: s('helpHowItWorks'),
    icon: <QuestionCircle20Regular />,
    dialog: {
      title: s('helpHowItWorks'),
      body: <HowItWorksBody current={partOf(furthest)} role={study.role ?? 'gp'} />,
      extra: st.tour.done
        ? (close) => (
            <Button
              appearance="subtle"
              icon={<Map20Regular />}
              onClick={() => {
                close();
                navigate('/studie/omvisning?igjen');
              }}
            >
              {s('guideTourAgain')}
            </Button>
          )
        : undefined,
    },
  });
  help.push({ key: 'glossary', label: s('helpGlossary'), icon: <BookOpen20Regular />, dialog: { title: s('helpGlossary'), body: <GlossaryBody />, wide: true } });
  help.push({ key: 'about', label: s('helpAboutPrototype'), icon: <Info20Regular />, dialog: { title: s('helpAboutPrototype'), body: <AboutBody /> } });
  if (stepIndex(furthest) > 0)
    help.push({ key: 'reset', label: s('helpResetUnsent'), icon: <ArrowCounterclockwise20Regular />, onSelect: () => setConfirmReset(true), divider: true });

  const form = host.form;
  const actions: FormPanelActions | null = useMemo(() => {
    if (!form) return null;
    if (form.feedback) {
      // The part in the panel's heading, so a switch of parts is heard in the heading itself (r7A-05).
      const part = form.locked.side ? sectionOf(form.locked.side, form.locked.seksjon) : undefined;
      return {
        title: `${s('formPanel')}: ${formTitle(form.formKey, s('feedback'), t)}${part ? ` · ${s(part.label)}` : ''}`,
        onConfirmSent: () => {
          study.markFeedback(`${form.locked.side}#${form.locked.seksjon}`);
          host.close();
          showNotice('feedbackThanks', hereRef.current);
        },
        onSkip: () => host.close(),
        skipLabel: s('feedbackClose'),
      };
    }
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
  }, [form, ctl, st.page1, s, t, study, host, showNotice]);

  const chips = [preview ? s('previewForm') : null, getConfig().round === 'pilot' ? s('roundPilot') : null].filter((x): x is string => !!x);
  const feedbackNotice = useMemo(() => (key: Parameters<typeof showNotice>[0]) => showNotice(key, hereRef.current), [showNotice]);

  return (
    <StudyWorkProvider actions={ctl.work}>
      <StudyNoticeProvider show={feedbackNotice}>
        <AppShell
          headerStart={
            <>
              <Wordmark to={ctl.currentPath()} extra={chips} />
              <RoleLabel />
            </>
          }
          headerCenter={<StudyProgress />}
          headerEnd={
            <>
              <HelpMenu items={help} />
              <LanguageToggle />
              <StudyAccount />
            </>
          }
          banner={preview ? <PreviewBanner /> : undefined}
          notice={<NoticeBar notice={notice} onDismiss={clearNotice} onBind={bindNotice} />}
          nav={nav}
          navExpandedDefault={false}
          formPanel={<FormPanel actions={actions} />}
          footerExtra={
            // Velkommen only, once: the credit line and UiA's logo in the bottom corner.
            route.path[1] === 'velkommen'
              ? { note: s('footerCredit'), end: <img src="./uia-logo.png" alt={s('uiaLogoAlt')} width={141} height={32} style={{ display: 'block' }} /> }
              : undefined
          }
        >
          <StudyRoutes path={route.path} igjen={route.query.has('igjen')} />
        </AppShell>
        {!studyClosed() && <StudyFeedbackTab path={route.path} onResult={(r) => feedbackResult(r, feedbackNotice)} />}
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
      </StudyNoticeProvider>
    </StudyWorkProvider>
  );
}

function feedbackResult(r: string, show: (key: 'feedbackOpenedTab' | 'feedbackNotReady') => void) {
  if (r === 'tab') show('feedbackOpenedTab');
  else if (r === 'notready') show('feedbackNotReady');
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

/**
 * The tour, started from the overview (decision 2). Its end opens the cases, asks once about the tour (S9), and leads
 * back to the overview. Seen again from Hjelp, it changes nothing.
 */
function StudyTourPage({ igjen }: { igjen: boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const ctl = useStudyController();
  const notice = useStudyNotice();
  const role = study.role ?? 'gp';
  const parts = tourParts(role, true);
  const st = study.state;
  const replay = igjen || st.tour.done;
  const [local, setLocal] = useState<TourPosition | 'end'>({ part: 0, step: 0 });
  // Reached the end in this visit: the closing screen stays, with its question, until the participant goes home.
  const [justDone, setJustDone] = useState(false);
  const stored = st.tour;
  const pos: TourPosition | 'end' = replay ? local : stored.part >= parts.length ? 'end' : { part: stored.part, step: stored.step };
  const onPos = (p: TourPosition | 'end') => {
    if (replay) setLocal(p);
    else if (p === 'end') {
      setLocal('end');
      setJustDone(true);
      study.finishTour();
    } else study.setTour({ part: p.part, step: p.step });
  };
  const fb = useStudyFeedback(() => document.querySelector<HTMLElement>('[data-tour-feedback]'));
  const asked = !!st.prompts.tour;
  const ending =
    replay && !justDone ? (
      <div data-tour-end="replay">
        <Actions>
          <SheenButton onClick={() => navigate(ctl.currentPath())}>{s('tourBackToStudy')}</SheenButton>
        </Actions>
      </div>
    ) : (
      <div className={cls.tourEnd} data-tour-end="">
        <h2 className={cls.h2}>{s(role === 'gp' ? 'tourEndOpenGp' : 'tourEndOpenDps')}</h2>
        <Body>{s('tourEndText')}</Body>
        {!asked ? (
          <section className={cls.prompt} aria-labelledby="tour-prompt" data-tour-prompt="">
            <p className={cls.promptQ} id="tour-prompt">
              {s('tourPromptQuestion')}
            </p>
            <Muted>{s('promptWhy')}</Muted>
            <div>
              <Button
                icon={<CommentEdit20Regular />}
                data-tour-feedback=""
                onClick={() =>
                  fb.request(`${roleSeg(role)}/omvisning`, 'hele', (r) => {
                    if (feedbackOpened(r)) study.setPrompt('tour', 'sent');
                    notice(r);
                  })
                }
              >
                {s('feedback')}
              </Button>
            </div>
          </section>
        ) : (
          <Muted>{s('promptAlways')}</Muted>
        )}
        <Actions>
          <SheenButton
            icon={<ArrowRight20Regular />}
            iconPosition="after"
            onClick={() => {
              if (!asked) study.setPrompt('tour', 'later');
              if (!st.tour.done) study.finishTour();
              navigate(HOME_PATH);
            }}
          >
            {s('toHome')}
          </SheenButton>
        </Actions>
        {fb.dialog}
      </div>
    );
  // The pattern and the area's figures stay held until the three cases are done, seen again or not (G-38, 3.5.1 B1).
  const hold = casesDone(st) < CORE.length ? 'study' : undefined;
  return (
    <>
      {replay && !justDone && <Muted>{s('tourReplayNote')}</Muted>}
      <TourView role={role} pos={pos} onPos={onPos} showReasons={false} ending={ending} notes={false} withStudy hold={hold} />
    </>
  );
}

function StudyRoutes({ path, igjen }: { path: string[]; igjen: boolean }) {
  const study = useStudy();
  const ctl = useStudyController();
  const st = study.state;
  const furthest = st.furthest;
  const current = ctl.currentPath();
  const [, section, a, b] = path;
  const needsRole = !study.role;
  const guard = (step: (typeof STEP_ORDER)[number]) => stepReachable(furthest, step) && !(needsRole && stepIndex(step) > stepIndex('om-deg'));

  // After the study's last day nothing starts: every address shows the welcome page's closed state (decision 12).
  if (studyClosed()) return section === 'velkommen' ? <VelkommenPage /> : <Redirect to={STEP_PATH.velkommen} />;

  switch (section) {
    case undefined:
      return <Redirect to={current} />;
    case 'velkommen':
      return <VelkommenPage />;
    case 'om-deg':
      return guard('om-deg') ? <OmDegPage /> : <Redirect to={current} />;
    case 'hjem':
      return guard('omvisning') ? <HomePage /> : <Redirect to={current} />;
    case 'omvisning':
      if (!guard('omvisning')) return <Redirect to={current} />;
      // The tour starts from the card on the overview, so the participant reads what it is first.
      if (!igjen && !st.tour.started && !st.tour.done) return <Redirect to={`${HOME_PATH}?omvisning`} />;
      return <StudyTourPage key={igjen ? 'igjen' : 'tour'} igjen={igjen} />;
    case 'helhet':
      return guard('helhet') ? <HelhetPage /> : <Redirect to={current} />;
    case 'steg':
      return <StepperPage />;
    case 'liste':
      // The list the cases start from (3.4, boards 4a and 4b), reached from the start page.
      return guard('omvisning') ? <ListPage /> : <Redirect to={current} />;
    case 'sak': {
      if (!isCaseId(a) || a === 'sofie') return <Redirect to={current} />;
      if (a === 'torbjorn') {
        if (furthest !== 'ekstra' || study.role !== 'gp') return <Redirect to={current} />;
        return <CaseRoute caseId={a} view={b} />;
      }
      // A case opens once the tour is done, and only in its turn.
      if (!guard(a as 'kari') || !st.tour.done) return <Redirect to={current} />;
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
