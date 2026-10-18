import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  SearchBox,
  Tab,
  TabList,
  ToggleButton,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { ArrowCounterclockwise20Regular, BookOpen20Regular, ChevronDown16Regular, Dismiss20Regular, Info20Regular, QuestionCircle20Regular } from '@fluentui/react-icons';
import { Fragment, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { glossary } from '../content';
import type { GlossaryEntry, GlossaryGroup } from '../content/types';
import type { StringKey } from '../i18n/strings';
import { useLang } from '../i18n/i18n';
import { RouterLink } from '../router/router';
import { GuideImage, SheenButton, SrOnly, useSelectedToggle } from '../patterns/basics';
import { useAtlasAnnounce } from '../patterns/announce';
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
  badge: { ...typographyStyles.body1Strong, whiteSpace: 'nowrap' },
  step: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap' },
  // A help dialog is part of the guide layer (boards 7b and 7c): the artwork in its header, fading into the white body.
  // On a short window only the body scrolls: the header with its close button and «Lukk» stay in view.
  helpSurface: {
    padding: 0,
    width: '100%',
    maxWidth: 'min(760px, calc(100vw - 32px))',
    maxHeight: 'calc(100dvh - 32px)',
    borderRadius: tokens.borderRadiusXLarge,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    // Below 400 px of height (a phone on its side, 400 % zoom) the whole dialog scrolls instead (WCAG 1.4.10).
    '@media (max-height: 399px)': { overflowY: 'auto', display: 'block' },
  },
  // The glossary lays its terms out in columns, so it takes more width and less height.
  helpSurfaceWide: { maxWidth: 'min(920px, calc(100vw - 32px))' },
  helpHead: {
    position: 'relative',
    isolation: 'isolate',
    overflow: 'hidden',
    flexShrink: 0,
    minHeight: '104px',
    boxSizing: 'border-box',
    paddingInline: 'clamp(20px, 4vw, 28px)',
    paddingBlockStart: '22px',
    paddingBlockEnd: '14px',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '12px',
    // The guide card's warm stops (guide-card-warm, -pink, -lavender), fading to the white body.
    background: `linear-gradient(180deg,rgba(255,255,255,0) 35%,#FFFFFF 100%), ${guide.card}`,
    '@media (forced-colors: active)': { background: 'Canvas' },
  },
  helpHeadText: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  helpClose: { alignSelf: 'flex-start', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.7)' },
  helpEyebrow: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  helpTitle: { ...typographyStyles.title3, margin: 0 },
  helpContent: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingInline: 'clamp(20px, 4vw, 28px)',
    paddingBlockStart: tokens.spacingVerticalS,
    paddingBlockEnd: '20px',
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  helpActions: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    paddingInline: 'clamp(20px, 4vw, 28px)',
    paddingBlockStart: tokens.spacingVerticalM,
    paddingBlockEnd: '20px',
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
  },
  helpExtra: { minWidth: 0 },
});

export function Wordmark({ to, extra }: { to: string; extra?: string | string[] }) {
  const cls = useStyles();
  const { s } = useLang();
  const extras = extra === undefined ? [] : Array.isArray(extra) ? extra : [extra];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <RouterLink to={to} className={cls.wordmark} aria-label={`${s('wordmark')}, ${s('prototype')}`}>
        {s('wordmark')}
      </RouterLink>
      <span className={mergeClasses(cls.chip, cls.hideSmall)}>{s('prototype')}</span>
      {extras.map((x) => (
        <span key={x} className={mergeClasses(cls.chip, cls.hideSmall)} data-header-chip="">
          {x}
        </span>
      ))}
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
  /** `extra` sits beside «Lukk», for example «Se omvisningen igjen»; it gets the dialog's close. `wide` for the glossary. */
  dialog?: { title: string; body: ReactNode; extra?: (close: () => void) => ReactNode; wide?: boolean };
  /** A divider before the item: an action that changes something, set apart from the help that only shows. */
  divider?: boolean;
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
              <Fragment key={it.key}>
                {it.divider && <MenuDivider />}
                <MenuItem
                  icon={(it.icon as ReactElement) ?? <Info20Regular />}
                  onClick={() => {
                    if (it.dialog) setDialog(it.dialog);
                    else if (it.href) window.open(it.href, '_blank', 'noopener');
                    else it.onSelect?.();
                  }}
                >
                  {it.label}
                </MenuItem>
              </Fragment>
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
        <DialogSurface className={mergeClasses(cls.helpSurface, dialog?.wide && cls.helpSurfaceWide)} data-help-dialog="">
          <div className={cls.helpHead}>
            <GuideImage variant="header" />
            <div className={cls.helpHeadText}>
              <p className={cls.helpEyebrow}>{s('helpEyebrow')}</p>
              <DialogTitle as="h2" className={cls.helpTitle}>
                {dialog?.title}
              </DialogTitle>
            </div>
            <Button
              appearance="subtle"
              className={cls.helpClose}
              icon={<Dismiss20Regular />}
              aria-label={s('close')}
              onClick={() => {
                setDialog(null);
                returnFocusToHelp();
              }}
            />
          </div>
          {/* The body scrolls on its own on a short window, so it is a tab stop then (WCAG 2.1.1). */}
          <HelpBody className={cls.helpContent} label={dialog?.title ?? ''}>
            {dialog?.body}
          </HelpBody>
          <div className={cls.helpActions}>
            <div className={cls.helpExtra}>{dialog?.extra?.(() => setDialog(null))}</div>
            {/* The dialog's only action: the sheen, as boards 7b and 7c draw it. */}
            <SheenButton
              onClick={() => {
                setDialog(null);
                returnFocusToHelp();
              }}
            >
              {s('close')}
            </SheenButton>
          </div>
        </DialogSurface>
      </Dialog>
    </>
  );
}

