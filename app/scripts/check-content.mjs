#!/usr/bin/env node
/**
 * Content checks, run before every build and in the Pages workflow.
 * 1. Schema: the content files have the shape the app reads (ajv).
 * 2. Language: every text exists in Norwegian and English.
 * 3. Copy rules: no em dash; no advice in ATLAS's own voice; no «vi» in the
 *    interface and guide texts; retired sentences and names never return.
 * 4. Instrument and configuration: every form exists, codebook names are
 *    valid and unique, vignette forms have three pages with the stop page.
 * 5. Reused text: every sources.json entry, with its declared substitutions,
 *    still reproduces the text at its path.
 * Exit code 1 on any failure.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = join(root, 'src', 'content');
const errors = [];
const fail = (msg) => errors.push(msg);

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`${relative(root, p)}: not valid JSON (${e.message})`);
    return null;
  }
};

const files = {};
for (const f of readdirSync(contentDir)) if (f.endsWith('.json')) files[f] = readJson(join(contentDir, f));
const cases = {};
for (const f of readdirSync(join(contentDir, 'cases'))) if (f.endsWith('.json')) cases[f.replace('.json', '')] = readJson(join(contentDir, 'cases', f));

/* ---------- 1. Schema ---------- */

const T = { type: 'object', required: ['nb', 'en'], additionalProperties: false, properties: { nb: { type: 'string' }, en: { type: 'string' } } };
const rows = { type: 'array', items: { type: 'object', required: ['label', 'value'], properties: { label: T, value: T } } };
const briefing = { type: 'object', required: ['task', 'rows', 'time'], properties: { task: T, rows, time: T } };
const iso = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' };
const sections = { type: 'object', required: ['aktuelt', 'tidligere', 'funksjon', 'risiko', 'sporsmal'] };
const reading = { type: 'object', required: ['placement', 'summary', 'reasoning'], properties: { placement: { type: 'number', minimum: 0, maximum: 100 }, summary: T, reasoning: T } };
const debrief = { type: 'object', required: ['title', 'whatHappened', 'purpose'], properties: { title: T, whatHappened: T, purpose: T } };

const caseSchema = {
  type: 'object',
  required: ['id', 'vignette', 'patient', 'gp', 'debrief'],
  properties: {
    id: { enum: ['kari', 'erlend', 'astrid', 'torbjorn', 'sofie'] },
    vignette: { enum: ['V1', 'V2', 'V3', 'V4', 'practice'] },
    patient: { type: 'object', required: ['name', 'age', 'initials', 'fnr'] },
    draftFlag: T,
    gp: {
      type: 'object',
      required: ['timeliste', 'briefing', 'atlasTask', 'profile', 'note', 'selfReport', 'meds', 'history', 'dpsScript'],
      properties: {
        briefing,
        atlasTask: T,
        note: { type: 'object', required: ['date', 'text'], properties: { date: iso, text: T } },
        systemReading: reading,
        referralDraft: sections,
        history: { type: 'array', items: { type: 'object', required: ['date', 'text'], properties: { date: iso, text: T } } },
      },
    },
    dps: {
      type: 'object',
      required: ['queue', 'briefing', 'atlasTask', 'referral', 'guideAsReceived', 'gpScript'],
      properties: {
        briefing,
        atlasTask: T,
        referral: { type: 'object', required: ['sent', 'received', 'deadline', 'sections', 'noteAttachment'], properties: { sent: iso, received: iso, deadline: iso, sections } },
        systemReading: reading,
      },
    },
    debrief: { type: 'object', required: ['gp'], properties: { gp: debrief, dps: debrief } },
  },
};

const tourStep = {
  type: 'object',
  required: ['id', 'title', 'body', 'reason', 'frame'],
  properties: { id: { type: 'string' }, title: T, body: T, reason: T, frame: { type: 'string' }, tryIt: T, bridge: T },
};
const tourSide = { type: 'object', required: ['parts'], properties: { parts: { type: 'array', items: { type: 'object', required: ['title', 'steps'], properties: { title: T, steps: { type: 'array', maxItems: 4, items: tourStep } } } } } };
const tourSchema = { type: 'object', required: ['gp', 'dps', 'closing'], properties: { gp: tourSide, dps: tourSide } };

