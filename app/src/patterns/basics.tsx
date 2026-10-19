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
import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { Role, Source } from '../content/types';
import { notes, vocab } from '../content';
import { useLang } from '../i18n/i18n';
import { atlasSheen, guide, guideImage, guideWave } from '../theme/constants';
import { useNotes } from './notesContext';
import { useStudyOptional } from '../state/study';

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

/* ---------- The guide card, the sheen button and the study name's mark ---------- */

/**
 * A guide card's surface (Meridian, two registers): the dawn in a card with a warm edge. Spread into a component's own
 * class; the artwork's band needs `position: relative` and `isolation: isolate`, which this gives.
 */
export const guideCardSurface = {
  position: 'relative',
  isolation: 'isolate',
  overflow: 'hidden',
  borderRadius: tokens.borderRadiusXLarge,
  border: `1px solid ${guide.cardEdge}`,
  background: guide.card,
  boxSizing: 'border-box',
  // On a guide card, captions use foreground 2: foreground 3 falls below 4.5:1 on the warm end (G-24).
  '& [data-muted]': { color: tokens.colorNeutralForeground2 },
  '@media print': { background: '#FFFFFF' },
  '@media (forced-colors: active)': { background: 'Canvas', border: '1px solid CanvasText' },
} as const;

const useGuide = makeStyles({
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

/* ---------- The guide layer's image ---------- */

/** The artwork behind every variant, set on the element: the organza, or a role's wave (see `guideArt`). */
const ART = 'var(--guide-art)';

const useGuideImage = makeStyles({
  base: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: -1,
    pointerEvents: 'none',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    '@media print': { display: 'none' },
    '@media (forced-colors: active)': { display: 'none' },
  },
  // Velkommen: the fabric on the right, white behind the text on the left; on a narrow screen the text runs over it, so a
  // white wash covers it all.
  hero: {
    backgroundImage: `linear-gradient(90deg,#FFFFFF 0%,rgba(255,255,255,0.9) 32%,rgba(255,255,255,0) 60%), ${ART}`,
    backgroundPosition: 'right 40%',
    opacity: 0.92,
    '@media (max-width: 1023px)': {
      backgroundImage: `linear-gradient(180deg,rgba(255,255,255,0.9) 0%,rgba(255,255,255,0.8) 60%,rgba(255,255,255,0.6) 100%), ${ART}`,
    },
  },
  // The top band of a guide card: the artwork fades into the card's own first colour, so there is no edge.
  band: {
    bottom: 'auto',
    height: '104px',
    backgroundImage: `linear-gradient(180deg,rgba(255,244,238,0) 45%,${guide.cardTop} 100%), ${ART}`,
    backgroundPosition: 'right 38%',
    opacity: 0.85,
  },
  // A profile card's cover (Om deg's study name): a taller band, as the picture over an account card in Microsoft 365.
  cover: {
    bottom: 'auto',
    // Taller with a taller card, so the fabric fills the top of it as board 8a draws it.
    height: 'max(168px, 44%)',
    backgroundImage: `linear-gradient(180deg,rgba(255,244,238,0) 55%,${guide.cardTop} 100%), ${ART}`,
    backgroundPosition: 'right 36%',
    opacity: 0.9,
  },
  // The briefing's task card: the fabric on the right, with a longer white wash, so the task's lines always end on white
  // (on a narrow window a wash covers it all, as on Velkommen).
  brief: {
    backgroundImage: `linear-gradient(90deg,#FFFFFF 0%,rgba(255,255,255,0.94) 50%,rgba(255,255,255,0) 80%), ${ART}`,
    backgroundPosition: 'right 40%',
    opacity: 0.9,
    '@media (max-width: 1023px)': {
      backgroundImage: `linear-gradient(180deg,rgba(255,255,255,0.92) 0%,rgba(255,255,255,0.82) 60%,rgba(255,255,255,0.62) 100%), ${ART}`,
    },
  },
  // The tour stage: the whole surface.
  stage: { backgroundImage: ART, backgroundPosition: 'right 40%', opacity: 0.8, '@media (max-width: 1023px)': { opacity: 0.45 } },
  // A dialog or panel header: white behind the title on the left, and the image fades out at the bottom into the body.
  header: {
    backgroundImage: `linear-gradient(90deg,rgba(255,255,255,0.92) 0%,rgba(255,255,255,0.55) 42%,rgba(255,255,255,0) 72%), ${ART}`,
    backgroundPosition: 'right 40%',
    opacity: 0.9,
    maskImage: 'linear-gradient(180deg,#000 35%,transparent 100%)',
    WebkitMaskImage: 'linear-gradient(180deg,#000 35%,transparent 100%)',
  },
  // The start page's greeting (3.4): the art has its own cell beside the text, so no text ever sits on it; its ribbons
  // fade in from the cell's left edge.
  home: {
    backgroundImage: ART,
    backgroundPosition: 'right 100%',
    opacity: 0.95,
    maskImage: 'linear-gradient(90deg,transparent 0%,rgba(0,0,0,0.55) 22%,#000 48%)',
    WebkitMaskImage: 'linear-gradient(90deg,transparent 0%,rgba(0,0,0,0.55) 22%,#000 48%)',
  },
});

/**
 * Where a wave sits in each frame. The organza's fabric fills the upper right; the waves are low and wide, their
 * colour gathered at the lower right, so each frame shows their lower edge.
 */
const WAVE_POSITION: Record<GuideVariant, string> = {
  hero: 'right 85%',
  band: 'right 100%',
  cover: 'right 92%',
  brief: 'right 92%',
  stage: 'right 100%',
  header: 'right 92%',
  home: 'right 100%',
};

type GuideVariant = 'hero' | 'brief' | 'band' | 'cover' | 'stage' | 'header' | 'home';

const HOME_CROP: Record<'gp' | 'dps', { size: string; position: string }> = {
  gp: { size: '150% auto', position: 'right 12%' },
  dps: { size: '135% auto', position: 'right 100%' },
};
export type GuideArt = 'organza' | 'gp' | 'dps';

/**
 * Which artwork a guide surface wears (3.4): the role chooses. The coral-led wave on every GP surface, the lavender-led
 * wave on every DPS surface, and the organza, where both colours fold together, where the roles meet: Velkommen with
 * the role choice, Takk, and review mode. One artwork per screen, never a sign of state.
 */
export function useGuideArt(): GuideArt {
  const study = useStudyOptional();
  return study?.role ?? 'organza';
}

/**
 * The guide layer's image behind a guide surface. Its parent needs `position: relative` and `isolation: isolate`.
 * Decoration only. `art` names the artwork where the surface is shared by both roles (Velkommen, Takk); elsewhere the
 * participant's role chooses it.
 */
export function GuideImage({ variant, art, className }: { variant: GuideVariant; art?: GuideArt; className?: string }) {
  const cls = useGuideImage();
  const byRole = useGuideArt();
  const chosen = art ?? byRole;
  const url = chosen === 'organza' ? guideImage : guideWave[chosen];
  // The greeting frames each wave on its own colour, so the role shows at a glance: the coral-led wave on its coral
  // arc, the lavender-led wave on its lavender ribbons.
  const crop = variant === 'home' && chosen !== 'organza' ? HOME_CROP[chosen] : undefined;
  const style = {
    '--guide-art': url,
    backgroundPosition: chosen === 'organza' ? undefined : (crop?.position ?? WAVE_POSITION[variant]),
    backgroundSize: crop?.size,
  } as CSSProperties;
  return <div aria-hidden="true" className={mergeClasses(cls.base, cls[variant], className)} style={style} data-guide-image={variant} data-guide-art={chosen} />;
}

/**
 * The one start action on a guide surface (Meridian: «Sheen»): a role card's start, «Fortsett der du slapp», the study
 * card's next step, the tour's way on, the briefing's «Start saken». Never in a clinical view.
 */
export function SheenButton(props: ButtonProps) {
  const cls = useGuide();
  return <Button appearance="primary" size="large" {...props} className={mergeClasses(cls.sheen, props.className)} />;
}

/** The one action of a working page (a form page, «Sendt»): a solid primary, as in any Fluent app. */
export function StartButton(props: ButtonProps) {
  return <Button appearance="primary" {...props} />;
}

const useNameMark = makeStyles({
  mark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusCircular,
    background: guide.nameMark,
    border: `1px solid ${guide.cardEdge}`,
    color: guide.ink,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '0.02em',
    boxSizing: 'border-box',
    userSelect: 'none',
    '@media (forced-colors: active)': { background: 'Canvas', color: 'CanvasText', border: '1px solid CanvasText' },
    '@media print': { background: '#FFFFFF' },
  },
  // A white ring where the mark sits on the cover's artwork, as an account picture sits on its banner.
  ring: { boxShadow: `0 0 0 3px ${tokens.colorNeutralBackground1}, ${tokens.shadow4}` },
  // The animal sits a touch above the centre, as an emoji's weight does; it never takes pointer events or a drag. A
  // hairline shadow keeps the white animals (hare, svane, gås) off the pale gradient. Forced colours drop the gradient
  // and keep a picture as drawn, so there the mark shows the initials instead.
  animal: {
    display: 'block',
    pointerEvents: 'none',
    userSelect: 'none',
    marginBlockStart: '-1px',
    filter: 'drop-shadow(0 0 0.6px rgba(36, 36, 36, 0.5))',
    '@media (forced-colors: active)': { display: 'none' },
  },
  initialsHidden: { display: 'none', '@media (forced-colors: active)': { display: 'inline' } },
});

