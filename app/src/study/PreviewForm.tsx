import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Radio,
  RadioGroup,
  makeStyles,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { InstrumentForm, InstrumentItem } from '../content/types';
import { instrument } from '../content';
import { useLang } from '../i18n/i18n';
import { readJSON, writeJSON } from '../state/persist';
import { GrowingTextarea } from '../patterns/basics';
import type { LockedFields } from '../engine/forms';

/**
 * A stand-in for a Nettskjema form, used in review mode, in test builds and in
 * study mode with the preview flag. It renders the instrument's pages and
 * keeps answers only in this browser (they can be downloaded as CSV).
 */
export const PREVIEW_ANSWERS_KEY = 'atlas.preview.answers';

export interface PreviewAnswerRow {
  form: string;
  at: string;
  values: Record<string, string>;
}

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, paddingBlock: tokens.spacingVerticalM },
  title: { ...typographyStyles.subtitle1, margin: 0, ':focus': { outline: 'none' } },
  previewNote: {
    ...typographyStyles.caption1,
    margin: 0,
    paddingInline: tokens.spacingHorizontalS,
    paddingBlock: tokens.spacingVerticalXS,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
  intro: { ...typographyStyles.body1, margin: 0, color: tokens.colorNeutralForeground2 },
  locked: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  lockedHead: { ...typographyStyles.caption1Strong },
  lockedRow: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground2 },
  page: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
  stop: {
    ...typographyStyles.body1Strong,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  nav: { display: 'flex', gap: tokens.spacingHorizontalS, justifyContent: 'space-between', flexWrap: 'wrap' },
  privacy: { ...typographyStyles.caption1, color: tokens.colorNeutralForeground3, margin: 0 },
  scale: { display: 'flex', flexWrap: 'wrap', gap: '2px' },
  anchors: { display: 'flex', justifyContent: 'space-between', ...typographyStyles.caption1, color: tokens.colorNeutralForeground3 },
});

function scaleRange(item: InstrumentItem): number[] {
  switch (item.type) {
    case 'agree7':
    case 'confidence7':
    case 'helpful7':
      return [1, 2, 3, 4, 5, 6, 7];
    case 'nps11':
      return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    case 'clarity5':
      return [1, 2, 3, 4, 5];
    default:
      return [];
  }
}

export function findForm(formKey: string): InstrumentForm | undefined {
  return instrument.forms.find((f) => f.key === formKey);
}

