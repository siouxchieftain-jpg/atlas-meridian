import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  ToggleButton,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ArrowCounterclockwise20Regular, BookOpen20Regular, ChevronDown16Regular, Info20Regular, QuestionCircle20Regular } from '@fluentui/react-icons';
import { useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { glossary } from '../content';
import { useLang } from '../i18n/i18n';
import { RouterLink } from '../router/router';
import { GuideImage, useSelectedToggle } from '../patterns/basics';
import { guide } from '../theme/constants';

const useStyles = makeStyles({
  wordmark: {
    ...typographyStyles.subtitle1,
    fontWeight: tokens.fontWeightBold,
    letterSpacing: '0.04em',
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px', borderRadius: tokens.borderRadiusSmall },
  },
  chip: {
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground3,
    paddingInline: tokens.spacingHorizontalS,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusCircular,
    whiteSpace: 'nowrap',
  },
  hideSmall: { '@media only screen and (max-width: 639px)': { display: 'none' } },
  helpBtn: { '@media only screen and (max-width: 639px)': { minWidth: '32px', paddingInline: '4px' } },
  lang: { display: 'inline-flex', gap: '2px' },
  langBtn: { minWidth: 'auto', paddingInline: tokens.spacingHorizontalS },
  dialogText: { ...typographyStyles.body1, margin: `0 0 ${tokens.spacingVerticalM}` },
  gTerm: { ...typographyStyles.body1Strong, marginTop: tokens.spacingVerticalS },
  gText: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  badge: { ...typographyStyles.body1Strong, whiteSpace: 'nowrap' },
  step: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' },
  // A help dialog is part of the guide layer: the image in its header, fading into the white body.
  helpSurface: {
    padding: 0,
    width: '100%',
    maxWidth: 'min(760px, calc(100vw - 32px))',
    borderRadius: '14px',
    overflowY: 'auto',
  },
  helpHead: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    minHeight: '128px',
    boxSizing: 'border-box',
    paddingInline: 'clamp(20px, 4vw, 28px)',
    paddingBlock: '26px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: '4px',
    borderRadius: '14px 14px 0 0',
    background: `linear-gradient(180deg,rgba(255,255,255,0) 35%,#FFFFFF 100%), linear-gradient(120deg,#FFF3EC 0%,#FDEDF5 52%,#F1EEFC 100%)`,
    '@media (forced-colors: active)': { background: 'Canvas' },
  },
  helpEyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  helpTitle: { ...typographyStyles.title3, margin: 0 },
  helpContent: { paddingInline: 'clamp(20px, 4vw, 28px)', paddingBlockStart: tokens.spacingVerticalS, paddingBlockEnd: '24px' },
  helpActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    paddingInline: 'clamp(20px, 4vw, 28px)',
    paddingBlockEnd: '24px',
  },
  helpExtra: { minWidth: 0 },
});

export function Wordmark({ to, extra }: { to: string; extra?: string }) {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <RouterLink to={to} className={cls.wordmark} aria-label={`${s('wordmark')}, ${s('prototype')}`}>
        {s('wordmark')}
      </RouterLink>
      <span className={mergeClasses(cls.chip, cls.hideSmall)}>{s('prototype')}</span>
      {extra && <span className={mergeClasses(cls.chip, cls.hideSmall)}>{extra}</span>}
    </span>
  );
}

export function LanguageToggle() {
  const cls = useStyles();
  const sel = useSelectedToggle();
  const { lang, setLang, s } = useLang();
  return (
    <div className={cls.lang} role="group" aria-label={`${s('language')} / Language`}>
      <ToggleButton
        size="small"
        appearance="subtle"
        className={mergeClasses(cls.langBtn, lang === 'nb' && sel.on)}
        checked={lang === 'nb'}
        onClick={() => setLang('nb')}
        lang="nb"
      >
        Norsk
      </ToggleButton>
      <ToggleButton
        size="small"
        appearance="subtle"
        className={mergeClasses(cls.langBtn, lang === 'en' && sel.on)}
        checked={lang === 'en'}
        onClick={() => setLang('en')}
        lang="en"
      >
        English
      </ToggleButton>
    </div>
  );
}

export function StepBadge({ roleLabel, step }: { roleLabel?: string; step?: number }) {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
      {roleLabel && <span className={`${cls.badge} ${cls.hideSmall}`}>{roleLabel}</span>}
      {step !== undefined && <span className={cls.step}>{s('stepCounter', { n: step })}</span>}
    </span>
  );
}

export interface HelpItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  href?: string;
  /** `extra` sits beside «Lukk», for example «Se omvisningen igjen»; it gets the dialog's close. */
  dialog?: { title: string; body: ReactNode; extra?: (close: () => void) => ReactNode };
}

