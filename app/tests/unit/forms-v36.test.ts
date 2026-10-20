import { describe, expect, it, vi } from 'vitest';
import { instrument, vocab } from '../../src/content';
import { STUDY_FORM_KEYS, formKeyFor } from '../../src/engine/forms';
import type { InstrumentForm, InstrumentItem } from '../../src/content/types';

// ATLAS 3.6, the form pass (improvement plan of 2026-10-20): the decision without and with ATLAS in every case form, Kari's
// form split by role (I-1), the calibration item (I-14), the two written reasons P6 commits to (I-12), «Vet ikke» on the
// other side's needs (I-18) and the DPS wordings (I-17). All are proposals for the owner's rulings (D1, D7, D8, O-G2 to O-G4).

const form = (key: string): InstrumentForm => {
  const f = instrument.forms.find((x) => x.key === key);
  if (!f) throw new Error(`no form ${key}`);
  return f;
};
const item = (key: string, id: string): InstrumentItem => {
  const it = form(key).pages.flatMap((p) => p.items).find((x) => x.id === id);
  if (!it) throw new Error(`${key} has no ${id}`);
  return it;
};
const questions = (items: InstrumentItem[]) => items.filter((it) => it.type !== 'locked');
const nb = (it: InstrumentItem) => (it.options ?? []).map((o) => o.nb);

const CASES = [
  { step: 'S3', v: 'V1' },
  { step: 'S4', v: 'V3' },
  { step: 'S5', v: 'V4' },
] as const;
const ROLES = [
  { role: 'gp', variant: 'fastlege' },
  { role: 'dps', variant: 'dps' },
] as const;

describe('Kari has one form per role (I-1)', () => {
  it('maps step S3 to the role\'s own form, and no study form is called S3 alone', () => {
    expect(formKeyFor('S3', 'gp')).toBe('S3.fastlege');
    expect(formKeyFor('S3', 'dps')).toBe('S3.dps');
    expect(STUDY_FORM_KEYS).not.toContain('S3');
    expect(instrument.forms.map((f) => f.key)).not.toContain('S3');
    for (const k of ['S3.fastlege', 'S3.dps'] as const) expect(STUDY_FORM_KEYS).toContain(k);
  });

  it('keeps everything else of the shared form in both versions: with the decision items taken out, the two are the same', () => {
    const strip = (f: InstrumentForm) => ({
      ...f,
      key: '',
      pages: f.pages.map((p) => ({ ...p, items: p.items.filter((it) => !/^D-V1-D[12]$/.test(it.id)) })),
    });
    expect(strip(form('S3.dps'))).toEqual(strip(form('S3.fastlege')));
    // B1, the locked fields, the stop page, the check item and B2 are all still there.
    expect(form('S3.fastlege').pages.flatMap((p) => p.items).map((it) => it.id)).toEqual(expect.arrayContaining(['D-V1-B1', 'STOPP-V1', 'E11-V1', 'D-V1-B2', 'D-V1-DS', 'D-V1-04', 'versjon']));
  });
});

