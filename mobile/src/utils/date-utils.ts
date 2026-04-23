const DAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni',
                'juli', 'august', 'september', 'oktober', 'november', 'desember'];

export function toIsoDate(date: Date): string {
  return (
    date.getFullYear() +
    '-' + String(date.getMonth() + 1).padStart(2, '0') +
    '-' + String(date.getDate()).padStart(2, '0')
  );
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
}

export function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toIsoDate(d);
}

/** "Torsdag 23. april" */
export function formatDateLong(date: Date): string {
  return `${DAYS[date.getDay()]} ${date.getDate()}. ${MONTHS[date.getMonth()]}`;
}

/** "23.04" */
export function formatDateShort(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}.${month}`;
}

export function dayName(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  return DAYS[d.getUTCDay()];
}
