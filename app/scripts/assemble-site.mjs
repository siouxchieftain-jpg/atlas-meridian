// Assembles the Pages site in ../site: the built app at the root, and the design tool's Meridian export under meridian/
// with its two React files served from the site instead of unpkg.com. Each file is fetched from the npm registry and
// must match the integrity hash the export pins, or the script fails. The repository's meridian/ is left unchanged.
// Run with `npm run site` after `npm run build`.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..');
const root = join(app, '..');
const dist = join(app, 'dist');
const site = join(root, 'site');
const meridian = join(root, 'meridian');

if (!existsSync(join(dist, 'index.html'))) throw new Error('assemble-site: build the app first (npm run build)');
if (!existsSync(join(meridian, 'support.js'))) throw new Error('assemble-site: meridian/support.js is missing');

rmSync(site, { recursive: true, force: true });
cpSync(dist, site, { recursive: true });
cpSync(meridian, join(site, 'meridian'), { recursive: true });

// The two React files the Meridian runtime loads, with the integrity hashes it pins.
const support = readFileSync(join(meridian, 'support.js'), 'utf8');
function pinned(name) {
  const m = support.match(new RegExp(`var ${name}_URL = "([^"]+)";\\s*var ${name}_SRI = "([^"]+)";`));
  if (!m) throw new Error(`assemble-site: ${name}_URL not found in support.js`);
  const u = m[1].match(/^https:\/\/unpkg\.com\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.+)$/);
  if (!u) throw new Error(`assemble-site: unexpected address ${m[1]}`);
  return { sri: m[2], pkg: u[1], version: u[2], path: u[3], name: u[3].split('/').pop() };
}
const files = [pinned('REACT'), pinned('REACT_DOM')];

const win = process.platform === 'win32';
const tmp = mkdtempSync(join(tmpdir(), 'atlas-site-'));
const vendor = join(site, 'meridian', 'vendor');
mkdirSync(vendor, { recursive: true });
try {
  for (const f of files) {
    const packed = execFileSync(win ? 'npm.cmd' : 'npm', ['pack', `${f.pkg}@${f.version}`, '--silent'], { cwd: tmp, shell: win });
    const tgz = packed.toString().trim().split(/\r?\n/).pop();
    execFileSync('tar', ['-xzf', tgz, `package/${f.path}`], { cwd: tmp });
    const body = readFileSync(join(tmp, 'package', f.path));
    const got = `sha384-${createHash('sha384').update(body).digest('base64')}`;
    if (got !== f.sri) throw new Error(`assemble-site: ${f.pkg}@${f.version}/${f.path} does not match the hash support.js pins`);
    writeFileSync(join(vendor, f.name), body);
    rmSync(join(tmp, 'package'), { recursive: true, force: true });
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// React is on the page before the runtime starts, so the runtime never asks unpkg.com for it.
const tags = files.map((f) => `<script src="./vendor/${f.name}" integrity="${f.sri}" crossorigin="anonymous"></script>`).join('');
const marker = '<script src="./support.js"></script>';
let pages = 0;
for (const name of readdirSync(join(site, 'meridian'))) {
  if (!name.endsWith('.dc.html')) continue;
  const p = join(site, 'meridian', name);
  const html = readFileSync(p, 'utf8');
  if (!html.includes(marker)) throw new Error(`assemble-site: ${name} does not load support.js as expected`);
  writeFileSync(p, html.replace(marker, `${tags}${marker}`));
  pages++;
}
console.log(`assemble-site: the app and meridian/ (${pages} pages, React served from the site) -> ${site}`);