describe('the decision without and with ATLAS (I-1)', () => {
  for (const { step, v } of CASES) {
    for (const { variant } of ROLES) {
      const key = `${step}.${variant}`;
      it(`${key}: page 1 asks the decision, then B1; the last page asks it again after the check item, then B2`, () => {
        const [p1, p2, p3] = form(key).pages;
        expect(questions(p1.items).map((it) => it.id)).toEqual([`D-${v}-D1`, `D-${v}-B1`]);
        expect(questions(p2.items).map((it) => it.type)).toEqual(['stop']);
        expect(questions(p3.items).slice(0, 3).map((it) => it.id)).toEqual([`E11-${v}`, `D-${v}-D2`, `D-${v}-B2`]);
        const d1 = item(key, `D-${v}-D1`);
        const d2 = item(key, `D-${v}-D2`);
        for (const d of [d1, d2]) {
          expect(d.type).toBe('choice');
          expect(d.required).toBe(true);
          expect(d.options?.at(-1)).toEqual({ nb: 'Ikke bestemt', en: 'Not decided', code: 'ikke_bestemt' });
          expect(d.codebook).toMatch(/^d_v[134]_d[12]$/);
          // Waiting for the owner's ruling (D1): the form script leaves the form alone until it is ruled.
          expect(d.draft).toBe(true);
        }
        expect(d2.text).toEqual(d1.text);
        expect(d2.options).toEqual(d1.options);
      });
    }
  }

  it('offers the GP keeping or referring in Kari\'s and Erlend\'s cases, and the plan in Astrid\'s', () => {
    for (const key of ['S3.fastlege', 'S4.fastlege']) {
      const d = item(key, key.startsWith('S3') ? 'D-V1-D1' : 'D-V3-D1');
      expect(d.text.nb).toBe('Hva ville du gjort nå?');
      expect(nb(d)).toEqual(['Beholde pasienten i allmennpraksis', 'Henvise til DPS', 'Ikke bestemt']);
      expect(d.options?.map((o) => o.code)).toEqual(['beholde', 'henvise', 'ikke_bestemt']);
    }
    const plan = item('S5.fastlege', 'D-V4-D1');
    expect(plan.text.nb).toBe('Hva er planen videre?');
    expect(nb(plan)).toEqual(['Følge opp i allmennpraksis', 'Henvise på nytt', 'Ikke bestemt']);
    expect(plan.options?.map((o) => o.code)).toEqual(['folge_opp', 'henvise_pa_nytt', 'ikke_bestemt']);
  });

  it('offers DPS the three outcomes the app offers, in its order and words, in Kari\'s and Erlend\'s cases', () => {
    const outcomes = (['info', 'rett', 'retur'] as const).map((o) => vocab.outcomes[o].label);
    for (const [key, id] of [['S3.dps', 'D-V1-D1'], ['S4.dps', 'D-V3-D1']] as const) {
      const d = item(key, id);
      expect(d.text.nb).toBe('Hvordan ville du vurdert henvisningen?');
      expect(d.options?.slice(0, 3).map(({ nb: n, en }) => ({ nb: n, en }))).toEqual(outcomes);
      expect(d.options?.map((o) => o.code)).toEqual(['info', 'rett', 'retur', 'ikke_bestemt']);
      expect(d.draft).toBe(true);
    }
  });

  it('asks DPS in Astrid\'s case what they would answer the GP, with choices that do not overlap, as a draft', () => {
    const d = item('S5.dps', 'D-V4-D1');
    expect(d.text.nb).toBe('Hva ville du svart fastlegen?');
    expect(nb(d)).toEqual(['Stå ved returen slik den er', 'Be om en ny henvisning', 'Vurdere henvisningen på nytt', 'Ikke svare nå', 'Ikke bestemt']);
    expect(d.options?.map((o) => o.en)).toEqual(['Stand by the return as it is', 'Ask for a new referral', 'Reassess the referral', 'Not reply for now', 'Not decided']);
    expect(d.options?.map((o) => o.code)).toEqual(['sta_ved_returen', 'ny_henvisning', 'vurdere_pa_nytt', 'ikke_svare', 'ikke_bestemt']);
    expect(d.draft).toBe(true);
  });

  it('names every decision choice\'s code, so «Ikke bestemt» is the same code in every form', () => {
    for (const { step, v } of CASES) {
      for (const { variant } of ROLES) {
        for (const n of [1, 2]) {
          const d = item(`${step}.${variant}`, `D-${v}-D${n}`);
          expect(d.options?.every((o) => typeof o.code === 'string' && /^[a-z][a-z0-9_]*$/.test(o.code))).toBe(true);
        }
      }
    }
  });
});

