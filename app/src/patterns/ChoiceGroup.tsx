import { makeStyles, mergeClasses, tokens, typographyStyles } from '@fluentui/react-components';
import { useId, type ReactNode } from 'react';

/**
 * One choice group on native radios (G-20): equal options, nothing
 * pre-selected, fixed order, identical size. Selected = brand outline and
 * tint; focus = an outside ring. Used for Behold or Henvis, the DPS outcomes,
 * the plan and the confidence steps (a scale: one row of equal steps, never wrapped).
 */
export interface Choice<V extends string> {
  value: V;
  label: string;
  icon?: ReactNode;
  description?: string;
}

const useStyles = makeStyles({
  fieldset: { border: 'none', margin: 0, padding: 0, minWidth: 0 },
  legend: {
    ...typographyStyles.subtitle2,
    color: tokens.colorNeutralForeground1,
    padding: 0,
    marginBottom: tokens.spacingVerticalS,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXXS,
    width: '100%',
  },
  legendHidden: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  },
  grid: { display: 'grid', gap: tokens.spacingHorizontalS },
  row: { gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' },
  column: { gridTemplateColumns: '1fr' },
  // An ordered scale (Din trygghet nå): the steps in one row, equal widths, in the order of the scale.
  scaleRow: { gap: tokens.spacingHorizontalXS },
  card: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minHeight: '40px',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusLarge,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    cursor: 'pointer',
    ...typographyStyles.body1Strong,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover, border: `1px solid ${tokens.colorNeutralStroke1Hover}` },
    ':has(input:focus-visible)': {
      outline: `2px solid ${tokens.colorStrokeFocus2}`,
      outlineOffset: '2px',
    },
    '@media (forced-colors: active)': { border: '1px solid CanvasText' },
  },
  selected: {
    border: `2px solid ${tokens.colorBrandStroke1}`,
    backgroundColor: tokens.colorBrandBackground2,
    paddingInline: `calc(${tokens.spacingHorizontalM} - 1px)`,
    ':hover': { border: `2px solid ${tokens.colorBrandStroke1}`, backgroundColor: tokens.colorBrandBackground2Hover },
    '@media (forced-colors: active)': { border: '2px solid Highlight' },
  },
  scaleCard: {
    justifyContent: 'center',
    textAlign: 'center',
    minHeight: '40px',
    paddingInline: '2px',
    paddingBlock: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    ...typographyStyles.caption1,
    overflowWrap: 'anywhere',
  },
  scaleSelected: { paddingInline: '1px', paddingBlock: `calc(${tokens.spacingVerticalXS} - 1px)`, fontWeight: tokens.fontWeightSemibold },
  disabled: { cursor: 'not-allowed', color: tokens.colorNeutralForeground3, ':hover': { backgroundColor: tokens.colorNeutralBackground1 } },
  input: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    margin: 0,
    opacity: 0,
    cursor: 'inherit',
  },
  icon: { display: 'inline-flex', flexShrink: 0, fontSize: '20px', color: tokens.colorNeutralForeground2 },
  text: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  desc: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightRegular },
});

export function ChoiceGroup<V extends string>({
  legend,
  hideLegend,
  name,
  choices,
  value,
  onChange,
  layout = 'row',
  disabled,
  describedBy,
  chip,
}: {
  legend: string;
  hideLegend?: boolean;
  name?: string;
  choices: Choice<V>[];
  value?: V;
  onChange: (value: V) => void;
  layout?: 'row' | 'column' | 'scale';
  /** Read-only: the radios stay in the Tab order and say they are unavailable (G-18); a change is ignored. */
  disabled?: boolean;
  describedBy?: string;
  /** A provenance chip beside the legend, for example «Din vurdering». */
  chip?: ReactNode;
}) {
  const cls = useStyles();
  const autoName = useId();
  const groupName = name ?? autoName;
  return (
    <fieldset className={cls.fieldset} aria-describedby={describedBy}>
      <legend className={hideLegend ? cls.legendHidden : cls.legend}>
        <span>{legend}</span>
        {chip}
      </legend>
      <div
        className={mergeClasses(cls.grid, layout === 'row' && cls.row, layout === 'column' && cls.column, layout === 'scale' && cls.scaleRow)}
        style={layout === 'scale' ? { gridTemplateColumns: `repeat(${choices.length}, minmax(0, 1fr))` } : undefined}
      >
        {choices.map((c) => {
          const checked = value === c.value;
          return (
            <label
              key={c.value}
              className={mergeClasses(
                cls.card,
                checked && cls.selected,
                layout === 'scale' && cls.scaleCard,
                checked && layout === 'scale' && cls.scaleSelected,
                disabled && cls.disabled,
              )}
            >
              <input
                className={cls.input}
                type="radio"
                name={groupName}
                value={c.value}
                checked={checked}
                aria-disabled={disabled || undefined}
                onChange={() => {
                  if (!disabled) onChange(c.value);
                }}
              />
              {c.icon && (
                <span className={cls.icon} aria-hidden="true">
                  {c.icon}
                </span>
              )}
              <span className={cls.text}>
                <span>{c.label}</span>
                {c.description && <span className={cls.desc}>{c.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
