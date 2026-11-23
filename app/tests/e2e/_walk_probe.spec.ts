import { expect, test } from '@playwright/test';
import { mockNettskjema, configWithoutForms } from './mock';
import { clickThroughTour, sendForm, startStudy, toHome } from './helpers';

test.beforeEach(async ({ context }) => { await configWithoutForms(context); });

test('probe dialog reset', async ({ page }) => {
  await mockNettskjema(page);
  await startStudy(page, 'Fastlege', 'Nei');
  await sendForm(page);
  await toHome(page);
  await page.locator('[data-start-tour]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start omvisningen' }).click();
  // to the dialog step
  for (let i = 0; i < 30; i++) {
    const t = await page.locator('[data-tour-frame]').count();
    if (await page.getByRole('button', { name: /Avslutt omvisningen/ }).isVisible()) break;
    await page.getByRole('button', { name: /^(Neste|Neste del)$/ }).click();
  }
  const win = page.locator('[data-tour-stage]');
  const thread = win.locator('[data-section="delt-dialog"] button').first();
  console.log('thread buttons', await win.locator('[data-section="delt-dialog"] button').count());
  await thread.click();
  console.log('opened back?', await win.getByRole('button', { name: 'Tilbake til Dialog' }).isVisible());
  await win.getByRole('button', { name: 'Nullstill eksempelet' }).click();
  console.log('after reset, back visible?', await win.getByRole('button', { name: 'Tilbake til Dialog' }).isVisible(), 'thread list?', await win.locator('[data-section="delt-dialog"]').count());
  await page.getByRole('button', { name: 'Avslutt omvisningen' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/claude/walk/probe-end.png' });
  const seeAgain = page.getByRole('button', { name: 'Se igjen' });
  console.log('see again count', await seeAgain.count());
  await seeAgain.last().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/home/claude/walk/probe-again.png' });
  const t2 = page.locator('[data-section="delt-dialog"] button').first();
  console.log('thread count again', await page.locator('[data-section="delt-dialog"] button').count());
  await t2.click({ timeout: 5000 }).catch((e) => console.log('click fail', String(e).slice(0, 300)));
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/home/claude/walk/probe-again2.png' });
  console.log('back visible', await page.getByRole('button', { name: 'Tilbake til Dialog' }).isVisible());
});
