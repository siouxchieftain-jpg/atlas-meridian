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
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByLabel(role, { exact: true }).check({ force: true });
  await page.getByLabel(intervju, { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre og åpne skjemaet' }).click();
  await expect(page.locator('iframe[data-form-frame]')).toBeVisible();
}

export async function doTour(page: Page) {
  await page.getByRole('button', { name: 'Gå til omvisningen' }).click();
  for (let i = 0; i < 20; i++) {
    const end = page.getByRole('button', { name: 'Ja, gå videre' });
    if (await end.isVisible()) break;
    await page.getByRole('button', { name: /^(Neste|Neste del|Se oversikten)$/ }).click();
  }
  await page.getByRole('button', { name: 'Ja, gå videre' }).click();
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
