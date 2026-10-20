import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { configWithoutForms, mockNettskjema } from './mock';
import { noHorizontalScroll, sendForm, startStudy, toHome } from './helpers';

// ATLAS 3.5.1: the tour comes before case 1, so «Mitt henvisningsmønster» and Delt oversikt's Kalibrering hold their
// figures back and show their layout. No rate, count or return reason of the area or of the GP's own pattern reaches a
// participant before their answers without ATLAS (G-38; the 3.4 flow review's B1). The hold follows the study's
// progress, not the window: part 3, «Se igjen» on Helhetsinntrykk and the tour seen again after the three cases show
// the figures (3.5.1 review B1 and S5). The review's tour mirrors the participant's and says so (N4).
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

type Nb = { nb: string; en: string };
const read = (f: string) => JSON.parse(readFileSync(`src/content/${f}`, 'utf8'));
const vocab = read('vocab.json') as { reasons: Record<string, Nb> };
const REASONS = Object.values(vocab.reasons).map((r) => r.nb);
const QUARTERS = (read('pattern.json') as { quarters: { label: Nb }[] }).quarters.map((q) => q.label.nb);
const AREA = (read('shared.json') as { kalibrering: { catchment: { label: Nb }[] } }).kalibrering.catchment.map((c) => c.label.nb);
const HELD = 'Ingen tall i omvisningen. Tallene og returårsakene vises på oversikten når de tre sakene er ferdige.';
const HELD_REVIEW = 'Ingen tall i omvisningen. I studien vises tallene og returårsakene på oversikten når de tre sakene er ferdige.';
const HELD_EN = 'No figures in the tour. The figures and the return reasons appear on the overview once the three cases are done.';
const NEXT = /^(Neste|Neste del)$/;

