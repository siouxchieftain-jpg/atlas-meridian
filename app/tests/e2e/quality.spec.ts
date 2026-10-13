import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema } from './mock';
import { caseOnlyThenAtlas, place, sendForm, startStudy } from './helpers';

/** Review screens, both roles, every case view with content. */
const REVIEW_PATHS = [
  '#/gjennomgang',
  '#/gjennomgang/fastlege/timeliste',
  '#/gjennomgang/fastlege/sak/kari/orientering',
  '#/gjennomgang/fastlege/sak/kari/konsultasjon',
  '#/gjennomgang/fastlege/sak/kari/henvisning',
  '#/gjennomgang/fastlege/sak/kari/dialog',
  '#/gjennomgang/fastlege/sak/kari/plan',
  '#/gjennomgang/fastlege/sak/kari/oppsummering',
  '#/gjennomgang/fastlege/sak/erlend/henvisning',
  '#/gjennomgang/fastlege/sak/erlend/konsultasjon',
  '#/gjennomgang/fastlege/sak/astrid/konsultasjon',
  '#/gjennomgang/fastlege/sak/astrid/dialog',
  '#/gjennomgang/fastlege/sak/torbjorn/konsultasjon',
  '#/gjennomgang/fastlege/monster',
  '#/gjennomgang/fastlege/delt',
  '#/gjennomgang/fastlege/omvisning',
  '#/gjennomgang/fastlege/to-fastleger',
  '#/gjennomgang/dps/mottatte',
  '#/gjennomgang/dps/sak/kari/orientering',
  '#/gjennomgang/dps/sak/kari/vurdering',
  '#/gjennomgang/dps/sak/erlend/vurdering',
  '#/gjennomgang/dps/sak/astrid/vurdering',
  '#/gjennomgang/dps/sak/kari/dialog',
  '#/gjennomgang/dps/sak/kari/oppsummering',
  '#/gjennomgang/dps/delt',
  '#/gjennomgang/dps/omvisning',
  '#/gjennomgang/tilbakemeldinger',
];

/** Norwegian words and letters that should not appear in English text (names and codes carry their own lang or are listed). */
const NORWEGIAN = /\b(og|ikke|er|på|med|som|av|det|eller|saken|fastlegen|henvisningen|vurderingen|skjemaet|pasienten|deg|ditt|dine|hva|hvorfor|når|uten|etter|før|svar|lagre|neste|forrige|tilbake|ingen|timeliste|mottatte|notat|legemidler|historikk|sykemeldt|uker|måneder)\b|[æøåÆØÅ]/;
/** Proper names that keep their Norwegian letters in English. */
const NAMES = /Torbjørn|Skjærgården|Bjørn|Søren|Løvås/g;

async function englishLeftovers(page: Page, where: string): Promise<string[]> {
  await page.waitForTimeout(150);
  const lines = await page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const text = (n.textContent ?? '').trim();
      const el = n.parentElement;
      if (!text || !el) continue;
      // Text in the other language must carry its own lang; ATLAS's codes and the bilingual footer do.
      if (el.closest('[lang]')?.getAttribute('lang') !== 'en') continue;
      // The announcer's hidden live region keeps the last message as it was announced, in the language of that moment.
      if (el.closest('iframe, script, style, code, [aria-live]')) continue;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      out.push(text);
    }
    return out;
  });
  return lines.filter((l) => NORWEGIAN.test(l.replace(NAMES, ''))).map((l) => `${where}: ${l.slice(0, 140)}`);
}

async function hashTo(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
}

