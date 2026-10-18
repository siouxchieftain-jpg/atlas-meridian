import { expect, type Page } from '@playwright/test';

export const frame = (page: Page) => page.frameLocator('iframe[data-form-frame]');
export const panel = (page: Page) => page.locator('[data-form-panel]');

/** The steg value in the open iframe's address. */
export async function frameSteg(page: Page): Promise<string | null> {
  const src = await page.locator('iframe[data-form-frame]').getAttribute('src');
  if (!src) return null;
  return new URL(src).searchParams.get('CBsteg');
}

/** Send the open mock form: Neste until the last page, then Send. */
export async function sendForm(page: Page) {
  const f = frame(page);
  await expect(f.locator('#page')).toHaveText(/^Side \d av \d$/);
  for (let i = 0; i < 4; i++) {
    if (await f.locator('#send').isVisible()) break;
    await f.locator('#next').click();
  }
  await f.locator('#send').click();
}

/** Page 1 of a vignette form, then on to the stop page. */
export async function toStopPage(page: Page) {
  await expect(frame(page).locator('#page')).toHaveText('Side 1 av 3');
  await frame(page).locator('#next').click();
  await expect(frame(page).locator('#page')).toHaveText('Side 2 av 3');
}

export async function startStudy(page: Page, role: 'Fastlege' | 'DPS-kliniker', intervju: 'Ja' | 'Nei' | 'Vil ikke svare' = 'Nei') {
  await page.goto('/');
  // The role is chosen on Velkommen, with its card; Om deg asks the one question left.
  await page.getByRole('button', { name: role === 'Fastlege' ? 'Start som fastlege' : 'Start i DPS-inntaket' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Om deg' })).toBeVisible();
  await page.getByLabel(intervju, { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre og åpne skjemaet' }).click();
  await expect(page.locator('iframe[data-form-frame]')).toBeVisible();
}

/** The overview's heading, for either role. */
export const HOME_HEADING = /^(Min dag|Inntaket i dag)$/;

/** After S1 is sent: on to the overview (v3.1). */
export async function toHome(page: Page) {
  await page.getByRole('button', { name: 'Til oversikten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeVisible();
}

/** Through the tour, from the next button to the closing screen (the study's part first, then ATLAS's). */
export async function clickThroughTour(page: Page) {
  for (let i = 0; i < 30; i++) {
    if (await page.locator('[data-tour-prompt], [data-tour-end]').first().isVisible()) break;
    await page.getByRole('button', { name: /^(Neste|Neste del|Avslutt omvisningen)$/ }).click();
  }
}

/**
 * From the overview after S1: the card before the tour, the tour to its end, and back to the overview with the cases
 * open. The question about the tour is left unanswered («Til oversikten» answers «later»).
 */
export async function doTour(page: Page) {
  await page.locator('[data-start-tour]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await clickThroughTour(page);
  await page.getByRole('button', { name: 'Til oversikten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeVisible();
}

/** From the overview: the current case's briefing, from the study card. */
export async function openCurrentCase(page: Page) {
  await page.locator('[data-study-card] [data-open-case]').click();
  await expect(page.getByRole('button', { name: /^(Start saken|Fortsett saken)$/ })).toBeVisible();
}

/** S1, the overview, the tour and Kari's briefing: ready for the first case (v3.1). */
export async function toFirstCase(page: Page, role: 'Fastlege' | 'DPS-kliniker' = 'Fastlege', intervju: 'Ja' | 'Nei' | 'Vil ikke svare' = 'Nei') {
  await startStudy(page, role, intervju);
  await sendForm(page);
  await toHome(page);
  await doTour(page);
  await openCurrentCase(page);
}

/** The summary's way on: past the question about the case, back to the overview. */
export async function finishCaseHome(page: Page) {
  await page.getByRole('button', { name: 'Til oversikten' }).click();
  await expect(page.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeVisible();
}

/** Place the case with the visible band control (below 1024 px it sits in the ATLAS overlay). */
export async function place(page: Page, index: number) {
  await page.getByRole('combobox', { name: 'Plasser saken' }).filter({ visible: true }).first().click();
  await page.getByRole('option').nth(index).click();
}

/** Start a case and answer page 1 up to the stop page, then press «Vis ATLAS» from the panel. */
export async function caseOnlyThenAtlas(page: Page) {
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(page.getByText('Uten ATLAS', { exact: true }).first()).toBeVisible();
  await toStopPage(page);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'horizontal page scroll').toBeLessThanOrEqual(0);
}
