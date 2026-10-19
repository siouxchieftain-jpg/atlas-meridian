import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { configWithoutForms, mockNettskjema } from './mock';
import { caseOnlyThenAtlas, doTour, openCurrentCase, place, sendForm, startStudy, toHome } from './helpers';

// ATLAS 3.3: the guide layer back where the approved boards had it, pages that reach the footer, the study card's three
// cases, the patient search, the glossary in groups and the study name's mark.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/** The space between a panel's foot and the footer: one panel inset when the panel reaches down to it. */
async function gapToFooter(page: Page, panel: Locator): Promise<number> {
  const foot = await panel.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);
  const footer = await page.locator('footer').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  return footer - foot;
}

/** The sheen: a gradient behind the button, never a flat fill. */
async function hasSheen(button: Locator): Promise<boolean> {
  return button.evaluate((el) => getComputedStyle(el).backgroundImage.includes('linear-gradient'));
}

test('Velkommen reaches the footer at a laptop and a desktop size, and each role card starts with the sheen', async ({ page }) => {
  for (const [width, height] of [
    [1536, 713],
    [1920, 890],
    [1280, 600],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const hero = page.locator('[data-welcome="first"]');
    await expect(hero).toBeVisible();
    // The panel's wrap ends one inset above the footer, whether the content is shorter than the window or not.
    expect(await gapToFooter(page, hero), `${width} × ${height}`).toBeLessThanOrEqual(16);
  }
  for (const name of ['Start som fastlege', 'Start i DPS-inntaket']) expect(await hasSheen(page.getByRole('button', { name })), name).toBe(true);
  // The tour's step carries the guide's solid coral mark (board 10b).
  const marks = page.locator('[data-welcome="first"] ol li span[aria-hidden="true"]');
  expect(await marks.nth(2).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(245, 158, 133)');
});

test('Om deg: the study name as a profile card with its mark, both panels down to the footer, and the mark in the header', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 713 });
  await mockNettskjema(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start som fastlege' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Om deg' })).toBeVisible();
  const card = page.locator('aside[data-studienavn]');
  const name = (await card.locator('[data-studienavn-value]').textContent())!.trim();
  // 3.4: the mark shows the name's animal, a picture with no text of its own; the cover wears the GP's wave.
  await expect(card.locator('[data-name-mark]')).toHaveAttribute('data-animal', name.split(' ')[1]);
  await expect(card.locator('[data-name-mark] img')).toHaveAttribute('alt', '');
  await expect(card.locator('[data-guide-image="cover"]')).toHaveAttribute('data-guide-art', 'gp');
  expect(await gapToFooter(page, card)).toBeLessThanOrEqual(16);
  // The header's account: the mark opens a card with the name and the role.
  const account = page.locator('[data-study-account]');
  await expect(account).toHaveAccessibleName(`Studienavnet ditt: ${name}`);
  await account.click();
  const pop = page.getByRole('dialog');
  await expect(pop).toContainText(name);
  await expect(pop).toContainText('Du deltar som fastlege.');
  await page.keyboard.press('Escape');
  await expect(account).toBeFocused();
});

