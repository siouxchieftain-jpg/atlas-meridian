import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { configWithoutForms } from './mock';

// ATLAS 3.4.1: from a laptop to a large monitor. The page fills the window as a Fluent app does (it kept to a 1,600 px
// column before, with an empty band on the right), and the pages reflow: more columns where there is room, running text
// at a readable length, «Frister» never crowded (G-39). Velkommen's five steps sit at the foot of its card, and the
// information letter is a button in the card's top right corner from 1024 px, a link in the intro below that.

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The site's own configuration (the letter and the contact are set); no request reaches Nettskjema, and no form opens. */
async function siteConfig(page: Page) {
  await page.route('https://nettskjema.no/**', (route) => route.abort());
}

/** A participant's stored progress: the tour done; case 1 next, or Kari done and Erlend next. */
async function seed(page: Page, role: 'fastlege' | 'dps-kliniker', afterKari = false) {
  const at = '2026-10-19T00:00:00.000Z';
  const sent = (steg: string) => ({ status: 'sent', at, steg, via: 'panel' });
  const state = {
    v: 2,
    roleChoice: role,
    intervju: 'Nei',
    studienavn: 'Ivrig ugle 42',
    furthest: afterKari ? 'erlend' : 'kari',
    route: 'panel',
    ledger: afterKari ? { S1: sent('S1'), S3: sent('S3') } : { S1: sent('S1') },
    visAtlas: afterKari ? { kari: true } : {},
    page1: {},
    phase: afterKari ? { kari: 'done' } : {},
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: true, started: true },
    extra: {},
    prompts: afterKari ? { kari: 'later' } : {},
    feedbackSent: [],
  };
  await page.addInitScript((s) => window.localStorage.setItem('atlas.study.v2', JSON.stringify(s)), state);
}

/** The column's margins inside <main>, and the footer's width against the column's. */
async function column(page: Page) {
  return page.evaluate(() => {
    const col = document.querySelector('[data-content-column]')!.getBoundingClientRect();
    const main = document.getElementById('main')!.getBoundingClientRect();
    const foot = document.querySelector('footer')!.getBoundingClientRect();
    return { left: col.left - main.left, right: main.right - col.right, width: col.width, footWidth: foot.width };
  });
}

test('on a laptop and a large monitor every page fills the window, with no empty band at the side', async ({ page, context }) => {
  const fills = async (p: Page, where: string) => {
    const c = await column(p);
    expect(Math.abs(c.left), where).toBeLessThanOrEqual(1);
    expect(Math.abs(c.right), where).toBeLessThanOrEqual(1);
    expect(c.footWidth, where).toBeGreaterThanOrEqual(c.width - 2);
  };
  await siteConfig(page);
  for (const [width, height] of [
    [2560, 1270],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('[data-welcome="first"]')).toBeVisible();
    await fills(page, `Velkommen ${width}`);
    expect((await column(page)).width, `${width}`).toBeGreaterThan(width - 120);
  }
  // A participant who has started, in a page of its own (no live form address is served to it).
  await configWithoutForms(context);
  const seeded = await context.newPage();
  await seeded.setViewportSize({ width: 2560, height: 1270 });
  await seed(seeded, 'fastlege');
  for (const [where, path, heading] of [
    ['start page', '/#/studie/hjem', 'Sak 1 av 3: Kari Nordli'],
    ['list', '/#/studie/liste', 'Timeliste i dag'],
    ['briefing', '/#/studie/sak/kari', 'Kari Nordli'],
  ] as const) {
    await seeded.goto(path);
    await expect(seeded.getByRole('heading', { level: 1, name: new RegExp(`^${heading}`) })).toBeVisible();
    await fills(seeded, where);
  }
});

