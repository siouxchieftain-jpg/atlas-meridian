import {
  Avatar,
  Button,
  Textarea,
  makeStyles,
  mergeClasses,
  tokens,
  typographyStyles,
  type ButtonProps,
  type TextareaProps,
} from '@fluentui/react-components';
import {
  Beaker16Regular,
  DataBarVertical16Regular,
  DocumentText16Regular,
  Note16Regular,
  People16Regular,
  People20Regular,
  Person16Regular,
  PersonFeedback16Regular,
  Stethoscope20Regular,
  Lightbulb16Regular,
} from '@fluentui/react-icons';
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import type { Role, Source } from '../content/types';
import { notes, vocab } from '../content';
import { useLang } from '../i18n/i18n';
import { atlasDawn, atlasSheen } from '../theme/constants';

/* ---------- Provenance label ---------- */

const provIcon: Record<Source, ReactNode> = {
  record: <DocumentText16Regular />,
  note: <Note16Regular />,
  selfReport: <PersonFeedback16Regular />,
  own: <Person16Regular />,
  gp: <Stethoscope20Regular fontSize={16} />,
  // G-22: `people` means «DPS, inntak».
  dps: <People16Regular />,
  dpsRecord: <DocumentText16Regular />,
  system: <DataBarVertical16Regular />,
  fictional: <Beaker16Regular />,
};

const useProv = makeStyles({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    paddingInline: tokens.spacingHorizontalXS,
    minHeight: '20px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    ...typographyStyles.caption1,
    whiteSpace: 'nowrap',
    // A narrow window (400 % zoom) lets the label wrap inside the chip rather than run out of its frame (r8A-01, r8A-06).
    '@media (max-width: 400px)': { whiteSpace: 'normal', overflowWrap: 'anywhere' },
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  system: { backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
});

/** Names where a block of information comes from (Analysis check 3). */
export function ProvenanceChip({ source, label }: { source: Source; label?: string }) {
  const cls = useProv();
  const { t } = useLang();
  return (
    <span className={mergeClasses(cls.chip, source === 'system' && cls.system)} data-provenance={source}>
      <span aria-hidden="true" style={{ display: 'inline-flex' }}>
        {provIcon[source]}
      </span>
      {label ?? t(vocab.sources[source])}
    </span>
  );
}

/* ---------- Panels and headings ---------- */

const usePanel = makeStyles({
  panel: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow2,
    paddingInline: tokens.spacingHorizontalL,
    paddingBlock: tokens.spacingVerticalL,
    minWidth: 0,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  flat: { boxShadow: 'none', border: `1px solid ${tokens.colorNeutralStroke2}` },
  tight: { paddingInline: tokens.spacingHorizontalM, paddingBlock: tokens.spacingVerticalM },
  sectionTitle: { ...typographyStyles.subtitle2, color: tokens.colorNeutralForeground1, margin: 0 },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalS,
  },
});

export function Panel({
  children,
  flat,
  tight,
  className,
  as = 'section',
  ...rest
}: {
  children: ReactNode;
  flat?: boolean;
  tight?: boolean;
  className?: string;
  as?: 'section' | 'div' | 'aside' | 'article';
  'aria-label'?: string;
  'aria-labelledby'?: string;
  id?: string;
}) {
  const cls = usePanel();
  const Tag = as;
  return (
    <Tag className={mergeClasses(cls.panel, flat && cls.flat, tight && cls.tight, className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHead({ title, children, id, level = 2 }: { title: string; children?: ReactNode; id?: string; level?: 2 | 3 }) {
  const cls = usePanel();
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <div className={cls.sectionHead}>
      <H className={cls.sectionTitle} id={id}>
        {title}
      </H>
      {children}
    </div>
  );
}

/* ---------- Role avatar (G-34) ---------- */

// Fluent paints the colours on the icon slot, so the brand tint goes there (G-34, MF-08).
const useAvatar = makeStyles({
  avatar: { boxShadow: `inset 0 0 0 1px ${tokens.colorBrandStroke2}`, borderRadius: tokens.borderRadiusCircular },
  icon: { backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground2 },
});

export function RoleAvatar({ role, size = 32 }: { role: Role; size?: 24 | 28 | 32 | 36 | 40 }) {
  const cls = useAvatar();
  return (
    <Avatar
      className={cls.avatar}
      size={size}
      aria-hidden="true"
      icon={{ className: cls.icon, children: role === 'gp' ? <Stethoscope20Regular /> : <People20Regular /> }}
    />
  );
}

/* ---------- Neutral status chip (lists) ---------- */

const useChip = makeStyles({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    paddingInline: tokens.spacingHorizontalS,
    minHeight: '22px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    ...typographyStyles.caption1,
    whiteSpace: 'nowrap',
    '@media (max-width: 400px)': { whiteSpace: 'normal', overflowWrap: 'anywhere' },
  },
  isNew: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
  },
});

export function StatusChip({ children, isNew }: { children: ReactNode; isNew?: boolean }) {
  const cls = useChip();
  return <span className={mergeClasses(cls.chip, isNew && cls.isNew)}>{children}</span>;
}

/* ---------- Growing textarea (G-33) ---------- */

export const GrowingTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function GrowingTextarea(props, ref) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inner.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  const grow = () => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    const max = Math.round(window.innerHeight * 0.6);
    el.style.height = `${Math.min(el.scrollHeight + 2, max)}px`;
  };
  useLayoutEffect(grow);
  useEffect(() => {
    window.addEventListener('resize', grow);
    return () => window.removeEventListener('resize', grow);
  }, []);
  // A locked text stays readable and in the Tab order: read-only rather than disabled (G-18).
  const { disabled, ...rest } = props;
  return (
    <Textarea
      resize="vertical"
      {...rest}
      readOnly={disabled || rest.readOnly}
      textarea={{ ref: setRef, 'aria-readonly': disabled || undefined, ...(rest.textarea as object) }}
    />
  );
});

