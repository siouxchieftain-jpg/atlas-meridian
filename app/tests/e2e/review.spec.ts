import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema, recordSubmissions, submissions, configWithoutForms } from './mock';
import { frame, panel, place, sendForm } from './helpers';

// No check depends on the addresses the site holds: with none, review mode gives feedback in its preview forms.
// A check that needs forms routes them to the stand-in (mockNettskjema), which takes precedence.
test.beforeEach(async ({ context }) => {
  await configWithoutForms(context);
});

/** Move within the app without a reload, as the in-app links do. */
async function go(page: Page, hash: string) {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
  await expect(page).toHaveURL(new RegExp(`${hash.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&')}$`));
}

/** The locked fields in the open form's address. */
async function frameFields(page: Page): Promise<Record<string, string>> {
  const src = await page.locator('iframe[data-form-frame]').getAttribute('src');
  const out: Record<string, string> = {};
  new URL(src ?? 'about:blank').searchParams.forEach((v, k) => {
    if (k.startsWith('CB')) out[k.slice(2)] = v;
  });
  return out;
}

test('review: the other side is an example until someone plays it, then the played answer reaches the other side', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByRole('button', { name: 'Se som DPS, inntak' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang\/dps\/mottatte$/);

  // Nobody has played the GP side: the letter is the scripted one, marked «Eksempel» (a referral is no reply, r10F-07).
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await expect(page.getByRole('article', { name: 'Henvisning, slik fastlegen sendte den' }).getByText('Eksempel', { exact: true })).toBeVisible();

  // «Se fra den andre siden» opens the same case on the GP side.
  await page.getByRole('button', { name: 'Se fra den andre siden' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang\/fastlege\/sak\/kari\/konsultasjon$/);

  // Play the GP side: place, decide, write and send the referral.
  await place(page, 3);
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click();
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click();
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang\/fastlege\/sak\/kari\/sendt$/);

  // DPS not played yet: the GP sees the scripted request, marked as an example.
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await expect(page.getByText('Eksempelsvar').first()).toBeVisible();

  // The DPS side now receives the played referral, not the example.
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await expect(page.getByText('Eksempelsvar')).toHaveCount(0);
  await expect(page.getByText('Eksempel', { exact: true })).toHaveCount(0);
  await place(page, 2);
  await expect(page.getByText(/Henvisende fastlege plasserte saken/).filter({ visible: true }).first()).toBeVisible();
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();

  // Back on the GP side, the thread carries the played question and no example.
  await go(page, '#/gjennomgang/fastlege/sak/kari/dialog');
  await expect(page.getByText('Hvordan er søvnen nå?')).toBeVisible();
  await expect(page.getByText('Eksempelsvar')).toHaveCount(0);

  // «Start på nytt» clears the played sides.
  await page.getByRole('button', { name: 'Start på nytt' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ja, start på nytt' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang$/);
  await go(page, '#/gjennomgang/dps/sak/kari/vurdering');
  await expect(page.getByText('Eksempel', { exact: true }).first()).toBeVisible();
});

test('review: «Uten ATLAS» / «Med ATLAS», Merknader and the role switch', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');
  const band = page.getByRole('combobox', { name: 'Plasser saken' });
  await expect(band.first()).toBeVisible();
  await expect(page.locator('[data-note]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Uten ATLAS', exact: true }).click();
  await expect(band).toHaveCount(0);
  await page.getByRole('switch', { name: 'Merknader' }).click();
  await expect(page.locator('[data-note="uten-atlas"]')).toBeVisible();

  await page.getByRole('button', { name: 'Med ATLAS', exact: true }).click();
  await expect(band.first()).toBeVisible();
  await expect(page.locator('[data-note="uten-atlas"]')).toHaveCount(0);
  await expect(page.locator('[data-note]').first()).toBeVisible();

  // The setting is kept across a reload.
  await page.reload();
  await expect(page.locator('[data-note]').first()).toBeVisible();
  await page.getByRole('switch', { name: 'Merknader' }).click();
  await expect(page.locator('[data-note]')).toHaveCount(0);

  // The header role switch keeps the case: the GP consultation turns into the DPS assessment.
  await page.getByRole('group', { name: 'Rolle', exact: true }).getByRole('button', { name: 'DPS, inntak' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang\/dps\/sak\/kari\/vurdering$/);
  await page.getByRole('group', { name: 'Rolle', exact: true }).getByRole('button', { name: 'Fastlege' }).click();
  await expect(page).toHaveURL(/#\/gjennomgang\/fastlege\/sak\/kari\/konsultasjon$/);
});

test('review: R1 for one part of a screen and R2 at the end go through the form with the locked context', async ({ page }) => {
  await mockNettskjema(page);
  await recordSubmissions(page);
  await page.goto('/#/gjennomgang/fastlege/sak/kari/konsultasjon');

  // The tab asks for the reviewer's role first.
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  await expect(page.getByText('Velg rollen din i gjennomgangen først.')).toBeVisible();
  // The role is picked, then confirmed: an arrow key alone never commits a role (R2A-07).
  await page.getByRole('dialog').getByLabel('Veileder', { exact: true }).check({ force: true });
  await expect(page.getByText('Hvilken del gjelder tilbakemeldingen?')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Bruk denne rollen' }).click();
  await expect(page.getByText('Hvilken del gjelder tilbakemeldingen?')).toBeVisible();
  // The popover is a named dialog (R2A-06), and focus is on its first part.
  await expect(page.getByRole('dialog', { name: 'Hvilken del gjelder tilbakemeldingen?' })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Hele skjermbildet' })).toBeFocused();
  await page.getByRole('dialog').getByRole('button', { name: 'Usikkerhetsvisning' }).click();

  await expect(panel(page)).toBeVisible();
  expect(await frameFields(page)).toEqual({
    rolle: 'Veileder',
    side: 'fastlege/kari/konsultasjon',
    seksjon: 'band',
    versjon: expect.stringMatching(/^3\.4\.1-/),
  });
  await sendForm(page);
  // Confirmed on the screen the feedback was about, in a MessageBar (no toast).
  await expect(page.getByText('Takk. Tilbakemeldingen er registrert.')).toBeVisible();
  await expect(panel(page)).toBeHidden();

  // The overview shows what has been given, with the case; the role is now locked.
  await page.getByRole('link', { name: 'Tilbakemeldinger' }).first().click();
  await expect(page).toHaveURL(/#\/gjennomgang\/tilbakemeldinger$/);
  const row = page.getByRole('listitem').filter({ hasText: 'Fastlege · Kari Nordli · Konsultasjon · Usikkerhetsvisning' });
  await expect(row.locator('code')).toHaveText('fastlege/kari/konsultasjon#band');
  await expect(row.getByText('Tilbakemelding gitt')).toBeVisible();
  // The screen list counts the part for Kari only, and links to the screen.
  await expect(page.getByRole('link', { name: 'Fastlege · Kari Nordli · Konsultasjon: tilbakemelding på 1 av 9 deler' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Fastlege · Erlend Bakken · Konsultasjon: tilbakemelding på 0 av 9 deler' })).toBeVisible();
  await expect(page.getByText('Rollen er sendt med tilbakemeldingene og kan ikke endres.')).toBeVisible();
  await expect(page.getByLabel('Fastlege', { exact: true })).toBeDisabled();

  // R2: the overall impression.
  await page.getByRole('button', { name: 'Gi et samlet inntrykk' }).click();
  await expect(frame(page).locator('h1')).toHaveText('Mock Nettskjema R2');
  expect(await frameFields(page)).toEqual({ rolle: 'Veileder', versjon: expect.stringMatching(/^3\.4\.1-/) });
  await sendForm(page);
  await expect(page.getByText('Det samlede inntrykket er sendt.')).toBeVisible();

  const sent = await submissions(page);
  expect(sent.map((s) => s.key)).toEqual(['R1', 'R2']);
  expect(sent[0].fields).toMatchObject({ rolle: 'Veileder', side: 'fastlege/kari/konsultasjon', seksjon: 'band' });
  expect(sent[0].fields.steg).toBeUndefined();
  expect(sent[1].fields.side).toBeUndefined();
});

test('review: the sections offered match the case (Astrid has no band on the GP consultation)', async ({ page }) => {
  await page.goto('/#/gjennomgang');
  await page.getByLabel('Fastlege', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/fastlege/sak/astrid/konsultasjon');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  const pop = page.getByRole('dialog');
  await expect(pop.getByRole('button', { name: 'Hele skjermbildet' })).toBeVisible();
  await expect(pop.getByRole('button', { name: 'Retur med råd fra DPS' })).toBeVisible();
  await expect(pop.getByRole('button', { name: 'Usikkerhetsvisning' })).toHaveCount(0);
});

test('review: R1 opens as a preview when the form address is not set', async ({ page }) => {
  await mockNettskjema(page, { missing: ['R1'] });
  await page.goto('/#/gjennomgang');
  await page.getByLabel('DPS-kliniker', { exact: true }).check({ force: true });
  await go(page, '#/gjennomgang/dps/mottatte');
  await page.getByRole('button', { name: 'Gi tilbakemelding' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hele skjermbildet' }).click();
  await expect(panel(page).getByText('Fylt ut automatisk av ATLAS')).toBeVisible();
  await expect(page.locator('iframe[data-form-frame]')).toHaveCount(0);
});

test('review: the no-data states of Mitt henvisningsmønster and Delt oversikt', async ({ page }) => {
  await page.goto('/#/gjennomgang/fastlege/monster');
  await expect(page.getByText('Ingen data ennå')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Vis tilstanden uten data' }).click();
  await expect(page.getByText('Ingen data ennå').first()).toBeVisible();
  // No figures, so no «Fiktive tall» beside «Ingen data ennå» (SV-17).
  await expect(page.getByText('Fiktive tall for prototypen', { exact: true })).toHaveCount(0);
  await page.getByRole('switch', { name: 'Vis tilstanden uten data' }).click();
  await expect(page.getByText('Ingen data ennå')).toHaveCount(0);

  await go(page, '#/gjennomgang/dps/delt');
  await expect(page.getByText('Ingen data ennå')).toHaveCount(0);
  await page.getByRole('switch', { name: 'Vis tilstanden uten data' }).click();
  await expect(page.getByText('Ingen data ennå').first()).toBeVisible();
});
