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
  const locked = page.locator('[data-atlas-card="locked"]');
  await expect(locked).toContainText('ATLAS åpner her når du har svart på side 1 og trykket «Vis ATLAS».');
  // Locked, the card names nothing of what ATLAS shows (review R1).
  await expect(locked).not.toContainText('Viser usikkerhet');
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
  await expect(card).toContainText('ATLAS er nå på for denne saken.');
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
  // Focus moves to the new part's heading, and the boxes come back into view (review R2, R3).
  await expect(part(2).getByRole('heading', { name: 'Hva er uklart i saken?' })).toBeFocused();
  await expect(box(2)).toBeInViewport();
  await expect(box(2)).toHaveAttribute('aria-current', 'step');
  // A box never closes its part (review R10).
  await box(2).click();
  await expect(part(2)).toBeVisible();
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
  // The task line says what comes next once the decision is saved (review R8); the title's «Gjenstår» gives way.
  await expect(page.locator('[data-task-parts]')).toContainText('Neste: skriv og send henvisningen.');
  await expect(page.locator('[data-case-remaining]')).toBeHidden();
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

test('3.8: the study map opens from the header as a panel; «Fortsett» goes back to the case, and the rail has no study item', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege', 'Nei');
  await sendForm(page);
  await toHome(page);
  await doTour(page);
  await openCurrentCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  const url = page.url();
  // The rail holds the system's own pages only (Jishnu, 24 November).
  await expect(page.getByRole('link', { name: 'Studien' })).toHaveCount(0);
  const open = page.getByRole('button', { name: /^Hvor du er i studien: Del 2 av 3/ });
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await open.click();
  const map = page.getByRole('dialog', { name: 'Studien' });
  await expect(map).toBeVisible();
  await expect(map.locator('li[aria-current="step"]')).toContainText('Sak 1: Kari');
  await map.getByRole('button', { name: 'Fortsett' }).click();
  await expect(map).toHaveCount(0);
  expect(page.url()).toBe(url);
  await expect(open).toBeFocused();
  // Escape closes it the same way, and «Åpne» on a finished step goes there.
  await open.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Studien' })).toHaveCount(0);
  await open.click();
  await page.getByRole('dialog', { name: 'Studien' }).locator('li', { hasText: 'Omvisning' }).getByRole('button', { name: 'Åpne' }).click();
  await expect(page).toHaveURL(/#\/studie\/omvisning/);
});
