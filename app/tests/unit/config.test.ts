import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfig, loadConfig } from '../../src/engine/forms';

describe('atlas-config.json', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('treats an empty or blank address as «not ready», trims the rest, and drops blank contact and letter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            forms: { S1: '  https://nettskjema.no/a/111  ', S3: '', R1: '   ', R2: 42 },
            informationLetter: '   ',
            contact: { nb: ' ', en: '' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    const config = await loadConfig();
    expect(config.forms).toEqual({ S1: 'https://nettskjema.no/a/111' });
    expect(config.informationLetter).toBeUndefined();
    expect(config.contact).toBeUndefined();
    expect(getConfig()).toBe(config);
  });
});