/** «Stødig hval 54» → «SH»: the first letter of each of the name's two words. */
export function studyNameInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w.charAt(0).toLocaleUpperCase('nb'))
    .join('');
}

/**
 * The study names' twenty animals as Fluent Emoji (flat), Microsoft's open emoji set (MIT licence, see
 * `src/assets/animals/README.md`). Files are named by the animal, «æ», «ø» and «å» written «ae», «o» and «a»
 * («ørn» → `orn.svg`, «gås» → `gas.svg`).
 */
const ANIMALS = import.meta.glob('../assets/animals/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** The animal in a study name («Rolig elg 27» → «elg») and its picture, when ATLAS has one for it. */
export function studyNameAnimal(name: string): { animal: string; url: string } | undefined {
  const animal = name.split(/\s+/)[1]?.toLocaleLowerCase('nb');
  if (!animal) return undefined;
  const file = animal.replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a');
  const url = ANIMALS[`../assets/animals/${file}.svg`];
  return url ? { animal, url } : undefined;
}

/** 28 px is the smallest mark: below it the animals blur (an eagle or a badger at 24 px is a smudge). */
type MarkSize = 28 | 32 | 40 | 48 | 56 | 64;
const MARK_TEXT: Record<MarkSize, string> = { 28: '11px', 32: '12px', 40: '14px', 48: '17px', 56: '20px', 64: '22px' };

/**
 * The study name's mark: the name's animal on the guide's warm gradient (its initials when ATLAS has no picture of the
 * animal), like the picture on an account in Microsoft 365. It stands for the participant's study name, never a person,
 * and is decoration: the name is always written beside it, so the mark and its picture have no text of their own.
 */
export function StudyNameMark({ name, size = 32, ring, className }: { name: string; size?: MarkSize; ring?: boolean; className?: string }) {
  const cls = useNameMark();
  const animal = studyNameAnimal(name);
  const inner = Math.round(size * 0.6);
  return (
    <span
      aria-hidden="true"
      className={mergeClasses(cls.mark, ring && cls.ring, className)}
      style={{ width: size, height: size, fontSize: MARK_TEXT[size], lineHeight: 1 }}
      data-name-mark=""
      data-animal={animal?.animal}
    >
      {animal ? (
        <>
          <img src={animal.url} alt="" width={inner} height={inner} draggable={false} className={cls.animal} />
          <span className={cls.initialsHidden}>{studyNameInitials(name)}</span>
        </>
      ) : (
        studyNameInitials(name)
      )}
    </span>
  );
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
  // The number on the part's corner, centred on the corner of its ring (the ring lies 3 to 5 px outside the
  // part), so it clears the part's first line of text. It sits outside the flow: turning Merknader on moves nothing.
  marker: {
    position: 'absolute',
    top: '-16px',
    left: '-16px',
    zIndex: 2,
    width: '24px',
    height: '24px',
    boxSizing: 'border-box',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadiusCircular,
    border: '2px solid #FFFFFF',
    background: guide.mark,
    boxShadow: '0 0 2px rgba(0,0,0,0.20), 0 2px 4px rgba(0,0,0,0.20)',
    color: tokens.colorNeutralForeground1,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1,
    cursor: 'pointer',
    transitionProperty: 'transform',
    transitionDuration: '0.1s',
    ':hover': { transform: 'scale(1.08)' },
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
    '@media (forced-colors: active)': { background: 'ButtonFace', color: 'ButtonText', border: '1px solid ButtonText' },
    '@media print': { display: 'none' },
  },
});

