import { describe, expect, it } from 'vitest';
import { DPS_TODAY, GP_TODAY, addWorkingDays, daysBetween, isWeekday, laterOf } from '../../src/engine/clock';
import { cases } from '../../src/content';
import type { CaseId } from '../../src/content/types';

const weekday = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

describe('the fictional clock', () => {
  it('sets the GP on Tuesday 17 March 2026 and DPS on the day after', () => {
    expect(weekday(GP_TODAY)).toBe(2);
    expect(weekday(DPS_TODAY)).toBe(3);
    expect(daysBetween(GP_TODAY, DPS_TODAY)).toBe(1);
  });

  it('counts working days over weekends', () => {
    expect(addWorkingDays('2026-03-17', 10)).toBe('2026-03-31');
    expect(addWorkingDays('2026-03-02', 10)).toBe('2026-03-16');
    expect(addWorkingDays('2026-03-20', 1)).toBe('2026-03-23');
    expect(isWeekday('2026-03-21')).toBe(false);
    expect(isWeekday('2026-03-22')).toBe(false);
    expect(isWeekday('2026-03-23')).toBe(true);
  });

  it('counts calendar days across the change to summer time', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-03-17', '2026-03-31')).toBe(14);
  });

  it('takes the latest date, and today when there is none', () => {
    expect(laterOf('2026-03-17', undefined, '2026-03-23', '2026-03-20')).toBe('2026-03-23');
    expect(laterOf()).toBe(GP_TODAY);
  });
});

describe('dates in the cases', () => {
  const ids: CaseId[] = ['kari', 'erlend', 'astrid', 'torbjorn', 'sofie'];

  it('puts every scripted message, note and referral on a working day', () => {
    for (const id of ids) {
      const c = cases[id];
      const dates: [string, string][] = [[`${id} note`, c.gp.note.date]];
      for (const [k, v] of Object.entries(c.gp.dpsScript ?? {})) if (v && typeof v === 'object' && 'date' in v) dates.push([`${id} dpsScript.${k}`, v.date as string]);
      for (const [k, v] of Object.entries(c.dps?.gpScript ?? {})) if (v && typeof v === 'object' && 'date' in v) dates.push([`${id} gpScript.${k}`, v.date as string]);
      if (c.dps) dates.push([`${id} referral.sent`, c.dps.referral.sent], [`${id} referral.received`, c.dps.referral.received]);
      for (const [label, d] of dates) expect(isWeekday(d), `${label} ${d}`).toBe(true);
    }
  });

  it('sets each DPS deadline ten working days after receipt', () => {
    for (const id of ids) {
      const d = cases[id].dps;
      if (!d) continue;
      expect(d.referral.deadline, id).toBe(addWorkingDays(d.referral.received, 10));
      expect(d.referral.received >= d.referral.sent, id).toBe(true);
    }
  });

  it('never dates an answer before what it answers', () => {
    const kari = cases.kari.gp.dpsScript;
    expect(kari.request!.date >= GP_TODAY).toBe(true);
    expect(kari.grant!.date >= kari.request!.date).toBe(true);
    expect(cases.erlend.gp.dpsScript.grant!.date >= GP_TODAY).toBe(true);
    for (const id of ['kari', 'erlend', 'sofie'] as const) {
      const gs = cases[id].dps!.gpScript;
      if (gs.replyToRequest) expect(gs.replyToRequest.date >= DPS_TODAY, `${id} reply`).toBe(true);
      if (gs.ackOfReturn) expect(gs.ackOfReturn.date >= DPS_TODAY, `${id} ack`).toBe(true);
    }
    const astrid = cases.astrid;
    expect(astrid.gp.dpsScript.return!.date >= astrid.gp.firstReferral!.sent).toBe(true);
    expect(astrid.gp.dpsScript.answer!.date >= astrid.dps!.gpScript.question!.date).toBe(true);
    expect(astrid.dps!.gpScript.question!.date >= astrid.gp.dpsScript.return!.date).toBe(true);
  });
});