test('Velkommen on a large monitor: the card fills the window, its content in the middle, the steps at its foot and the letter in its corner', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 2560, height: 1270 });
  await siteConfig(page);
  await page.goto('/');
  const hero = page.locator('[data-welcome="first"]');
  const steps = page.getByRole('region', { name: 'Slik foregår det' });
  const letter = page.getByRole('link', { name: 'Les informasjonsskrivet' });
  await expect(letter).toBeVisible();
  const h = (await hero.boundingBox())!;
  const st = (await steps.boundingBox())!;
  const l = (await letter.boundingBox())!;
  const mid = (await page.locator('[data-welcome-middle]').boundingBox())!;
  // The card spans the window; the intro and the role cards keep one width in its middle, and the steps the same.
  expect(h.width).toBeGreaterThan(2400);
  expect(mid.width).toBeLessThanOrEqual(1760);
  expect(Math.abs(mid.x - h.x - (h.x + h.width - (mid.x + mid.width)))).toBeLessThanOrEqual(2);
  expect(Math.abs(st.x - mid.x)).toBeLessThanOrEqual(1);
  // The steps end one padding above the card's foot, however tall the window.
  expect(h.y + h.height - (st.y + st.height)).toBeLessThanOrEqual(41);
  // The letter in the top right corner, as a button would sit there.
  expect(h.x + h.width - (l.x + l.width)).toBeLessThanOrEqual(13);
  expect(l.y - h.y).toBeLessThanOrEqual(13);
  expect(l.height).toBeGreaterThanOrEqual(32);
  // The intro and the role cards between the letter and the steps.
  for (const el of [page.getByRole('heading', { level: 1 }), page.getByRole('heading', { name: 'Velg rollen din' }), page.locator('[data-role-card="dps"]')]) {
    const b = (await el.boundingBox())!;
    expect(b.y).toBeGreaterThan(l.y + l.height);
    expect(b.y + b.height).toBeLessThan(st.y);
  }
  // Still the same link, read after the intro and before the role cards.
  await expect(letter).toHaveAttribute('href', './informasjonsskriv.html');
  await expect(letter).toHaveAttribute('target', '_blank');
  const order = await letter.evaluate((a) => {
    const start = document.querySelector('[data-role-card="gp"] button')!;
    const lead = document.querySelector('[data-welcome="first"] h1')!;
    return {
      afterIntro: !!(lead.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING),
      beforeRoles: !!(a.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  expect(order).toEqual({ afterIntro: true, beforeRoles: true });
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).exclude('[data-tabster-dummy]').analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious, serious.join('\n')).toEqual([]);
});

