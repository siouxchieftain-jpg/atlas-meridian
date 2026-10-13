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
} from '@fluentui/react-icons';
import { useId, useState, type ReactNode } from 'react';
import type { Role, TourStep } from '../content/types';
import { tour } from '../content';
import { useLang } from '../i18n/i18n';
import { SheenButton } from '../patterns/basics';
import { Actions, Body, Eyebrow, Lead } from '../patterns/layout';
import { PageHeading } from '../shell/PageHeading';
import { atlasDawn, size } from '../theme/constants';
import { SandboxFrame, useSandbox, type Sandbox } from './frames';

const useStyles = makeStyles({
  surface: {
    marginBlockStart: `${size.panelInset}px`,
    background: atlasDawn,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: 'clamp(16px, 4vw, 48px)',
    paddingBlock: 'clamp(20px, 4vw, 40px)',
    minHeight: `calc(100dvh - var(--atlas-header-h, 48px) - ${size.panelInset * 2}px - 64px)`,
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: 'clamp(20px, 3vw, 40px)',
    alignItems: 'start',
    '@media only screen and (min-width: 1024px)': { gridTemplateColumns: 'minmax(280px, 420px) minmax(0, 1fr)' },
    '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
    '@media print': { background: '#FFFFFF' },
  },
  text: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: '400ms',
    animationTimingFunction: tokens.curveEasyEase,
    '@media (prefers-reduced-motion: reduce)': { animationDuration: '0.01ms' },
    '@media only screen and (min-width: 1024px)': { position: 'sticky', top: 'calc(var(--atlas-header-h, 48px) + 24px)' },
  },
  part: { ...typographyStyles.body1Strong, margin: 0, color: tokens.colorNeutralForeground2 },
  tryIt: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
    ...typographyStyles.body1Strong,
    margin: 0,
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
  window: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadius2XLarge,
    boxShadow: tokens.shadow16,
    overflow: 'hidden',
    minWidth: 0,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
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
    maxHeight: 'min(72vh, 760px)',
    overflowY: 'auto',
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  frameNote: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2, margin: `${tokens.spacingVerticalS} 0 0` },
  coachReading: {
    '& [data-reading]': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '4px' },
  },
  coachMargin: {
    '& [data-margin]': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '2px' },
  },
  coachReturn: {
    '& [data-section="vurdering"] fieldset': { outline: `2px solid ${tokens.colorBrandStroke1}`, outlineOffset: '6px', borderRadius: tokens.borderRadiusMedium },
  },
  seen: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  seenItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
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
    </section>
  );
}

const COACH: Record<string, string> = { 'gp-lesning': 'reading', 'dps-markorer': 'reading', 'gp-margin': 'margin', 'dps-retur': 'return' };

function StepText({ step, showReason, eyebrow, partLine }: { step: TourStep; showReason: boolean; eyebrow: string; partLine: string }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const [why, setWhy] = useState(false);
  const whyId = useId();
  return (
    <>
      <Eyebrow>{eyebrow}</Eyebrow>
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
}: {
  role: Role;
  pos: TourPosition | 'end';
  onPos: (p: TourPosition | 'end') => void;
  showReasons: boolean;
  /** What the closing screen offers. */
  ending: ReactNode;
  notes: boolean;
}) {
  const cls = useStyles();
  const { s, t } = useLang();
  const sandbox = useSandbox(role, notes);
  const parts = tour[role].parts;
  const all = parts.flatMap((p, pi) => p.steps.map((st, si) => ({ st, pi, si })));
  const roleLabel = role === 'gp' ? s('roleGp') : s('roleDps');
  if (pos === 'end') {
    return (
      <div className={cls.surface}>
        <div className={cls.text}>
          <Eyebrow>{s('tourEyebrow', { role: roleLabel, n: all.length, total: all.length })}</Eyebrow>
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
    <div className={cls.surface}>
      <div className={cls.text} key={step.id}>
        <StepText
          step={step}
          showReason={showReasons}
          eyebrow={s('tourEyebrow', { role: roleLabel, n: flatIndex + 1, total: all.length })}
          partLine={s('tourPart', { n: pos.part + 1, total: parts.length, title: t(part.title) })}
        />
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
            <SheenButton size="medium" icon={<ArrowRight20Regular />} iconPosition="after" onClick={next}>
              {!lastInPart ? s('next') : !lastPart ? s('tourNextPart') : s('tourFinish')}
            </SheenButton>
          </Actions>
        </div>
      </div>
      <div>
        <FramedWindow title={t(step.title)} coach={COACH[step.id]}>
          <SandboxFrame sandbox={sandbox} frame={step.frame} role={role} />
        </FramedWindow>
        <p className={cls.frameNote}>{s('tourFrameNote')}</p>
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
  const step = stepId ? tour[role].parts.flatMap((p) => p.steps).find((x) => x.id === stepId) : undefined;
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