/* ---------- Guide surface (dawn) and the sheen button ---------- */

const useGuide = makeStyles({
  surface: {
    background: atlasDawn,
    borderRadius: tokens.borderRadiusLarge,
    minHeight: '100%',
    paddingInline: 'clamp(16px, 5vw, 48px)',
    paddingBlock: 'clamp(24px, 5vw, 48px)',
    boxSizing: 'border-box',
    '@media print': { background: '#FFFFFF' },
    '@media (forced-colors: active)': { background: 'Canvas' },
  },
  column: { maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  wide: { maxWidth: '1040px' },
  sheen: {
    backgroundImage: atlasSheen.background,
    boxShadow: atlasSheen.shadow,
    border: 'none',
    color: tokens.colorNeutralForegroundOnBrand,
    ':hover': { backgroundImage: atlasSheen.background, color: tokens.colorNeutralForegroundOnBrand, filter: 'brightness(1.06)' },
    ':hover:active': { backgroundImage: atlasSheen.background, color: tokens.colorNeutralForegroundOnBrand, filter: 'brightness(0.94)' },
    '@media (forced-colors: active)': { backgroundImage: 'none', border: '1px solid ButtonText' },
  },
});

export function GuideSurface({ children, wide, className }: { children: ReactNode; wide?: boolean; className?: string }) {
  const cls = useGuide();
  return (
    <div className={mergeClasses(cls.surface, className)} data-guide-surface="">
      <div className={mergeClasses(cls.column, wide && cls.wide)}>{children}</div>
    </div>
  );
}

/** The one start action on a guide surface (never in clinical views). */
export function SheenButton(props: ButtonProps) {
  const cls = useGuide();
  return <Button appearance="primary" size="large" {...props} className={mergeClasses(cls.sheen, props.className)} />;
}

/* ---------- Design note (Merknader, review mode only) ---------- */

const useNote = makeStyles({
  note: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-start',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px dashed ${tokens.colorBrandStroke2}`,
    color: tokens.colorNeutralForeground1,
    ...typographyStyles.caption1,
  },
  icon: { color: tokens.colorBrandForeground2, flexShrink: 0, marginTop: '1px' },
  title: { ...typographyStyles.caption1Strong, display: 'block' },
});

export function DesignNote({ id, show }: { id: string; show: boolean }) {
  const cls = useNote();
  const { t } = useLang();
  const note = notes[id];
  if (!show || !note) return null;
  return (
    // A note, not a landmark: design notes sit inside <main> beside the parts they explain (1.3.1, AX-12).
    <div className={cls.note} role="note" aria-label={t(note.title)} data-note={id}>
      <Lightbulb16Regular className={cls.icon} aria-hidden="true" />
      <span>
        <span className={cls.title}>{t(note.title)}</span>
        {t(note.text)}
      </span>
    </div>
  );
}

/**
 * A checked ToggleButton shows its state with a brand outline and tint, not
 * grey alone (WCAG 1.4.11; Meridian: selected is brand).
 */
export const useSelectedToggle = makeStyles({
  // A 2 px brand edge (1 px border and a 1 px inset ring, so the size does not change), as G-20 asks.
  on: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    border: `1px solid ${tokens.colorBrandStroke1}`,
    boxShadow: `inset 0 0 0 1px ${tokens.colorBrandStroke1}`,
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover, color: tokens.colorBrandForeground2, border: `1px solid ${tokens.colorBrandStroke1}` },
    ':hover:active': { backgroundColor: tokens.colorBrandBackground2Pressed, color: tokens.colorBrandForeground2, border: `1px solid ${tokens.colorBrandStroke1}` },
    '@media (forced-colors: active)': { border: '2px solid Highlight' },
  },
});

/* ---------- Screen-reader-only text ---------- */

export const srOnly = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

export function SrOnly({ children }: { children: ReactNode }) {
  return <span style={srOnly}>{children}</span>;
}
