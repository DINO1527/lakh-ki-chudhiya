const COLOMBO_OFFSET_MINUTES = 5 * 60 + 30;

export function colomboDateTimeLocalToUtc(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+05:30`);
  if (Number.isNaN(date.getTime())) return null;
  const utc = date.toISOString();
  return utcToColomboDateTimeLocal(utc) === value ? utc : null;
}

export function utcToColomboDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "";
  return new Date(timestamp.getTime() + COLOMBO_OFFSET_MINUTES * 60_000).toISOString().slice(0, 16);
}
