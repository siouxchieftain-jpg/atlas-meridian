import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { configWithoutForms } from './mock';

// ATLAS 3.4.1: a large monitor. The page column sits in the middle of the window with the footer on the same axis (it
// kept to the left before, with an empty band on the right; G-39). Velkommen's five steps sit at the foot of its card,
// and the information letter is a button in the card's top right corner from 1024 px, a link in the intro below that.

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** The site's own configuration (the letter and the contact are set); no request reaches Nettskjema, and no form opens. */
async function siteConfig(page: Page) {
  await page.route('https://nettskjema.no/**', (route) => route.abort());
}

/** A participant's stored progress: the tour done, case 1 next. */
async function seedCaseOne(page: Page, role: 'fastlege' | 'dps-kliniker') {
  const at = '2026-10-19T00:00:00.000Z';
  const state = {
    v: 2,
    roleChoice: role,
    intervju: 'Nei',
    studienavn: 'Ivrig ugle 42',
    furthest: 'kari',
    route: 'panel',
    ledger: { S1: { status: 'sent', at, steg: 'S1', via: 'panel' } },
    visAtlas: {},
    page1: {},
    phase: {},
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: true, started: true },
    extra: {},
    prompts: {},
    feedbackSent: [],
  };
  await page.addInitScript((s) => window.localStorage.setItem('atlas.study.v2', JSON.stringify(s)), state);
}

/** The column's margins inside <main>, and the footer's left edge against the column's. */
async function column(page: Page) {
  return page.evaluate(() => {
    const col = document.querySelector('[data-content-column]')!.getBoundingClientRect();
    const main = document.getElementById('main')!.getBoundingClientRect();
    const foot = document.querySelector('footer')!.getBoundingClientRect();
    return { left: col.left - main.left, right: main.right - col.right, width: col.width, footLeft: foot.left - col.left, footWidth: foot.width };
  });
}

test('on a large monitor every page’s column sits in the middle of the window, with the footer on the same axis', async ({ page, context }) => {
  const check = async (p: Page, where: string) => {
    const c = await column(p);
    expect(c.width, where).toBeLessThanOrEqual(1600);
    expect(Math.abs(c.left - c.right), `${where}: ${c.left} left, ${c.right} right`).toBeLessThanOrEqual(1);
    expect(c.left, where).toBeGreaterThan(300);
    expect(Math.abs(c.footLeft), where).toBeLessThanOrEqual(1);
    expect(c.footWidth, where).toBeLessThanOrEqual(1600);
  };
  await page.setViewportSize({ width: 2560, height: 1270 });
  await siteConfig(page);
  await page.goto('/');
  await expect(page.locator('[data-welcome="first"]')).toBeVisible();
  await check(page, 'Velkommen');
  // A participant who has started, in a page of its own (no live form address is served to it).
  await configWithoutForms(context);
  const seeded = await context.newPage();
  await seeded.setViewportSize({ width: 2560, height: 1270 });
  await seedCaseOne(seeded, 'fastlege');
  for (const [where, path, heading] of [
    ['start page', '/#/studie/hjem', 'Sak 1 av 3: Kari Nordli'],
    ['list', '/#/studie/liste', 'Timeliste i dag'],
    ['briefing', '/#/studie/sak/kari', 'Kari Nordli'],
  ] as const) {
    await seeded.goto(path);
    await expect(seeded.getByRole('heading', { level: 1, name: new RegExp(`^${heading}`) })).toBeVisible();
    await check(seeded, where);
  }
  // A 1920 desktop too.
  await seeded.setViewportSize({ width: 1920, height: 1080 });
  await seeded.goto('/#/studie/liste');
  await expect(seeded.getByRole('heading', { level: 1, name: 'Timeliste i dag' })).toBeVisible();
  const c = await column(seeded);
  expect(Math.abs(c.left - c.right)).toBeLessThanOrEqual(1);
});

test('Velkommen on a large monitor: the five steps at the foot of the card, the letter in its top right corner, the intro and the roles between', async ({ page }) => {
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
