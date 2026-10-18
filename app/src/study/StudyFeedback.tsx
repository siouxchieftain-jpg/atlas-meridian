import {
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Tooltip,
  makeStyles,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ArrowSwap20Regular, CheckmarkCircle16Regular, CommentEdit20Regular } from '@fluentui/react-icons';
import { useEffect, useId, useLayoutEffect, useState, type ReactElement } from 'react';
import { useLang } from '../i18n/i18n';
import type { StringKey } from '../i18n/strings';
import { previewFlag } from '../engine/forms';
import { useStudy } from '../state/study';
import { focusAfterOverlay } from '../patterns/announce';
import { ConfirmDialog } from '../shell/HeaderParts';
import { SrOnly } from '../patterns/basics';
import { partOf as sectionOf, sectionsFor, sideLabel } from '../review/sections';
import { useFormHost } from './formHost';
import { useStudyController } from './controller';
import { studySide } from './parts';

const useStyles = makeStyles({
  // The same right-edge launcher as review mode's (Meridian 1.0), so «Gi tilbakemelding» is in the same place in both.
  tab: {
    position: 'fixed',
    right: 'var(--atlas-form-inline, 0px)',
    top: 'var(--atlas-header-full-h, 48px)',
    bottom: 0,
    marginBlock: 'auto',
    height: 'fit-content',
    zIndex: 880,
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
    '@media (min-height: 220px) and (max-height: 300px)': { paddingBlock: tokens.spacingVerticalXXS, '& .fui-Button__icon': { display: 'none' } },
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
  pop: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    maxWidth: '320px',
    maxHeight: 'calc(100dvh - 56px)',
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: '2px',
  },
  popSurface: { overflowY: 'auto', overflowX: 'hidden !important' as 'hidden', boxSizing: 'border-box' },
  popTitle: { ...typographyStyles.body1Strong, margin: 0 },
  popWhere: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  popNote: { ...typographyStyles.caption1, margin: 0, color: tokens.colorNeutralForeground2 },
  secList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  openNow: { ...typographyStyles.caption1Strong, color: tokens.colorBrandForeground1, marginInlineStart: tokens.spacingHorizontalS, whiteSpace: 'nowrap' },
});

export type FeedbackResult = 'panel' | 'tab' | 'preview' | 'notready' | 'blocked' | 'shown';

/**
 * Opening S9. One form is open at a time: choosing the part whose form is open shows it again, another part asks
 * first when a feedback form is open and not sent (its answers would be lost, r6A-01). A step form that is open is
 * never replaced: S9 then opens in a new tab, or, in a preview (no address to open), waits until the step is done.
 */
