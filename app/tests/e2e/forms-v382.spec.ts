import { expect, test, type Page } from '@playwright/test';
import { frame, panel } from './helpers';
import { mockNettskjema } from './mock';

// ATLAS 3.8.2 (F135): the merged closing form runs to about 10,500 px in the panel. The frame was capped at 6000 px,
// so its «Neste» fell below the cut and the participant could not go on. The frame now takes the form's full height.

async function seedAtClosing(page: Page, role: 'fastlege' | 'dps-kliniker') {
  const at = '2026-11-25T00:00:00.000Z';
  const sent = (steg: string) => ({ status: 'sent', at, steg, via: 'panel' });
  const state = {
    v: 2,
    round: 'pilot',
    roleChoice: role,
    intervju: 'Nei',
    studienavn: 'Ivrig ugle 42',
    furthest: 'helhet',
    route: 'panel',
    ledger: { S1: sent('S1'), S3: sent('S3'), S4: sent('S4'), S5: sent('S5') },
    visAtlas: { kari: true, erlend: true, astrid: true },
    page1: {},
    phase: { kari: 'done', erlend: 'done', astrid: 'done' },
    gp: {},
    dps: {},
    tour: { part: 0, step: 0, done: true, started: true },
    extra: {},
    prompts: { kari: 'later', erlend: 'later', astrid: 'later' },
    feedbackSent: [],
  };
  await page.addInitScript((s) => {
    if (!window.sessionStorage.getItem('seeded')) {
      window.localStorage.setItem('atlas.study.v2', JSON.stringify(s));
      window.sessionStorage.setItem('seeded', '1');
    }
  }, state);
}

for (const [role, key] of [
  ['fastlege', 'S2.fastlege'],
  ['dps-kliniker', 'S2.dps'],
] as const) {
  test(`${key}: a closing form taller than 6000 px gets its full height, so its last button can be reached and sent`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await mockNettskjema(page, { round: 'pilot', tall: [key] });
    await seedAtClosing(page, role);
    await page.goto('/#/studie/helhet');
    const iframe = panel(page).locator('iframe[data-form-frame]');
    await expect(iframe).toBeVisible();
    await expect.poll(async () => (await iframe.boundingBox())?.height ?? 0).toBeGreaterThan(10_400);
    // The frame holds the whole form: the send button sits inside the frame's box, not below it.
    const send = frame(page).locator('#send');
    await send.scrollIntoViewIfNeeded();
    const box = await iframe.boundingBox();
    const btn = await send.boundingBox();
    expect(btn!.y + btn!.height).toBeLessThanOrEqual(box!.y + box!.height);
    await send.click();
    await expect(page.locator('[data-press-now]')).toBeVisible();
  });
}
