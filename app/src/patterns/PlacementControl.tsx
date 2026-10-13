import { Dropdown, Field, Option } from '@fluentui/react-components';
import { useLang } from '../i18n/i18n';
import { POSITIONS, positionIndex } from '../engine/placement';

/**
 * The keyboard and screen-reader path for placing a case: seven positions
 * named in words. No value before the first placement; never a number.
 */
export function PlacementControl({
  value,
  onChange,
  disabled,
  hint,
}: {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const { s } = useLang();
  const idx = value === undefined ? -1 : positionIndex(value);
  const selected = idx >= 0 ? POSITIONS[idx] : undefined;
  const label = selected ? s(selected.key) : '';
  return (
    <Field label={s('bandPlace')} hint={hint}>
      <Dropdown
        style={{ minWidth: 0, maxWidth: '100%' }}
        placeholder={s('bandNotPlaced')}
        value={label ? label.charAt(0).toUpperCase() + label.slice(1) : ''}
        selectedOptions={selected ? [selected.key] : []}
        disabled={disabled}
        onOptionSelect={(_, d) => {
          const p = POSITIONS.find((x) => x.key === d.optionValue);
          if (p) onChange(p.value);
        }}
      >
        {POSITIONS.map((p) => {
          const text = s(p.key);
          return (
            <Option key={p.key} value={p.key} text={text}>
              {text.charAt(0).toUpperCase() + text.slice(1)}
            </Option>
          );
        })}
      </Dropdown>
    </Field>
  );
}

/** Snap a click on the track (0 to 1) to the nearest named position. */
export function snapFraction(fraction: number): number {
  const v = fraction * 100;
  let best = POSITIONS[0].value;
  let dist = Infinity;
  for (const p of POSITIONS) {
    const d = Math.abs(p.value - v);
    if (d < dist) {
      dist = d;
      best = p.value;
    }
  }
  return best;
}

export function capitalise(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