export function useStudyFeedback(back: () => HTMLElement | null) {
  const { s } = useLang();
  const host = useFormHost();
  const study = useStudy();
  const ctl = useStudyController();
  const [pending, setPending] = useState<{ open: string; next: string; go: () => void } | null>(null);
  const openFeedback = host.form?.feedback ? host.form : undefined;
  const stepFormOpen = !!host.form && !host.form.feedback && !host.form.review && !study.state.ledger[host.form.step];
  const blocked = previewFlag() && stepFormOpen;
  const isOpen = (side: string, seksjon: string) => !!openFeedback && openFeedback.locked.side === side && openFeedback.locked.seksjon === seksjon;
  const label = (side: string, seksjon: string) => {
    const part = sectionOf(side, seksjon);
    return `${sideLabel(side, s)} · ${part ? s(part.label) : seksjon}`;
  };
  const request = (side: string, seksjon: string, done: (r: FeedbackResult) => void) => {
    if (blocked) return done('blocked');
    if (isOpen(side, seksjon)) {
      const wasVisible = host.visible;
      host.show();
      if (wasVisible) focusAfterOverlay(() => document.querySelector<HTMLElement>('[data-form-panel] h2'));
      return done('shown');
    }
    const go = () => done(ctl.openFeedback(side, seksjon));
    if (!openFeedback) return go();
    setPending({ open: label(openFeedback.locked.side ?? '', openFeedback.locked.seksjon ?? ''), next: label(side, seksjon), go });
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
  return { request, isOpen, blocked, dialog };
}

/** True when S9 opened: in the panel, in a new tab, as a preview, or was already open. */
export function feedbackOpened(r: FeedbackResult): boolean {
  return r === 'panel' || r === 'tab' || r === 'preview' || r === 'shown';
}

/** The notice that says what happened when S9 did not open in the panel. */
export function feedbackNotice(r: FeedbackResult): StringKey | null {
  if (r === 'tab') return 'feedbackOpenedTab';
  if (r === 'notready') return 'feedbackNotReady';
  return null;
}

/** The parts of one screen, as a list of buttons; the part's form opens on a click. */
function PartsList({ side, onPick, isOpen }: { side: string; onPick: (seksjon: string) => void; isOpen: (side: string, seksjon: string) => boolean }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  return (
    <ul className={cls.secList}>
      {sectionsFor(side).map((sec) => {
        const given = study.state.feedbackSent.includes(`${side}#${sec.id}`);
        return (
          <li key={sec.id}>
            <Button
              appearance="subtle"
              data-feedback-part={sec.id}
              icon={given ? <CheckmarkCircle16Regular /> : undefined}
              style={{ justifyContent: 'flex-start', width: '100%', textAlign: 'start' }}
              onClick={() => onPick(sec.id)}
            >
              {s(sec.label)}
              {given && <SrOnly>{`, ${s('feedbackGiven')}`}</SrOnly>}
              {isOpen(side, sec.id) && <span className={cls.openNow}>{s('feedbackOpenNow')}</span>}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A button that asks which part the feedback is about, then opens S9: the case-end prompt and the tab both use it.
 * `onResult` hears what happened (a notice for a new tab, or that the form is not ready).
 */
export function FeedbackPartsPopover({
  side,
  trigger,
  back,
  onResult,
  position = 'above',
}: {
  side: string;
  /** A Button (or a Tooltip round one): it takes the popover's ref and handlers. */
  trigger: ReactElement;
  /** Where focus goes when a switch of forms is cancelled. */
  back: () => HTMLElement | null;
  onResult: (r: FeedbackResult) => void;
  position?: 'above' | 'before';
}) {
  const cls = useStyles();
  const { s } = useLang();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const fb = useStudyFeedback(back);
  return (
    <>
      <Popover open={open} onOpenChange={(_, d) => setOpen(d.open)} positioning={{ position, autoSize: true, overflowBoundaryPadding: 8 }} withArrow trapFocus>
        <PopoverTrigger disableButtonEnhancement>{trigger}</PopoverTrigger>
        <PopoverSurface aria-labelledby={titleId} className={cls.popSurface}>
          <div className={cls.pop}>
            <p className={cls.popTitle} id={titleId}>
              {s('feedbackPick')}
            </p>
            <p className={cls.popWhere}>{sideLabel(side, s)}</p>
            {fb.blocked ? (
              <p className={cls.popNote}>{s('feedbackBlockedPreview')}</p>
            ) : (
              <PartsList
                side={side}
                isOpen={fb.isOpen}
                onPick={(seksjon) => {
                  setOpen(false);
                  fb.request(side, seksjon, onResult);
                }}
              />
            )}
            <p className={cls.popNote}>{s('feedbackWhere')}</p>
          </div>
        </PopoverSurface>
      </Popover>
      {fb.dialog}
    </>
  );
}

/** The right-edge «Gi tilbakemelding» tab on every study page after S1 (decision 4). */
export function StudyFeedbackTab({ path, onResult }: { path: string[]; onResult: (r: FeedbackResult) => void }) {
  const cls = useStyles();
  const { s } = useLang();
  const study = useStudy();
  const role = study.role;
  const side = role && study.state.ledger.S1 ? studySide(role, path) : null;
  // The content keeps room for the tab, as in review mode (r9A-03).
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--atlas-edge-tab', side ? '36px' : '0px');
  }, [side]);
  useEffect(() => () => document.documentElement.style.setProperty('--atlas-edge-tab', '0px'), []);
  const [iconOnly, setIconOnly] = useState(() => window.matchMedia('(max-height: 219px)').matches);
  const [tip, setTip] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-height: 219px)');
    const on = () => setIconOnly(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  if (!side) return null;
  const trigger = (
    <Tooltip content={s('feedback')} relationship="label" positioning="before" withArrow visible={iconOnly && tip} onVisibleChange={(_, d) => setTip(d.visible)}>
      <Button className={cls.tab} appearance="primary" icon={<CommentEdit20Regular />} data-feedback-tab="">
        <span className={cls.tabLabel}>{s('feedback')}</span>
      </Button>
    </Tooltip>
  );
  return (
    <FeedbackPartsPopover
      key={side}
      side={side}
      position="before"
      trigger={trigger}
      back={() => document.querySelector<HTMLElement>('[data-feedback-tab]')}
      onResult={onResult}
    />
  );
}