/** S1 sent, then the card before the tour and into its first step. */
async function startTour(page: Page, role: 'Fastlege' | 'DPS-kliniker') {
  await mockNettskjema(page);
  await startStudy(page, role, 'Nei');
  await sendForm(page);
  await toHome(page);
  await page.locator('[data-start-tour]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
  await expect(page.locator('[data-tour-frame]')).toBeVisible();
}

/** On through the tour until its live window is titled `title`. */
async function tourTo(page: Page, title: string, label = 'Levende eksempel', next = NEXT) {
  const win = page.locator('[data-tour-frame]');
  for (let i = 0; i < 30; i++) {
    if ((await win.getAttribute('aria-label')) === `${label}: ${title}`) return win;
    await page.getByRole('button', { name: next }).click();
  }
  throw new Error(`the tour has no step titled ${title}`);
}

/** A study seeded after `done` of the three cases, the tour done. */
async function seed(page: Page, role: 'fastlege' | 'dps-kliniker', done: 1 | 3) {
  const at = '2026-10-19T00:00:00.000Z';
  const sent = (steg: string) => ({ status: 'sent', at, steg, via: 'panel' });
  const three = done === 3;
  const state = {
    v: 2,
    roleChoice: role,
    intervju: 'Nei',
    studienavn: 'Ivrig ugle 42',
    furthest: three ? 'helhet' : 'erlend',
    route: 'panel',
    ledger: three ? { S1: sent('S1'), S3: sent('S3'), S4: sent('S4'), S5: sent('S5') } : { S1: sent('S1'), S3: sent('S3') },
    visAtlas: three ? { kari: true, erlend: true, astrid: true } : { kari: true },
    page1: {},
    phase: three ? { kari: 'done', erlend: 'done', astrid: 'done' } : { kari: 'done' },
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: true, started: true },
    extra: {},
    prompts: three ? { kari: 'later', erlend: 'later', astrid: 'later' } : { kari: 'later' },
    feedbackSent: [],
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

/** The pattern holds its figures back: the outcomes, the reasons' heading and the quarters by name, nothing beside them. */
async function expectPatternHeld(win: Locator, line = HELD) {
  await expect(win.locator('[data-held]')).toHaveText(line);
  await expect(win.getByRole('heading', { name: 'Utfall' })).toBeVisible();
  await expect(win.getByRole('heading', { name: 'Årsaker til retur' })).toBeVisible();
  await expect(win.getByRole('heading', { name: 'Henvisninger per kvartal' })).toBeVisible();
  await expect(win).toContainText('Rett til helsehjelp');
  await expect(win).toContainText('Retur med råd');
  // «Ingen» would say there were none; the figures are held back, not zero.
  await expect(win.getByText('Ingen', { exact: true })).toHaveCount(0);
  let text = await win.innerText();
  for (const q of QUARTERS) {
    expect(text, `the quarter «${q}» is named`).toContain(q);
    text = text.replace(q, '');
  }
  expect(text, 'a count beside the layout').not.toMatch(/\d/);
  for (const x of ['%', 'Fiktive tall', 'Ingen data ennå', 'Oftest oppgitt']) expect(text).not.toContain(x);
  for (const r of REASONS) expect(text, `the pattern names «${r}»`).not.toContain(r);
}

/** Kalibrering holds its figures back: the area's six labels, the reasons' heading with no list, and the log. */
async function expectKalibreringHeld(win: Locator, line = HELD) {
  await expect(win.locator('[data-held]')).toHaveText(line);
  const area = win.getByRole('region', { name: 'Opptaksområdet' });
  for (const l of AREA) await expect(area).toContainText(l);
  expect(await area.innerText(), 'a figure beside the area’s labels').not.toMatch(/\d/);
  const reasons = win.getByRole('region', { name: 'Vanlige årsaker til retur' });
  await expect(reasons).toContainText('En retur kan ha flere årsaker.');
  // Not even the reasons' names: their order alone would rank them.
  await expect(reasons.getByRole('listitem')).toHaveCount(0);
  // The log of changes to the criteria stays: it names no case's reason and no rate.
  await expect(win.getByRole('region', { name: 'Endringer i kriteriene' })).toContainText('Ved spørsmål om ADHD hos voksne');
  const text = await win.innerText();
  for (const x of ['%', 'Fiktive tall', 'Ingen data ennå', '1 182', 'virkedager']) expect(text).not.toContain(x);
  for (const r of REASONS) expect(text, `Kalibrering names «${r}»`).not.toContain(r);
}

/** The full pattern: the GP's own counts and reasons, and no held line. */
async function expectPatternOpen(scope: Locator) {
  await expect(scope.locator('[data-held]')).toHaveCount(0);
  await expect(scope).toContainText('Fiktive tall');
  await expect(scope).toContainText('24 henvisninger');
  const reasons = scope.getByRole('region', { name: 'Årsaker til retur' });
  await expect(reasons.getByRole('listitem')).toHaveCount(5);
  await expect(reasons).toContainText('Funksjonsnedgang for kort varighet');
}

/** The full Kalibrering: the area's figures and the reasons with their shares, and no held line. */
async function expectKalibreringOpen(scope: Locator) {
  await expect(scope.locator('[data-held]')).toHaveCount(0);
  const area = scope.getByRole('region', { name: 'Opptaksområdet' });
  for (const x of ['1 182', '64 %', '36 %', '14 %', '8 virkedager', '27']) await expect(area).toContainText(x);
  const reasons = scope.getByRole('region', { name: 'Vanlige årsaker til retur' });
  await expect(reasons.getByRole('listitem')).toHaveCount(5);
  await expect(reasons).toContainText('Utilstrekkelig informasjon');
  await expect(reasons).toContainText('29 %');
}

async function axe(page: Page) {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .include('[data-tour-frame]')
    .analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

/**
 * Opens a tour step in a dialog, checks it, and closes it again. At a laptop's height the content scrolls: it must be
 * reachable by keyboard, pass axe, and keep «Lukk» on screen (3.5.1 re-check S1, N7).
 */
async function inDialog(page: Page, opener: Locator, check: (win: Locator) => Promise<void>) {
  await opener.click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  // The dialog fades in over 250 ms. axe reads colours, and halfway through the fade «Lukk» (white on brand 80, 4.6:1)
  // reads below 4.5:1, so wait until the dialog has finished opening. An animation that is cancelled on the way leaves
  // nothing behind, so its rejected promise counts as done.
  await dlg.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))));
  await check(dlg.locator('[data-tour-frame]'));
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .include('[role="dialog"]')
    .analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  const close = dlg.getByRole('button', { name: 'Lukk' });
  const box = await close.boundingBox();
  expect(box && box.y + box.height, '«Lukk» below the window').toBeLessThanOrEqual(page.viewportSize()!.height);
  const content = dlg.locator('.fui-DialogContent');
  if (await content.evaluate((el) => el.scrollHeight > el.clientHeight)) {
    await content.focus();
    await page.keyboard.press('End');
    await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  }
  await close.click();
  await expect(dlg).toHaveCount(0);
}