describe('Helhetsinntrykk (S2), both roles', () => {
  for (const key of ['S2.fastlege', 'S2.dps']) {
    it(`${key}: the calibration item sits in C1's block, before C1's written reason (I-14)`, () => {
      const ids = questions(form(key).pages[0].items).map((it) => it.id);
      expect(ids.indexOf('C1-06')).toBe(ids.indexOf('C1-04') + 1);
      expect(ids.indexOf('C1-05')).toBe(ids.indexOf('C1-06') + 1);
      const c = item(key, 'C1-06');
      expect(c.type).toBe('agree7');
      expect(c.required).toBe(false);
      expect(c.anchors).toEqual(item(key, 'C1-01').anchors);
      expect(c.text.nb).toBe('Det var tydelig for meg når jeg kunne støtte meg på det ATLAS viste, og når jeg burde holde meg til min egen vurdering.');
    });

    it(`${key}: every 3.6 change waits for the owner's ruling`, () => {
      for (const id of ['C1-06', 'C3-01', 'C3-03', 'C4-02', 'C-CUCF-02']) expect(item(key, id).draft, id).toBe(true);
    });

    it(`${key}: every block of ratings has a required written reason (I-12)`, () => {
      expect(item(key, 'C4-02').required).toBe(true);
      expect(item(key, 'C-CUCF-02').required).toBe(true);
      const reasons = questions(form(key).pages[0].items).filter((it) => it.type === 'longtext');
      expect(reasons.map((it) => [it.id, it.required])).toEqual([
        ['C1-05', true],
        ['C2-03', true],
        ['C3-03', true],
        ['C4-02', true],
        ['C5-03', true],
        ['C-CUCF-02', true],
      ]);
    });

    it(`${key}: the other side's needs can be answered «Vet ikke» (I-18)`, () => {
      expect(item(key, 'C3-01').dontKnow).toEqual({ nb: 'Vet ikke', en: "Don't know" });
      expect(item(key, 'C3-03').text.nb).toMatch(/skriv «Vet ikke»\.$/);
      expect(item(key, 'C3-03').required).toBe(true);
    });
  }

  it('words C1-01 and the CUCF pair for DPS assessments, as drafts (O-G4)', () => {
    for (const id of ['C1-01', 'C-CUCF-01', 'C-CUCF-02']) {
      expect(item('S2.dps', id).text).not.toEqual(item('S2.fastlege', id).text);
      expect(item('S2.dps', id).draft).toBe(true);
    }
    expect(item('S2.fastlege', 'C1-01').draft).toBeUndefined();
    expect(item('S2.fastlege', 'C-CUCF-01').draft).toBeUndefined();
    expect(item('S2.dps', 'C1-01').text.nb).toMatch(/vurderinger av henvisninger/);
    // DPS's feedback on its own assessments is the GPs' replies and questions; Kalibrering is C1-04's (review N4).
    expect(item('S2.dps', 'C-CUCF-01').text.nb).toMatch(/^Svarene og spørsmålene fra fastlegene etter mine vurderinger/);
    expect(item('S2.dps', 'C-CUCF-01').text.nb).not.toMatch(/opptaksområdet/);
    expect(item('S2.dps', 'C-CUCF-02').text.nb).toBe('Hva ville denne tilbakemeldingen bety for hvordan du vurderer henvisninger over tid? (1-3 setninger)');
  });
});

describe('Astrid for DPS asks about answering the GP, not about a refusal they did not write (O-G3)', () => {
  it('rewords D-V4-01 for DPS, as a draft', () => {
    const d = item('S5.dps', 'D-V4-01');
    expect(d.text.nb).toBe('Endrer den strukturerte tilbakemeldingen hvordan du ville svart fastlegen? (1-3 setninger)');
    expect(d.text.nb).not.toMatch(/følelsesmessige/);
    expect(d.required).toBe(true);
    expect(d.draft).toBe(true);
  });
});