/**
 * A design note, in review mode with Merknader on: a numbered marker on the
 * corner of the part it sits in, and a ring round that part. The note itself
 * opens in the Merknader drawer. Outside review mode it never shows.
 */
export function DesignNote({ id, show }: { id: string; show: boolean }) {
  const cls = useNote();
  const { t, s } = useLang();
  const api = useNotes();
  const ref = useRef<HTMLButtonElement | null>(null);
  const note = notes[id];
  const active = show && !!note && !!api;
  const register = api?.register;
  const selected = api?.selected === id;
  // The part is the element the note sits in: it carries the marker, so it is positioned while the note shows.
  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!active || !register || !el) return;
    const prev = el.style.position;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const unregister = register(id, el);
    return () => {
      unregister();
      el.style.position = prev;
    };
  }, [active, register, id]);
  // The chosen note's part in coral, the others in peach. An outline takes no room, so nothing moves.
  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!active || !el) return;
    const prevOutline = el.style.outline;
    const prevOffset = el.style.outlineOffset;
    el.style.outline = selected ? `3px solid ${guide.coral}` : `2px solid ${guide.peach}`;
    el.style.outlineOffset = '3px';
    return () => {
      el.style.outline = prevOutline;
      el.style.outlineOffset = prevOffset;
    };
  }, [active, selected]);
  if (!show || !note) return null;
  if (!api) {
    // No Merknader drawer here: the note as text beside its part.
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
  const n = api.entries.findIndex((e) => e.id === id) + 1;
  return (
    <button
      ref={ref}
      type="button"
      className={cls.marker}
      data-note={id}
      aria-label={s('notesMarker', { n: n || '', title: t(note.title) })}
      onClick={() => api.select(id, { focusDrawer: true })}
    >
      {n > 0 ? n : ''}
    </button>
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

export function SrOnly({ children, as = 'span' }: { children: ReactNode; as?: 'span' | 'h2' | 'p' }) {
  const Tag = as;
  return <Tag style={srOnly}>{children}</Tag>;
}
