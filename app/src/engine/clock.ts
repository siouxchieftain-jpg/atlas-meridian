/** The fictional clock (Appendix C). */
export const GP_TODAY = '2026-03-17';
export const DPS_TODAY = '2026-03-18';

export function todayFor(role: 'gp' | 'dps'): string {
  return role === 'gp' ? GP_TODAY : DPS_TODAY;
}

/** The later of ISO dates (a message never predates the one it answers). */
export function laterOf(...dates: (string | undefined)[]): string {
  return dates.filter((d): d is string => !!d).sort().at(-1) ?? GP_TODAY;
}

export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function isWeekday(iso: string): boolean {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return d >= 1 && d <= 5;
}

/** Ten working days after receipt (no public holidays fall in March 2026). */
export function addWorkingDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd >= 1 && wd <= 5) left -= 1;
  }
  return d.toISOString().slice(0, 10);
}