/** Hjelp: the tour again, how the evaluation works, the glossary, about the prototype, and mode-specific items. */
/**
 * After a dialog opened from the Hjelp menu closes, the menu item that opened
 * it is gone; focus goes back to the Hjelp button instead of the page (2.4.3).
 */
export function returnFocusToHelp() {
  window.setTimeout(() => document.querySelector<HTMLElement>('[data-help-trigger]')?.focus(), 60);
}

export function HelpMenu({ items }: { items: HelpItem[] }) {
  const cls = useStyles();
  const { s } = useLang();
  const [dialog, setDialog] = useState<HelpItem['dialog'] | null>(null);
  return (
    <>
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button appearance="subtle" icon={<QuestionCircle20Regular />} iconPosition="before" aria-label={s('help')} className={cls.helpBtn} data-help-trigger="">
            <span className={cls.hideSmall}>{s('help')}</span>
            <ChevronDown16Regular style={{ marginInlineStart: 4 }} aria-hidden="true" className={cls.hideSmall} />
          </Button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            {items.map((it) => (
              <MenuItem
                key={it.key}
                icon={(it.icon as ReactElement) ?? <Info20Regular />}
                onClick={() => {
                  if (it.dialog) setDialog(it.dialog);
                  else if (it.href) window.open(it.href, '_blank', 'noopener');
                  else it.onSelect?.();
                }}
              >
                {it.label}
              </MenuItem>
            ))}
          </MenuList>
        </MenuPopover>
      </Menu>
      <Dialog
        open={!!dialog}
        onOpenChange={(_, d) => {
          if (d.open) return;
          setDialog(null);
          returnFocusToHelp();
        }}
      >
        <DialogSurface className={cls.helpSurface}>
          <div className={cls.helpHead}>
            <GuideImage variant="header" />
            <p className={cls.helpEyebrow}>{s('helpEyebrow')}</p>
            <DialogTitle as="h2" className={cls.helpTitle}>
              {dialog?.title}
            </DialogTitle>
          </div>
          <div className={cls.helpContent}>{dialog?.body}</div>
          <div className={cls.helpActions}>
            <div className={cls.helpExtra}>{dialog?.extra?.(() => setDialog(null))}</div>
            <Button
              appearance="primary"
              onClick={() => {
                setDialog(null);
                returnFocusToHelp();
              }}
            >
              {s('close')}
            </Button>
          </div>
        </DialogSurface>
      </Dialog>
    </>
  );
}

export function GlossaryBody() {
  const cls = useStyles();
  const { t } = useLang();
  return (
    <dl style={{ margin: 0 }}>
      {glossary.map((g) => (
        <div key={g.term.nb}>
          <dt className={cls.gTerm}>{t(g.term)}</dt>
          <dd className={cls.gText} style={{ marginInlineStart: 0 }}>
            {t(g.text)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Paragraphs({ items }: { items: string[] }) {
  const cls = useStyles();
  return (
    <>
      {items.map((p, i) => (
        <p key={i} className={cls.dialogText}>
          {p}
        </p>
      ))}
    </>
  );
}

/** A confirmation step built into the page (never window.confirm). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  fromHelp,
  icon,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Opened from the Hjelp menu: on cancel, focus goes back to the Hjelp button. */
  fromHelp?: boolean;
  /** The confirm button's icon: a restart by default; removal uses a delete icon (G-22, r5A-06). */
  icon?: ReactElement;
}) {
  const { s } = useLang();
  const bodyId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancel = () => {
    onCancel();
    if (fromHelp) returnFocusToHelp();
  };
  // The primary button comes first, as Meridian and Fluent place it (r6A-04); the dialog still opens on «Avbryt», so
  // Enter never confirms a removal by accident. Fluent focuses the first button in the Dialog's own effect, which runs
  // before this one in the same commit, so focus moves on at once, with no frame in between for a key press (r7A-03).
  useEffect(() => {
    if (!open) return;
    if (cancelRef.current) {
      cancelRef.current.focus();
      // At 400 % the dialog scrolls: bring the focused button wholly into view once it has laid out (r8A-02).
      const id = window.requestAnimationFrame(() => cancelRef.current?.scrollIntoView({ block: 'nearest' }));
      return () => window.cancelAnimationFrame(id);
    }
    const id = window.requestAnimationFrame(() => cancelRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && cancel()}>
      <DialogSurface aria-describedby={bodyId}>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent id={bodyId}>{body}</DialogContent>
          {/* The full width keeps a longer English label on one line (r5A-06). */}
          <DialogActions fluid>
            <Button appearance="primary" icon={icon ?? <ArrowCounterclockwise20Regular />} onClick={onConfirm}>
              {confirmLabel}
            </Button>
            <Button ref={cancelRef} appearance="secondary" onClick={cancel}>
              {s('cancel')}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

export { BookOpen20Regular };