const item = {
  type: 'object',
  required: ['id', 'type', 'codebook', 'text', 'required'],
  properties: {
    type: { enum: ['locked', 'agree7', 'confidence7', 'helpful7', 'nps11', 'clarity5', 'importance3', 'choice', 'text', 'longtext', 'stop', 'consent'] },
    codebook: { type: 'string', pattern: '^[a-z0-9_]+$' },
    text: T,
  },
};
const instrumentSchema = {
  type: 'object',
  required: ['consentLine', 'privacyLine', 'lockedHeading', 'forms'],
  properties: {
    forms: { type: 'array', items: { type: 'object', required: ['key', 'title', 'intro', 'locked', 'pages', 'receipt'], properties: { title: T, intro: T, receipt: T, pages: { type: 'array', items: { type: 'object', required: ['items'], properties: { items: { type: 'array', items: item } } } } } } },
  },
};
const stringsSchema = { type: 'object', additionalProperties: T };

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = (name, schema, data) => {
  if (!data) return;
  const v = ajv.compile(schema);
  if (!v(data)) for (const e of v.errors ?? []) fail(`${name}${e.instancePath}: ${e.message}`);
};
for (const [id, c] of Object.entries(cases)) validate(`cases/${id}.json`, caseSchema, c);
validate('tour.json', tourSchema, files['tour.json']);
validate('instrument.json', instrumentSchema, files['instrument.json']);
validate('strings.json', stringsSchema, files['strings.json']);

/* ---------- 2. Language: every text in both languages ---------- */