test('the glossary: three groups as tabs, each as cards, and a search across all of them', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Hjelp/ }).click();
  await page.getByRole('menuitem', { name: 'Ordliste' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Ordliste' })).toBeVisible();
  await expect(dialog.locator('[data-guide-image="header"]')).toHaveCount(1);
  const tabs = dialog.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  for (const name of ['Roller og tjenester 3 ord', 'Henvisningen 6 ord', 'I ATLAS 6 ord']) await expect(dialog.getByRole('tab', { name, exact: true })).toBeVisible();
  const cards = dialog.locator('[data-glossary-term]');
  await expect(cards).toHaveCount(3);
  await dialog.getByRole('tab', { name: /^Henvisningen/ }).click();
  await expect(cards).toHaveCount(6);
  await expect(dialog.getByRole('tabpanel')).toContainText('Vurderingsfrist');
  // Every term is in one group, and the three groups hold all fifteen.
  await dialog.getByRole('tab', { name: /^I ATLAS/ }).click();
  await expect(cards).toHaveCount(6);
  const search = dialog.getByRole('searchbox', { name: 'Søk i ordlisten' });
  await search.fill('gråsone');
  await expect(dialog.getByRole('tab')).toHaveCount(0);
  await expect(dialog.getByRole('heading', { level: 3 })).toHaveText(['Henvisningen']);
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Gråsone');
  // A word in the definitions finds its terms in every group, each under its group's name.
  await search.fill('fiktiv');
  await expect(dialog.getByRole('heading', { level: 3 })).toHaveText(['Roller og tjenester', 'I ATLAS']);
  await search.fill('xyzzy');
  await expect(dialog).toContainText('Ingen ord passer søket.');
  // Esc with text in the search clears it and keeps the dialog; the next Esc closes the dialog.
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(dialog.getByRole('tab')).toHaveCount(3);
  await search.fill('frist');
  // On a short laptop window only the body scrolls: the header, the close button and «Lukk» stay in view.
  await search.fill('');
  for (const [width, height] of [
    [1536, 713],
    [1366, 657],
    [1280, 600],
  ]) {
    await page.setViewportSize({ width, height });
    await dialog.getByRole('tab', { name: /^I ATLAS/ }).click();
    const surface = page.locator('[data-help-dialog]');
    expect(await surface.evaluate((el) => el.scrollHeight - el.clientHeight), `${width} × ${height}`).toBeLessThanOrEqual(1);
    const lukk = dialog.getByRole('button', { name: 'Lukk', exact: true });
    await expect(lukk).toHaveCount(2);
    await expect(lukk.first()).toBeInViewport();
    await expect(lukk.last()).toBeInViewport();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('the guide surfaces keep their contrast and roles: axe on Velkommen, Om deg, the overview, the glossary and the briefing', async ({ page }) => {
  // Settled states, as in a11y.spec.ts: reduced motion, and any fade finished before axe reads the colours.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await mockNettskjema(page);
  const found: string[] = [];
  const check = async (where: string) => {
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const ending = document
        .getAnimations()
        .filter((a) => Number.isFinite(Number(a.effect?.getComputedTiming().endTime)))
        .map((a) => a.finished.catch(() => undefined));
      return Promise.race([Promise.all(ending), new Promise((done) => setTimeout(done, 2000))]);
    });
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('iframe')
      // Fluent UI's Tabster focus sentinels: focusable but aria-hidden by design; they pass focus on at once.
      .exclude('[data-tabster-dummy]')
      .analyze();
    for (const v of r.violations) if (v.impact === 'serious' || v.impact === 'critical') found.push(`${where}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  };
  await page.goto('/');
  await check('velkommen');
  await page.getByRole('button', { name: 'Start som fastlege' }).click();
  await page.getByLabel('Nei', { exact: true }).check({ force: true });
  await check('om deg');
  await page.getByRole('button', { name: 'Lagre og åpne skjemaet' }).click();
  await sendForm(page);
  await toHome(page);
  await check('startsiden');
  await page.locator('[data-study-account]').click();
  await check('kontoen');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Hjelp/ }).click();
  await page.getByRole('menuitem', { name: 'Ordliste' }).click();
  await check('ordlisten');
  await page.keyboard.press('Escape');
  await doTour(page);
  await page.locator('[data-start-hero] [data-to-list]').click();
  await check('timelisten');
  await page.locator('[data-study-card] [data-open-case]').click();
  await expect(page.locator('[data-guide-card]')).toBeVisible();
  await check('orienteringen');
  expect(found, found.join('\n')).toEqual([]);
});

test('a case page reaches the footer too, and the briefing starts the case with the sheen', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await doTour(page);
  await openCurrentCase(page);
  const start = page.getByRole('button', { name: 'Start saken' });
  await expect(start).toBeVisible();
  expect(await hasSheen(start)).toBe(true);
  const last = page.locator('main section').last();
  expect(await gapToFooter(page, last)).toBeLessThanOrEqual(16);
});

test('the end of a case: both ways on sit in the warm bar, the feedback first with the sheen (board 9b)', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await doTour(page);
  await openCurrentCase(page);
  await caseOnlyThenAtlas(page);
  await place(page, 3);
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  const bar = page.locator('[data-case-prompt="kari"]');
  await expect(bar).toBeVisible();
  expect(await hasSheen(bar.locator('[data-prompt-feedback]'))).toBe(true);
  // 3.4: after case 1 the way on is the list.
  const home = bar.getByRole('button', { name: 'Til timelisten' });
  await expect(home).toBeVisible();
  expect(await hasSheen(home)).toBe(false);
  // Nothing on the summary's white card outside the bar carries the sheen.
  const sheens = await page.locator('main button').evaluateAll((els) => els.filter((el) => getComputedStyle(el).backgroundImage.includes('linear-gradient')).length);
  expect(sheens).toBe(1);
  await home.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Timeliste i dag' })).toBeVisible();
});