/** A help dialog's body: it scrolls on its own on a short window, and is a tab stop only then, so the keyboard can
 * scroll it (WCAG 2.1.1). */
function HelpBody({ className, label, children }: { className: string; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [children]);
  return (
    <div ref={ref} className={className} tabIndex={scrolls ? 0 : undefined} role={scrolls ? 'region' : undefined} aria-label={scrolls ? label : undefined}>
      {children}
    </div>
  );
}

const GLOSSARY_GROUPS: { key: GlossaryGroup; label: StringKey }[] = [
  { key: 'roller', label: 'glossaryGroupRoles' },
  { key: 'henvisning', label: 'glossaryGroupReferral' },
  { key: 'atlas', label: 'glossaryGroupAtlas' },
];

const useGlossary = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  // The groups as Fluent tabs on the left and the search on the right, on one line over a rule, as a 365 help pane.
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: '16px',
    rowGap: '8px',
    minHeight: '44px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    paddingBlockEnd: '4px',
    // When the dialog's body scrolls, the groups and the search stay at its top.
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  // On a narrow window the three tabs wrap onto a second line rather than run past the dialog (G-03).
  tabs: { marginInlineStart: '-10px', flexWrap: 'wrap', minWidth: 0 },
  found: { ...typographyStyles.body1Strong, margin: 0 },
  search: { flex: '0 1 280px', minWidth: '200px', maxWidth: '100%' },
  count: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, marginInlineStart: '2px' },
  // The terms as cards in columns, so a group reads at a glance instead of down a long list.
  grid: { margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 248px), 1fr))', gap: '8px' },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingInline: '14px',
    paddingBlock: '10px',
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${guide.cardEdge}`,
    backgroundColor: guide.cardTop,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  term: { ...typographyStyles.body1Strong, margin: 0 },
  text: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  groupHead: { ...typographyStyles.caption1Strong, margin: 0, color: guide.ink },
  results: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  panel: { borderRadius: tokens.borderRadiusMedium, ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' } },
  empty: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
});

function GlossaryCards({ entries }: { entries: GlossaryEntry[] }) {
  const g = useGlossary();
  const { t } = useLang();
  return (
    <dl className={g.grid}>
      {entries.map((e) => (
        <div key={e.term.nb} className={g.card} data-glossary-term="">
          <dt className={g.term}>{t(e.term)}</dt>
          <dd className={g.text}>{t(e.text)}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Hjelp → Ordliste: the fifteen terms in three groups as tabs, each group as cards in columns, and a search across all
 * of them (ATLAS 3.3). Matches show under their group's name; how many is said once typing pauses (G-28).
 */
export function GlossaryBody() {
  const g = useGlossary();
  const { s, t } = useLang();
  const announce = useAtlasAnnounce();
  const [group, setGroup] = useState<GlossaryGroup>('roller');
  const [query, setQuery] = useState('');
  const tabsId = useId();
  const needle = query.trim().toLocaleLowerCase('nb');
  const hits = needle ? glossary.filter((e) => `${t(e.term)} ${t(e.text)} ${e.term.nb}`.toLocaleLowerCase('nb').includes(needle)) : [];
  useEffect(() => {
    if (!needle) return;
    const id = window.setTimeout(() => announce(hits.length ? s('glossaryFound', { n: hits.length }) : s('glossaryNoMatch')), 1000);
    return () => window.clearTimeout(id);
  }, [needle, hits.length, announce, s]);
  return (
    <div className={g.root} data-glossary="">
      <div className={g.bar}>
        {needle ? (
          <p className={g.found}>{hits.length ? s('glossaryFound', { n: hits.length }) : s('glossaryNoMatch')}</p>
        ) : (
          <TabList className={g.tabs} selectedValue={group} onTabSelect={(_, d) => setGroup(d.value as GlossaryGroup)} aria-label={s('helpGlossary')}>
            {GLOSSARY_GROUPS.map((x) => (
              <Tab key={x.key} value={x.key} id={`${tabsId}-${x.key}`} aria-controls={`${tabsId}-panel`}>
                {s(x.label)}{' '}
                <span className={g.count}>
                  {glossary.filter((e) => e.group === x.key).length}
                  <SrOnly>{` ${s('glossaryWords')}`}</SrOnly>
                </span>
              </Tab>
            ))}
          </TabList>
        )}
        <SearchBox
          className={g.search}
          value={query}
          onChange={(_, d) => setQuery(d.value)}
          // Esc in a search with text clears the search; only the next Esc closes the dialog.
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.stopPropagation();
              e.preventDefault();
              setQuery('');
            }
          }}
          placeholder={s('glossarySearch')}
          aria-label={s('glossarySearch')}
          dismiss={{ 'aria-label': s('clearSearch') }}
        />
      </div>
      {needle ? (
        hits.length ? (
          <div className={g.results}>
            {GLOSSARY_GROUPS.filter((x) => hits.some((e) => e.group === x.key)).map((x) => (
              <section key={x.key} className={g.results} aria-label={s(x.label)}>
                <h3 className={g.groupHead}>{s(x.label)}</h3>
                <GlossaryCards entries={hits.filter((e) => e.group === x.key)} />
              </section>
            ))}
          </div>
        ) : (
          <p className={g.empty}>{s('glossaryEmptyHint')}</p>
        )
      ) : (
        <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${group}`} tabIndex={0} className={g.panel}>
          <GlossaryCards entries={glossary.filter((e) => e.group === group)} />
        </div>
      )}
    </div>
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
