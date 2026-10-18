import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema, recordSubmissions, submissions, configWithoutForms } from './mock';
import { caseOnlyThenAtlas, frame, frameSteg, openCurrentCase, panel, place, sendForm, startStudy, toFirstCase, toStopPage } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/** S1, the overview and the tour, ready for Kari (v3.1). */
async function toKari(page: Page, role: 'Fastlege' | 'DPS-kliniker' = 'Fastlege') {
  await toFirstCase(page, role);
}

async function kariDecision(page: Page) {
  await place(page, 3);
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
}

test('a reload during the ATLAS work reopens the form as S3-etter at the page-2 moment', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await caseOnlyThenAtlas(page);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Plasser saken' })).toBeVisible();
  await expect(page.locator('iframe[data-form-frame]')).toHaveCount(0);
  await kariDecision(page);
  await expect(panel(page)).toBeVisible();
  expect(await frameSteg(page)).toBe('S3-etter');
  await expect(panel(page).getByText('Skjemaet er åpnet på nytt. Svar på alle sidene nå.')).toBeVisible();
});

test('a reload in the case-only state reopens page 1 with S3 and asks for page 1 again', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await toStopPage(page);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await page.reload();
  await expect(page.locator('iframe[data-form-frame]')).toBeVisible();
  expect(await frameSteg(page)).toBe('S3');
  await expect(panel(page).getByRole('button', { name: 'Vis ATLAS' })).toHaveAttribute('aria-disabled', 'true');
});

test('a failed send offers a retry in the same form, and the retry counts', async ({ page }) => {
  await mockNettskjema(page, { failOnce: ['S1'] });
  await recordSubmissions(page);
  await startStudy(page, 'Fastlege');
  await sendForm(page);
  await expect(panel(page).getByText('Sendingen feilet. Prøv igjen i skjemaet, eller åpne det i en ny fane.')).toBeVisible();
  await frame(page).locator('#send').click();
  await expect(page.getByRole('button', { name: 'Til oversikten' })).toBeVisible();
  expect((await submissions(page)).map((s) => s.key)).toEqual(['S1']);
});

