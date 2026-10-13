import { expect, test } from '@playwright/test';
import { mockNettskjema, recordSubmissions, submissions, configWithoutForms } from './mock';
import { caseOnlyThenAtlas, doTour, frame, frameSteg, panel, place, sendForm, startStudy } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

test('a GP completes the whole study on the panel route, with the right locked values', async ({ page }) => {
  await mockNettskjema(page);
  await recordSubmissions(page);
  await startStudy(page, 'Fastlege', 'Nei');
  expect(await frameSteg(page)).toBe('S1');
  await sendForm(page);
  await expect(page.getByRole('button', { name: 'Gå til omvisningen' })).toBeVisible();
  await doTour(page);
  await sendForm(page);
  await page.getByRole('button', { name: 'Gå til den første saken' }).click();

  // Kari: case only, page 1, stop page, «Vis ATLAS», own work, the rest of the form, the reply.
  await caseOnlyThenAtlas(page);
  await expect(panel(page)).toBeHidden();
  await expect(page.getByText('Resten av skjemaet åpnes når du har gjort saken ferdig', { exact: false })).toBeVisible();
  await expect(page.getByText('Systemets lesning', { exact: true })).toHaveCount(0);
  await place(page, 3);
  await expect(page.locator('[data-reading]')).toBeVisible();
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByText('Gå videre i skjemaet og svar på resten nå.')).toBeVisible();
  // The reply from DPS is held until the last page is sent.
  await expect(page.getByText('Svaret fra den andre siden vises når du har sendt resten av skjemaet.')).toBeVisible();
  await expect(frame(page).locator('#page')).toHaveText('Side 2 av 3');
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await expect(page.getByText('Be om mer informasjon').first()).toBeVisible();
  await page.getByRole('button', { name: 'Ikke svar nå' }).click();
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await page.getByRole('button', { name: 'Gå til neste steg' }).click();

  // Erlend: the GP starts in the referral draft after «Vis ATLAS».
  await caseOnlyThenAtlas(page);
  await expect(page.getByRole('heading', { name: 'Ny henvisning', level: 1 })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Funksjonsfall' })).toHaveValue('');
  await page.getByRole('button', { name: 'Lagre utkast' }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await expect(page.getByRole('heading', { name: 'Din plan', level: 1 })).toBeVisible();
  await page.getByLabel('Følg opp i allmennpraksis').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click();
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await expect(page.getByText('utkastet ble lagret og ikke sendt').first()).toBeVisible();
  await page.getByRole('button', { name: 'Gå til neste steg' }).click();

  // Astrid: the structured return, a question, the answer, Din plan.
  await caseOnlyThenAtlas(page);
  await expect(page.getByRole('heading', { name: 'Retur med råd fra DPS' })).toBeVisible();
  await page.locator('[data-section="composer"] textarea').fill('Hva manglet i henvisningen?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await page.getByLabel('Følg opp i allmennpraksis').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click();
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await page.getByRole('button', { name: 'Gå til neste steg' }).click();

  // Avslutning, then Takk: the reasons open only here.
  await sendForm(page);
  await page.getByRole('button', { name: 'Avslutt', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hvorfor ATLAS ser slik ut' })).toBeVisible();

  const sent = await submissions(page);
  const steg = Object.fromEntries(sent.map((s) => [s.key, s.fields.steg]));
  expect(steg).toEqual({ S1: 'S1', 'S2.fastlege': 'S2', S3: 'S3', 'S4.fastlege': 'S4', 'S5.fastlege': 'S5', S6: 'S6' });
  for (const s of sent) {
    expect(s.fields.rolle).toBe('Fastlege');
    expect(s.fields.intervju).toBe('Nei');
    expect(s.fields.versjon).toMatch(/^3\.0\.0-/);
  }
  expect(sent.find((s) => s.key === 'S3')?.fields.vignett).toBe('V1');
  expect(sent.find((s) => s.key === 'S4.fastlege')?.fields.vignett).toBe('V3');
  expect(sent.find((s) => s.key === 'S5.fastlege')?.fields.vignett).toBe('V4');
  expect(sent.find((s) => s.key === 'S1')?.fields.vignett).toBeUndefined();
});
