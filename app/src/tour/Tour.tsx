import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import {
  ArrowLeft20Regular,
  ArrowRight20Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  Lightbulb20Regular,
  Info16Regular,
  Map16Regular,
} from '@fluentui/react-icons';
import { useId, useState, type ReactNode } from 'react';
import type { Role, TourPart, TourStep } from '../content/types';
import { tour, tourParts } from '../content';
import { useLang } from '../i18n/i18n';
import { GuideImage, StartButton } from '../patterns/basics';
import { Actions, Body, Lead } from '../patterns/layout';
import { PageHeading } from '../shell/PageHeading';
import { atlasDawn, size } from '../theme/constants';
import { SandboxFrame, isStudyFrame, useSandbox, type Sandbox } from './frames';

const useStyles = makeStyles({
  // The guide layer's stage: the dawn and the image, the progress on top, the panel and the live window in the middle.
  surface: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    marginBlockStart: `${size.panelInset}px`,
    background: atlasDawn,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: 'clamp(16px, 3vw, 36px)',
    paddingBlockStart: 'clamp(16px, 2vw, 24px)',
    paddingBlockEnd: 'clamp(20px, 3vw, 36px)',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto',
    gap: 'clamp(20px, 3vw, 28px)',
    // The text card sits at the top beside the live window (and stays in view while the window is read).
    alignItems: 'start',
    '@media only screen and (min-width: 1024px)': { gridTemplateColumns: 'minmax(300px, 470px) minmax(0, 1fr)', gridTemplateRows: 'auto minmax(0, 1fr)' },
    '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
    '@media print': { background: '#FFFFFF' },
  },
  top: { gridColumn: '1 / -1', alignSelf: 'start', display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: '16px', rowGap: '10px' },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    paddingBlock: '3px',
    paddingInlineStart: '8px',
    paddingInlineEnd: '10px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    color: tokens.colorBrandForeground1,
    ...typographyStyles.caption1Strong,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  where: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  progress: { flex: '1 1 280px', maxWidth: '520px', display: 'flex', alignItems: 'center', gap: '10px' },
  progressPart: { display: 'flex', gap: '4px' },
  seg: { flex: '1 1 0', height: '4px', borderRadius: '2px', backgroundColor: tokens.colorNeutralStroke2, '@media (forced-colors: active)': { border: '1px solid CanvasText' } },
  segDone: { backgroundColor: tokens.colorBrandStroke2 },
  segNow: { backgroundColor: tokens.colorBrandBackground, '@media (forced-colors: active)': { backgroundColor: 'Highlight' } },
  // A white card over the image, so the text always reads on white.
  text: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    minWidth: 0,
    padding: 'clamp(18px, 2.5vw, 28px)',
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    boxSizing: 'border-box',
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: '400ms',
    animationTimingFunction: tokens.curveEasyEase,
    '@media (prefers-reduced-motion: reduce)': { animationDuration: '0.01ms' },
    '@media only screen and (min-width: 1024px)': { position: 'sticky', top: 'calc(var(--atlas-header-h, 48px) + 24px)' },
    '@media (forced-colors: active)': { backgroundColor: 'Canvas', border: '1px solid CanvasText' },
  },
  part: { ...typographyStyles.caption1Strong, margin: 0, color: tokens.colorBrandForeground1 },
  tryIt: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    ...typographyStyles.body1Strong,
    margin: 0,
    paddingInline: '14px',
    paddingBlock: '12px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  tryIcon: { color: tokens.colorBrandForeground1, flexShrink: 0, marginTop: '1px' },
  bridge: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
    ...typographyStyles.body1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.75)',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  why: { borderTop: `1px solid ${tokens.colorBrandStroke2}`, paddingTop: tokens.spacingVerticalS },
  whyText: { ...typographyStyles.body1, margin: 0 },
  dots: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
  dot: {
    width: '24px',
    height: '24px',
    minWidth: '24px',
    padding: 0,
    borderRadius: tokens.borderRadiusCircular,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    // An inactive dot keeps a 3:1 outline (WCAG 1.4.11); the current one is filled.
    '::after': {
      content: '""',
      width: '8px',
      height: '8px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: tokens.colorNeutralBackground1,
      border: `1px solid ${tokens.colorNeutralStrokeAccessible}`,
    },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '1px' },
    '@media (forced-colors: active)': { '::after': { backgroundColor: 'Canvas', border: '1px solid CanvasText' } },
  },
  dotOn: {
    '::after': { width: '10px', height: '10px', backgroundColor: tokens.colorBrandBackground, border: `1px solid ${tokens.colorBrandBackground}` },
    '@media (forced-colors: active)': { '::after': { backgroundColor: 'Highlight', border: '1px solid Highlight' } },
  },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  // The live window: a white window on the stage, as a Fluent card at its elevation.
  window: {
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow16,
    minWidth: 0,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  windowInner: { backgroundColor: tokens.colorNeutralBackground1, borderRadius: tokens.borderRadiusLarge, overflow: 'hidden' },
  // A plain 40 px bar with the frame's title: no browser tab, no favicon, no window buttons (fluent.md 5.2, R2A-10).
  bar: {
    display: 'flex',
    alignItems: 'center',
    minHeight: '40px',
    boxSizing: 'border-box',
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    ...typographyStyles.caption1Strong,
    color: tokens.colorNeutralForeground1,
  },
  // Long titles wrap rather than being cut at 400 % zoom or with text spacing (r4A-08).
  barTitle: { minWidth: 0, overflowWrap: 'anywhere' },
  winBody: {
    paddingInline: 'clamp(12px, 2vw, 24px)',
    paddingBlock: tokens.spacingVerticalL,
    // The window is as tall as its content; anything wider than a narrow window scrolls inside it, never the page.
    overflowX: 'auto',
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  // Over the image: a white backing keeps the line readable.
  frameNote: {
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
    margin: `${tokens.spacingVerticalS} 0 0`,
    display: 'inline-block',
    paddingInline: tokens.spacingHorizontalS,
    paddingBlock: '2px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  coachReading: {
    '& [data-reading]': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '4px' },
  },
  coachMargin: {
    '& [data-margin]': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '2px' },
  },
  coachReturn: {
    '& [data-section="vurdering"] fieldset': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '6px', borderRadius: tokens.borderRadiusMedium },
  },
  // «Dette har du sett»: in two columns where there is room.
  seen: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    '@media only screen and (min-width: 1024px)': { display: 'block', columns: 2, columnGap: '24px' },
  },
  seenItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: '2px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    breakInside: 'avoid',
    ...typographyStyles.body1,
  },
  question: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalM,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: 'rgba(255,255,255,0.8)',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  h2: { ...typographyStyles.subtitle1, margin: 0 },
  dialogSurface: { maxWidth: 'min(960px, calc(100vw - 32px))', width: '100%' },
});

