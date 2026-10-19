import { expect, test } from '@playwright/test';
import { mockNettskjema, recordSubmissions, submissions, configWithoutForms } from './mock';
import { caseOnlyThenAtlas, doTour, finishCaseHome, openCurrentCase, panel, place, sendForm, startStudy, toHome, toStopPage } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

test('a DPS clinician completes the core study, with the GP marker shown only after placing', async ({ page }) => {
  await mockNettskjema(page);
  await recordSubmissions(page);
  await startStudy(page, 'DPS-kliniker', 'Ja');
  await sendForm(page);
  await toHome(page);
  await expect(page.locator('[data-start-hero]').getByRole('heading', { level: 1, name: 'Start med omvisningen' })).toBeVisible();
  await expect(page.locator('[data-home-part="inntak"]').getByRole('heading', { level: 2, name: 'Inntaket i dag' })).toBeVisible();
  await doTour(page);

  // Kari: the case-only letter has no «Hva fastlegen var usikker på».
  await openCurrentCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(page.getByText('Hva fastlegen var usikker på')).toHaveCount(0);
  await toStopPage(page);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await expect(page.getByText('Hva fastlegen var usikker på').first()).toBeVisible();
  // B7: no GP marker or reading before the DPS clinician places the case.
  await expect(page.getByText(/Henvisende fastlege plasserte saken/)).toHaveCount(0);
  await place(page, 2);
  await expect(page.getByText(/Henvisende fastlege plasserte saken/).filter({ visible: true }).first()).toBeVisible();
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await expect(page.getByRole('button', { name: 'Send vurderingen' })).toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await page.getByLabel('Retur med råd').check({ force: true });
  await page.getByLabel('Utilstrekkelig informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Råd til fastlegen/ }).fill('Beskriv tidligere episoder.');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await expect(page.getByText('Kvittering').first()).toBeVisible();
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await expect(page.locator('[data-case-prompt="kari"]')).toBeVisible();
  await finishCaseHome(page);

  // Erlend: the plain line from DPS's own record is there in both states.
  await openCurrentCase(page);
  await page.getByRole('button', { name: 'Start saken' }).click();
  await expect(page.getByText('Tidligere henvisning avslått 12. november 2025')).toBeVisible();
  await toStopPage(page);
  await panel(page).getByRole('button', { name: 'Jeg har svart på side 1' }).click();
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await place(page, 5);
  await page.getByLabel('Rett til helsehjelp').check({ force: true });
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await finishCaseHome(page);

  // Astrid: the answer to the GP's question.
  await openCurrentCase(page);
  await caseOnlyThenAtlas(page);
  await page.locator('[data-section="composer"] textarea').fill('Beskriv mønsteret over tid.');
  await page.getByRole('button', { name: 'Send svaret' }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await finishCaseHome(page);
  // After the three referrals: S2 (now about ATLAS as a whole, after the cases), then S6.
  await page.locator('[data-start-hero]').getByRole('button', { name: 'Gå til avslutningen' }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Gå videre til avslutningen' }).click();
  await sendForm(page);
  await page.getByRole('button', { name: 'Avslutt', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hvorfor ATLAS ser slik ut' })).toBeVisible();

  const sent = await submissions(page);
  expect(Object.fromEntries(sent.map((s) => [s.key, s.fields.steg]))).toEqual({ S1: 'S1', 'S2.dps': 'S2', S3: 'S3', 'S4.dps': 'S4', 'S5.dps': 'S5', S6: 'S6' });
  expect(sent.map((s) => s.key)).toEqual(['S1', 'S3', 'S4.dps', 'S5.dps', 'S2.dps', 'S6']);
  for (const s of sent) {
    expect(s.fields.rolle).toBe('DPS-inntak');
    expect(s.fields.intervju).toBe('Ja');
  }
});

test('the DPS card covers every role in intake, sends DPS-inntak and the study name shown on Om deg', async ({ page }) => {
  await mockNettskjema(page);
  await recordSubmissions(page);
  await page.goto('/');
  const card = page.locator('[data-role-card="dps"]');
  await expect(card.getByText('Gjelder også andre roller i inntaket.', { exact: false })).toBeVisible();
  await card.getByRole('button', { name: 'Start i DPS-inntaket' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Om deg' })).toBeVisible();
  const name = (await page.locator('[data-studienavn-value]').first().textContent())?.trim() ?? '';
  expect(name).toMatch(/^\S+ \S+ \d{2}$/);
  await page.getByLabel('Vil ikke svare').check({ force: true });
  await page.getByRole('button', { name: 'Lagre og åpne skjemaet' }).click();
  await sendForm(page);
  await expect(page.getByRole('button', { name: 'Til oversikten' })).toBeVisible();
  const s1 = (await submissions(page))[0];
  expect(s1.fields.rolle).toBe('DPS-inntak');
  expect(s1.fields.intervju).toBe('Vil ikke svare');
  expect(s1.fields.studienavn).toBe(name);
  await toHome(page);
  // The start page greets the participant by the same study name, with the name's animal (3.4).
  await expect(page.locator('[data-start-greeting]')).toContainText(name);
  await expect(page.locator('[data-start-hero] [data-name-mark]')).toHaveAttribute('data-animal', name.split(' ')[1]);
  await page.locator('[data-start-tour]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
  await expect(page.getByText('DPS, inntak · punkt 1 av', { exact: false })).toBeVisible();
});