test('GP before case 1: the tour shows the pattern and Kalibrering as layouts, with no figure and no return reason', async ({ page }) => {
  await startTour(page, 'Fastlege');

  const pattern = await tourTo(page, 'Mitt henvisningsmønster');
  await expectPatternHeld(pattern);
  // The step's text is true held or not: the view's figures are fictional, and they show in part 3.
  await expect(page.getByText('Tallene er fiktive for prototypen.', { exact: false })).toBeVisible();
  // Nothing in the window to reset.
  await expect(page.getByRole('button', { name: 'Nullstill eksempelet' })).toHaveCount(0);
  await axe(page);

  const kal = await tourTo(page, 'Delt oversikt: Kalibrering');
  await expectKalibreringHeld(kal);
  await expect(page.getByText('Ingen enkeltklinikere vises, og tallene er fiktive.', { exact: false })).toBeVisible();
  await expect(page.getByText('Spørsmålene kaller tallene i Kalibrering og i Mitt henvisningsmønster for «kalibreringsdata».')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nullstill eksempelet' })).toHaveCount(0);
  await axe(page);
});

test('DPS before case 1: the tour shows Kalibrering as a layout, with no figure and no return reason', async ({ page }) => {
  await startTour(page, 'DPS-kliniker');
  const kal = await tourTo(page, 'Delt oversikt: Kalibrering');
  await expectKalibreringHeld(kal);
  await expect(page.getByText('Ingen enkeltfastlege vises, og tallene er fiktive.', { exact: false })).toBeVisible();
  await expect(page.getByText('Spørsmålene kaller tallene i Kalibrering for «kalibreringsdata»', { exact: false })).toBeVisible();
  await axe(page);
});

test('English: both held windows say the same as the Norwegian', async ({ page }) => {
  await startTour(page, 'Fastlege');
  await page.getByRole('button', { name: 'English' }).click();
  const pattern = await tourTo(page, 'My referral pattern', 'Live example', /^(Next|Next part)$/);
  await expect(pattern.locator('[data-held]')).toHaveText(HELD_EN);
  await expect(pattern.getByRole('heading', { name: 'Referrals per quarter' })).toBeVisible();
  await expect(page.getByText('The figures are fictional for the prototype.', { exact: false })).toBeVisible();
  const kal = await tourTo(page, 'Shared overview: Calibration', 'Live example', /^(Next|Next part)$/);
  await expect(kal.locator('[data-held]')).toHaveText(HELD_EN);
  await expect(kal.getByRole('region', { name: 'The catchment area' })).toContainText('Referrals received');
  await expect(kal.getByRole('region', { name: 'Common reasons for return' }).getByRole('listitem')).toHaveCount(0);
  expect(await kal.innerText()).not.toContain('%');
  await expect(page.getByText('The questions call the figures in Calibration and in My referral pattern ‘calibration data’.')).toBeVisible();
});

test('the held windows at 320 px and in forced colours: no sideways scroll, and the line keeps its dashed border', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await startTour(page, 'Fastlege');
  const pattern = await tourTo(page, 'Mitt henvisningsmønster');
  await expectPatternHeld(pattern);
  await noHorizontalScroll(page);
  const kal = await tourTo(page, 'Delt oversikt: Kalibrering');
  await expectKalibreringHeld(kal);
  await noHorizontalScroll(page);
  await page.emulateMedia({ forcedColors: 'active' });
  const border = await kal.locator('[data-held]').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { style: cs.borderTopStyle, width: parseFloat(cs.borderTopWidth) };
  });
  expect(border.style).toBe('dashed');
  expect(border.width).toBeGreaterThan(0);
});