/** The window that frames a live component in the tour (fluent.md 5.2). */
export function FramedWindow({ title, children, coach }: { title: string; children: ReactNode; coach?: string }) {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <section className={cls.window} aria-label={s('tourFrameLabel', { title })} data-tour-frame="">
      <div className={cls.windowInner}>
        <div className={cls.bar}>
          <span className={cls.barTitle}>ATLAS · {title}</span>
        </div>
        <div
          className={mergeClasses(
            cls.winBody,
            coach === 'reading' && cls.coachReading,
            coach === 'margin' && cls.coachMargin,
            coach === 'return' && cls.coachReturn,
          )}
          tabIndex={0}
          role="region"
          aria-label={title}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

const COACH: Record<string, string> = { 'gp-lesning': 'reading', 'dps-markorer': 'reading', 'gp-margin': 'margin', 'dps-retur': 'return' };

/** The stage's top row: «Omvisning», where you are, and the progress by part. */
function StageTop({ role, parts, flatIndex, done }: { role: Role; parts: TourPart[]; flatIndex: number; done?: boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  const total = parts.reduce((n, p) => n + p.steps.length, 0);
  const roleLabel = role === 'gp' ? s('roleGp') : s('roleDps');
  let k = 0;
  const partNo = done ? parts.length : (() => {
    let acc = 0;
    for (let i = 0; i < parts.length; i++) {
      acc += parts[i].steps.length;
      if (flatIndex < acc) return i + 1;
    }
    return parts.length;
  })();
  return (
    <div className={cls.top}>
      <span className={cls.pill}>
        <Map16Regular aria-hidden="true" />
        {s('stepOmvisning')}
      </span>
      <span className={cls.where}>{s('tourWhere', { role: roleLabel, n: done ? total : flatIndex + 1, total })}</span>
      <div className={cls.progress} role="img" aria-label={s('tourProgress', { n: done ? total : flatIndex + 1, total, part: partNo, parts: parts.length })}>
        {parts.map((p, pi) => (
          <span key={pi} className={cls.progressPart} style={{ flex: `${p.steps.length} 1 0` }}>
            {p.steps.map((st) => {
              const i = k++;
              return <span key={st.id} className={mergeClasses(cls.seg, (done || i < flatIndex) && cls.segDone, !done && i === flatIndex && cls.segNow)} />;
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepText({ step, showReason, partLine }: { step: TourStep; showReason: boolean; partLine: string }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const [why, setWhy] = useState(false);
  const whyId = useId();
  return (
    <>
      <p className={cls.part}>{partLine}</p>
      <PageHeading title={s('stepOmvisning')} guide>
        {t(step.title)}
      </PageHeading>
      <Lead>{t(step.body)}</Lead>
      {step.tryIt && (
        <p className={cls.tryIt}>
          <Lightbulb20Regular className={cls.tryIcon} aria-hidden="true" />
          {t(step.tryIt)}
        </p>
      )}
      {step.bridge && (
        <p className={cls.bridge}>
          <Info16Regular aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          {t(step.bridge)}
        </p>
      )}
      {showReason && (
        <div className={cls.why}>
          <Button
            appearance="transparent"
            icon={why ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
            aria-expanded={why}
            aria-controls={whyId}
            onClick={() => setWhy(!why)}
            style={{ paddingInline: 0 }}
          >
            {s('tourWhy')}
          </Button>
          <p className={cls.whyText} id={whyId} hidden={!why}>
            {t(step.reason)}
          </p>
        </div>
      )}
    </>
  );
}

export interface TourPosition {
  part: number;
  step: number;
}

/**
 * The Edge-style tour: short parts (at most four steps), a text column and a
 * framed live window with the practice patient. Reasons («Hvorfor dette
 * finnes») show only where allowed (review mode with Merknader; never in study
 * mode before «Takk»).
 */
export function TourView({
  role,
  pos,
  onPos,
  showReasons,
  ending,
  notes,
  withStudy = false,
}: {
  role: Role;
  pos: TourPosition | 'end';
  onPos: (p: TourPosition | 'end') => void;
  showReasons: boolean;
  /** What the closing screen offers. */
  ending: ReactNode;
  notes: boolean;
  /** The participant's tour: it starts with «Slik foregår studien». */
  withStudy?: boolean;
}) {
  const cls = useStyles();
  const { s, t } = useLang();
  const sandbox = useSandbox(role, notes);
  const parts = tourParts(role, withStudy);
  const all = parts.flatMap((p, pi) => p.steps.map((st, si) => ({ st, pi, si })));
  if (pos === 'end') {
    return (
      <div className={cls.surface} data-tour-stage="">
        <GuideImage variant="stage" />
        <StageTop role={role} parts={parts} flatIndex={all.length - 1} done />
        <div className={cls.text}>
          <PageHeading title={s('stepOmvisning')} guide>
            {t(tour.closing.title)}
          </PageHeading>
          <Lead>{t(tour.closing.body)}</Lead>
          {ending}
        </div>
        <section className={cls.question} aria-label={t(tour.closing.seenTitle)}>
          <h2 className={cls.h2}>{t(tour.closing.seenTitle)}</h2>
          <ul className={cls.seen}>
            {all.map(({ st, pi, si }) => (
              <li key={st.id} className={cls.seenItem}>
                <span>{t(st.title)}</span>
                <Button size="small" appearance="subtle" onClick={() => onPos({ part: pi, step: si })}>
                  {s('tourSeeAgain')}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }
  const part = parts[Math.min(pos.part, parts.length - 1)];
  const stepIdx = Math.min(pos.step, part.steps.length - 1);
  const step = part.steps[stepIdx];
  const flatIndex = all.findIndex((x) => x.st.id === step.id);
  const lastInPart = stepIdx === part.steps.length - 1;
  const lastPart = pos.part === parts.length - 1;
  const next = () => {
    if (!lastInPart) onPos({ part: pos.part, step: stepIdx + 1 });
    else if (!lastPart) onPos({ part: pos.part + 1, step: 0 });
    else onPos('end');
  };
  const prev = () => {
    if (stepIdx > 0) onPos({ part: pos.part, step: stepIdx - 1 });
    else if (pos.part > 0) onPos({ part: pos.part - 1, step: parts[pos.part - 1].steps.length - 1 });
  };
  return (
    <div className={cls.surface} data-tour-stage="">
      <GuideImage variant="stage" />
      <StageTop role={role} parts={parts} flatIndex={flatIndex} />
      <div className={cls.text} key={step.id}>
        <StepText step={step} showReason={showReasons} partLine={s('tourPart', { n: pos.part + 1, total: parts.length, title: t(part.title) })} />
        <div className={cls.nav}>
          <div className={cls.dots} role="group" aria-label={s('tourStepList')}>
            {part.steps.map((st, i) => (
              <button
                key={st.id}
                type="button"
                className={mergeClasses(cls.dot, i === stepIdx && cls.dotOn)}
                aria-label={`${s('tourStepDot', { n: i + 1 })}: ${t(st.title)}`}
                aria-current={i === stepIdx ? 'step' : undefined}
                onClick={() => onPos({ part: pos.part, step: i })}
              />
            ))}
          </div>
          <Actions>
            <Button icon={<ArrowLeft20Regular />} disabled={pos.part === 0 && stepIdx === 0} onClick={prev}>
              {s('previous')}
            </Button>
            <StartButton size="medium" icon={<ArrowRight20Regular />} iconPosition="after" onClick={next}>
              {!lastInPart ? s('next') : !lastPart ? s('tourNextPart') : s('tourFinish')}
            </StartButton>
          </Actions>
        </div>
      </div>
      <div>
        <FramedWindow title={t(step.title)} coach={COACH[step.id]}>
          <SandboxFrame sandbox={sandbox} frame={step.frame} role={role} />
        </FramedWindow>
        {/* The study's own frames are drawings of ATLAS, not the practice patient. */}
        <p className={cls.frameNote}>{isStudyFrame(step.frame) ? s('tourStudyFrameNote') : s('tourFrameNote')}</p>
      </div>
    </div>
  );
}

function StepDialogBody({ step, role, showReason }: { step: TourStep; role: Role; showReason: boolean }) {
  const { t } = useLang();
  const sandbox: Sandbox = useSandbox(role, false);
  return (
    <DialogBody>
      <DialogTitle>{t(step.title)}</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Body>{t(step.body)}</Body>
          {step.bridge && <Body>{t(step.bridge)}</Body>}
          {showReason && <Body>{t(step.reason)}</Body>}
          <FramedWindow title={t(step.title)} coach={COACH[step.id]}>
            <SandboxFrame sandbox={sandbox} frame={step.frame} role={role} />
          </FramedWindow>
        </div>
      </DialogContent>
    </DialogBody>
  );
}

/** «Se igjen»: one tour step in a dialog, without its reason (study mode). */
export function TourStepDialog({ role, stepId, onClose, showReason = false }: { role: Role; stepId: string | null; onClose: () => void; showReason?: boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  const step = stepId ? tourParts(role, true).flatMap((p) => p.steps).find((x) => x.id === stepId) : undefined;
  return (
    <Dialog open={!!step} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface className={cls.dialogSurface}>
        {step && <StepDialogBody step={step} role={role} showReason={showReason} />}
        <DialogActions style={{ marginTop: 12 }}>
          <Button appearance="primary" onClick={onClose}>
            {s('close')}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
}
