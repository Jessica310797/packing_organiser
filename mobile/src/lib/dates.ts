const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function formatDateRange(start: string, end: string): string {
  if (!start) return "";
  if (!end || end === start) return formatDate(start);
  const startYear = start.split("-")[0];
  const endYear = end.split("-")[0];
  if (startYear === endYear) {
    const [, m, d] = start.split("-").map(Number);
    const [ye, me, de] = end.split("-").map(Number);
    return `${d} ${MONTHS[(m ?? 1) - 1]} – ${de} ${MONTHS[(me ?? 1) - 1]} ${ye}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Adds `days` to an ISO date, returning a new ISO date string. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** e.g. "Fri 16 Oct" -- used for itinerary day cards. */
export function formatDateWithWeekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return `${WEEKDAYS[date.getDay()]} ${d} ${MONTHS[(m ?? 1) - 1]}`;
}

/** True while today falls on/before the trip's end date -- upcoming or in progress. */
export function isTripCurrent(endDateIso: string): boolean {
  return endDateIso >= todayIso();
}

export function isTripPast(endDateIso: string): boolean {
  return !isTripCurrent(endDateIso);
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
