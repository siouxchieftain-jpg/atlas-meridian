import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema } from './mock';

/** A GP participant in the middle of Kari's ATLAS work (seeded, so every width starts from the same state). */
const KARI_ATLAS = {
  v: 1,
  roleChoice: 'fastlege',
  intervju: 'Nei',
  furthest: 'kari',
  route: 'panel',
  ledger: {
    S1: { status: 'sent', at: '2026-10-12T10:00:00Z', steg: 'S1', via: 'panel' },
    S2: { status: 'sent', at: '2026-10-12T10:20:00Z', steg: 'S2', via: 'panel' },
  },
  visAtlas: { kari: true },
  page1: { kari: true },
  phase: { kari: 'atlas' },
  gp: { kari: { tags: [], description: '', decisionReason: '', messages: [], planReason: '', placement: 50 } },
  dps: {},
  tour: { part: 4, step: 0, done: true },
  extra: {},
};

async function seed(page: Page, state: object) {
  await page.addInitScript((s) => {
    window.localStorage.setItem('atlas.study.v1', JSON.stringify(s));
  }, state);
}

async function overflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

const WIDTHS = [320, 390, 1024, 1366, 1448, 1920];
const REVIEW = [
  '/#/gjennomgang',
  '/#/gjennomgang/fastlege/timeliste',
  '/#/gjennomgang/fastlege/sak/kari/konsultasjon',
  '/#/gjennomgang/fastlege/sak/erlend/henvisning',
  '/#/gjennomgang/fastlege/sak/astrid/konsultasjon',
  '/#/gjennomgang/fastlege/sak/kari/oppsummering',
  '/#/gjennomgang/fastlege/monster',
  '/#/gjennomgang/fastlege/delt',
  '/#/gjennomgang/fastlege/omvisning',
  '/#/gjennomgang/fastlege/to-fastleger',
  '/#/gjennomgang/dps/mottatte',
  '/#/gjennomgang/dps/sak/kari/vurdering',
  '/#/gjennomgang/tilbakemeldinger',
];

for (const width of WIDTHS) {
  test(`no horizontal page scroll at ${width} px (review screens)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const bad: string[] = [];
    for (const p of REVIEW) {
      await page.goto(p);
      await page.waitForTimeout(150);
      const o = await overflow(page);
      if (o > 0) bad.push(`${p}: ${o}px`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test(`no horizontal page scroll at ${width} px (study screens)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockNettskjema(page);
    await seed(page, KARI_ATLAS);
    const bad: string[] = [];
    for (const p of ['/#/studie/velkommen', '/#/studie/sak/kari/konsultasjon', '/#/studie/steg', '/#/studie/liste', '/#/studie/helhet']) {
      await page.goto(p);
      await page.waitForTimeout(150);
      const o = await overflow(page);
      if (o > 0) bad.push(`${p}: ${o}px`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
}

test('the G-01 layout: rail from 640, the ATLAS panel inline from 1024, the 260 px nav from 1366 in review', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await expect(page.getByRole('button', { name: 'Meny' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vis ATLAS-panelet' })).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(page.getByRole('button', { name: 'Meny' })).toBeHidden();
  await expect(page.getByRole('complementary', { name: 'ATLAS' })).toBeVisible();
  await page.setViewportSize({ width: 1366, height: 900 });
  const navWidth = await page.getByRole('navigation', { name: 'Hovednavigasjon' }).evaluate((n) => (n as HTMLElement).getBoundingClientRect().width);
  expect(navWidth).toBe(260);
});
