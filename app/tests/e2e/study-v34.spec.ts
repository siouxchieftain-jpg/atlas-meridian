import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { configWithoutForms, mockNettskjema } from './mock';
import { doTour, sendForm, startStudy, toHome } from './helpers';

// ATLAS 3.4: the start page and the list. The start page greets the participant with the next step and the day around
// the study; the list is where every case starts and where cases 1 and 2 end. Nothing on the start page opens a case or
// hints at one; the parts that show outcomes open after the three cases; the role chooses the artwork.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/** The sheen: a gradient behind the button, never a flat fill. */
async function hasSheen(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundImage.includes('linear-gradient'));
}

/** A participant's stored progress after case 1: the tour done, Kari done, Erlend next. */
async function seedAfterCaseOne(page: Page, role: 'fastlege' | 'dps-kliniker') {
  const at = '2026-10-19T00:00:00.000Z';
  const sent = (steg: string) => ({ status: 'sent', at, steg, via: 'panel' });
  const state = {
    v: 2,
    roleChoice: role,
    intervju: 'Nei',
    studienavn: 'Rolig gås 27',
    furthest: 'erlend',
    route: 'panel',
    ledger: { S1: sent('S1'), S3: sent('S3') },
    visAtlas: { kari: true },
    page1: {},
    phase: { kari: 'done' },
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: true, started: true },
    extra: {},
    prompts: { kari: 'later' },
    feedbackSent: [],
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

/** A participant's stored progress, seeded before the page loads: the tour done and the three cases done (part 3). */
async function seedPartThree(page: Page, role: 'fastlege' | 'dps-kliniker') {
  const at = '2026-10-19T00:00:00.000Z';
  const sent = (steg: string) => ({ status: 'sent', at, steg, via: 'panel' });
  const state = {
    v: 2,
    roleChoice: role,
    intervju: 'Nei',
    studienavn: 'Ivrig ugle 42',
    furthest: 'helhet',
    route: 'panel',
    ledger: { S1: sent('S1'), S3: sent('S3'), S4: sent('S4'), S5: sent('S5') },
    visAtlas: { kari: true, erlend: true, astrid: true },
    page1: {},
    phase: { kari: 'done', erlend: 'done', astrid: 'done' },
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: true, started: true },
    extra: {},
    prompts: { kari: 'later', erlend: 'later', astrid: 'later' },
    feedbackSent: [],
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

test('the start page before the tour: the next step and its one sheen, the day around the study, nothing that opens a case or hints at one', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await expect(page).toHaveTitle('Oversikten · ATLAS');
  const hero = page.locator('[data-start-hero]');
  await expect(hero).toHaveAttribute('data-guide-surface', '');
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Start med omvisningen');
  // The greeting names the study name, and its mark shows the name's animal.
  const name = (await hero.locator('[data-studienavn-value]').textContent())!.trim();
  await expect(hero.locator('[data-start-greeting]')).toHaveText(`God morgen, ${name}`);
  await expect(hero.locator('[data-name-mark]')).toHaveAttribute('data-animal', name.split(' ')[1]);
  // One sheen: the tour. The lock is said once, in the step's own line.
  expect(await hasSheen(page, '[data-start-hero] [data-start-tour]')).toBe(true);
  await expect(hero).toContainText('Sakene åpner seg etter omvisningen.');
  // The three cases along its foot, named by a visible label; none is current before the tour.
  const cases = page.getByRole('list', { name: 'Sakene i studien' });
  await expect(cases.getByRole('listitem')).toHaveCount(3);
  await expect(cases.getByRole('listitem').first()).toContainText('Sak 1: Kari Nordli');
  await expect(cases.locator('[aria-current="step"]')).toHaveCount(0);
  // The GP's wave in a cell of its own beside the text (wide), never under it.
  await expect(hero.locator('[data-guide-image="home"]')).toHaveAttribute('data-guide-art', 'gp');

  // The day around the study, and the parts that show outcomes locked until the three cases are done.
  const parts = page.locator('[data-home-part]');
  expect(await parts.evaluateAll((els) => els.map((el) => el.getAttribute('data-home-part')))).toEqual(['dag', 'henvisninger', 'monster', 'innboks', 'delt']);
  for (const part of ['monster', 'delt']) {
    await expect(page.locator(`[data-home-part="${part}"]`)).toHaveAttribute('data-locked', '');
    await expect(page.locator(`[data-home-part="${part}"]`)).toContainText('Åpnes når de tre sakene er ferdige.');
  }
  // One door per destination: no part opens anything by its frame, and no row opens a case.
  await expect(page.locator('[data-home-part] button, [data-home-part] a')).toHaveCount(0);
  // The examples: one grey group per part that has them, labelled once.
  await expect(page.locator('[data-examples]')).toHaveCount(2);
  for (const group of await page.locator('[data-examples]').all()) await expect(group).toContainText('Eksempler på en vanlig dag, kan ikke åpnes i prototypen');
  // Nothing that the case's «with ATLAS» view adds: DPS's reply is a reply, and there are no reasons or rates.
  const text = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  expect(text).not.toContain('Retur med råd');
  expect(text).toContain('Svar fra DPS Skjærgården');
  expect(text).not.toMatch(/\d\s?%/);
  // The day: the morning as a strip with «Nå» where the study's clock stands, and a line for the rest of the day.
  await expect(page.locator('[data-day-now]')).toHaveText('Nå 08:52');
  await expect(page.locator('[data-day-item="kari"]')).toBeVisible();
  await expect(page.locator('[data-home-part="dag"]')).toContainText('Resten av dagen: telefontid, øyeblikkelig hjelp og kontortid til kl. 16.');
  // The inbox's dot means new: Kari's self-report and DPS's reply, newest first.
  await expect(page.locator('[data-home-part="innboks"]')).toContainText('2 nye');
});

test('after the tour: the sheen leads to the list, whose study card holds the same step and opens the case; the list filters', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 713 });
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await doTour(page);
  const hero = page.locator('[data-start-hero]');
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText('Sak 1 av 3: Kari Nordli');
  await expect(hero).toContainText('Kl. 09:00 · Kontroll');
  await expect(hero).toContainText('Saken tar omtrent 10 minutter. Du ser den først uten ATLAS, så med.');
  await expect(page.getByRole('list', { name: 'Sakene i studien' }).locator('[aria-current="step"]')).toContainText('Kari Nordli');
  // The start page's day is «Dagen»: «Timeliste i dag» names the list, where the cases open.
  await expect(page.locator('[data-home-part="dag"]').getByRole('heading', { level: 2 })).toHaveText('Dagen');
  // The one sheen goes to the list; the tour again is a quiet link beside it.
  expect(await hasSheen(page, '[data-start-hero] [data-to-list]')).toBe(true);
  await expect(hero.getByRole('button', { name: 'Se omvisningen igjen' })).toBeVisible();
  await hero.locator('[data-to-list]').click();

  await expect(page.getByRole('heading', { level: 1, name: 'Timeliste i dag' })).toBeVisible();
  await expect(page).toHaveTitle('Timeliste i dag · ATLAS');
  // The study card holds the same step, as one object moving on.
  const card = page.locator('[data-study-card]');
  await expect(card.getByRole('heading', { level: 2 })).toHaveText('Sak 1 av 3: Kari Nordli');
  expect(await hasSheen(page, '[data-study-card] [data-open-case]')).toBe(true);
  await expect(page.locator('[data-list-case="kari"] [data-list-open]')).toBeVisible();
  await expect(page.locator('[data-list-case="erlend"]')).toContainText('Senere i studien');
  // Each case's heading carries its time for screen readers, as the card shows it.
  await expect(page.locator('[data-list-case="kari"] h3')).toHaveText('09:00, Kari Nordli, 34 år');

  // The search filters the list by name, or by the start of the national identity number.
  const search = page.getByRole('searchbox', { name: 'Søk etter pasient eller fødselsnummer' });
  const cards = page.locator('[data-list-case], [data-list-routine]');
  await expect(cards).toHaveCount(6);
  await search.fill('erlend');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Erlend Bakken');
  await search.fill('zzz');
  await expect(cards).toHaveCount(0);
  await expect(page.getByText('Ingen pasienter passer søket.')).toBeVisible();
  await search.fill('');
  await expect(cards).toHaveCount(6);

  await card.locator('[data-open-case]').click();
  await expect(page.getByRole('button', { name: 'Start saken' })).toBeVisible();
  // The case's breadcrumb starts at the list.
  await expect(page.getByRole('navigation', { name: 'Brødsmulesti' }).getByRole('link').first()).toHaveText('Timeliste');
});

