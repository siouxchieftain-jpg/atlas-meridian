import { createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';

/** Meridian brand ramp. Fluent lavender at brand 80 (settled). */
export const atlasBrand: BrandVariants = {
  10: '#120F25',
  20: '#221D46',
  30: '#302963',
  40: '#3F3682',
  50: '#4A3F99',
  60: '#5649B0',
  70: '#6656D1',
  80: '#7160E8',
  90: '#8172EB',
  100: '#9184EE',
  110: '#A79CF1',
  120: '#BCB4F5',
  130: '#D2CCF8',
  140: '#DCD8FA',
  150: '#E7E4FB',
  160: '#F9F8FE',
};

const base = createLightTheme(atlasBrand);

/**
 * Meridian 1.1 light theme.
 * A. Settled rule: links and brand text use brand 60 on white (G-10).
 * B. Meridian values that follow the Fluent 2 design site where v9 differs (G-11).
 */
export const atlasLightTheme: Theme = {
  ...base,
  colorBrandForegroundLink: atlasBrand[60],
  colorBrandForegroundLinkHover: atlasBrand[50],
  colorBrandForegroundLinkPressed: atlasBrand[40],
  colorBrandForegroundLinkSelected: atlasBrand[60],
  colorBrandForeground1: atlasBrand[60],
  colorBrandForeground2: atlasBrand[60],
  colorBrandForeground2Hover: atlasBrand[50],
  colorNeutralForeground2BrandHover: atlasBrand[60],
  colorNeutralForeground2BrandPressed: atlasBrand[50],
  borderRadiusLarge: '8px',
  lineHeightBase500: '26px',
  shadow28: '0 0 8px rgba(0,0,0,0.20), 0 14px 28px rgba(0,0,0,0.24)',
  shadow64: '0 0 8px rgba(0,0,0,0.20), 0 32px 64px rgba(0,0,0,0.24)',
};

/** The overrides above, listed so a unit test can assert every one of them. */
export const meridianOverrides: Partial<Record<keyof Theme, string>> = {
  colorBrandForegroundLink: '#5649B0',
  colorBrandForegroundLinkHover: '#4A3F99',
  colorBrandForegroundLinkPressed: '#3F3682',
  colorBrandForegroundLinkSelected: '#5649B0',
  colorBrandForeground1: '#5649B0',
  colorBrandForeground2: '#5649B0',
  colorBrandForeground2Hover: '#4A3F99',
  colorNeutralForeground2BrandHover: '#5649B0',
  colorNeutralForeground2BrandPressed: '#4A3F99',
  borderRadiusLarge: '8px',
  lineHeightBase500: '26px',
  shadow28: '0 0 8px rgba(0,0,0,0.20), 0 14px 28px rgba(0,0,0,0.24)',
  shadow64: '0 0 8px rgba(0,0,0,0.20), 0 32px 64px rgba(0,0,0,0.24)',
};