for (const role of ['fastlege', 'dps-kliniker'] as const) {
  const gp = role === 'fastlege';
  test(`part 3 (${gp ? 'GP' : 'DPS'}): the start page, «Se igjen» and the tour seen again show the figures`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await mockNettskjema(page);
    await seed(page, role, 3);
    await page.goto('/#/studie/hjem');
    await expect(page.locator('[data-start-hero]').getByRole('heading', { level: 1 })).toHaveText('De tre sakene er ferdige');
    // The hero no longer says «igjen»: before part 3 the participant saw only the layout.
    await expect(page.locator('[data-start-hero]')).toContainText(gp ? 'hvis du vil se dem før skjemaene' : 'hvis du vil se den før skjemaene');

    // The start page's openers.
    if (gp) await inDialog(page, page.locator('[data-open-step="gp-monster"]'), expectPatternOpen);
    await inDialog(page, page.locator(`[data-open-step="${gp ? 'gp-kalibrering' : 'dps-kalibrering'}"]`), expectKalibreringOpen);

    // «Se igjen» on Helhetsinntrykk.
    await page.goto('/#/studie/helhet');
    await expect(page.locator('main h1')).toBeVisible();
    if (gp) await inDialog(page, page.locator('[data-see-again="gp-monster"]'), expectPatternOpen);
    await inDialog(page, page.locator(`[data-see-again="${gp ? 'gp-kalibrering' : 'dps-kalibrering'}"]`), expectKalibreringOpen);

    // The tour seen again after the three cases.
    await page.goto('/#/studie/omvisning?igjen');
    await expect(page.locator('[data-tour-frame]')).toBeVisible();
    if (gp) await expectPatternOpen(await tourTo(page, 'Mitt henvisningsmønster'));
    await expectKalibreringOpen(await tourTo(page, 'Delt oversikt: Kalibrering'));
  });
}

test('after one case the tour seen again still holds the figures back', async ({ page }) => {
  await mockNettskjema(page);
  await seed(page, 'fastlege', 1);
  await page.goto('/#/studie/omvisning?igjen');
  await expect(page.locator('[data-tour-frame]')).toBeVisible();
  await expectPatternHeld(await tourTo(page, 'Mitt henvisningsmønster'));
  await expectKalibreringHeld(await tourTo(page, 'Delt oversikt: Kalibrering'));
});

test('review mode: the tour mirrors the held state and says when the study shows the figures; the review’s own pages show them', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/omvisning');
  await expect(page.locator('[data-tour-frame]')).toBeVisible();
  await expectPatternHeld(await tourTo(page, 'Mitt henvisningsmønster'), HELD_REVIEW);
  await expectKalibreringHeld(await tourTo(page, 'Delt oversikt: Kalibrering'), HELD_REVIEW);
  await page.goto('/#/gjennomgang/dps/delt');
  await expect(page.locator('main h1')).toBeVisible();
  await expectKalibreringOpen(page.locator('main'));
});

/**
 * A guard for G-38: no sentence of 25 characters or more that a study case's «with ATLAS» view holds (the system's
 * reading, the GP's uncertainty, DPS's return, explanation, advice and reply) appears in the Norwegian tour, and no rate
 * or «Fiktive tall» does. The practice case is placed where a window asks, and the window's disclosures are opened at
 * every step. Reason, criterion and outcome names are the interface's vocabulary.
 */