test('a skipped vignette form lets the case go on, and «Svar likevel» opens it as S3-etter', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await panel(page).getByRole('button', { name: 'Hopp over skjemaet' }).click();
  await expect(panel(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Vis ATLAS' }).first().click();
  await kariDecision(page);
  // No page-2 moment for a skipped form: the reply is not held.
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await expect(page.getByText('Be om mer informasjon').first()).toBeVisible();
  await page.goto('/#/studie/steg');
  await page.getByRole('button', { name: 'Svar likevel' }).first().click();
  await expect(page.locator('iframe[data-form-frame]')).toBeVisible();
  expect(await frameSteg(page)).toBe('S3-etter');
});

test('a vignette form sent whole before «Vis ATLAS» counts as sent, and is not offered again', async ({ page }) => {
  await mockNettskjema(page);
  await recordSubmissions(page);
  await toKari(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await sendForm(page);
  await expect(page.locator('iframe[data-form-frame]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Vis ATLAS' }).first().click();
  await kariDecision(page);
  await expect(page.locator('iframe[data-form-frame]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await expect(page.getByText('Be om mer informasjon').first()).toBeVisible();
  const s3 = (await submissions(page)).filter((s) => s.key === 'S3');
  expect(s3).toHaveLength(1);
  expect(s3[0].fields.steg).toBe('S3');
});

test('going past the stop page before «Vis ATLAS» shows the hint, and the confirmation is still asked', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await toStopPage(page);
  await frame(page).locator('#next').click();
  await expect(panel(page).getByText('Skjemaet har gått videre. Trykk på knappen når du har svart på side 1.')).toBeVisible();
  await expect(panel(page).getByRole('button', { name: 'Vis ATLAS' })).toHaveAttribute('aria-disabled', 'true');
});

test('resizing across the inline threshold keeps the open form where it was', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await toStopPage(page);
  await expect(panel(page)).toHaveAttribute('data-inline', 'true');
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(panel(page)).toHaveAttribute('data-inline', 'false');
  await expect(frame(page).locator('#page')).toHaveText('Side 2 av 3');
  await page.setViewportSize({ width: 683, height: 450 });
  await expect(frame(page).locator('#page')).toHaveText('Side 2 av 3');
  await page.setViewportSize({ width: 1600, height: 900 });
  await expect(panel(page)).toHaveAttribute('data-inline', 'true');
  await expect(frame(page).locator('#page')).toHaveText('Side 2 av 3');
});

test('at 1448 px the form panel sits inline beside the ATLAS panel', async ({ page }) => {
  await page.setViewportSize({ width: 1448, height: 900 });
  await mockNettskjema(page);
  await toKari(page);
  await caseOnlyThenAtlas(page);
  await kariDecision(page);
  await page.goto('/#/studie/sak/kari/konsultasjon');
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toHaveAttribute('data-inline', 'true');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a form without an address is not ready: no skip, no way past it', async ({ page }) => {
  await mockNettskjema(page, { missing: ['S1'] });
  await startStudy(page, 'Fastlege').catch(() => undefined);
  await expect(panel(page).getByText('Dette skjemaet er ikke klart ennå.')).toBeVisible();
  await expect(panel(page).getByText('Hopp over skjemaet')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Til oversikten' })).toHaveCount(0);
  await page.goto('/#/studie/omvisning');
  await expect(page).toHaveURL(/#\/studie\/om-deg$/);
  await page.goto('/#/studie/hjem');
  await expect(page).toHaveURL(/#\/studie\/om-deg$/);
});

test('a participant who edits the address to review mode returns to the study; the bare address asks first (welcome back)', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'DPS-kliniker');
  await sendForm(page);
  await expect(page.getByRole('button', { name: 'Til oversikten' })).toBeVisible();
  // Once S1 is sent, the participant is at home: the overview, where the tour starts from its card.
  await page.goto('/#/gjennomgang/fastlege/timeliste');
  await expect(page).toHaveURL(/#\/studie\/hjem$/);
  // The study link again: Velkommen asks whether it is the same person (decision 11), then goes on from where it was.
  await page.goto('/');
  await expect(page).toHaveURL(/#\/studie\/velkommen\?tilbake$/);
  await page.getByRole('button', { name: 'Fortsett der du slapp' }).click();
  await expect(page).toHaveURL(/#\/studie\/hjem$/);
  await page.goto('/#/studie/steg');
  await page.getByRole('link', { name: /ATLAS/ }).first().click();
  await expect(page).toHaveURL(/#\/studie\/hjem$/);
  // The tour's address leads to its card first, never straight into the tour.
  await page.goto('/#/studie/omvisning');
  await expect(page).toHaveURL(/#\/studie\/hjem$/);
  await expect(page.getByRole('dialog')).toContainText('Før du starter: en kort omvisning');
});

test('restarting unfinished steps keeps the sent ledger, the role and the «Vis ATLAS» record', async ({ page }) => {
  await mockNettskjema(page);
  await toKari(page);
  await caseOnlyThenAtlas(page);
  await page.getByRole('button', { name: 'Hjelp' }).click();
  await page.getByRole('menuitem', { name: 'Start ufullførte steg på nytt' }).click();
  await page.getByRole('button', { name: 'Ja, start på nytt' }).click();
  // Kari starts again from the overview; S1 stays sent, the role stays, the tour stays done.
  await expect(page).toHaveURL(/#\/studie\/hjem$/);
  await expect(page.getByText('Fastlege', { exact: true }).first()).toBeVisible();
  await openCurrentCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  // ATLAS was shown before, so the form opens as S3-etter.
  expect(await frameSteg(page)).toBe('S3-etter');
});