test('part 3: the start page opens the GP’s pattern and Delt oversikt, without the area’s rates', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 713 });
  await mockNettskjema(page);
  await seedPartThree(page, 'fastlege');
  await page.goto('/#/studie/hjem');
  const hero = page.locator('[data-start-hero]');
  await expect(hero.getByRole('heading', { level: 1 })).toHaveText('De tre sakene er ferdige');
  await expect(hero.getByRole('button', { name: 'Gå til avslutningen' })).toBeVisible();
  await expect(hero).toContainText('Mitt henvisningsmønster og Delt oversikt er åpne under');
  const pattern = page.locator('[data-home-part="monster"]');
  await expect(pattern).not.toHaveAttribute('data-locked', '');
  await expect(pattern).toContainText('24');
  await expect(pattern).toContainText('Fiktive tall. Ingen sammenlikning med andre.');
  const shared = page.locator('[data-home-part="delt"]');
  await expect(shared).toContainText('Siste endring i kriteriene, 16. februar');
  await expect(shared).toContainText('Tid fra mottak til vurdering, median: 8 virkedager');
  expect(await shared.innerText()).not.toMatch(/\d\s?%/);
  // «Se mønsteret» opens the view the tour showed, and closing it gives focus back.
  await pattern.getByRole('button', { name: 'Se mønsteret' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pattern.getByRole('button', { name: 'Se mønsteret' })).toBeFocused();
  // The day's clock has moved on past the three cases, and each case shows done.
  await expect(page.locator('[data-day-now]')).toHaveText('Nå 10:38');
  await expect(page.getByRole('list', { name: 'Sakene i studien' })).toContainText('Ferdig');
});

