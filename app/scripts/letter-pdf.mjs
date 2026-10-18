// Prints the information letter (public/informasjonsskriv.html) to PDF, one file per language, for invitations and for
// «Last ned PDF» on the letter's page. Run after changing the letter: npm run letter
//
//   public/informasjonsskriv.pdf     Norwegian
//   public/information-letter.pdf    English
//
// Nothing to install: the script drives a Chromium browser that is already there, over the DevTools protocol. On
// Windows that is Microsoft Edge, where Segoe UI is: print the published PDFs there. ATLAS_BROWSER names another
// browser, for example Playwright's Chromium for a check on Linux (where a stand-in font prints).
//
// The PDFs are tagged (headings, lists and links can be read by assistive technology), carry an outline, and every
// page has the letter's name and «Side x av y» from the page's own print styles.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const letter = pathToFileURL(join(pub, 'informasjonsskriv.html')).href;
const out = { nb: 'informasjonsskriv.pdf', en: 'information-letter.pdf' };

function findBrowser() {
  if (process.env.ATLAS_BROWSER) return process.env.ATLAS_BROWSER;
  const candidates = {
    win32: ['C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'],
    darwin: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  }[process.platform] ?? ['/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('letter: no browser found. Set ATLAS_BROWSER to an Edge or Chromium executable.');
  return found;
}

const profile = mkdtempSync(join(tmpdir(), 'atlas-letter-'));
const flags = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions'];
// Chromium refuses its sandbox to the root user, as in a container.
if (process.platform === 'linux' && process.getuid?.() === 0) flags.push('--no-sandbox');
const browser = spawn(findBrowser(), [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const exited = new Promise((resolve) => browser.once('exit', resolve));

try {
  const endpoint = await new Promise((resolve, reject) => {
    let said = '';
    const timer = setTimeout(() => reject(new Error('letter: the browser did not start within 30 seconds')), 30_000);
    browser.stderr.on('data', (chunk) => {
      said += chunk;
      const m = said.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
    browser.once('exit', (code) => reject(new Error(`letter: the browser stopped (exit code ${code})\n${said.trim().split('\n').slice(-5).join('\n')}`)));
  });

  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('letter: could not connect to the browser'));
  });
  let lastId = 0;
  const waiting = new Map();
  const listeners = new Set();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      if (msg.error) reject(new Error(`letter: ${msg.error.message}`));
      else resolve(msg.result);
    } else for (const listen of listeners) listen(msg);
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++lastId;
      waiting.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  const next = (method, sessionId) =>
    new Promise((resolve) => {
      const listen = (msg) => {
        if (msg.method === method && msg.sessionId === sessionId) {
          listeners.delete(listen);
          resolve(msg.params);
        }
      };
      listeners.add(listen);
    });

  for (const [lang, file] of Object.entries(out)) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    const loaded = next('Page.loadEventFired', sessionId);
    // The page reads #nb or #en as it loads and shows that language.
    await send('Page.navigate', { url: `${letter}#${lang}` }, sessionId);
    await loaded;
    await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => document.documentElement.lang)', awaitPromise: true }, sessionId);
    const { data } = await send(
      'Page.printToPDF',
      { printBackground: true, preferCSSPageSize: true, generateTaggedPDF: true, generateDocumentOutline: true },
      sessionId,
    );
    writeFileSync(join(pub, file), Buffer.from(data, 'base64'));
    console.log(`letter: ${lang} -> public/${file}`);
    await send('Target.closeTarget', { targetId });
  }
  await send('Browser.close').catch(() => undefined);
  ws.close();
} finally {
  if (browser.exitCode === null) browser.kill();
  await exited;
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // The browser may still hold its profile for a moment; it is a temporary folder.
  }
}