export function PreviewForm({
  formKey,
  locked,
  onPageChange,
  onSent,
}: {
  formKey: string;
  locked: LockedFields;
  onPageChange: () => void;
  onSent: () => void;
}) {
  const cls = useStyles();
  const { t, s } = useLang();
  const form = useMemo(() => findForm(formKey), [formKey]);
  const [page, setPage] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();
  const turned = useRef(false);

  // A page change moves focus to the page's heading, as a new page would (WCAG 2.4.3).
  useEffect(() => {
    if (!turned.current) return;
    headRef.current?.focus();
  }, [page]);

  if (!form) return <MessageBar intent="error"><MessageBarBody>{s('formNotReady')}</MessageBarBody></MessageBar>;
  const total = form.pages.length;
  const items = form.pages[page]?.items ?? [];
  const idFor = (codebook: string) => `${uid}-${codebook}`;

  const validate = () => {
    for (const it of items) {
      if (it.type === 'locked' || it.type === 'stop') continue;
      if (it.required && !(values[it.codebook] ?? '').trim()) {
        setMissing(it.codebook);
        // Focus the first control of the first unanswered question.
        window.requestAnimationFrame(() => {
          const root = document.getElementById(idFor(it.codebook));
          root?.querySelector<HTMLElement>('input, textarea')?.focus();
        });
        return false;
      }
    }
    setMissing(null);
    return true;
  };

  const turn = (to: number) => {
    turned.current = true;
    setPage(to);
    onPageChange();
  };

  const send = () => {
    if (!validate()) return;
    const rows = readJSON<PreviewAnswerRow[]>(PREVIEW_ANSWERS_KEY) ?? [];
    rows.push({ form: formKey, at: new Date().toISOString(), values: { ...locked, ...values } });
    writeJSON(PREVIEW_ANSWERS_KEY, rows);
    setSent(true);
    onPageChange();
    onSent();
  };

  if (sent) {
    return (
      <div className={cls.root}>
        <p className={cls.intro}>{t(form.receipt)}</p>
      </div>
    );
  }

  // The locked fields sit where the instrument puts them: first in S1 (A-01 is the role), after B1 in a vignette form.
  const lockedItems = items.filter((it) => it.type === 'locked');
  const lockedFirst = lockedItems.length > 0 && items[0]?.type === 'locked';
  const lockedBox = lockedItems.length > 0 && Object.keys(locked).length > 0 && (
    <div className={cls.locked}>
      <span className={cls.lockedHead}>{t(instrument.lockedHeading)}</span>
      {lockedItems.map((it) => (
        <span key={it.codebook} className={cls.lockedRow}>
          {/[?:]$/.test(t(it.text)) ? t(it.text) : `${t(it.text)}:`}{' '}
          {/* Locked values are Norwegian in both languages (F-27). */}
          <strong lang="nb">{locked[it.codebook] ?? ''}</strong>
        </span>
      ))}
    </div>
  );

  return (
    <form
      className={cls.root}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (page < total - 1) {
          if (validate()) turn(page + 1);
        } else send();
      }}
    >
      <p className={cls.previewNote}>{s('previewFormNote')}</p>
      <h2 className={cls.title} ref={headRef} tabIndex={-1}>
        {t(form.title)}
        <span className={cls.page}> · {s('previewPageOf', { n: page + 1, total })}</span>
      </h2>
      {page === 0 && <p className={cls.intro}>{t(form.intro)}</p>}
      {page === 0 && <p className={cls.privacy}>{t(instrument.privacyLine)}</p>}
      {lockedFirst && lockedBox}
      {items
        .filter((it) => it.type !== 'locked')
        .map((it) => {
          if (it.type === 'stop') {
            return (
              <p key={it.id} className={cls.stop}>
                {t(it.text)}
              </p>
            );
          }
          const range = scaleRange(it);
          const label = it.required ? t(it.text) : `${t(it.text)} ${s('optionalMark')}`;
          const invalid = missing === it.codebook;
          const fieldState = invalid ? { validationState: 'error' as const, validationMessage: s('requiredMissing') } : {};
          if (range.length) {
            const anchorsId = `${idFor(it.codebook)}-anchors`;
            return (
              <div key={it.id} id={idFor(it.codebook)}>
                <Field label={label} required={it.required} {...fieldState}>
                  <RadioGroup
                    layout="horizontal"
                    value={values[it.codebook] ?? ''}
                    onChange={(_, d) => {
                      setValues({ ...values, [it.codebook]: d.value });
                      if (invalid) setMissing(null);
                    }}
                    className={cls.scale}
                    aria-describedby={it.anchors ? anchorsId : undefined}
                  >
                    {range.map((n) => (
                      <Radio key={n} value={String(n)} label={String(n)} />
                    ))}
                  </RadioGroup>
                </Field>
                {it.anchors && (
                  <div className={cls.anchors} id={anchorsId}>
                    <span>{`${range[0]}: ${t(it.anchors.low)}`}</span>
                    <span>{`${range[range.length - 1]}: ${t(it.anchors.high)}`}</span>
                  </div>
                )}
              </div>
            );
          }
          if ((it.type === 'choice' || it.type === 'importance3') && it.options) {
            return (
              <div key={it.id} id={idFor(it.codebook)}>
                <Field label={label} required={it.required} {...fieldState}>
                  <RadioGroup
                    value={values[it.codebook] ?? ''}
                    onChange={(_, d) => {
                      setValues({ ...values, [it.codebook]: d.value });
                      if (invalid) setMissing(null);
                    }}
                  >
                    {it.options.map((o) => (
                      <Radio key={o.nb} value={o.nb} label={t(o)} />
                    ))}
                  </RadioGroup>
                </Field>
              </div>
            );
          }
          if (it.type === 'text') {
            return (
              <div key={it.id} id={idFor(it.codebook)}>
                <Field label={label} required={it.required} {...fieldState}>
                  <Input value={values[it.codebook] ?? ''} onChange={(_, d) => setValues({ ...values, [it.codebook]: d.value })} />
                </Field>
              </div>
            );
          }
          return (
            <div key={it.id} id={idFor(it.codebook)}>
              {it.privacyLine && <p className={cls.privacy}>{t(instrument.privacyLine)}</p>}
              <Field label={label} required={it.required} {...fieldState}>
                <GrowingTextarea
                  value={values[it.codebook] ?? ''}
                  maxLength={3800}
                  onChange={(_, d) => {
                    setValues({ ...values, [it.codebook]: d.value });
                    if (invalid && d.value.trim()) setMissing(null);
                  }}
                />
              </Field>
            </div>
          );
        })}
      {!lockedFirst && lockedBox}
      <div className={cls.nav}>
        <Button type="button" disabledFocusable={page === 0} onClick={() => page > 0 && turn(page - 1)}>
          {s('back')}
        </Button>
        <Button type="submit" appearance="primary">
          {page < total - 1 ? s('next') : s('previewSend')}
        </Button>
      </div>
    </form>
  );
}

/** All preview answers as CSV (semicolon separated, quoted). */
export function previewCsv(): string {
  const rows = readJSON<PreviewAnswerRow[]>(PREVIEW_ANSWERS_KEY) ?? [];
  const keys = new Set<string>(['form', 'at']);
  rows.forEach((r) => Object.keys(r.values).forEach((k) => keys.add(k)));
  const header = [...keys];
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [header.map(q).join(';')];
  rows.forEach((r) => {
    lines.push(header.map((k) => q(k === 'form' ? r.form : k === 'at' ? r.at : r.values[k] ?? '')).join(';'));
  });
  return lines.join('\n');
}

/** Download the preview answers (study preview and review mode without form addresses). */
export function downloadPreviewCsv(name = 'atlas-forhandsvisning.csv') {
  const blob = new Blob([`\uFEFF${previewCsv()}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
