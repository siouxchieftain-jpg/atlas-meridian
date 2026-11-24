import { expect, test } from '@playwright/test';
import { mockNettskjema } from './mock';
import { doTour, openCurrentCase, panel, place, sendForm, startStudy, toHome, toStopPage } from './helpers';

/** 3.8: one next step at a time, marked; the task's parts as a checklist that ticks itself. */

test('3.8: the stop card carries the «Trykk her» mark; the checklist under the task ticks each part as it is done', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege', 'Nei');
  await sendForm(page);
  await toHome(page);
  await doTour(page);
  await openCurrentCase(page);
  // The briefing's one way on is marked.
  await expect(page.locator('[data-next-mark]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await toStopPage(page);
  const card = panel(page).locator('[data-next-step="show-atlas"]');
  await expect(card.locator('[data-next-mark]')).toContainText('Trykk her');
  await expect(card.locator('[data-next-mark]').getByRole('button', { name: 'Vis ATLAS' })).toBeVisible();
  await card.getByRole('button', { name: 'Vis ATLAS' }).click();
  const box = (n: number) => page.locator(`[data-guide-step="${n}"]`);
  await expect(box(1)).toBeVisible();
  await expect(page.locator('[data-guide-step][data-done]')).toHaveCount(0);
  await place(page, 3);
  await expect(box(1)).toHaveAttribute('data-done', '');
  await page.getByLabel('Middels', { exact: true }).check({ force: true });
  await expect(box(4)).toHaveAttribute('data-done', '');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await expect(box(5)).not.toHaveAttribute('data-done', '');
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await expect(box(5)).toHaveAttribute('data-done', '');
  await expect(page.getByText(/^\d av \d gjort$/)).toBeVisible();
});

test('3.8: Om deg marks «Lagre og åpne skjemaet» once the question is answered, and «Til oversikten» once the form is sent', async ({ page }) => {
  await mockNettskjema(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start som fastlege' }).click();
  await expect(page.locator('[data-next-mark]')).toHaveCount(0);
  await page.getByLabel('Nei', { exact: true }).check({ force: true });
  await expect(page.locator('[data-next-mark]').getByRole('button', { name: 'Lagre og åpne skjemaet' })).toBeVisible();
  await page.getByRole('button', { name: 'Lagre og åpne skjemaet' }).click();
  await sendForm(page);
  await expect(page.locator('[data-next-mark]').getByRole('button', { name: 'Til oversikten' })).toBeVisible();
});
