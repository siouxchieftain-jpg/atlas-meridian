import {
  Button,
  Field,
  InfoButton,
  ToggleButton,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import {
  CheckmarkCircle16Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  Circle16Regular,
  Checkmark12Regular,
  People16Regular,
} from '@fluentui/react-icons';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { ConfLevel, CriterionId, Letter, TagId } from '../content/types';
import { vocab } from '../content';
import { CRITERIA_ORDER } from '../engine/criteria';
import { formatDate, useLang } from '../i18n/i18n';
import { ChoiceGroup } from './ChoiceGroup';
import { GrowingTextarea, ProvenanceChip, useSelectedToggle } from './basics';
import { useAtlasAnnounce } from './announce';

/* ---------- Informasjonsguiden ---------- */

const useGuide = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  count: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  hint: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  item: {
    display: 'grid',
    gridTemplateColumns: '20px 1fr auto',
    columnGap: tokens.spacingHorizontalS,
    alignItems: 'start',
    paddingBlock: tokens.spacingVerticalXS,
    borderTop: `1px solid ${tokens.colorNeutralStroke3}`,
    ...typographyStyles.body1,
  },
  state: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, whiteSpace: 'nowrap', '@media (max-width: 400px)': { whiteSpace: 'normal', overflowWrap: 'anywhere' } },
  looksFor: { gridColumn: '2 / 4', ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  icon: { marginTop: '2px', color: tokens.colorNeutralForeground2 },
  toggle: { alignSelf: 'flex-start', paddingInline: 0, minWidth: 0 },
});

/** Informasjonsguiden: what a text mentions of the five criteria. Never a gate, never a percentage. */
export function InfoGuide({
  mentioned,
  mode,
  defaultOpen = false,
  showLooksFor = true,
}: {
  mentioned: CriterionId[];
  mode: 'note' | 'draft' | 'received' | 'sent';
  defaultOpen?: boolean;
  showLooksFor?: boolean;
}) {
  const cls = useGuide();
  const { s, t } = useLang();
  const [open, setOpen] = useState(defaultOpen);
  const listId = useId();
  const hint =
    mode === 'note' ? s('guideReadsNote') : mode === 'draft' ? s('guideReadsDraft') : mode === 'sent' ? s('guideAsSent') : s('guideAsReceived');
  // While the referral is written, a changed count is said once the writer pauses (MF-13, G-32),
  // through the app's one announcer and only from the instance on screen.
  const announce = useAtlasAnnounce();
  const rootRef = useRef<HTMLDivElement>(null);
  const said = useRef(mentioned.length);
  useEffect(() => {
    if (mode !== 'draft' || mentioned.length === said.current) return;
    const id = window.setTimeout(() => {
      said.current = mentioned.length;
      if (rootRef.current?.offsetParent) announce(s('guideCount', { n: mentioned.length }));
    }, 1500);
    return () => window.clearTimeout(id);
  }, [mode, mentioned.length, announce, s]);
  return (
    <div className={cls.root} data-guide={mode} ref={rootRef}>
      <div className={cls.head}>
        <span className={cls.count}>{s('guideCount', { n: mentioned.length })}</span>
        <Button
          appearance="transparent"
          size="small"
          className={cls.toggle}
          icon={open ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen(!open)}
        >
          {open ? s('hideDetails') : s('showDetails')}
        </Button>
      </div>
      <span className={cls.hint}>{hint}</span>
      <ul className={cls.list} id={listId} hidden={!open}>
        {CRITERIA_ORDER.map((c) => {
          const on = mentioned.includes(c);
          return (
            <li key={c} className={cls.item}>
              <span className={cls.icon} aria-hidden="true">
                {on ? <CheckmarkCircle16Regular /> : <Circle16Regular />}
              </span>
              <span>{t(vocab.criteria[c].label)}</span>
              {/* The same words as the margin beside a draft: «Ikke funnet ennå» while it is written (r5A-04). */}
              <span className={cls.state}>{on ? s('mentioned') : mode === 'draft' ? s('notMentionedYet') : s('notMentioned')}</span>
              {showLooksFor && <span className={cls.looksFor}>{t(vocab.criteria[c].dpsLooksFor)}</span>}
            </li>
          );
        })}
        <li className={cls.item}>
          <span className={cls.icon} aria-hidden="true">
            <People16Regular />
          </span>
          <span>{t(vocab.behandlingsnytte.label)}</span>
          <span className={cls.state}>{t(vocab.behandlingsnytte.text)}</span>
        </li>
      </ul>
    </div>
  );
}

/* ---------- Own confidence: five verbal steps ---------- */

export function ConfidenceScale({
  value,
  onChange,
  disabled,
  note,
}: {
  value?: ConfLevel;
  onChange: (v: ConfLevel) => void;
  disabled?: boolean;
  note?: string;
}) {
  const { s, t } = useLang();
  const noteId = useId();
  return (
    <div>
      <ChoiceGroup<ConfLevel>
        legend={s('confidenceTitle')}
        chip={<ProvenanceChip source="own" />}
        layout="scale"
        value={value}
        onChange={onChange}
        disabled={disabled}
        describedBy={note ? noteId : undefined}
        choices={vocab.confidenceOrder.map((c) => ({ value: c, label: t(vocab.confidence[c]) }))}
      />
      {note && (
        <p id={noteId} style={{ margin: '6px 0 0', fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200, color: tokens.colorNeutralForeground3 }}>
          {note}
        </p>
      )}
    </div>
  );
}

/* ---------- Hva er uklart: three tags with definitions, and a description ---------- */