const WITH: Record<'gp' | 'dps', string[]> = {
  gp: ['systemReading', 'dpsScript'],
  dps: ['systemReading', 'gpUncertainty', 'returnSent', 'gpScript'],
};
function nbStrings(x: unknown, out: string[]) {
  if (Array.isArray(x)) x.forEach((v) => nbStrings(v, out));
  else if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if (typeof o.nb === 'string') out.push(o.nb);
    else Object.values(o).forEach((v) => nbStrings(v, out));
  }
}
const LABELS = new Set<string>();
{
  const all: string[] = [];
  nbStrings(read('vocab.json'), all);
  all.forEach((l) => LABELS.add(l.trim().replace(/\.$/, '')));
}
/** Split into sentences, without the closing mark. */
const sentences = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim().replace(/[.!?]$/, ''))
    .filter(Boolean);
/**
 * What the practice patient's own case says too is the format, not a case: the reading's sources, that its sentence on
 * similar referrals was written for the case with no real figures behind it, a thank-you. Taken from Sofie's text, so
 * nothing case-specific is let through by a pattern (3.5.1 re-check N3).
 */
const SOFIE = new Set<string>();
{
  const all: string[] = [];
  nbStrings(read('cases/sofie.json'), all);
  all.forEach((s) => sentences(s).forEach((p) => SOFIE.add(p)));
}
/** The count is pinned, so a renamed key or a changed case shows here: check the new sentences, then update it. */
const WITH_ATLAS_COUNT = 49;
const WITH_ATLAS: string[] = [];
for (const id of ['kari', 'erlend', 'astrid']) {
  const c = read(`cases/${id}.json`) as Record<'gp' | 'dps', Record<string, unknown>>;
  for (const side of ['gp', 'dps'] as const) {
    for (const key of WITH[side]) {
      const found: string[] = [];
      nbStrings(c[side]?.[key], found);
      for (const s of found) {
        for (const p of sentences(s)) {
          if (p.length >= 25 && !LABELS.has(p) && !SOFIE.has(p)) WITH_ATLAS.push(p);
        }
      }
    }
  }
}

for (const role of ['Fastlege', 'DPS-kliniker'] as const) {
  test(`G-38 guard (${role}): no case's «with ATLAS» sentence, rate or «Fiktive tall» anywhere in the tour`, async ({ page }) => {
    expect(new Set(WITH_ATLAS).size, 'the sentences to look for (the case data changed: check them, then update)').toBe(WITH_ATLAS_COUNT);
    await startTour(page, role);
    const stage = page.locator('[data-tour-stage]');
    const win = page.locator('[data-tour-frame]');
    const seen: string[] = [];
    let steps = 0;
    for (let i = 0; i < 40; i++) {
      steps++;
      seen.push(await stage.innerText());
      // Place the practice case where the window asks, so the reading behind the placement shows too.
      const placeIt = win.getByRole('combobox', { name: 'Plasser saken' }).filter({ visible: true });
      if ((await placeIt.count()) > 0) {
        await placeIt.first().click();
        await page.getByRole('option').nth(2).click();
      }
      const closed = win.locator('button[aria-expanded="false"]:not([role="combobox"]):not([aria-haspopup])');
      for (let n = await closed.count(); n > 0; n = await closed.count()) {
        await closed.first().click();
        if ((await closed.count()) >= n) break;
      }
      seen.push(await stage.innerText());
      const next = page.getByRole('button', { name: NEXT });
      if ((await next.count()) === 0) break;
      await next.click();
    }
    const tourJson = read('tour.json') as Record<'gp' | 'dps', { parts: { steps: unknown[] }[] }>;
    expect(steps, 'every step walked').toBe(tourJson[role === 'Fastlege' ? 'gp' : 'dps'].parts.reduce((a, p) => a + p.steps.length, 0));
    const all = seen.join('\n').replace(/\s+/g, ' ');
    // The guard reads what placing reveals: the practice case's own reading is there.
    expect(all).toContain('Liknende henvisninger er oftere returnert med råd');
    const hits = WITH_ATLAS.filter((p) => all.includes(p));
    expect(hits, 'a study case’s «with ATLAS» sentence in the tour').toEqual([]);
    expect(all).not.toContain('%');
    expect(all).not.toContain('Fiktive tall');
  });
}
