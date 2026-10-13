/**
 * Meridian values that are not Fluent tokens. One module, so nothing else
 * hand-writes these colours or sizes.
 */

/** Uncertainty band, option C (settled). */
export const band = {
  trackHeight: 6,
  endGrey: '#D1D1D1',
  sand: '#D6C8A0',
  /** The grey zone (sand) spans 40 to 60 per cent of the track. */
  greyZoneStart: 0.4,
  greyZoneEnd: 0.6,
  /** The track fades into and out of the grey zone (Meridian sample: 28 to 40 and 60 to 72 per cent). */
  fadeStart: 0.28,
  fadeEnd: 0.72,
  ownMarker: { width: 3, colour: '#242424', keyline: '#FFFFFF' },
  otherMarker: { width: 6, fill: '#FFFFFF', outline: '#616161' },
  systemMarker: { width: 4, colour: '#7160E8' },
  markerHeight: 16,
} as const;

/** The neutral proportion bar in Mitt henvisningsmønster: greys only, never status colours (B1). */
export const neutralBar = ['#424242', '#8A8A8A', '#C7C7C7', '#F0F0F0'] as const;

/** Guide surfaces only: welcome, tour, briefings, sent and debrief pages. */
export const atlasDawn =
  'radial-gradient(22% 34% at 76% 36%,#FDCFB4 0%,rgba(253,207,180,0) 75%),' +
  'radial-gradient(44% 64% at 78% 34%,#FEE5D7 0%,rgba(254,229,215,0) 72%),' +
  'radial-gradient(36% 50% at 56% 4%,#FBDDF0 0%,rgba(251,221,240,0) 72%),' +
  'radial-gradient(40% 58% at 96% 86%,#D2CCF8 0%,rgba(210,204,248,0) 72%),' +
  'radial-gradient(50% 65% at 0% 100%,#E7E4FB 0%,rgba(231,228,251,0) 70%),' +
  '#FFFFFF';

/** The app frame behind white content panels (ATLAS's stand-in for Mica). */
export const atlasFrameWash = 'linear-gradient(90deg,#F5F5F5 0%,#F9F8FE 100%)';

/** The one start action on a guide surface. */
export const atlasSheen = {
  background: 'linear-gradient(135deg,#7160E8 0%,#3F3682 100%)',
  shadow: '0 0 2px rgba(0,0,0,0.30), 0 2px 4px rgba(0,0,0,0.25)',
} as const;

/** Sizes Fluent has no token for (G-11). */
export const size = {
  header: 48,
  rail: 48,
  nav: 260,
  atlasPanel: 320,
  formPanel: 440,
  contentMin: 640,
  /** With the ATLAS panel inline, the case column may narrow to this before the form panel overlays (AX-01). */
  contentMinWithAtlas: 520,
  contentMax: 1600,
  panelInset: 8,
} as const;

/** Size classes (G-01). Keys match the renderer's compareMediaQueries order. */
export const mq = {
  medium: '@media only screen and (min-width: 480px)',
  large: '@media only screen and (min-width: 640px)',
  xlarge: '@media only screen and (min-width: 1024px)',
  xxlarge: '@media only screen and (min-width: 1366px)',
  xxxlarge: '@media only screen and (min-width: 1920px)',
  belowLarge: '@media only screen and (max-width: 639px)',
  belowXlarge: '@media only screen and (max-width: 1023px)',
} as const;

export const mediaQueryOrder = [
  'only screen and (min-width: 480px)',
  'only screen and (min-width: 640px)',
  'only screen and (min-width: 1024px)',
  'only screen and (min-width: 1366px)',
  'only screen and (min-width: 1920px)',
  'only screen and (max-width: 1023px)',
  'only screen and (max-width: 639px)',
];
