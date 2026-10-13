import { Button, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { ChevronDown16Regular, ChevronRight16Regular } from '@fluentui/react-icons';
import { useEffect, useId, useRef, useState } from 'react';
import type { Role, SystemReading } from '../content/types';
import { vocab } from '../content';
import { useLang } from '../i18n/i18n';
import { positionKey } from '../engine/placement';
import { DesignNote, ProvenanceChip } from '../patterns/basics';
import { useAtlasAnnounce } from '../patterns/announce';
import { PlacementControl, snapFraction } from '../patterns/PlacementControl';
import { UncertaintyBand } from '../patterns/UncertaintyBand';
import { band } from '../theme/constants';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  title: { ...typographyStyles.subtitle2, margin: 0 },
  reading: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    position: 'relative',
    '::before': {
      content: '""',
      position: 'absolute',
      left: '-1px',
      top: '10px',
      bottom: '10px',
      width: '3px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: band.systemMarker.colour,
    },
    '@media (forced-colors: active)': { '::before': { backgroundColor: 'Highlight', forcedColorAdjust: 'none' } },
  },
  readingHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  readingTitle: { ...typographyStyles.body1Strong, margin: 0 },
  readingText: { ...typographyStyles.body1, margin: 0 },
  illustration: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  toggle: { alignSelf: 'flex-start', paddingInline: 0, minWidth: 0 },
  waits: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  sentences: { display: 'flex', flexDirection: 'column', gap: '2px' },
});

/** «Systemets lesning» with its Resonnement, labelled as written for the vignette. */
export function ReadingBlock({ reading, notes }: { reading: SystemReading; notes?: boolean }) {
  const cls = useStyles();
  const { s, t } = useLang();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={cls.reading} data-reading="">
      <div className={cls.readingHead}>
        <h4 className={cls.readingTitle}>{s('readingTitle')}</h4>
        <ProvenanceChip source="system" label={s('illustrationChip')} />
      </div>
      <p className={cls.readingText}>{t(reading.summary)}</p>
      <Button
        appearance="transparent"
        size="small"
        className={cls.toggle}
        icon={open ? <ChevronDown16Regular /> : <ChevronRight16Regular />}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {t(vocab.band.reasoningLabel)}
      </Button>
      <p className={cls.readingText} id={id} hidden={!open}>
        {t(reading.reasoning)}
      </p>
      <p className={cls.illustration}>{t(vocab.band.illustration)}</p>
      <DesignNote id="systemets-lesning" show={!!notes} />
    </div>
  );
}

/**
 * Usikkerhetsvisning: the viewer places the case first (B7); only then does
 * the band show the other clinician's marker and the system's reading.
 */
export function BandSection({
  viewer,
  own,
  onPlace,
  other,
  reading,
  readOnly,
  notes,
  headingLevel = 3,
}: {
  viewer: Role;
  own?: number;
  onPlace?: (value: number) => void;
  /** The other clinician's placement; drawn only after the viewer has placed. */
  other?: { role: Role; value: number };
  reading?: SystemReading;
  readOnly?: boolean;
  notes?: boolean;
  headingLevel?: 2 | 3;
}) {
  const cls = useStyles();
  const { s } = useLang();
  const announce = useAtlasAnnounce();
  const rootRef = useRef<HTMLElement>(null);
  const placed = own !== undefined;
  const H = headingLevel === 2 ? 'h2' : 'h3';
  const pos = (v: number) => s(positionKey(v));
  const showOther = placed && other;
  const showSystem = placed && reading;
  // The first placement reveals the other marker and the reading: say what appeared, once,
  // from the instance on screen (the inline panel and the drawer can both be mounted).
  const wasPlaced = useRef(placed);
  useEffect(() => {
    if (placed && !wasPlaced.current && (other || reading) && rootRef.current?.offsetParent) {
      const parts = [
        other ? s(other.role === 'gp' ? 'bandOtherSentenceGp' : 'bandOtherSentenceDps', { pos: s(positionKey(other.value)) }) : '',
        reading ? s('bandSystemSentence', { pos: s(positionKey(reading.placement)) }) : '',
      ].filter(Boolean);
      announce(parts.join(' '));
    }
    wasPlaced.current = placed;
  }, [placed, other, reading, announce, s]);
  const sentence = (
    <div className={cls.sentences}>
      <span>{placed ? s('bandOwnSentence', { pos: pos(own!) }) : s('bandNotPlaced')}</span>
      {showOther && <span>{s(other!.role === 'gp' ? 'bandOtherSentenceGp' : 'bandOtherSentenceDps', { pos: pos(other!.value) })}</span>}
      {showSystem && <span>{s('bandSystemSentence', { pos: pos(reading!.placement) })}</span>}
    </div>
  );
  return (
    <section ref={rootRef} className={cls.root} aria-label={s('bandTitle')} data-section="band">
      <div className={cls.head}>
        <H className={cls.title}>{s('bandTitle')}</H>
        {placed && <ProvenanceChip source="own" />}
      </div>
      <UncertaintyBand
        own={own}
        other={showOther ? other : undefined}
        system={showSystem ? reading!.placement : undefined}
        legend
        sentence={sentence}
        onTrackClick={!readOnly && onPlace ? (f) => onPlace(snapFraction(f)) : undefined}
      />
      {!readOnly && onPlace && <PlacementControl value={own} onChange={onPlace} hint={placed ? undefined : s('bandPlaceHint')} />}
      <DesignNote id={viewer === 'gp' ? 'band' : 'dps-band'} show={!!notes} />
      {reading && !placed && <p className={cls.waits}>{s('readingWaits')}</p>}
      {showSystem && <ReadingBlock reading={reading!} notes={notes} />}
    </section>
  );
}

/** The compact band at the top of narrow screens, so uncertainty stays visible (G-01). */
export function CompactBand({ own, other, reading }: { own?: number; other?: { role: Role; value: number }; reading?: SystemReading }) {
  const { s } = useLang();
  const placed = own !== undefined;
  const pos = (v: number) => s(positionKey(v));
  return (
    <div
      style={{
        background: tokens.colorNeutralBackground1,
        borderRadius: tokens.borderRadiusLarge,
        boxShadow: tokens.shadow2,
        padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
      }}
    >
      <UncertaintyBand
        compact
        own={own}
        other={placed ? other : undefined}
        system={placed && reading ? reading.placement : undefined}
        // Every marker drawn is named in the sentence and the legend (G-25, WCAG 1.1.1).
        legend={placed && !!(other || reading)}
        sentence={
          <span>
            {placed ? s('bandOwnSentence', { pos: pos(own!) }) : s('bandNotPlaced')}
            {placed && other ? ` ${s(other.role === 'gp' ? 'bandOtherSentenceGp' : 'bandOtherSentenceDps', { pos: pos(other.value) })}` : ''}
            {placed && reading ? ` ${s('bandSystemSentence', { pos: pos(reading.placement) })}` : ''}
          </span>
        }
      />
    </div>
  );
}
