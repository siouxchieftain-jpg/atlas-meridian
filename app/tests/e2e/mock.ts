import type { BrowserContext, Page } from '@playwright/test';

/**
 * A stand-in for Nettskjema at https://nettskjema.no. It behaves like the
 * embedded form as far as ATLAS can see: a height message every second,
 * "scrollToStart" on every page change and after sending, and
 * "submitFinished" or "submitFailed" when the participant sends. Vignette
 * forms have three pages (B1, the stop page, the rest). No request ever
 * leaves the test.
 */
export const FORM_KEYS = ['S1', 'S2.fastlege', 'S2.dps', 'S3', 'S4.fastlege', 'S4.dps', 'S5.fastlege', 'S5.dps', 'S6', 'S7.fastlege', 'S8', 'R1', 'R2'];
const THREE_PAGES = new Set(['S3', 'S4.fastlege', 'S4.dps', 'S5.fastlege', 'S5.dps']);

export interface MockOptions {
  /** Form keys whose first send fails with "submitFailed". */
  failOnce?: string[];
  /** Form keys left out of the configuration («ikke klart ennå»). */
  missing?: string[];
}

function mockHtml(key: string, failOnce: boolean): string {
  const pages = THREE_PAGES.has(key) ? 3 : 1;
  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><title>Mock ${key}</title>
<style>body{font:14px/20px sans-serif;margin:16px}button{margin:8px 8px 0 0;padding:6px 12px}</style></head>
<body><h1>Mock Nettskjema ${key}</h1><p id="page"></p><p id="fields"></p><div id="body"></div>
<button id="back" type="button">Tilbake</button><button id="next" type="button">Neste</button><button id="send" type="button">Send</button>
<p id="receipt" hidden>Takk for svaret. <a id="receipt-link" href="http://localhost:4173/sendt.html">Tilbake til ATLAS</a></p>
<script>
  var pages=${pages}, page=1, sent=false, failOnce=${failOnce ? 'true' : 'false'};
  var params=new URLSearchParams(location.search);
  var fields={}; params.forEach(function(v,k){ if(k.indexOf('CB')===0) fields[k.slice(2)]=v; });
  document.getElementById('fields').textContent=JSON.stringify(fields);
  function post(m){ if(window.parent!==window) window.parent.postMessage(m,'*'); }
  function render(){
    document.getElementById('page').textContent='Side '+page+' av '+pages;
    document.getElementById('body').textContent = pages===3 && page===2 ? 'Stopp her. Gå tilbake til ATLAS og trykk på Vis ATLAS.' : 'Spørsmål på side '+page;
    document.getElementById('next').hidden = page>=pages || sent;
    document.getElementById('send').hidden = page<pages || sent;
    document.getElementById('back').hidden = page===1 || sent;
  }
  document.getElementById('next').onclick=function(){ page++; render(); post('scrollToStart'); };
  document.getElementById('back').onclick=function(){ page--; render(); post('scrollToStart'); };
  document.getElementById('send').onclick=function(){
    if(failOnce){ failOnce=false; post('submitFailed'); return; }
    sent=true; render(); document.getElementById('receipt').hidden=false; post('scrollToStart'); post('submitFinished');
    post({ mock: 'submitted', key: '${key}', fields: fields });
  };
  render(); post(document.body.scrollHeight+50);
  setInterval(function(){ post(document.body.scrollHeight+50); }, 1000);
</script></body></html>`;
}

/** Route the configuration and every nettskjema.no request to the mock. */
export async function mockNettskjema(target: Page | BrowserContext, opts: MockOptions = {}) {
  const failOnce = new Set(opts.failOnce ?? []);
  const forms: Record<string, string> = {};
  for (const k of FORM_KEYS) forms[k] = opts.missing?.includes(k) ? '' : `https://nettskjema.no/a/${encodeURIComponent(k)}`;
  await target.route('**/atlas-config.json*', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ forms, informationLetter: 'https://example.org/info.pdf', contact: { nb: 'Prosjektleder, UiA', en: 'Project lead, UiA' } }) }),
  );
  await target.route('https://nettskjema.no/**', (route) => {
    const url = new URL(route.request().url());
    const key = decodeURIComponent(url.pathname.replace(/^\/a\//, ''));
    const fail = failOnce.has(key);
    failOnce.delete(key);
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: mockHtml(key, fail) });
  });
}

/**
 * The configuration as it was before any form had an address: every form «ikke klart ennå», so review mode gives
 * feedback in its preview forms. For the checks that test that flow, whatever addresses the site holds; any
 * request to nettskjema.no is stopped, so no check ever reaches a live form.
 */
export async function configWithoutForms(target: Page | BrowserContext) {
  const forms: Record<string, string> = {};
  for (const k of FORM_KEYS) forms[k] = '';
  await target.route('**/atlas-config.json*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ forms }) }));
  await target.route('https://nettskjema.no/**', (route) => route.abort());
}

/** Collect the mock's "submitted" messages in the parent page (ATLAS ignores them). */
export async function recordSubmissions(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __submitted: unknown[] }).__submitted = [];
    window.addEventListener('message', (e) => {
      const d = e.data as { mock?: string };
      if (d && typeof d === 'object' && d.mock === 'submitted') (window as unknown as { __submitted: unknown[] }).__submitted.push(d);
    });
  });
}

export async function submissions(page: Page): Promise<{ key: string; fields: Record<string, string> }[]> {
  return page.evaluate(() => (window as unknown as { __submitted: { key: string; fields: Record<string, string> }[] }).__submitted);
}
