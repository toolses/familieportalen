/**
 * Returns ISO date strings (YYYY-MM-DD) for Monday through Friday
 * of the given ISO week number and year.
 */
export function getDatesOfWeek(week: number, year: number): string[] {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  // Find Monday of week 1
  const dayOfWeek = jan4.getUTCDay() || 7; // Convert Sunday=0 to 7
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);

  // Target Monday = mondayWeek1 + (week - 1) * 7 days
  const targetMonday = new Date(mondayWeek1);
  targetMonday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);

  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(targetMonday);
    d.setUTCDate(targetMonday.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to Norwegian display format (DD.MM).
 */
export function formatDateShort(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}.${month}`;
}

/**
 * Returns the Norwegian day name for an ISO date string.
 */
export function dayName(isoDate: string): string {
  const names = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const d = new Date(isoDate + 'T00:00:00Z');
  return names[d.getUTCDay()];
}