test('the role chooses the artwork: the organza where the role is chosen, the coral wave for the GP, the lavender wave for DPS', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 713 });
  await mockNettskjema(page);
  await page.goto('/');
  await expect(page.locator('[data-welcome="first"] [data-guide-image="hero"]')).toHaveAttribute('data-guide-art', 'organza');
  await startStudy(page, 'DPS-kliniker');
  await expect(page.locator('[data-guide-image="cover"]')).toHaveAttribute('data-guide-art', 'dps');
  await sendForm(page);
  await toHome(page);
  await expect(page.locator('[data-start-hero] [data-guide-image]')).toHaveAttribute('data-guide-art', 'dps');
  // One artwork per screen.
  await expect(page.locator('main [data-guide-image]')).toHaveCount(1);
  // DPS's start page: the intake, the messages and Delt oversikt (locked), and no outcome before the cases.
  expect(await page.locator('[data-home-part]').evaluateAll((els) => els.map((el) => el.getAttribute('data-home-part')))).toEqual(['inntak', 'meldinger', 'delt']);
  await expect(page.locator('[data-home-part="inntak"]')).toContainText('Mottatt 17. mars · vurderingsfrist 31. mars');
  await expect(page.locator('[data-start-hero] [data-to-list], [data-start-hero] [data-start-tour]')).toHaveCount(1);
});

test('review mode, where the roles meet, wears the organza on both sides', async ({ page }) => {
  // A fresh browser: a participant's session sends review addresses back to the study.
  for (const role of ['fastlege', 'dps']) {
    await page.goto(`/#/gjennomgang/${role}/sak/kari/orientering`);
    await expect(page.locator('[data-guide-image="brief"]')).toHaveAttribute('data-guide-art', 'organza');
  }
});

