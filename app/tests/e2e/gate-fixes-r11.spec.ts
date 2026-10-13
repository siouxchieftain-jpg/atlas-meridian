import { expect, test, type Page } from '@playwright/test';
import { configWithoutForms } from './mock';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/**
 * Behaviour fixed after the round-10 gate review (r10F, r10A). Each test names the finding it covers; each one fails on
 * the round-10 build (index-DrV5fY3Q.js) and passes on this one.
 */

/** Move within the app without a reload, as the in-app links do. */
async function go(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
}

/** Review mode: the GP side decides to refer Kari and opens the referral. */
async function gpOpensKari(page: Page) {
  await go(page, '#/gjennomgang/fastlege/sak/kari/konsultasjon');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
}

/** Review mode: the GP side sends Kari's referral, the DPS side returns it with advice, the GP side opens the new referral. */
async function toNewReferral(page: Page, fresh = true) {
  if (fresh) await page.goto('/#/gjennomgang');
  await gpOpensKari(page);
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await page.getByLabel('Retur med råd').check({ force: true });
  await page.getByLabel('Situasjonell krise').check({ force: true });
  await page.getByRole('textbox', { name: 'Råd til fastlegen' }).fill('Prøv kommunalt tilbud først.');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await page.getByLabel('Henvis på nytt').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click();
  await page.getByRole('button', { name: 'Skriv den nye henvisningen' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ny henvisning');
}

test('r10F-01: the standard formula «fare for eget eller andres liv» counts in Risikovurdering; «Spurte ikke om …» does not', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await gpOpensKari(page);
  const risk = page.getByRole('textbox', { name: 'Risikovurdering' });
  const status = page.locator('[data-section="henvisning-risiko"] [data-status]');
  await risk.fill('Ingen holdepunkter for akutt fare for eget eller andres liv.');
  await expect(status).toHaveAttribute('data-status', 'mentioned');
  await risk.fill('Spurte ikke om selvmordstanker, hun var for urolig.');
  await expect(status).toHaveAttribute('data-status', 'notMentionedYet');
});

test('r10F-02: on the DPS side, an empty section of the played referral reads «Tom», never «Ingen»', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await gpOpensKari(page);
  await page.getByRole('textbox', { name: 'Risikovurdering' }).fill('');
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  const letter = page.getByRole('article', { name: 'Henvisning, slik fastlegen sendte den' });
  await expect(letter.locator('h3:has-text("Risikovurdering") + p')).toHaveText('Tom');
  await expect(letter.getByText('Ingen', { exact: true })).toHaveCount(0);
});

test('r10A-02, r10A-03: the new referral has its own heading, and each field is described by where its text comes from', async ({ page }) => {
  await toNewReferral(page);
  await expect(page.getByRole('heading', { level: 2, name: 'Henvisningen' })).toHaveCount(1);
  const field = page.getByRole('textbox', { name: 'Aktuelt og problemstilling' });
  await expect(field).toHaveAccessibleDescription('Fra den første henvisningen');
  await field.fill('Nedstemt i fire måneder, nå verre.');
  await expect(field).toHaveAccessibleDescription('Endret av deg');
});

test('r10A-05: «Gi tilbakemelding» on the new referral offers its own parts: DPS’s advice, and no ATLAS panel or band', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await toNewReferral(page, false);
  await page.locator('[data-feedback-tab]').click();
  const parts = page.locator('[data-feedback-part]');
  await expect(parts.filter({ hasText: 'Råd fra DPS' })).toHaveCount(1);
  await expect(parts.filter({ hasText: 'Fra ATLAS-panelet' })).toHaveCount(0);
  await expect(parts.filter({ hasText: 'Usikkerhetsvisning' })).toHaveCount(0);
});

