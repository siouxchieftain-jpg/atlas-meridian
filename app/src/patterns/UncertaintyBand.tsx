import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { useId, type ReactNode } from 'react';
import type { Role } from '../content/types';
import { vocab } from '../content';
import { useLang } from '../i18n/i18n';
import { band } from '../theme/constants';

/**
 * The uncertainty band, Meridian option C (settled): grey ends, sand grey
 * zone, no number, no ticks, never animates. The SVG is decorative
 * (aria-hidden); the sentence beside it is the text equivalent. The viewer's
 * own marker is always ink, the other clinician's always white with a grey
 * outline, the system reading always lavender, in every view.
 */
export interface BandProps {
  own?: number;
  other?: { role: Role; value: number };
  system?: number;
  /** The describing sentence (the accessible text). */
  sentence?: ReactNode;
  /** Show the legend under the band when more than one marker is drawn. */
  legend?: boolean;
  /** Click on the track to place (mouse convenience; the keyboard path is the placement control). */
  onTrackClick?: (fraction: number) => void;
  /** Smaller vertical spacing. */
  compact?: boolean;
  className?: string;
}

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: 0 },
  svgWrap: { position: 'relative', paddingInline: '4px' },
  clickable: { cursor: 'pointer' },
  svg: {
    display: 'block',
    width: '100%',
    height: `${band.markerHeight + 6}px`,
    overflow: 'visible',
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact',
  },
  // The track's colours come from its gradient; in forced colours it turns GrayText and the
  // grey zone is drawn as its own outlined block, which is hidden otherwise.
  track: { '@media (forced-colors: active)': { forcedColorAdjust: 'none', fill: 'GrayText' } },
  sand: {
    display: 'none',
    '@media (forced-colors: active)': { display: 'inline', forcedColorAdjust: 'none', fill: 'Canvas', stroke: 'CanvasText', strokeWidth: '1px' },
  },
  own: { fill: band.ownMarker.colour, '@media (forced-colors: active)': { forcedColorAdjust: 'none', fill: 'CanvasText' } },
  ownKey: { fill: band.ownMarker.keyline, '@media (forced-colors: active)': { forcedColorAdjust: 'none', fill: 'Canvas' } },
  other: {
    fill: band.otherMarker.fill,
    stroke: band.otherMarker.outline,
    strokeWidth: '1px',
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', fill: 'Canvas', stroke: 'CanvasText' },
  },
  system: { fill: band.systemMarker.colour, '@media (forced-colors: active)': { forcedColorAdjust: 'none', fill: 'Highlight' } },
  ends: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground3,
  },
  middle: { textAlign: 'center' },
  sentence: { ...typographyStyles.body1, color: tokens.colorNeutralForeground1, marginTop: tokens.spacingVerticalXXS },
  caption: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalXXS,
    ...typographyStyles.caption1,
    color: tokens.colorNeutralForeground2,
  },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  swatchOwn: {
    width: '3px',
    height: '12px',
    backgroundColor: band.ownMarker.colour,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'CanvasText' },
  },
  swatchOther: {
    width: '6px',
    height: '12px',
    boxSizing: 'border-box',
    backgroundColor: band.otherMarker.fill,
    border: `1px solid ${band.otherMarker.outline}`,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'Canvas', border: '1px solid CanvasText' },
  },
  swatchSystem: {
    width: '4px',
    height: '12px',
    backgroundColor: band.systemMarker.colour,
    '@media (forced-colors: active)': { forcedColorAdjust: 'none', backgroundColor: 'Highlight' },
  },
  compact: { gap: '2px' },
});

const clamp = (v: number) => Math.min(99, Math.max(1, v));

function Marker({ value, kind, cls }: { value: number; kind: 'own' | 'other' | 'system'; cls: ReturnType<typeof useStyles> }) {
  const x = `${clamp(value)}%`;
  const h = band.markerHeight;
  if (kind === 'own') {
    return (
      <svg x={x} y={3} overflow="visible">
        <rect className={cls.ownKey} x={-2.5} y={-1} width={5} height={h + 2} />
        <rect className={cls.own} x={-1.5} y={0} width={band.ownMarker.width} height={h} rx={1} />
      </svg>
    );
  }
  if (kind === 'other') {
    return (
      <svg x={x} y={3} overflow="visible">
        <rect className={cls.other} x={-3} y={0.5} width={band.otherMarker.width} height={h - 1} rx={1} />
      </svg>
    );
  }
  return (
    <svg x={x} y={3} overflow="visible">
      <rect className={cls.system} x={-2} y={0} width={band.systemMarker.width} height={h} rx={2} />
    </svg>
  );
}

export function UncertaintyBand({ own, other, system, sentence, legend, onTrackClick, compact, className }: BandProps) {
  const cls = useStyles();
  const { t } = useLang();
  const descId = useId();
  // A plain id for url(#…): React's useId may contain characters a URL fragment does not take.
  const gradId = `band${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const y = 3 + band.markerHeight / 2 - band.trackHeight / 2;
  const count = [own, other?.value, system].filter((v) => v !== undefined).length;

  return (
    <div className={mergeClasses(cls.root, compact && cls.compact, className)} data-band="">
      <div
        className={mergeClasses(cls.svgWrap, onTrackClick && cls.clickable)}
        onClick={
          onTrackClick
            ? (e) => {
                const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                onTrackClick(Math.min(1, Math.max(0, (e.clientX - r.left - 4) / (r.width - 8))));
              }
            : undefined
        }
      >
        <svg className={cls.svg} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={band.endGrey} />
              <stop offset={band.fadeStart} stopColor={band.endGrey} />
              <stop offset={band.greyZoneStart} stopColor={band.sand} />
              <stop offset={band.greyZoneEnd} stopColor={band.sand} />
              <stop offset={band.fadeEnd} stopColor={band.endGrey} />
              <stop offset="1" stopColor={band.endGrey} />
            </linearGradient>
          </defs>
          <rect className={cls.track} x="0" y={y} width="100%" height={band.trackHeight} rx={band.trackHeight / 2} fill={`url(#${gradId})`} />
          <rect
            className={cls.sand}
            x={`${band.greyZoneStart * 100}%`}
            y={y}
            width={`${(band.greyZoneEnd - band.greyZoneStart) * 100}%`}
            height={band.trackHeight}
          />
          {other && <Marker value={other.value} kind="other" cls={cls} />}
          {system !== undefined && <Marker value={system} kind="system" cls={cls} />}
          {own !== undefined && <Marker value={own} kind="own" cls={cls} />}
        </svg>
      </div>
      <div className={cls.ends}>
        <span>{t(vocab.band.left)}</span>
        <span className={cls.middle}>{t(vocab.band.middle)}</span>
        <span>{t(vocab.band.right)}</span>
      </div>
      {legend && count > 1 && (
        <div className={cls.legend} aria-hidden="true">
          {own !== undefined && (
            <span className={cls.legendItem}>
              <span className={cls.swatchOwn} />
              {t(vocab.band.own)}
            </span>
          )}
          {other && (
            <span className={cls.legendItem}>
              <span className={cls.swatchOther} />
              {t(vocab.band.other[other.role])}
            </span>
          )}
          {system !== undefined && (
            <span className={cls.legendItem}>
              <span className={cls.swatchSystem} />
              {t(vocab.band.system)}
            </span>
          )}
        </div>
      )}
      {sentence && (
        <div className={cls.sentence} id={descId}>
          {sentence}
        </div>
      )}
      <div className={cls.caption}>{t(vocab.band.caption)}</div>
    </div>
  );
}
