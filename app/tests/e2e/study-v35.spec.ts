import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { configWithoutForms, mockNettskjema } from './mock';

// ATLAS 3.5: board 12a's parts back on both start pages, under 3.4's rules. The key figures are plain text; the day runs
// from 08 to 16 with the day's tasks; the GP's referrals are a table with their deadlines; the pattern and Delt
// oversikt open after the three cases; «Kommende» closes the page. Every example sits in a grey group under its label,
// nothing on the page opens a case, and nothing before a case hints at its outcome.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

type Phase = 'case1' | 'case2' | 'end';

/** A participant's stored progress, seeded before the page loads: the tour done, and the cases done up to the phase. */
async function seed(page: Page, role: 'fastlege' | 'dps-kliniker', phase: Phase) {
  const at = '2026-10-19T00:00:00.000Z';
  const sent = (steg: string) => ({ status: 'sent', at, steg, via: 'panel' });
  const done = phase === 'case1' ? [] : phase === 'case2' ? ['kari'] : ['kari', 'erlend', 'astrid'];
  const state = {
    v: 2,
    roleChoice: role,
    intervju: 'Nei',
    studienavn: 'Ivrig ugle 42',
    furthest: phase === 'case1' ? 'kari' : phase === 'case2' ? 'erlend' : 'helhet',
    route: 'panel',
    ledger: { S1: sent('S1'), ...(done.length ? { S3: sent('S3') } : {}), ...(done.length === 3 ? { S4: sent('S4'), S5: sent('S5') } : {}) },
    visAtlas: Object.fromEntries(done.map((c) => [c, true])),
    page1: {},
    phase: Object.fromEntries(done.map((c) => [c, 'done'])),
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: true, started: true },
    extra: {},
    prompts: Object.fromEntries(done.map((c) => [c, 'later'])),
    feedbackSent: [],
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

async function home(page: Page, role: 'fastlege' | 'dps-kliniker', phase: Phase, width = 1366, height = 768) {
  await page.setViewportSize({ width, height });
  await mockNettskjema(page);
  await seed(page, role, phase);
  await page.goto('/#/studie/hjem');
  await expect(page.locator('[data-start-hero]')).toBeVisible();
  await expect(page.locator('[data-home-part="tall"]')).toBeVisible();
}

/** The key figures as a screen reader reads them: each label with its value and its line. */
async function figures(page: Page): Promise<Record<string, string>> {
  return page.locator('[data-home-part="tall"] [data-figure]').evaluateAll((els) =>
    Object.fromEntries(els.map((el) => [el.getAttribute('data-figure'), (el as HTMLElement).innerText.replace(/\s+/g, ' ').trim()])),
  );
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .exclude('iframe')
    .exclude('[data-tabster-dummy]')
    .analyze();
  const found = r.violations.map((v) => `${v.impact} ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(found, found.join('\n')).toEqual([]);
}

/** The outcomes and the reasons for a return, as the case's «with ATLAS» view and the pattern name them. */
const OUTCOME_WORDS = [
  'Retur med råd',
  'Rett til helsehjelp',
  'Avslått uten begrunnelse',
  'Funksjonsnedgang for kort varighet',
  'Utilstrekkelig informasjon',
  'Kommunalt tilbud ikke utprøvd',
  'Situasjonell krise',
  'Annen årsak',
];

/** Nothing before a case says how DPS answered or why, and no rate appears beside the GP's own counts. */
async function noOutcome(page: Page) {
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  for (const w of OUTCOME_WORDS) expect(text, w).not.toContain(w);
  expect(text).not.toMatch(/\d\s?%/);
  // And no text with a placeholder left in it.
  expect(text).not.toContain('{{');
}

test('the GP’s start page has 12a’s parts: plain figures, the whole day with its tasks, the referrals as a table, and Kommende', async ({ page }) => {
  await home(page, 'fastlege', 'case1');
  // The key figures: four counts as text, never a tile, a link or a button.
  const fig = await figures(page);
  expect(fig.timer).toBe('Timer i dag 6 timer 3 med henvisningssak · første kl. 09:00');
  expect(fig.innboks).toBe('Innboks 2 nye Svar fra DPS og en selvrapport');
  expect(fig.henvisninger).toBe('Henvisninger til DPS 3 venter på svar DPS ber om mer informasjon i én');
  expect(fig.frist).toBe('Neste vurderingsfrist 23. mars Per Haugen, mottatt av DPS 9. mars');
  await expect(page.locator('[data-home-part="tall"]').getByRole('heading', { level: 2, name: 'Nøkkeltall' })).toBeAttached();
  await expect(page.locator('[data-home-part="tall"] :is(a, button, [tabindex])')).toHaveCount(0);

  // The day from 08 to 16, «Nå» where the study's clock stands, and the day's tasks as examples.
  const day = page.locator('[data-home-part="dag"]');
  await expect(day.getByRole('list', { name: 'Dagen fra kl. 08 til 16' })).toBeVisible();
  await expect(day.locator('[data-day-item]')).toHaveCount(11);
  await expect(day.locator('[data-day-now]')).toHaveText('Nå 08:52');
  const tasks = day.getByRole('group', { name: 'Gjøremål i dag: eksempler, kan ikke åpnes i prototypen' });
  await expect(tasks.getByRole('listitem')).toHaveCount(3);
  await expect(tasks).toContainText('Skriv legeattest · Jonas Brekke');

  // The referrals: a table with its headers; Astrid's says DPS answered and when, never what.
  const refs = page.getByRole('table', { name: 'Henvisningene mine' });
  await expect(refs.getByRole('columnheader')).toHaveText(['Pasient', 'Sendt', 'Hvor den er', 'Status']);
  const astrid = refs.locator('[data-ref-row="astrid"]');
  await expect(astrid.getByRole('rowheader')).toHaveText('Astrid Holm, 28 år');
  await expect(astrid).toContainText('Vurdert 16. mars');
  await expect(astrid).toContainText('Svar fra DPS · Sak 3');
  // The examples in one grey group of rows under their label.
  const ex = refs.getByRole('rowgroup', { name: 'Eksempler på en vanlig dag, kan ikke åpnes i prototypen' });
  await expect(ex).toHaveAttribute('data-examples', '');
  await expect(ex.locator('[data-ref-row]')).toHaveCount(3);
  await expect(ex.locator('[data-ref-row="Mona Lie"]')).toContainText('Mottatt 11. mars, DPS spurte 13. mars');
  // The deadlines of the next ten working days, as dates: today, then Per Haugen's and Siri Dahl's.
  // The cells are a picture; the sentence under them says every deadline in words.
  const strip = page.locator('[data-home-part="henvisninger"] ol[aria-hidden="true"]');
  await expect(strip.locator('li')).toHaveCount(10);
  await expect(strip.locator('[data-due]')).toHaveCount(2);
  await expect(page.locator('[data-home-part="henvisninger"]')).toContainText('23. mars: Per Haugen · 27. mars: Siri Dahl');

  // What is coming up: four examples of an ordinary week.
  const coming = page.locator('[data-home-part="kommende"]');
  await expect(coming.getByRole('heading', { level: 2 })).toHaveText('Kommende');
  await expect(coming.getByRole('group', { name: 'Eksempler på en vanlig uke, kan ikke åpnes i prototypen' }).getByRole('listitem')).toHaveCount(4);
  await expect(coming).toContainText('Torsdag 19. mars, kl. 14:00');

  // One door per destination: nothing in the parts opens anything before part 3, and nothing hints at an outcome.
  await expect(page.locator('[data-home-part] :is(a, button)')).toHaveCount(0);
  await noOutcome(page);
  await axe(page);
});

test('the GP’s two locked parts share one column beside the referrals, and open with 12a’s chart and time line in part 3', async ({ page }) => {
  await home(page, 'fastlege', 'case1');
  const pattern = (await page.locator('[data-home-part="monster"]').boundingBox())!;
  const shared = (await page.locator('[data-home-part="delt"]').boundingBox())!;
  const refs = (await page.locator('[data-home-part="henvisninger"]').boundingBox())!;
  // One above the other, beside the referrals, and together as tall as them.
  expect(Math.abs(pattern.x - shared.x)).toBeLessThanOrEqual(1);
  expect(shared.y).toBeGreaterThan(pattern.y + pattern.height);
  expect(pattern.x).toBeGreaterThan(refs.x + refs.width);
  expect(Math.abs(shared.y + shared.height - (refs.y + refs.height))).toBeLessThanOrEqual(2);
  for (const part of ['monster', 'delt']) {
    await expect(page.locator(`[data-home-part="${part}"]`)).toHaveAttribute('data-locked', '');
    await expect(page.locator(`[data-home-part="${part}"]`)).toContainText('Åpnes når de tre sakene er ferdige.');
  }
  await expect(page.locator('[data-home-part="monster"]')).toContainText('Dine egne henvisninger til DPS og svarene på dem, kvartal for kvartal.');
});

test('part 3 on a large monitor: four columns in two rows, the pattern per quarter, the criteria’s changes, no rates', async ({ page }) => {
  await home(page, 'fastlege', 'end', 2560, 1270);
  await expect(page.locator('[data-columns]')).toHaveAttribute('data-columns', '4');
  const box = async (part: string) => (await page.locator(`[data-home-part="${part}"]`).boundingBox())!;
  const [day, inbox, coming, refs, pattern, shared] = await Promise.all(['dag', 'innboks', 'kommende', 'henvisninger', 'monster', 'delt'].map(box));
  // Two rows, each part as tall as its row.
  for (const b of [inbox, coming]) {
    expect(Math.abs(b.y - day.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.height - day.height)).toBeLessThanOrEqual(1);
  }
  for (const b of [pattern, shared]) {
    expect(Math.abs(b.y - refs.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.height - refs.height)).toBeLessThanOrEqual(1);
  }
  expect(coming.x).toBeGreaterThan(inbox.x + inbox.width);
  // The whole day fits, with the times over the initials, and each case done shows its tick.
  await expect(page.locator('[data-day-now]')).toHaveText('Nå 10:38');
  await expect(page.locator('[data-home-part="dag"] [data-day-item="ingrid"]')).toContainText('10:45');
  const p = page.locator('[data-home-part="monster"]');
  await expect(p.getByRole('figure', { name: 'Henvisninger per kvartal' }).getByRole('listitem')).toHaveCount(4);
  await expect(p.getByRole('figure', { name: 'Henvisninger per kvartal' })).toContainText('Oktober til desember 2025: 7 henvisninger');
  await expect(p.getByRole('button', { name: 'Se mønsteret' })).toBeVisible();
  const s = page.locator('[data-home-part="delt"]');
  await expect(s.getByRole('list', { name: 'Endringer i kriteriene' })).toContainText('feb. 2026');
  await expect(s).toContainText('ADHD hos voksne: opplysninger om barndommen');
  await expect(s).toContainText('DPS, inntak · 25. februar');
  await expect(s).toContainText('Ingen enkeltfastleger vises.');
  expect(await s.innerText()).not.toMatch(/\d\s?%/);
  // The figures follow the study: everything in the inbox is read once the three cases are done.
  expect((await figures(page)).innboks).toBe('Innboks Ingen nye Alt er lest');
  await axe(page);
});

test('DPS’s start page: the figures, the intake beside its deadlines, the day, the messages, Kommende and Delt oversikt', async ({ page }) => {
  await home(page, 'dps-kliniker', 'case1', 1920, 1080);
  await expect(page.locator('[data-columns]')).toHaveAttribute('data-columns', '4');
  const fig = await figures(page);
  expect(fig.henvisninger).toBe('Henvisningene i dag 3 henvisninger 2 nye og 1 med en melding fra fastlegen');
  expect(fig.meldinger).toBe('Meldinger 1 ny Fra henvisende fastlege');
  expect(fig.frist).toBe('Neste vurderingsfrist 31. mars Kari Nordli og Erlend Bakken');
  expect(fig.mote).toBe('Inntaksmøte kl. 11:00 Ni andre henvisninger venter på vurdering denne uka');
  // «Frister» keeps its room beside the intake (G-39).
  const deadlines = (await page.locator('[data-home-part="frister"]').boundingBox())!;
  const intake = (await page.locator('[data-home-part="inntak"]').boundingBox())!;
  expect(deadlines.width).toBeGreaterThanOrEqual(400);
  expect(Math.abs(deadlines.y - intake.y)).toBeLessThanOrEqual(1);
  // The intake clinician's day: the study's referrals in one stretch of the morning, «Nå» inside it.
  const day = page.locator('[data-home-part="dag"]');
  await expect(day.locator('[data-day-item="studien"]')).toContainText('Henvisningene i studien');
  await expect(day.locator('[data-day-now]')).toHaveText('Nå 08:50');
  await expect(day.getByRole('group', { name: 'Gjøremål i dag: eksempler, kan ikke åpnes i prototypen' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.locator('[data-home-part="kommende"]')).toContainText('Samarbeidsmøte med fastlegene i opptaksområdet');
  await expect(page.locator('[data-home-part="delt"]')).toHaveAttribute('data-locked', '');
  await expect(page.locator('[data-home-part] :is(a, button)')).toHaveCount(0);
  await noOutcome(page);
  await axe(page);
});

test('DPS’s figures follow the study: a deadline leaves when its referral is done, and the message once Astrid’s case is', async ({ page }) => {
  await home(page, 'dps-kliniker', 'case2');
  expect((await figures(page)).frist).toBe('Neste vurderingsfrist 31. mars Erlend Bakken');
  expect((await figures(page)).henvisninger).toBe('Henvisningene i dag 3 henvisninger 1 ny, 1 med en melding fra fastlegen og 1 ferdig');
  await noOutcome(page);
  await page.evaluate(() => window.sessionStorage.clear());
  const at = '2026-10-19T00:00:00.000Z';
  await page.evaluate((stamp) => {
    const s = JSON.parse(window.localStorage.getItem('atlas.study.v2')!);
    s.phase = { kari: 'done', erlend: 'done', astrid: 'done' };
    s.furthest = 'helhet';
    s.ledger.S4 = { status: 'sent', at: stamp, steg: 'S4', via: 'panel' };
    s.ledger.S5 = { status: 'sent', at: stamp, steg: 'S5', via: 'panel' };
    window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
    window.sessionStorage.setItem('seeded', '1');
  }, at);
  await page.reload();
  await expect(page.locator('[data-home-part="tall"]')).toBeVisible();
  const fig = await figures(page);
  expect(fig.henvisninger).toBe('Henvisningene i dag 3 henvisninger Alle tre er ferdige');
  expect(fig.frist).toBe('Neste vurderingsfrist Ingen åpne De nye henvisningene i studien er vurdert');
  expect(fig.meldinger).toBe('Meldinger Ingen nye Alt er lest');
  await expect(page.locator('[data-home-part="frister"]')).toContainText('Ingen åpne frister i studien.');
  await expect(page.locator('[data-home-part="delt"]')).not.toHaveAttribute('data-locked', '');
  await axe(page);
});

test('on a phone both start pages stack their parts, the figures two by two, the day and the referrals as lists', async ({ page }) => {
  await home(page, 'fastlege', 'case1', 390, 844);
  await expect(page.locator('[data-columns]')).toHaveAttribute('data-columns', '1');
  const cells = await page.locator('[data-home-part="tall"] [data-figure]').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(cells[0]).toBe(cells[1]);
  expect(cells[2]).toBeGreaterThan(cells[0]);
  await expect(page.locator('[data-home-part="dag"]').getByRole('list', { name: 'Dagen fra kl. 08 til 16' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Henvisningene mine' })).toHaveCount(0);
  await expect(page.locator('[data-home-part="henvisninger"]')).toContainText('Sendt 2. mars · Vurdert 16. mars · Svar fra DPS');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('in English the parts read in English, and nothing scrolls sideways at a laptop’s width', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('atlas.settings.lang', JSON.stringify('en')));
  await home(page, 'fastlege', 'case1');
  await expect(page.locator('[data-home-part="tall"]').getByRole('heading', { level: 2, name: 'Key figures' })).toBeAttached();
  expect((await figures(page)).henvisninger).toBe('Referrals to DPS 3 awaiting a reply DPS asks for more information on one');
  await expect(page.locator('[data-home-part="kommende"]').getByRole('heading', { level: 2 })).toHaveText('Coming up');
  await expect(page.getByRole('table', { name: 'My referrals' }).getByRole('columnheader')).toHaveText(['Patient', 'Sent', 'Where it stands', 'Status']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('before Astrid’s case the GP’s start page still names no outcome, and the inbox says what is new', async ({ page }) => {
  await home(page, 'fastlege', 'case2');
  expect((await figures(page)).innboks).toBe('Innboks 1 ny Svar fra DPS');
  await expect(page.locator('[data-ref-row="astrid"]')).toContainText('Svar fra DPS · Sak 3');
  await noOutcome(page);
});

test('no page shows a text with its placeholder left in it, and a thread one day apart says «Én dag senere»', async ({ page }) => {
  // 3.4 had written the start page's «Resten av dagen» over the thread's «Én dag senere» under the same key.
  for (const role of ['fastlege', 'dps']) {
    for (const c of ['kari', 'erlend', 'astrid']) {
      await page.goto(`/#/gjennomgang/${role}/sak/${c}/dialog`);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await page.locator('main').innerText(), `${role} ${c}`).not.toContain('{{');
    }
  }
  await page.goto('/#/gjennomgang/dps/sak/astrid/dialog');
  await expect(page.locator('main')).toContainText('Én dag senere');
});
