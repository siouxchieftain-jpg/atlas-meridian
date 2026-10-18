import { afterEach, describe, expect, it, vi } from 'vitest';
import { feedbackLocked, resolveConfig } from '../../src/engine/forms';
import { instrument, tour, tourParts } from '../../src/content';
import { partOf, studySide } from '../../src/study/parts';

/** A fresh copy of the forms module, so each check loads its own configuration. */
async function freshForms(config: unknown) {
  vi.resetModules();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(config), { status: 200, headers: { 'content-type': 'application/json' } })),
  );
  const forms = await import('../../src/engine/forms');
  await forms.loadConfig();
  return forms;
}

describe('the pilot round (decision 10)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('takes the study forms from pilotForms, and R1 and R2 from forms', () => {
    const c = resolveConfig({
      round: 'pilot',
      forms: { S1: 'https://nettskjema.no/a/1', S9: 'https://nettskjema.no/a/9', R1: 'https://nettskjema.no/a/91' },
      pilotForms: { S1: ' https://nettskjema.no/a/101 ', S3: '' },
    });
    expect(c.round).toBe('pilot');
    // S9 has no pilot address: it is not ready, never the study form.
    expect(c.forms).toEqual({ S1: 'https://nettskjema.no/a/101', R1: 'https://nettskjema.no/a/91' });
  });

  it('is the study round when the file names no round, or names another', () => {
    expect(resolveConfig({ forms: { S1: 'https://nettskjema.no/a/1' }, pilotForms: { S1: 'https://nettskjema.no/a/101' } }).forms.S1).toBe('https://nettskjema.no/a/1');
    expect(resolveConfig({ round: 'Pilot ', forms: {} }).round).toBe('study');
  });

  it('marks every answer in the pilot round with a version ending in -pilot', async () => {
    const forms = await freshForms({ round: 'pilot', forms: {}, pilotForms: { S1: 'https://nettskjema.no/a/101' } });
    expect(forms.versjonValue()).toMatch(/^3\.1\.0-.*-pilot$/);
    expect(forms.studyLocked('S1', 'fastlege', 'Nei', {}, 'Rolig elg 27').versjon).toMatch(/-pilot$/);
    expect(forms.feedbackLocked('fastlege', 'Rolig elg 27', 'fastlege/hjem', 'hele').versjon).toMatch(/-pilot$/);
  });
});

describe('the study period (decision 12)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('closes the study round after its last day, and never the pilot round', async () => {
    const study = await freshForms({ round: 'study', forms: {}, studyPeriod: { opens: '2026-11-02', closes: '2026-12-18' } });
    expect(study.getConfig().opens).toBe('2026-11-02');
    expect(study.studyClosed('2026-12-18')).toBe(false);
    expect(study.studyClosed('2026-12-19')).toBe(true);
    const pilot = await freshForms({ round: 'pilot', forms: {}, studyPeriod: { closes: '2026-01-01' } });
    expect(pilot.studyClosed('2026-12-19')).toBe(false);
  });

  it('ignores a closing day that is not a date', () => {
    expect(resolveConfig({ forms: {}, studyPeriod: { closes: '18.12.2026' } }).closes).toBeUndefined();
    expect(resolveConfig({ forms: {}, studyPeriod: { closes: '' } }).closes).toBeUndefined();
  });
});

describe('S9, feedback in the moment (decision 4)', () => {
  it('is in the instrument with its locked context and five items', () => {
    const s9 = instrument.forms.find((f) => f.key === 'S9')!;
    expect(s9.locked).toEqual(['rolle', 'studienavn', 'side', 'seksjon', 'versjon']);
    const items = s9.pages.flatMap((p) => p.items).filter((i) => i.type !== 'locked');
    expect(items.map((i) => i.id)).toEqual(['S9-01', 'S9-02', 'S9-03', 'S9-04', 'S9-05']);
    expect(items.every((i) => !i.required)).toBe(true);
  });

  it('locks the role, the study name, the screen, the part and the build, and no step', () => {
    const f = feedbackLocked('dps-kliniker', 'Rolig elg 27', 'dps/kari/saken', 'atlas');
    expect(f).toMatchObject({ rolle: 'DPS-inntak', studienavn: 'Rolig elg 27', side: 'dps/kari/saken', seksjon: 'atlas' });
    expect(f.steg).toBeUndefined();
  });

  it('names the screen it is sent from', () => {
    expect(studySide('gp', ['studie', 'velkommen'])).toBeNull();
    expect(studySide('gp', ['studie', 'hjem'])).toBe('fastlege/hjem');
    expect(studySide('dps', ['studie', 'omvisning'])).toBe('dps/omvisning');
    expect(studySide('gp', ['studie', 'sak', 'kari'])).toBe('fastlege/kari/orientering');
    expect(studySide('gp', ['studie', 'sak', 'kari', 'konsultasjon'])).toBe('fastlege/kari/konsultasjon');
    // The summary asks about the case as a whole.
    expect(studySide('dps', ['studie', 'sak', 'astrid', 'oppsummering'])).toBe('dps/astrid/saken');
    expect(studySide('gp', ['studie', 'ekstra', 'to-fastleger'])).toBe('fastlege/to-fastleger');
    expect(studySide('gp', ['studie', 'steg'])).toBe('fastlege/studien');
  });
});