test('narrow windows: the greeting’s art moves to a band above the text, and the day becomes a list', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  const hero = page.locator('[data-start-hero]');
  await expect(hero.locator('[data-guide-image="band"]')).toHaveCount(1);
  await expect(hero.locator('[data-guide-image="home"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const day = page.getByRole('list', { name: 'Dagen fra kl. 08 til 16' });
  await expect(day).toBeVisible();
  // Every appointment and every block of the day, in time order.
  await expect(day.getByRole('listitem')).toHaveCount(11);
  await expect(day.getByRole('listitem').first()).toContainText('08:00–08:45');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the study name’s mark: an exact animal as a picture with no text of its own, and the initials in forced colours', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockNettskjema(page);
  await seedPartThree(page, 'fastlege');
  await page.goto('/#/studie/hjem');
  const mark = page.locator('[data-start-hero] [data-name-mark]');
  await expect(mark).toHaveAttribute('data-animal', 'ugle');
  await expect(mark).toHaveAttribute('aria-hidden', 'true');
  await expect(mark.locator('img')).toHaveAttribute('alt', '');
  await expect(mark.locator('img')).toBeVisible();
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(mark.locator('img')).toBeHidden();
  await expect(mark).toContainText('IU');
});

test('the start page and the list keep their contrast and roles: axe for both roles and in part 3', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockNettskjema(page);
  const found: string[] = [];
  const check = async (where: string) => {
    await page.waitForTimeout(250);
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('iframe')
      .exclude('[data-tabster-dummy]')
      .analyze();
    for (const v of r.violations) if (v.impact === 'serious' || v.impact === 'critical') found.push(`${where}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  };
  await startStudy(page, 'DPS-kliniker');
  await sendForm(page);
  await toHome(page);
  await check('dps start page');
  await page.goto('/#/studie/liste');
  await expect(page.getByRole('heading', { level: 1, name: 'Mottatte henvisninger' })).toBeVisible();
  await check('dps list');
  for (const width of [1024, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/#/studie/hjem');
    await expect(page.locator('[data-start-hero]')).toBeVisible();
    await check(`dps start page at ${width}`);
  }
  expect(found, found.join('\n')).toEqual([]);
});

test('part 3 keeps its contrast and roles too (axe, GP)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockNettskjema(page);
  await seedPartThree(page, 'fastlege');
  await page.goto('/#/studie/hjem');
  await expect(page.locator('[data-start-hero]')).toBeVisible();
  await page.waitForTimeout(250);
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('iframe')
    .exclude('[data-tabster-dummy]')
    .analyze();
  const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious, serious.join('\n')).toEqual([]);
});

test('DPS after case 1: a done referral reads as done, its deadline leaves «Frister», and dates read one way', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockNettskjema(page);
  await seedAfterCaseOne(page, 'dps-kliniker');
  await page.goto('/#/studie/liste');
  await expect(page.getByRole('heading', { level: 1, name: 'Mottatte henvisninger' })).toBeVisible();
  const kari = page.locator('[data-list-case="kari"]');
  await expect(kari).toContainText('Ferdig');
  await expect(kari).not.toContainText('Ny henvisning');
  await expect(kari).not.toContainText('Frist');
  await expect(page.locator('[data-list-case="erlend"]')).toContainText('Mottatt 17. mars');
  await expect(page.locator('[data-list-case="erlend"]')).toContainText('Frist 31. mars');
  // The cards read dates as the study card beside them does: «17. mars», never «17. mars 2026».
  for (const card of await page.locator('[data-list-case]').all()) expect(await card.innerText()).not.toMatch(/\d{1,2}\. mars 2026/);
  // «Frister» is a part of its own beside the referrals, never a fourth referral.
  await expect(page.getByRole('list', { name: 'Henvisningene i studien' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.locator('[data-home-part="frister"]')).toContainText('31. mars: Erlend Bakken');
  await expect(page.locator('[data-home-part="frister"]')).not.toContainText('Kari Nordli');
  // The start page says the same: Kari is done.
  await page.goto('/#/studie/hjem');
  await expect(page.locator('[data-home-part="inntak"]')).toContainText('Mottatt 17. mars · ferdig');
});