test('English coverage: no Norwegian left in English mode, review and study', async ({ page }) => {
  test.setTimeout(240_000);
  await mockNettskjema(page);
  const found: string[] = [];
  await page.goto('/#/gjennomgang');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('switch', { name: 'Design notes' }).click();
  for (const p of REVIEW_PATHS) {
    await hashTo(page, p);
    found.push(...(await englishLeftovers(page, p)));
  }

  // Study mode: run the flow in Norwegian (the helpers press Norwegian labels) and read each stop in English.
  const english = async (where: string) => {
    await page.getByRole('button', { name: 'English', exact: true }).click();
    found.push(...(await englishLeftovers(page, `studie ${where}`)));
    await page.getByRole('button', { name: 'Norsk', exact: true }).click();
  };
  await page.goto('/#/studie');
  await english('velkommen');
  await startStudy(page, 'Fastlege');
  await english('om deg');
  await sendForm(page);
  await page.getByRole('button', { name: 'Gå til omvisningen' }).click();
  await english('omvisning, first step');
  for (let i = 0; i < 20; i++) {
    if (await page.getByRole('button', { name: 'Ja, gå videre' }).isVisible()) break;
    await page.getByRole('button', { name: /^(Neste|Neste del|Se oversikten)$/ }).click();
    if (i === 4) await english('omvisning, a later step');
  }
  await english('omvisning, the end');
  await page.getByRole('button', { name: 'Ja, gå videre' }).click();
  await english('helhet');
  await sendForm(page);
  await page.getByRole('button', { name: 'Gå til den første saken' }).click();
  await english('kari briefing');
  await caseOnlyThenAtlas(page);
  await english('kari atlas');
  await place(page, 3);
  await english('kari placed');
  await page.goto('/#/studie/steg');
  await english('stepper');
  expect([...new Set(found)], [...new Set(found)].join('\n')).toEqual([]);
});

test('titles, one h1 and the landmarks on every review screen; the root lang follows the toggle', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb');
  const titles = new Map<string, string>();
  for (const p of REVIEW_PATHS) {
    await hashTo(page, p);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('header, [role="banner"]').first()).toBeAttached();
    const title = await page.title();
    expect(title, p).toMatch(/^.+ · ATLAS$/);
    // The document title never carries a patient's name (it shows in tab lists and history).
    expect(title, p).not.toMatch(/Kari|Erlend|Astrid|Torbjørn|Sofie/);
    titles.set(p, title);
  }
  expect(new Set(titles.values()).size).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle(/ · ATLAS$/);
});

test('forced colours: the band, the chips and the proportion bar stay visible', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await place(page, 2);
  const panelBand = page.getByRole('complementary', { name: 'ATLAS' }).locator('[data-band]').first();
  await expect(panelBand.locator('svg').first()).toBeVisible();
  // Track, grey zone and markers keep system colours (forced-color-adjust: none), so they stay apart from the canvas.
  const fills = await panelBand.evaluate((root) => [...root.querySelectorAll('svg rect')].map((el) => getComputedStyle(el).fill).filter((f) => f && f !== 'none'));
  expect(new Set(fills).size, `fills: ${[...new Set(fills)].join(', ')}`).toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: 'test-results/forced-colours-gp.png', fullPage: false });
  await page.goto('/#/gjennomgang/fastlege/monster');
  await page.screenshot({ path: 'test-results/forced-colours-pattern.png', fullPage: false });
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await place(page, 4);
  await page.screenshot({ path: 'test-results/forced-colours-dps.png', fullPage: false });
});

test('print: a case prints without the shell, the panels or the feedback tab', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.emulateMedia({ media: 'print' });
  const hidden = await page.evaluate(() =>
    ['header', 'nav', '[data-form-panel]'].map((sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).display : 'none';
    }),
  );
  expect(hidden).toEqual(['none', 'none', 'none']);
  await expect(page.getByRole('button', { name: 'Gi tilbakemelding' })).toBeHidden();
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({ path: 'test-results/print-consultation.png', fullPage: true });
});

test('privacy: the only third-party request is the Nettskjema form; nothing else leaves the browser', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', (r) => hosts.add(new URL(r.url()).host));
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await page.getByRole('button', { name: 'Gå til omvisningen' }).click();
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await page.goto('/#/gjennomgang/fastlege/monster');
  expect([...hosts].sort()).toEqual(['localhost:4173', 'nettskjema.no']);
  // Progress and settings stay in this browser: only ATLAS's own keys.
  const keys = await page.evaluate(() => Object.keys(localStorage));
  for (const k of keys) expect(k, 'localStorage key').toMatch(/^atlas\./);
});