describe('the instrument after the cases (decision 3)', () => {
  it('asks about «ATLAS», never «the dashboard», in S2 and S8, and has dropped B-02', () => {
    for (const key of ['S2.fastlege', 'S2.dps', 'S8']) {
      const f = instrument.forms.find((x) => x.key === key)!;
      const texts = [f.intro, ...f.pages.flatMap((p) => p.items.map((i) => i.text))];
      for (const t of texts) {
        expect(t.nb.toLowerCase(), key).not.toContain('dashbord');
        expect(t.en.toLowerCase(), key).not.toContain('dashboard');
      }
      expect(f.pages.flatMap((p) => p.items).some((i) => i.id === 'B-02')).toBe(false);
    }
  });

  it('keeps no tour bridge that calls ATLAS a dashboard', () => {
    for (const role of ['gp', 'dps'] as const)
      for (const step of tour[role].parts.flatMap((p) => p.steps)) {
        expect(step.bridge?.nb ?? '').not.toContain('dashbord');
        expect(step.bridge?.en ?? '').not.toContain('dashboard');
      }
  });
});

describe('the participant’s tour (decision 2)', () => {
  it('starts with «Slik foregår studien» for the participant only', () => {
    for (const role of ['gp', 'dps'] as const) {
      expect(tourParts(role, true)[0].title.nb).toBe('Slik foregår studien');
      expect(tourParts(role, true)[0].steps).toHaveLength(4);
      expect(tourParts(role).some((p) => p.studyOnly)).toBe(false);
    }
    expect(tourParts('gp', true).length).toBe(5);
    expect(tourParts('dps', true).length).toBe(5);
  });
});

describe('the three parts', () => {
  it('put the welcome, Om deg and the tour first, the cases second, and the rest last', () => {
    expect(partOf('velkommen')).toBe(1);
    expect(partOf('omvisning')).toBe(1);
    expect(partOf('kari')).toBe(2);
    expect(partOf('astrid')).toBe(2);
    expect(partOf('helhet')).toBe(3);
    expect(partOf('takk')).toBe(3);
  });
});

describe('coming back (decision 11) and the case under way', () => {
  const sent = (steg: string) => ({ status: 'sent', at: '2026-10-12T10:00:00Z', steg, via: 'panel' });
  const base = {
    v: 2,
    roleChoice: 'fastlege',
    intervju: 'Nei',
    studienavn: 'Rolig elg 27',
    route: 'panel',
    visAtlas: {},
    page1: {},
    gp: {},
    dps: {},
    tour: { part: 5, step: 0, done: true, started: true },
    extra: {},
    prompts: {},
    feedbackSent: [],
  };
  const store = (s: object) => window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
  afterEach(() => window.localStorage.clear());

  it('keeps a case current after its form is sent or skipped, until the case is done', async () => {
    const { loadStudy } = await import('../../src/state/study');
    store({ ...base, furthest: 'kari', ledger: { S1: sent('S1'), S3: sent('S3') }, phase: { kari: 'reply' } });
    expect(loadStudy().furthest).toBe('kari');
    store({ ...base, furthest: 'astrid', ledger: { S1: sent('S1'), S5: { ...sent('S5'), status: 'skipped' } }, phase: { kari: 'done', erlend: 'done', astrid: 'uten' } });
    expect(loadStudy().furthest).toBe('astrid');
    store({ ...base, furthest: 'kari', ledger: { S1: sent('S1'), S3: sent('S3') }, phase: { kari: 'done' } });
    expect(loadStudy().furthest).toBe('erlend');
  });

  it('treats a case form kept only in the keep record as a case done', async () => {
    const { loadStudy } = await import('../../src/state/study');
    window.localStorage.setItem('atlas.study.keep.v2', JSON.stringify({ ledger: { S1: sent('S1'), S3: sent('S3') }, visAtlas: { kari: true }, roleChoice: 'fastlege', intervju: 'Nei', studienavn: 'Rolig elg 27' }));
    const s = loadStudy();
    expect(s.phase.kari).toBe('done');
    expect(s.furthest).toBe('erlend');
  });

  it('starts afresh when the session began in the other round, and goes on within its own', async () => {
    await freshForms({ round: 'study', forms: {} });
    const { loadStudy, studyEntryPath } = await import('../../src/state/study');
    store({ ...base, round: 'pilot', furthest: 'erlend', ledger: { S1: sent('S1'), S3: sent('S3') }, phase: { kari: 'done' } });
    window.localStorage.setItem('atlas.study.keep.v2', JSON.stringify({ round: 'pilot', ledger: { S1: sent('S1'), S3: sent('S3') }, visAtlas: { kari: true }, roleChoice: 'fastlege', intervju: 'Nei', studienavn: 'Rolig elg 27' }));
    const study = loadStudy('study');
    expect(study.round).toBe('study');
    expect(study.roleChoice).toBeUndefined();
    expect(study.studienavn).toBeUndefined();
    expect(study.ledger).toEqual({});
    expect(study.visAtlas).toEqual({});
    expect(study.furthest).toBe('velkommen');
    // The site runs the study round: the pilot session is not offered back.
    expect(studyEntryPath('')).toBeNull();
    const pilot = loadStudy('pilot');
    expect(pilot.round).toBe('pilot');
    expect(pilot.roleChoice).toBe('fastlege');
    expect(pilot.studienavn).toBe('Rolig elg 27');
    expect(pilot.furthest).toBe('erlend');
    // While the site runs the pilot round, the pilot session is offered back.
    await freshForms({ round: 'pilot', forms: {} });
    const inPilot = await import('../../src/state/study');
    expect(inPilot.studyEntryPath('')).toBe('/studie/velkommen?tilbake');
    vi.unstubAllGlobals();
  });

  it('takes a session with no round recorded as this round\'s', async () => {
    const { loadStudy } = await import('../../src/state/study');
    store({ ...base, furthest: 'kari', ledger: { S1: sent('S1') }, phase: {} });
    const s = loadStudy('pilot');
    expect(s.round).toBe('pilot');
    expect(s.roleChoice).toBe('fastlege');
    expect(s.furthest).toBe('kari');
  });

  it('sends the bare study link to the welcome back when the browser holds a role, and nothing else', async () => {
    const { studyEntryPath } = await import('../../src/state/study');
    expect(studyEntryPath('')).toBeNull();
    store({ ...base, furthest: 'om-deg', ledger: {}, phase: {} });
    for (const h of ['', '#', '#/', '#/studie', '#/studie/']) expect(studyEntryPath(h), h).toBe('/studie/velkommen?tilbake');
    for (const h of ['#/studie/hjem', '#/studie/sak/kari/konsultasjon', '#/studie?forhandsvisning', '#/studie?kvittering', '#/gjennomgang']) expect(studyEntryPath(h), h).toBeNull();
  });
});

