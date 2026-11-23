import { expect, test, type Page } from '@playwright/test';
import { mockNettskjema, configWithoutForms } from './mock';
import { caseOnlyThenAtlas, doTour, finishCaseHome, frame, openCurrentCase, panel, place, sendForm, startStudy, toHome, toStopPage } from './helpers';
import * as fs from 'fs';

const OUT = process.env.WALK_OUT ?? '/home/claude/walk/' + (process.env.WALK_TAG ?? 'before');
let n = 0;
async function snap(page: Page, role: string, label: string) {
  n++;
  const name = `${role}-${String(n).padStart(2, '0')}-${label}`;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const text = await page.evaluate(() => {
    const parts: string[] = [];
    const main = document.querySelector('#main') as HTMLElement | null;
    parts.push('MAIN: ' + (main?.innerText ?? '').replace(/\n{2,}/g, '\n'));
    const fp = document.querySelector('[data-form-panel]:not([hidden])') as HTMLElement | null;
    if (fp) parts.push('FORMPANEL: ' + fp.innerText);
    const dlg = document.querySelector('[role="dialog"]') as HTMLElement | null;
    if (dlg) parts.push('DIALOG: ' + dlg.innerText);
    return parts.join('\n----\n');
  });
  fs.appendFileSync(`${OUT}/${role}.txt`, `\n\n######## ${name}\n${text}`);
}

test.beforeEach(async ({ context }) => { await configWithoutForms(context); fs.mkdirSync(OUT, { recursive: true }); });


async function atlasStep(page: Page, r: string, c: string) {
  await page.getByRole('button', { name: 'Start saken' }).click();
  await snap(page, r, `${c}-caseonly`);
  await toStopPage(page);
  await snap(page, r, `${c}-stoppage`);
  const p1 = panel(page).getByRole('button', { name: 'Jeg har svart på side 1' });
  if (await p1.isVisible()) {
    await p1.click();
    await snap(page, r, `${c}-page1-confirmed`);
  }
  await panel(page).getByRole('button', { name: 'Vis ATLAS' }).click();
  await snap(page, r, `${c}-atlas`);
  await page.screenshot({ path: `${OUT}/${r}-${c}-atlas-full.png`, fullPage: true });
}
async function rest(page: Page, r: string, c: string) {
  await snap(page, r, `${c}-form-rest`);
  await sendForm(page);
  await snap(page, r, `${c}-form-sent`);
}
async function end(page: Page, r: string, c: string) {
  await snap(page, r, `${c}-summary`);
  await page.screenshot({ path: `${OUT}/${r}-${c}-summary-full.png`, fullPage: true });
  await finishCaseHome(page);
  await snap(page, r, `${c}-after`);
}
async function start(page: Page, r: string, role: 'Fastlege' | 'DPS-kliniker') {
  try { fs.unlinkSync(`${OUT}/${r}.txt`); } catch { /* none */ }
  await mockNettskjema(page);
  await page.goto('/');
  await snap(page, r, 'velkommen');
  await startStudy(page, role, 'Nei');
  await snap(page, r, 's1');
  await sendForm(page);
  await snap(page, r, 's1-sent');
  await toHome(page);
  await snap(page, r, 'home');
  await doTour(page);
  await snap(page, r, 'home-after-tour');
}
async function closing(page: Page, r: string) {
  await page.locator('[data-start-hero]').getByRole('button', { name: 'Gå til avslutningen' }).click();
  await snap(page, r, 's2');
  await sendForm(page);
  await snap(page, r, 's2-sent');
  const goOn = page.getByRole('button', { name: 'Gå videre til avslutningen' });
  if (await goOn.isVisible()) {
    await goOn.click();
    await snap(page, r, 's6');
    await sendForm(page);
    await snap(page, r, 's6-sent');
  }
  const avslutt = page.getByRole('button', { name: 'Avslutt', exact: true });
  if (await avslutt.isVisible()) await avslutt.click();
  await snap(page, r, 'takk');
  await page.screenshot({ path: `${OUT}/${r}-takk-full.png`, fullPage: true });
}