const allowedEmpty = (path) => /\.referralDraft\.[a-z]+\.text$/.test(path);
function walk(o, path, visit) {
  if (Array.isArray(o)) o.forEach((v, i) => walk(v, `${path}[${i}]`, visit));
  else if (o && typeof o === 'object') {
    if ('nb' in o && 'en' in o && Object.keys(o).length === 2) visit(o, path);
    else for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`, visit);
  }
}
const texts = [];
const collect = (name, data) =>
  walk(data, name, (t, path) => {
    texts.push({ file: name, path, t });
    const nbEmpty = typeof t.nb !== 'string' || t.nb.trim() === '';
    const enEmpty = typeof t.en !== 'string' || t.en.trim() === '';
    if (nbEmpty !== enEmpty) fail(`${path}: only one language is filled in`);
    else if (nbEmpty && !allowedEmpty(path) && name !== 'sources.json') fail(`${path}: empty text`);
  });
for (const [f, data] of Object.entries(files)) if (f !== 'sources.json') collect(f, data);
for (const [id, c] of Object.entries(cases)) collect(`cases/${id}.json`, c);

/* ---------- 3. Copy rules ---------- */

const EM = '—';
for (const { path, t } of texts) {
  if (`${t.nb}${t.en}`.includes(EM)) fail(`${path}: em dash`);
}
// Source files and the static receipt page: no em dash in anything written for this build.
const walkFiles = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
};
for (const p of [...walkFiles(join(root, 'src')), ...walkFiles(join(root, 'public'))]) {
  if (!/\.(tsx?|html|css|json|svg)$/.test(p) || p.endsWith('sources.json')) continue;
  if (readFileSync(p, 'utf8').includes(EM)) fail(`${relative(root, p)}: em dash`);
}

// Advice in ATLAS's own voice (B3). The instrument is the questionnaire's wording (E-05 keeps «anbefalt» verbatim).
const advice = [/\bAnbefalt\b/, /\bdu bør\b/i, /\bvi anbefaler\b/i, /\brecommended\b/i, /\byou should\b/i];
for (const { file, path, t } of texts) {
  if (file === 'instrument.json') continue;
  for (const re of advice) if (re.test(t.nb) || re.test(t.en)) fail(`${path}: advice wording (${re})`);
}
// Study and guide texts speak for «prosjektet», never «vi» (Constraints).
const voiceFiles = new Set(['strings.json', 'tour.json', 'glossary.json', 'notes.json']);
for (const { file, path, t } of texts) {
  if (!voiceFiles.has(file)) continue;
  if (/(^|[^\p{L}])vi([^\p{L}]|$)/iu.test(t.nb)) fail(`${path}: «vi» in a study or guide text`);
  if (/(^|[^\p{L}])we([^\p{L}]|$)/iu.test(t.en)) fail(`${path}: "we" in a study or guide text`);
}
// Dates in running text are written in words (G-27); a field that holds only a
// date is formatted by the app, and a medicines period is a table column.
const isoInText = /\d{4}-\d{2}(-\d{2})?/;
for (const { path, t } of texts) {
  if (/\.period$/.test(path)) continue;
  for (const v of [t.nb, t.en]) if (isoInText.test(v) && !/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(`${path}: a date in running text is not written in words`);
}
// Sentences that contradict the system reading, and names that must not return (F-12).
const retired = ['ATLAS regner ikke ut eller scorer pasienter', 'Systemet beregner ikke dette', 'Ingrid Moe', 'Jonas Lie', 'kompletthetsguiden'];
for (const { path, t } of texts) for (const r of retired) if (`${t.nb} ${t.en}`.toLowerCase().includes(r.toLowerCase())) fail(`${path}: retired text «${r}»`);

/* ---------- 4. Instrument and configuration ---------- */

const FORM_KEYS = ['S1', 'S2.fastlege', 'S2.dps', 'S3', 'S4.fastlege', 'S4.dps', 'S5.fastlege', 'S5.dps', 'S6', 'S7.fastlege', 'S8', 'R1', 'R2'];
const instrument = files['instrument.json'];
if (instrument) {
  const keys = instrument.forms.map((f) => f.key);
  for (const k of FORM_KEYS) if (!keys.includes(k)) fail(`instrument.json: form ${k} is missing`);
  for (const f of instrument.forms) {
    const seen = new Set();
    for (const p of f.pages) for (const it of p.items) {
      if (seen.has(it.codebook)) fail(`instrument.json ${f.key}: codebook «${it.codebook}» is used twice`);
      seen.add(it.codebook);
      if (/[æøå]/i.test(it.codebook)) fail(`instrument.json ${f.key}: codebook «${it.codebook}» has æ, ø or å`);
      if ((it.type === 'agree7' || it.type === 'confidence7' || it.type === 'helpful7' || it.type === 'nps11') && !it.anchors) fail(`instrument.json ${f.key} ${it.id}: scale without anchors`);
      if ((it.type === 'choice' || it.type === 'importance3') && !(it.options && it.options.length)) fail(`instrument.json ${f.key} ${it.id}: choice without options`);
      if (it.type === 'consent' && !(it.required && it.options && it.options.length === 1)) fail(`instrument.json ${f.key} ${it.id}: the consent tick box must be required and have exactly one option`);
    }
    const lockedItems = f.pages.flatMap((p) => p.items).filter((it) => it.type === 'locked').map((it) => it.codebook);
    for (const l of f.locked) if (!lockedItems.includes(l)) fail(`instrument.json ${f.key}: locked field «${l}» has no item`);
    for (const l of lockedItems) if (!f.locked.includes(l)) fail(`instrument.json ${f.key}: locked item «${l}» is not in the form's locked list`);
    if (/^S[345]/.test(f.key)) {
      if (f.pages.length !== 3) fail(`instrument.json ${f.key}: a vignette form has ${f.pages.length} pages, not 3`);
      else if (!(f.pages[1].items.length === 1 && f.pages[1].items[0].type === 'stop')) fail(`instrument.json ${f.key}: page 2 is not the stop page`);
    }
  }
}
const config = readJson(join(root, 'public', 'atlas-config.json'));
if (config) for (const k of FORM_KEYS) if (!(k in (config.forms ?? {}))) fail(`public/atlas-config.json: form ${k} is missing`);