describe('the closing day is a day in Norway', () => {
  it('turns at Norwegian midnight', async () => {
    const { osloToday } = await import('../../src/engine/forms');
    expect(osloToday(new Date('2026-12-18T22:30:00Z'))).toBe('2026-12-18');
    expect(osloToday(new Date('2026-12-18T23:30:00Z'))).toBe('2026-12-19');
  });
});

describe('the receipt names its form (nettskjema.mjs verify)', () => {
  it('accepts the receipt the script writes and flags one without the name', async () => {
    const path = '../../scripts/nettskjema.mjs';
    const m = (await import(/* @vite-ignore */ path)) as {
      receiptProblems: (text: unknown, key: string) => string[];
      formSettings: (form: unknown, editors: string[]) => { receiptText: string };
    };
    const site = 'https://siouxchieftain-jpg.github.io/atlas-meridian/';
    for (const f of instrument.forms) expect(m.receiptProblems(m.formSettings(f, []).receiptText, f.key), f.key).toEqual([]);
    expect(m.receiptProblems(`<a href="${site}sendt.html?skjema=S2" rel="x">`, 'S2.dps')).toEqual([]);
    // As Nettskjema stores it: the equals sign as a character reference, which the browser reads as «=».
    expect(m.receiptProblems(`<a class="receipt-link-as-button" href="${site}sendt.html?skjema&#61;S9">Tilbake til ATLAS</a>`, 'S9')).toEqual([]);
    expect(m.receiptProblems(`<a href="${site}sendt.html?skjema&#61;S1">`, 'S9')).toHaveLength(1);
    expect(m.receiptProblems(`<a href="${site}sendt.html" rel="x">`, 'S9')).toHaveLength(1);
    expect(m.receiptProblems(`<a href="${site}sendt.html?skjema=S1" rel="x">`, 'S9')).toHaveLength(1);
    expect(m.receiptProblems('', 'S1')[0]).toMatch(/missing/);
  });

  it('opens a form through the end of a day in Norway, winter or summer', async () => {
    const path = '../../scripts/nettskjema.mjs';
    const m = (await import(/* @vite-ignore */ path)) as { osloEndOfDay: (d: unknown) => string | undefined };
    expect(m.osloEndOfDay('2026-11-30')).toBe('2026-11-30T23:59:00+01:00');
    expect(m.osloEndOfDay('2027-06-15')).toBe('2027-06-15T23:59:00+02:00');
    expect(m.osloEndOfDay('2026-02-30')).toBeUndefined();
    expect(m.osloEndOfDay('30.11.2026')).toBeUndefined();
  });
});
