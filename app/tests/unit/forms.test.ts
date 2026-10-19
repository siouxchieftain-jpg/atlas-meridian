import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFormUrl, formKeyFor, prefersNewTab, stegValue, studyLocked } from '../../src/engine/forms';
import { instrument } from '../../src/content';
import type { FormStep } from '../../src/state/types';

describe('steg', () => {
  it('is the step, with -etter only for a case form opened after «Vis ATLAS» in its own case', () => {
    expect(stegValue('S3', {})).toBe('S3');
    expect(stegValue('S3', { kari: true })).toBe('S3-etter');
    expect(stegValue('S4', { kari: true })).toBe('S4');
    expect(stegValue('S4', { erlend: true })).toBe('S4-etter');
    expect(stegValue('S5', { astrid: true })).toBe('S5-etter');
    expect(stegValue('S1', { kari: true, erlend: true, astrid: true })).toBe('S1');
    expect(stegValue('S6', { kari: true })).toBe('S6');
  });
});

describe('form keys', () => {
  it('picks the role variant where the instrument has one', () => {
    expect(formKeyFor('S1', 'gp')).toBe('S1');
    expect(formKeyFor('S2', 'gp')).toBe('S2.fastlege');
    expect(formKeyFor('S2', 'dps')).toBe('S2.dps');
    expect(formKeyFor('S3', 'dps')).toBe('S3');
    expect(formKeyFor('S4', 'dps')).toBe('S4.dps');
    expect(formKeyFor('S5', 'gp')).toBe('S5.fastlege');
    expect(formKeyFor('S7', 'gp')).toBe('S7.fastlege');
    expect(formKeyFor('S8', 'dps')).toBe('S8');
  });
});

describe('locked context', () => {
  it('sends rolle, intervju, studienavn, steg, vignett and versjon for a case form', () => {
    expect(studyLocked('S3', 'fastlege', 'Nei', { kari: true }, 'Rolig elg 27')).toEqual({
      rolle: 'Fastlege',
      intervju: 'Nei',
      studienavn: 'Rolig elg 27',
      steg: 'S3-etter',
      vignett: 'V1',
      versjon: expect.stringMatching(/^3\.5\.0-/),
    });
  });

  it('sends no study name before one exists, and sends it as typed once it does', () => {
    expect(buildFormUrl('https://nettskjema.no/a/1', studyLocked('S1', 'fastlege', 'Nei', {}), true)).not.toContain('CBstudienavn');
    const url = buildFormUrl('https://nettskjema.no/a/1', studyLocked('S1', 'fastlege', 'Nei', {}, 'Stødig ørn 41'), true);
    expect(url).toContain(`CBstudienavn=${encodeURIComponent('Stødig ørn 41')}&LCKstudienavn=true`);
  });

  it('maps both DPS choices to DPS-inntak and a missing interview answer to «Vil ikke svare»', () => {
    expect(studyLocked('S1', 'dps-kliniker', undefined, {}).rolle).toBe('DPS-inntak');
    expect(studyLocked('S1', 'annen', undefined, {})).toMatchObject({ rolle: 'DPS-inntak', intervju: 'Vil ikke svare', steg: 'S1' });
    expect(studyLocked('S1', 'annen', undefined, {}).vignett).toBeUndefined();
  });

  it('never guesses a role: no choice sends no rolle at all', () => {
    const fields = studyLocked('S1', undefined, undefined, {});
    expect(fields.rolle).toBe('');
    expect(buildFormUrl('https://nettskjema.no/a/1', fields, true)).not.toContain('CBrolle');
  });

  it('matches the locked list of every form in the instrument (the Nettskjema build sheet)', () => {
    const steps: [FormStep, 'gp' | 'dps'][] = [
      ['S1', 'gp'], ['S2', 'gp'], ['S2', 'dps'], ['S3', 'gp'], ['S4', 'gp'], ['S4', 'dps'], ['S5', 'gp'], ['S5', 'dps'], ['S6', 'gp'], ['S7', 'gp'], ['S8', 'gp'],
    ];
    for (const [step, role] of steps) {
      const key = formKeyFor(step, role);
      const form = instrument.forms.find((f) => f.key === key);
      expect(form, key).toBeDefined();
      const sent = Object.keys(studyLocked(step, role === 'gp' ? 'fastlege' : 'dps-kliniker', 'Ja', {}, 'Glad hval 63'));
      expect([...sent].sort(), key).toEqual([...form!.locked].sort());
    }
  });
});

describe('form address', () => {
  const locked = { rolle: 'DPS-inntak', side: 'fastlege/konsultasjon', seksjon: 'hele', tom: '', versjon: '3.0.0-abc1234' };

  it('locks every field with CB and LCK, encoded with encodeURIComponent (never + for a space)', () => {
    const url = buildFormUrl('https://nettskjema.no/a/123456', { ...locked, intervju: 'Vil ikke svare' }, true);
    expect(url.startsWith('https://nettskjema.no/a/123456?embed=1&')).toBe(true);
    expect(url).toContain('CBside=fastlege%2Fkonsultasjon&LCKside=true');
    expect(url).toContain('CBintervju=Vil%20ikke%20svare');
    expect(url).not.toContain('+');
    expect(url).not.toContain('CBtom');
    const params = new URL(url).searchParams;
    expect(params.get('CBrolle')).toBe('DPS-inntak');
    expect(params.get('LCKversjon')).toBe('true');
  });

  it('never carries embed=1 on the new-tab address, and appends to an address that has a query', () => {
    const tab = buildFormUrl('https://nettskjema.no/a/123456?lang=nb', locked, false);
    expect(tab).not.toContain('embed=1');
    expect(tab.startsWith('https://nettskjema.no/a/123456?lang=nb&CBrolle=')).toBe(true);
  });
});

describe('new-tab route', () => {
  afterEach(() => vi.unstubAllGlobals());
  const ua = (s: string) => vi.stubGlobal('navigator', { userAgent: s });

  it('starts Safari and iOS browsers on the tab route, and not Chrome, Edge or Firefox', () => {
    ua('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15');
    expect(prefersNewTab()).toBe(true);
    ua('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1');
    expect(prefersNewTab()).toBe(true);
    ua('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0');
    expect(prefersNewTab()).toBe(false);
    ua('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');
    expect(prefersNewTab()).toBe(false);
    ua('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0');
    expect(prefersNewTab()).toBe(false);
  });
});