test('r10F-04, r10A-07: once the new referral is sent it reads as sent, and «Fortsett» leads to the summary', async ({ page }) => {
  await toNewReferral(page);
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await expect(page).toHaveURL(/\/fastlege\/sak\/kari\/oppsummering$/);
  await go(page, '#/gjennomgang/fastlege/sak/kari/henvisning');
  await expect(page.getByText('Den nye henvisningen bygde på den første henvisningen og rådene fra DPS.')).toBeVisible();
  await expect(page.getByText('Det nye utkastet tar med den første henvisningen og rådene fra DPS.')).toHaveCount(0);
  await expect(page.getByText('Slik guiden leste henvisningen da du sendte den.', { exact: false }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText('Leser henvisningen del for del mens du skriver.', { exact: false }).filter({ visible: true })).toHaveCount(0);
});

test('r10F-05, r10A-04: the GP summary gives the plan its own row and names which referral each count reads', async ({ page }) => {
  await toNewReferral(page);
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/kari/oppsummering');
  await expect(page.locator('dt:has-text("DPS-vurdering") + dd')).toHaveText('Retur med råd');
  await expect(page.locator('dt:has-text("Fastlegens plan") + dd')).toHaveText('Henvis på nytt, og den nye henvisningen ble sendt');
  await expect(page.locator('dt:has-text("Omtalt i den første henvisningen") + dd')).toHaveText(/^\d av 5 kriterier omtalt$/);
  await expect(page.locator('dt:has-text("Omtalt i den nye henvisningen") + dd')).toHaveText(/^\d av 5 kriterier omtalt$/);
  await expect(page.locator('dt', { hasText: /^Omtalt i henvisningen$/ })).toHaveCount(0);
});

test('r10F-06: the DPS thread says that the GP sent a new referral, which the prototype does not follow', async ({ page }) => {
  await toNewReferral(page);
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await expect(page.locator('[data-new-referral]')).toHaveText(/^Fastlegen sendte en ny henvisning \d+\. \p{L}+ 2026\. Prototypen følger ikke den nye henvisningen videre\.$/u);
});

test('r10F-07: on the DPS summary, what rests on the example referral or the GP’s example reply says so', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/kari/vurdering');
  await expect(page.getByRole('article', { name: 'Henvisning, slik fastlegen sendte den' }).getByText('Eksempel', { exact: true })).toBeVisible();
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/dialog');
  await page.getByLabel('Rett til helsehjelp').check({ force: true });
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await go(page, '#/gjennomgang/dps/sak/kari/oppsummering');
  await expect(page.locator('dt:has-text("Fastlegens trygghet") + dd')).toHaveText(/\(eksempel\)$/);
  await expect(page.locator('dt:has-text("Omtalt i henvisningen") + dd')).toHaveText(/\(eksempel\)$/);
  await expect(page.locator('dt:has-text("DPS-vurdering") + dd')).toHaveText(/\(etter fastlegens eksempelsvar\)$/);
});

test('r10F-08: before the GP side’s question removes the DPS side’s answer to the example question, it asks', async ({ page }) => {
  await page.goto('/#/gjennomgang/dps/sak/astrid/vurdering');
  await page.locator('[data-section="composer"] textarea').fill('Vi trenger en tydeligere funksjonsbeskrivelse.');
  await page.getByRole('button', { name: 'Send svaret' }).click();
  await go(page, '#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.locator('[data-section="composer"] textarea').fill('Hva skal til for at DPS vurderer henne på nytt?');
  const send = page.getByRole('button', { name: 'Send', exact: true });
  await send.click();
  const ask = page.getByRole('dialog', { name: 'Fjerne DPS-svaret?' });
  await expect(ask).toBeVisible();
  // Cancel keeps both sides as they were, and focus goes back to «Send».
  await ask.getByRole('button', { name: 'Avbryt' }).click();
  await expect(ask).toHaveCount(0);
  await expect(send).toBeFocused();
  await go(page, '#/gjennomgang/dps/sak/astrid/dialog');
  await expect(page.getByText('Vi trenger en tydeligere funksjonsbeskrivelse.')).toBeVisible();
  // Confirm: the GP's question is sent, and DPS answers it afresh.
  await go(page, '#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.locator('[data-section="composer"] textarea').fill('Hva skal til for at DPS vurderer henne på nytt?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.getByRole('dialog', { name: 'Fjerne DPS-svaret?' }).getByRole('button', { name: 'Fjern og fortsett' }).click();
  await go(page, '#/gjennomgang/dps/sak/astrid/vurdering');
  await expect(page.getByText('Hva skal til for at DPS vurderer henne på nytt?')).toBeVisible();
  await expect(page.getByText('Vi trenger en tydeligere funksjonsbeskrivelse.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send svaret' })).toBeVisible();
});

test('r10A-01: on a very short window, a tooltip names the icon-only review tab', async ({ page }) => {
  await page.setViewportSize({ width: 341, height: 192 });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Veileder', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/timeliste');
  const tab = page.locator('[data-feedback-tab]');
  await expect(tab).toBeVisible();
  await tab.hover();
  await expect(page.getByRole('tooltip')).toHaveText('Gi tilbakemelding');
  await expect(tab).toHaveAccessibleName('Gi tilbakemelding');
});

test('r10A-06: below 400 px the preview banner’s stacked buttons keep a gap', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto('/#/studie?forhandsvisning');
  await page.getByRole('button', { name: 'Norsk' }).click();
  const csv = page.getByRole('button', { name: 'Last ned svarene som CSV' });
  const end = page.getByRole('button', { name: 'Avslutt forhåndsvisning' });
  await expect(end).toBeVisible();
  const [a, b] = await Promise.all([csv.boundingBox(), end.boundingBox()]);
  expect(b!.y - (a!.y + a!.height)).toBeGreaterThanOrEqual(7);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