/* ---------- 5. Reused text: sources.json reproduces the app text ---------- */
// Every entry names a text the build reuses from the earlier prototype or the
// vault. Its original, with the declared substitutions applied in order, must
// equal the text at the path. A text that is no longer reused verbatim leaves
// the list; a text that changed in an allowed way declares the substitution.
const ALLOWED_SUBSTITUTIONS = new Map([
  ['2026-03-24→2026-03-31', 'date moved to the canon (vurderingsfrist)'],
  ['2026-03-10→2026-03-17', 'date moved to the canon (the prototype clock)'],
  ['2025-10-28→2025-10-29', 'date moved to the canon (Erlend, earlier referral)'],
  ['2026-02-14→2026-02-13', 'date moved to the canon (Erlend, Rask psykisk helsehjelp ended)'],
  ['2026-03-01→2026-03-02', 'date moved to the canon (Astrid, referral sent)'],
  ['2026-03-15→2026-03-16', 'date moved to the canon (Astrid, return)'],
  ['–→ til ', 'en dash replaced (range, Norwegian)'],
  ['–→ to ', 'en dash replaced (range, English)'],
  ['–→ til nå', 'en dash replaced (open period, Norwegian)'],
  ['Vignetten→Saken', 'research word replaced on a clinical screen (Norwegian)'],
  ['vignette→case', 'research word replaced on a clinical screen (English)'],
  [' %→%', 'English typography: no space before the per cent sign'],
]);
// A date written in words in running text («31. mars 2026», "31 March 2026",
// «desember 2025») is also allowed: the same date, only its format changes.
const NB_MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateInWords = (a, b) => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(a);
  if (!m) return false;
  const [, y, mo, d] = m;
  const i = Number(mo) - 1;
  const forms = d
    ? [`${Number(d)}. ${NB_MONTHS[i]} ${y}`, `${Number(d)} ${EN_MONTHS[i]} ${y}`]
    : [`${NB_MONTHS[i]} ${y}`, `${EN_MONTHS[i]} ${y}`];
  return forms.includes(b);
};
// English typography: a quotation in straight double quotes set in curly ones, the words unchanged (r7F-07).
const curlyQuotes = (a, b) => /^"[^"]+"$/.test(a) && b === `“${a.slice(1, -1)}”`;
const allowedSubstitution = (a, b) => ALLOWED_SUBSTITUTIONS.has(`${a}→${b}`) || dateInWords(a, b) || curlyQuotes(a, b);
// A sentence added after the reused text is declared in «appended»; it is new
// text for this build and is listed in docs/CLINICIAN-CHECK.md.
const resolve = (data, dotted) => {
  let o = data;
  for (const part of dotted.split('.')) {
    if (o === null || typeof o !== 'object' || !(part in o)) return undefined;
    o = o[part];
  }
  return o;
};
const sources = files['sources.json'];
let reused = 0;
if (Array.isArray(sources)) {
  const seenPaths = new Set();
  sources.forEach((e, i) => {
    const at = `sources.json[${i}] ${e.path}`;
    if (seenPaths.has(e.path)) fail(`${at}: path listed twice`);
    seenPaths.add(e.path);
    if (e.source !== 'prototype' && e.source !== 'vault') fail(`${at}: unknown source «${e.source}»`);
    const [file, dotted] = String(e.path).split('#');
    const data = file.startsWith('cases/') ? cases[file.slice(6).replace('.json', '')] : files[file];
    if (!data || !dotted) return fail(`${at}: unknown file`);
    const actual = resolve(data, dotted);
    if (typeof actual !== 'string') return fail(`${at}: no text at this path`);
    let value = e.original;
    for (const [a, b] of e.substitutions ?? []) {
      if (!allowedSubstitution(a, b)) fail(`${at}: undeclared substitution «${a}» → «${b}»`);
      if (!value.includes(a)) fail(`${at}: substitution «${a}» does not occur`);
      value = value.split(a).join(b);
    }
    if (e.appended !== undefined) value += e.appended;
    if (value !== actual) fail(`${at}: the original with its substitutions no longer reproduces the app text`);
    else reused += 1;
  });
}

/* ---------- Report ---------- */

if (errors.length) {
  console.error(`check-content: ${errors.length} problem(s)`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-content: PASS (${texts.length} texts, ${Object.keys(cases).length} cases, ${instrument?.forms.length ?? 0} forms, ${reused} reused texts reproduced)`);
