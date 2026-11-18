import { expect, test } from '@playwright/test';
import { mockNettskjema } from './mock';
import { sendForm, startStudy, toHome } from './helpers';

/**
 * 3.7: «Se deg rundt», the guide's markers and the faded parts. The browse tab keeps its own storage, opens no form
 * and never touches the study in the first tab.
 */

test('«Se deg rundt» opens with its strip, keeps its own storage and shows no form', async ({ page }) => {
  await mockNettskjema(page);
  await page.goto('/#/studie/se-rundt');
  await expect(page).toHaveURL(/#\/studie\/velkommen$/);
  await expect(page.getByText('Du ser deg rundt.')).toBeVisible();
  await expect(page.locator('header').getByText('Se deg rundt', { exact: true })).toBeVisible();
  await expect(page.locator('[data-feedback-tab]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start som fastlege' }).click();
  await page.getByLabel('Nei', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre og åpne skjemaet' }).click();
  await expect(page.getByRole('heading', { name: 'Her åpnes et skjema i studien' })).toBeVisible();
  await expect(page.locator('iframe[data-form-frame]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Gå videre' }).click();
  await expect(page.getByRole('button', { name: 'Til oversikten' })).toBeVisible();
  const local = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('atlas.study')));
  expect(local).toEqual([]);
  const session = await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('atlas.browse:atlas.study')));
  expect(session.length).toBeGreaterThan(0);
});

test('«Se deg rundt» is not offered before the three cases are done', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await toHome(page);
  await page.getByRole('button', { name: /Hjelp/ }).first().click();
  await expect(page.getByRole('menuitem', { name: /Se deg rundt/ })).toHaveCount(0);
});