describe('the Nettskjema elements (nettskjema.mjs)', () => {
  type Element = { elementType: string; externalElementId?: string; isMandatory?: boolean; isHorizontal?: boolean; answerOptions?: { text: string; externalAnswerOptionId: string }[]; description?: string };
  const load = async () => {
    const path = '../../scripts/nettskjema.mjs';
    return (await import(/* @vite-ignore */ path)) as { formElements: (f: InstrumentForm) => Element[] };
  };

  it('builds «Vet ikke» as one row of single choices, 1 to 7 and vet_ikke, with the anchors in the description', async () => {
    const m = await load();
    for (const key of ['S2.fastlege', 'S2.dps']) {
      const c = m.formElements(form(key)).find((e) => e.externalElementId === 'c3_01')!;
      expect(c.elementType).toBe('RADIO');
      expect(c.isHorizontal).toBe(true);
      expect(c.isMandatory).toBe(false);
      expect(c.answerOptions?.map((o) => o.externalAnswerOptionId)).toEqual(['1', '2', '3', '4', '5', '6', '7', 'vet_ikke']);
      expect(c.answerOptions?.at(-1)?.text).toBe("Vet ikke / Don't know");
      expect(c.description).toContain('1: Helt uenig / Strongly disagree. 7: Helt enig / Strongly agree.');
      // The other agreement items stay linear scales.
      expect(m.formElements(form(key)).find((e) => e.externalElementId === 'c1_06')?.elementType).toBe('LINEAR_SCALE');
    }
  });

  it('puts the decision before B1 and, after the page breaks, the check item, the decision and B2, in every case form', async () => {
    const m = await load();
    for (const { step, v } of CASES) {
      for (const { variant } of ROLES) {
        const els = m.formElements(form(`${step}.${variant}`));
        const ids = els.map((e) => (e.elementType === 'PAGE_BREAK' ? '|' : e.externalElementId ?? e.elementType));
        const lv = v.toLowerCase();
        const page1 = ids.slice(0, ids.indexOf('|'));
        expect(page1.filter((x) => /^d_v/.test(x)), `${step}.${variant}`).toEqual([`d_${lv}_d1`, `d_${lv}_b1`]);
        const last = ids.slice(ids.lastIndexOf('|') + 1);
        expect(last.slice(0, 3), `${step}.${variant}`).toEqual(['kontroll', `d_${lv}_d2`, `d_${lv}_b2`]);
        const d1 = els.find((e) => e.externalElementId === `d_${lv}_d1`)!;
        expect(d1.elementType).toBe('RADIO');
        expect(d1.isMandatory).toBe(true);
        expect(d1.answerOptions?.at(-1)).toMatchObject({ text: 'Ikke bestemt / Not decided', externalAnswerOptionId: 'ikke_bestemt' });
        expect(d1.answerOptions?.map((o) => o.externalAnswerOptionId)).toEqual(item(`${step}.${variant}`, `D-${v}-D1`).options?.map((o) => o.code));
      }
    }
  });
});