const useTags = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  legend: { ...typographyStyles.subtitle2, margin: 0, color: tokens.colorNeutralForeground1 },
  headRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: tokens.spacingHorizontalS, rowGap: tokens.spacingVerticalXXS },
  row: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  tag: { display: 'inline-flex', alignItems: 'center' },
  // Meridian's tag: filled #F5F5F5, radius 4, 32 px; selected is the brand selected style (R2A-11).
  tagBtn: {
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    ':hover': { backgroundColor: tokens.colorNeutralBackground3Hover, border: `1px solid ${tokens.colorNeutralStroke1Hover}` },
    ':hover:active': { backgroundColor: tokens.colorNeutralBackground3Pressed },
  },
  info: { minWidth: '24px', marginInlineStart: '2px' },
  // Above the review tab (z-index 880), which would otherwise hide the end of the note at 320 to 414 px (r9A-02).
  def: { maxWidth: '260px', ...typographyStyles.body1, zIndex: 900 },
  readOnlyTag: {
    display: 'inline-flex',
    alignItems: 'center',
    paddingInline: tokens.spacingHorizontalS,
    minHeight: '24px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    ...typographyStyles.caption1,
  },
});

/**
 * A tag's definition: Fluent's InfoButton, whose note is rendered in place
 * (in the reading order) and closes when focus moves on, so it never covers
 * the next tag (WCAG 2.4.11, 1.3.2).
 */
function TagDefinition({ tag }: { tag: TagId }) {
  const cls = useTags();
  const { s, t } = useLang();
  return (
    <InfoButton
      size="medium"
      className={cls.info}
      aria-label={s('definitionOf', { tag: t(vocab.tags[tag].label) })}
      info={{ children: t(vocab.tags[tag].definition), className: cls.def }}
    />
  );
}

const TAG_ORDER: TagId[] = ['diagnostisk', 'terskel', 'epistemisk'];

export function UncertaintyTags({
  tags,
  description,
  onTags,
  onDescription,
  disabled,
  hint,
}: {
  tags: TagId[];
  description: string;
  onTags: (tags: TagId[]) => void;
  onDescription: (text: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const cls = useTags();
  const sel = useSelectedToggle();
  const { s, t } = useLang();
  const legendId = useId();
  return (
    <div className={cls.root} role="group" aria-labelledby={legendId}>
      <div className={cls.headRow}>
        <h3 className={cls.legend} id={legendId}>
          {s('unclearTitle')}
        </h3>
        <ProvenanceChip source="own" />
      </div>
      <div className={cls.row}>
        {TAG_ORDER.map((tag) => {
          const on = tags.includes(tag);
          return (
            <span key={tag} className={cls.tag}>
              <ToggleButton
                shape="rounded"
                checked={on}
                className={mergeClasses(cls.tagBtn, on && sel.on)}
                icon={on ? <Checkmark12Regular /> : undefined}
                disabledFocusable={disabled}
                onClick={() => {
                  if (!disabled) onTags(on ? tags.filter((x) => x !== tag) : [...tags, tag]);
                }}
              >
                {t(vocab.tags[tag].label)}
              </ToggleButton>
              <TagDefinition tag={tag} />
            </span>
          );
        })}
      </div>
      <Field label={s('unclearDescribe')} hint={hint}>
        <GrowingTextarea value={description} disabled={disabled} onChange={(_, d) => onDescription(d.value)} rows={2} />
      </Field>
    </div>
  );
}

/** Read-only tags (the GP's tags as DPS receives them). */
export function TagList({ tags }: { tags: TagId[] }) {
  const cls = useTags();
  const { t } = useLang();
  if (!tags.length) return null;
  return (
    <div className={cls.row}>
      {tags.map((tag) => (
        <span key={tag} className={cls.tag}>
          <span className={cls.readOnlyTag}>{t(vocab.tags[tag].label)}</span>
          <TagDefinition tag={tag} />
        </span>
      ))}
    </div>
  );
}

/* ---------- A plain letter (case-only states) ---------- */

const useLetter = makeStyles({
  letter: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  meta: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalL, ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  title: { ...typographyStyles.subtitle2, margin: 0 },
  body: { ...typographyStyles.body1, whiteSpace: 'pre-line', margin: 0 },
});

export function PlainLetter({ letter, source }: { letter: Letter; source?: 'dps' | 'gp' | 'record' | 'dpsRecord' }) {
  const cls = useLetter();
  const { s, t, lang } = useLang();
  return (
    <article className={cls.letter}>
      <div className={cls.meta}>
        <span>
          {s('letterFrom')}: {t(letter.from)}
        </span>
        <span>
          {s('letterDate')}: {formatDate(letter.date, lang)}
        </span>
        {source && <ProvenanceChip source={source} />}
      </div>
      <h3 className={cls.title}>{t(letter.title)}</h3>
      <p className={cls.body}>{t(letter.body)}</p>
    </article>
  );
}

/* ---------- Key and value rows ---------- */

const useRows = makeStyles({
  dl: { margin: 0, display: 'grid', gridTemplateColumns: 'minmax(120px, max-content) 1fr', columnGap: tokens.spacingHorizontalL, rowGap: tokens.spacingVerticalS },
  dt: { ...typographyStyles.body1Strong, color: tokens.colorNeutralForeground1 },
  dd: { margin: 0, ...typographyStyles.body1, color: tokens.colorNeutralForeground1, minWidth: 0 },
  narrow: {
    '@media only screen and (max-width: 639px)': { gridTemplateColumns: '1fr', rowGap: tokens.spacingVerticalXXS },
  },
});

export function Rows({ rows }: { rows: { label: ReactNode; value: ReactNode }[] }) {
  const cls = useRows();
  return (
    <dl className={mergeClasses(cls.dl, cls.narrow)}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt className={cls.dt}>{r.label}</dt>
          <dd className={cls.dd}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