test('walk GP', async ({ page }) => {
  n = 0; const r = 'gp';
  await start(page, r, 'Fastlege');
  await openCurrentCase(page); await snap(page, r, 'kari-brief');
  await atlasStep(page, r, 'kari');
  await place(page, 3); await snap(page, r, 'kari-placed');
  await page.getByLabel('Henvis', { exact: true }).check({ force: true });
  await page.getByRole('button', { name: 'Lagre beslutning' }).click(); await snap(page, r, 'kari-decided');
  await page.getByRole('button', { name: 'Skriv henvisningen' }).click(); await snap(page, r, 'kari-referral');
  await page.screenshot({ path: `${OUT}/${r}-kari-referral-full.png`, fullPage: true });
  await page.getByRole('button', { name: 'Send henvisning' }).click();
  await rest(page, r, 'kari');
  await page.getByRole('button', { name: 'Fortsett' }).click(); await snap(page, r, 'kari-reply');
  await page.getByRole('button', { name: 'Ikke svar nå' }).click(); await snap(page, r, 'kari-noreply');
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await end(page, r, 'kari');
  await openCurrentCase(page); await snap(page, r, 'erlend-brief');
  await atlasStep(page, r, 'erlend');
  await page.getByRole('button', { name: /^Lagre utkast/ }).click(); await snap(page, r, 'erlend-saved');
  await rest(page, r, 'erlend');
  await page.getByRole('button', { name: 'Fortsett' }).click(); await snap(page, r, 'erlend-plan');
  await page.getByLabel('Følg opp i allmennpraksis').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click(); await snap(page, r, 'erlend-plan-saved');
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await end(page, r, 'erlend');
  await openCurrentCase(page); await snap(page, r, 'astrid-brief');
  await atlasStep(page, r, 'astrid');
  await page.locator('[data-section="composer"] textarea').fill('Hva manglet i henvisningen?');
  await page.getByRole('button', { name: 'Send', exact: true }).click(); await snap(page, r, 'astrid-asked');
  await rest(page, r, 'astrid');
  await page.getByRole('button', { name: 'Fortsett' }).click(); await snap(page, r, 'astrid-plan');
  await page.getByLabel('Følg opp i allmennpraksis').check({ force: true });
  await page.getByRole('button', { name: 'Lagre plan' }).click(); await snap(page, r, 'astrid-plan-saved');
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await end(page, r, 'astrid');
  await closing(page, r);
});

test('walk DPS', async ({ page }) => {
  n = 0; const r = 'dps';
  await start(page, r, 'DPS-kliniker');
  await openCurrentCase(page); await snap(page, r, 'kari-brief');
  await atlasStep(page, r, 'kari');
  await place(page, 2); await snap(page, r, 'kari-placed');
  await page.getByLabel('Be om mer informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Spørsmål til fastlegen/ }).fill('Hvordan er søvnen nå?');
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await rest(page, r, 'kari');
  await page.getByRole('button', { name: 'Fortsett' }).click(); await snap(page, r, 'kari-dialogue');
  await page.screenshot({ path: `${OUT}/${r}-kari-dialogue-full.png`, fullPage: true });
  await page.getByLabel('Retur med råd').check({ force: true });
  await page.getByLabel('Utilstrekkelig informasjon').check({ force: true });
  await page.getByRole('textbox', { name: /Råd til fastlegen/ }).fill('Beskriv tidligere episoder.');
  await page.getByRole('button', { name: 'Send vurderingen' }).click(); await snap(page, r, 'kari-returned');
  await page.getByRole('button', { name: 'Gå til oppsummeringen' }).click();
  await end(page, r, 'kari');
  await openCurrentCase(page); await snap(page, r, 'erlend-brief');
  await atlasStep(page, r, 'erlend');
  await place(page, 5);
  await page.getByLabel('Rett til helsehjelp').check({ force: true });
  await page.getByRole('button', { name: 'Send vurderingen' }).click();
  await rest(page, r, 'erlend');
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await end(page, r, 'erlend');
  await openCurrentCase(page); await snap(page, r, 'astrid-brief');
  await atlasStep(page, r, 'astrid');
  await page.locator('[data-section="composer"] textarea').fill('Beskriv mønsteret over tid.');
  await page.getByRole('button', { name: 'Send svaret' }).click();
  await rest(page, r, 'astrid');
  await page.getByRole('button', { name: 'Fortsett' }).click();
  await end(page, r, 'astrid');
  await closing(page, r);
});
