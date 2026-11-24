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
  // Before «Vis ATLAS», the locked ATLAS card stands where ATLAS will open.
  await expect(page.locator('[data-atlas-card="locked"]')).toContainText('Her vises ATLAS etter at du har svart på side 1.');
  await toStopPage(page);
  const stop = panel(page).locator('[data-next-step="show-atlas"]');
  await expect(stop.locator('[data-next-mark]')).toContainText('Trykk her');
  await expect(stop.locator('[data-next-mark]').getByRole('button', { name: 'Vis ATLAS' })).toBeVisible();
  await stop.getByRole('button', { name: 'Vis ATLAS' }).click();
  const box = (n: number) => page.locator(`[data-guide-step="${n}"]`);
  const part = (n: number) => page.locator(`#task-part-${n}`);
  // 3.8: the ATLAS parts sit in the boxes under «Oppgaven din»; there is no side panel, and box 1 is open.
  await expect(page.locator('[data-atlas-side], aside[aria-label="ATLAS"]')).toHaveCount(0);
  await expect(part(1)).toBeVisible();
  await expect(part(2)).toBeHidden();
  // ATLAS arrives as its own card: «Med ATLAS», «ATLAS er på», its heading focused.
  const card = page.locator('[data-atlas-card="on"]');
  await expect(card).toContainText('Med ATLAS');
  await expect(card).toContainText('ATLAS er på');
  await expect(card.getByRole('heading', { level: 2, name: 'ATLAS' })).toBeFocused();
  await expect(page.locator('[data-guide-step][data-done]')).toHaveCount(0);
  await place(page, 3);
  await expect(box(1)).toHaveAttribute('data-done', '');
  // The box shows its answer, and the part stays open until «Neste» is pressed.
  await expect(box(1)).toContainText('midt i gråsonen');
  await expect(part(1)).toBeVisible();
  const next = part(1).locator('[data-next-mark]').getByRole('button', { name: /^Neste: Hva er uklart i saken/ });
  await expect(next).toBeVisible();
  await next.click();
  await expect(part(2)).toBeVisible();
  await expect(part(1)).toBeHidden();
  // A box can be opened directly.
  await box(4).click();
  await page.getByLabel('Middels', { exact: true }).check({ force: true });
  await expect(box(4)).toHaveAttribute('data-done', '');
  await expect(box(4)).toContainText('Middels');
  await box(5).click();
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await expect(box(5)).not.toHaveAttribute('data-done', '');
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await expect(box(5)).toHaveAttribute('data-done', '');
  await expect(part(5).locator('[data-next-mark]').getByRole('button', { name: /Skriv henvisningen/ })).toBeVisible();
  await expect(page.getByText(/^\d av \d gjort$/)).toBeVisible();
  // «Vis alle delene» shows every part at once, and the choice holds.
  await page.getByRole('button', { name: 'Vis alle delene' }).click();
  for (const n of [1, 2, 3, 4, 5]) await expect(part(n)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Vis én del om gangen' })).toBeVisible();
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