test('the letter in the corner never covers the page, from a small laptop to a large monitor, in both languages', async ({ page }) => {
  await siteConfig(page);
  for (const lang of ['nb', 'en'] as const) {
    await page.addInitScript((l) => window.localStorage.setItem('atlas.settings.lang', JSON.stringify(l)), lang);
    for (const [width, height] of [
      [1024, 768],
      [1100, 700],
      [1280, 600],
      [1366, 768],
      [1536, 713],
      [1920, 1080],
      [2560, 1270],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      const letter = page.locator('[data-letter]');
      await expect(letter).toBeVisible();
      expect(await letter.evaluate((el) => getComputedStyle(el).position), `${lang} ${width}`).toBe('absolute');
      const l = (await letter.boundingBox())!;
      const others = await page.evaluate(() =>
        [...document.querySelectorAll('[data-welcome="first"] :is(h1, h2, h3, p, ul, ol, article, [data-contact])')].map((el) => {
          const b = el.getBoundingClientRect();
          return { what: `${el.tagName.toLowerCase()} ${(el.textContent ?? '').slice(0, 30)}`, x: b.x, y: b.y, width: b.width, height: b.height };
        }),
      );
      for (const o of others) expect(overlaps(l, o), `${lang} ${width} × ${height}: the letter covers «${o.what}»`).toBe(false);
    }
  }
});

test('«Frister» keeps room for its ten days at every width: beside the three referrals on a big screen, beside the third on a laptop', async ({ page }) => {
  await configWithoutForms(page);
  await seed(page, 'dps-kliniker', true);
  for (const [width, mode] of [
    [1024, 'narrow'],
    [1280, 'two'],
    [1366, 'two'],
    [1536, 'two'],
    [1600, 'two'],
    [1920, 'side'],
    [2560, 'side'],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/studie/liste');
    await expect(page.getByRole('heading', { level: 1, name: 'Mottatte henvisninger' })).toBeVisible();
    const zones = page.locator('[data-deadlines]');
    await expect(zones, `${width}`).toHaveAttribute('data-deadlines', mode);
    const frister = (await page.locator('[data-home-part="frister"]').boundingBox())!;
    expect(frister.width, `${width}`).toBeGreaterThanOrEqual(400);
    if (mode === 'side') {
      // One row: the three referrals and «Frister» start at the same height.
      const first = (await page.locator('[data-list-case]').first().boundingBox())!;
      expect(Math.abs(frister.y - first.y), `${width}`).toBeLessThanOrEqual(1);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${width}`).toBeLessThanOrEqual(0);
  }
  await expect(page.getByRole('list', { name: 'Henvisningene i studien' }).getByRole('listitem')).toHaveCount(3);
});

test('a big screen gives the pages more columns: the start page four, Delt oversikt two, the referral and the GP’s doubt side by side', async ({ page, context, browser }) => {
  await configWithoutForms(context);
  await page.setViewportSize({ width: 2560, height: 1270 });
  await seed(page, 'fastlege');
  await page.goto('/#/studie/hjem');
  await expect(page.locator('[data-start-hero]').getByRole('heading', { level: 1 })).toHaveText('Sak 1 av 3: Kari Nordli');
  await expect(page.locator('[data-columns]')).toHaveAttribute('data-columns', '4');
  // The same reading order as on a laptop.
  expect(await page.locator('[data-home-part]').evaluateAll((els) => els.map((el) => el.getAttribute('data-home-part')))).toEqual(['dag', 'henvisninger', 'monster', 'innboks', 'delt']);
  const inbox = (await page.locator('[data-home-part="innboks"]').boundingBox())!;
  const shared = (await page.locator('[data-home-part="delt"]').boundingBox())!;
  expect(shared.x).toBeGreaterThan(inbox.x + inbox.width);
  // Review mode, in a fresh browser (a participant's session sends review addresses back to the study): Delt oversikt's
  // figures and its criteria side by side, and the referral beside the GP's doubt.
  const fresh = await browser.newContext();
  await configWithoutForms(fresh);
  const review = await fresh.newPage();
  await review.setViewportSize({ width: 2560, height: 1270 });
  await review.goto('/#/gjennomgang/fastlege/delt');
  await expect(review.locator('[data-split]')).toBeVisible();
  const figures = (await review.getByRole('heading', { name: 'Opptaksområdet' }).boundingBox())!;
  const changes = (await review.getByRole('heading', { name: 'Endringer i kriteriene' }).boundingBox())!;
  expect(changes.x).toBeGreaterThan(figures.x + 400);
  await review.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await expect(review.locator('[data-two-up]')).toBeVisible();
  const letterBox = (await review.getByRole('heading', { name: 'Henvisning, slik fastlegen sendte den' }).boundingBox())!;
  const doubtBox = (await review.getByRole('heading', { name: 'Hva fastlegen var usikker på' }).boundingBox())!;
  expect(doubtBox.x).toBeGreaterThan(letterBox.x + 400);
  expect(Math.abs(doubtBox.y - letterBox.y)).toBeLessThanOrEqual(4);
  // Running text keeps a readable line: no paragraph runs past a hundred characters (100ch, about 63 times its font
  // size in the test browser's font).
  const widest = await review.evaluate(() =>
    Math.max(...[...document.querySelectorAll('#main p')].map((p) => p.getBoundingClientRect().width / parseFloat(getComputedStyle(p).fontSize))),
  );
  expect(widest).toBeLessThanOrEqual(66);
  await fresh.close();
});

test('on a small screen the letter stays a link in the intro, and nothing scrolls sideways', async ({ page }) => {
  await siteConfig(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const letter = page.getByRole('link', { name: 'Les informasjonsskrivet' });
  await expect(letter).toBeVisible();
  expect(await letter.evaluate((el) => getComputedStyle(el).position)).toBe('static');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // The steps still close the card, after the role cards.
  const roles = (await page.locator('[data-role-card="dps"]').boundingBox())!;
  const steps = (await page.getByRole('region', { name: 'Slik foregår det' }).boundingBox())!;
  expect(steps.y).toBeGreaterThan(roles.y + roles.height);
});
