import { expect, test } from '@playwright/test';
import { mockNettskjema, configWithoutForms } from './mock';
import { panel } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

const SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

test.use({ userAgent: SAFARI });

test('Safari starts on the new-tab route; sendt.html marks the step as sent', async ({ page, context }) => {
  await mockNettskjema(context);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start som fastlege' }).click();
  await page.getByLabel('Nei', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre og åpne skjemaet' }).click();
  await expect(page.locator('iframe[data-form-frame]')).toHaveCount(0);
  await expect(panel(page).getByRole('button', { name: 'Åpne skjemaet i en ny fane' })).toBeVisible();
  const [tab] = await Promise.all([context.waitForEvent('page'), panel(page).getByRole('button', { name: 'Åpne skjemaet i en ny fane' }).click()]);
  await tab.waitForLoadState();
  const url = new URL(tab.url());
  expect(url.searchParams.get('embed')).toBeNull();
  expect(url.searchParams.get('CBsteg')).toBe('S1');
  expect(url.searchParams.get('LCKsteg')).toBe('true');
  await tab.locator('#send').click();
  await tab.locator('#receipt-link').click();
  await expect(tab.getByText('Takk. Skjemaet er sendt.')).toBeVisible();
  // The storage event reaches ATLAS in the first tab.
  await expect(page.getByRole('button', { name: 'Til oversikten' })).toBeVisible();
});

test('on the tab route «Jeg har sendt skjemaet» also marks the step', async ({ page, context }) => {
  await mockNettskjema(context);
  await page.goto('/');
  await page.getByRole('button', { name: 'Start i DPS-inntaket' }).click();
  await page.getByLabel('Nei', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre og åpne skjemaet' }).click();
  await panel(page).getByRole('button', { name: 'Jeg har sendt skjemaet' }).click();
  await expect(page.getByRole('button', { name: 'Til oversikten' })).toBeVisible();
});