describe('the form script holds a form back until its items are ruled, and repairs codebooks after update', () => {
  type Fetch = (url: string, init?: { method?: string; body?: string }) => Promise<Response>;
  const load = async () => {
    const path = '../../scripts/nettskjema.mjs';
    return (await import(/* @vite-ignore */ path)) as {
      draftItems: (f: InstrumentForm) => string[];
      fixCodebook: (c: { id: string; secret: string }, f: InstrumentForm, formId: number) => Promise<void>;
      formElements: (f: InstrumentForm) => { elementType: string; externalElementId?: string; answerOptions?: { externalAnswerOptionId: string }[] }[];
    };
  };

  it('lists the items still waiting for a ruling, and none in a form 3.6 does not touch', async () => {
    const m = await load();
    expect(m.draftItems(form('S3.fastlege'))).toEqual(['D-V1-D1', 'D-V1-D2']);
    expect(m.draftItems(form('S2.fastlege'))).toEqual(['C1-06', 'C3-01', 'C3-03', 'C4-02', 'C-CUCF-02']);
    for (const key of ['S1', 'S6', 'S7.fastlege', 'S8', 'S9', 'R1', 'R2']) expect(m.draftItems(form(key)), key).toEqual([]);
  });

  it('holds back every form a run names when one holds an unruled item, before reading any credential or sending anything', async () => {
    const { spawnSync } = await import('node:child_process');
    const { join } = await import('node:path');
    const { mkdtempSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    // Vitest runs in app/. A copy of the instrument with one item in S6 marked as waiting, so the check does not depend on
    // which of 3.6's items have been ruled.
    const script = join(process.cwd(), 'scripts', 'nettskjema.mjs');
    const copy = JSON.parse(JSON.stringify(instrument)) as typeof instrument;
    const s6 = copy.forms.find((f) => f.key === 'S6')!;
    s6.pages[0].items.find((it) => it.id === 'E-01')!.draft = true;
    for (const f of copy.forms) for (const p of f.pages) for (const it of p.items) if (f.key !== 'S6') delete it.draft;
    const file = join(mkdtempSync(join(tmpdir(), 'atlas-hold-')), 'instrument.json');
    writeFileSync(file, JSON.stringify(copy));
    // No credentials file exists at this path: a run that got past the hold would stop on it, saying so.
    const env = { ...process.env, ATLAS_INSTRUMENT: file, NETTSKJEMA_CREDENTIALS: '/nonexistent/atlas.json' };
    const run = (args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env });
    for (const mode of ['create', 'update']) {
      const held = run([mode, '--round', 'pilot', '--only', 'S8,S6']);
      expect(held.status, mode).toBe(1);
      expect(held.stdout, mode).toContain("S6           holds wording or choices waiting for the owner's ruling: E-01");
      expect(held.stdout, mode).toContain('Nothing was changed.');
      // S8 has nothing waiting, yet it is not touched either: no credential was read for it.
      expect(held.stderr, mode).not.toContain('credentials');
      // Without the held form the run goes on, and stops only at the missing credentials.
      const free = run([mode, '--round', 'pilot', '--only', 'S8']);
      expect(free.stdout + free.stderr, mode).toContain('no credentials file');
    }
  });

  it('marks as waiting, in the real instrument, every 3.6 item and the four DPS drafts from before (deviation 5)', async () => {
    const m = await load();
    const waiting = Object.fromEntries(instrument.forms.map((f) => [f.key, m.draftItems(f)]).filter(([, ids]) => ids.length));
    expect(Object.keys(waiting).sort()).toEqual(['S2.dps', 'S2.fastlege', 'S3.dps', 'S3.fastlege', 'S4.dps', 'S4.fastlege', 'S5.dps', 'S5.fastlege']);
    expect(waiting['S2.dps']).toContain('C1-04');
    expect(waiting['S4.dps']).toEqual(expect.arrayContaining(['D-V3-01', 'D-V3-02']));
    expect(waiting['S5.dps']).toContain('D-V4-02');
  });

  it('sets the codebook names and the named answer codes Nettskjema did not keep, «vet_ikke» among them', async () => {
    const m = await load();
    const f = form('S2.dps');
    const want = m.formElements(f);
    // Nettskjema's elements as a PUT might leave them: ids, but no codebook names and answer codes by place.
    const stored = want.map((w, i) => ({
      elementId: w.elementType === 'PAGE_BREAK' ? null : 1000 + i,
      elementType: w.elementType,
      externalElementId: null,
      answerOptions: (w.answerOptions ?? []).map((_, j) => ({ answerOptionId: 5000 + i * 20 + j, externalAnswerOptionId: String(j + 1) })),
    }));
    const calls: { url: string; method: string; body?: unknown }[] = [];
    const fake: Fetch = async (url, init) => {
      calls.push({ url, method: init?.method ?? 'GET', body: init?.body && typeof init.body === 'string' && init.body.startsWith('{') ? JSON.parse(init.body) : undefined });
      if (url.includes('/oauth2/token')) return new Response(JSON.stringify({ access_token: 'test' }), { status: 200 });
      if (url.endsWith('/elements')) return new Response(JSON.stringify(stored), { status: 200 });
      return new Response(null, { status: 204 });
    };
    vi.stubGlobal('fetch', fake);
    try {
      await m.fixCodebook({ id: 'client', secret: 'secret' }, f, 42);
    } finally {
      vi.unstubAllGlobals();
    }
    const put = calls.find((c) => c.method === 'PUT' && c.url.endsWith('/form/42/codebook'));
    expect(put).toBeDefined();
    const body = put!.body as { elementIdsAndExternalElementIdsMap: Record<string, string>; answerOptionIdsAndExternalAnswerOptionIdsMap: Record<string, string> };
    const i301 = want.findIndex((w) => w.externalElementId === 'c3_01');
    expect(body.elementIdsAndExternalElementIdsMap[String(1000 + i301)]).toBe('c3_01');
    // «Vet ikke», the eighth choice, gets its own code; 1 to 7 already match their place.
    expect(body.answerOptionIdsAndExternalAnswerOptionIdsMap[String(5000 + i301 * 20 + 7)]).toBe('vet_ikke');
    expect(body.answerOptionIdsAndExternalAnswerOptionIdsMap[String(5000 + i301 * 20 + 0)]).toBeUndefined();
    // No request went anywhere but the stand-in.
    expect(calls.every((c) => /nettskjema\.no/.test(c.url))).toBe(true);
  });
});
