import { makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import type { ReactNode } from 'react';
import { useLang } from '../i18n/i18n';

/**
 * A part of the page the study does not ask about (3.7). It fades and is taken out of clicks, the tab order and
 * axe's contrast check (inert); its label sits above it, outside the fade, so it reads at full contrast and covers nothing.
 */
export const FADE_OPACITY = 0.4;

const useStyles = makeStyles({
  // A column the height of its cell: the label on top, in flow, so it covers nothing; the card fills the rest.
  wrap: { display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 auto', height: '100%', minWidth: 0 },
  label: {
    ...typographyStyles.caption1Strong,
    alignSelf: 'flex-start',
    paddingBlock: '1px',
    paddingInline: tokens.spacingHorizontalS,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  faded: { opacity: FADE_OPACITY, flexGrow: 1, display: 'grid' },
});

export function NotInEvaluation({ children }: { children: ReactNode }) {
  const cls = useStyles();
  const { s } = useLang();
  return (
    <div className={cls.wrap}>
      <span className={cls.label}>{s('notInEvaluation')}</span>
      <div className={cls.faded} inert>
        {children}
      </div>
    </div>
  );
}
