// Per-building hour overrides for cases the default "weekday 8am–10pm, weekends
// closed" assumption can't express — e.g. a building that closes early on
// Fridays or keeps its own weekend hours. Overrides are date-bounded so they
// only apply during the relevant window and revert to the stored hours outside
// it; standing hours use a wide always-on window.
//
// This module is pure (no server-only deps), so it's the single source of
// truth shared by the server availability engine and the client UI.

export interface DayHours {
  open: string; // "HH:MM:SS"
  close: string; // "HH:MM:SS"
}

interface HoursOverride {
  start: string; // inclusive "YYYY-MM-DD", campus-local
  end: string; // inclusive
  // Index 0..6 = Sun..Sat; null = closed that day.
  days: (DayHours | null)[];
}

const BUILDING_HOURS_OVERRIDES: Record<string, HoursOverride[]> = {
  // Horn Center — official study-space hours: Mon–Thu 8 AM–10 PM, Fri 8 AM–5 PM,
  // closed weekends. (Mon–Thu match the flat 10 PM default; the override exists
  // for the early Friday close and to pin weekends closed.)
  HC: [
    {
      start: '2000-01-01',
      end: '2100-01-01',
      days: [
        null, // Sun
        { open: '08:00:00', close: '22:00:00' }, // Mon
        { open: '08:00:00', close: '22:00:00' }, // Tue
        { open: '08:00:00', close: '22:00:00' }, // Wed
        { open: '08:00:00', close: '22:00:00' }, // Thu
        { open: '08:00:00', close: '17:00:00' }, // Fri
        null, // Sat
      ],
    },
  ],
  // University Library — Sun 12–8, Mon–Thu 8–10, Fri 8–5, Sat 10–4. Not a real
  // building row; the library feature reads these via effectiveHours('LIB').
  LIB: [
    {
      start: '2000-01-01',
      end: '2100-01-01',
      days: [
        { open: '12:00:00', close: '20:00:00' }, // Sun
        { open: '08:00:00', close: '22:00:00' }, // Mon
        { open: '08:00:00', close: '22:00:00' }, // Tue
        { open: '08:00:00', close: '22:00:00' }, // Wed
        { open: '08:00:00', close: '22:00:00' }, // Thu
        { open: '08:00:00', close: '17:00:00' }, // Fri
        { open: '10:00:00', close: '16:00:00' }, // Sat
      ],
    },
  ],
};

// `date`'s campus-local calendar day as "YYYY-MM-DD". Callers pass a Date whose
// local fields already hold campus wall-clock time (as availability.ts does).
function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Effective open/close for this building on `date`'s day, or null if it's
// closed that day. Falls back to the stored weekday hours (weekends closed)
// when no override applies.
export function effectiveHours(
  code: string | null | undefined,
  weekdayOpen: string | null,
  weekdayClose: string | null,
  date: Date
): DayHours | null {
  const dow = date.getDay();

  const overrides = code ? BUILDING_HOURS_OVERRIDES[code] : undefined;
  if (overrides) {
    const today = localDateStr(date);
    const active = overrides.find((o) => o.start <= today && today <= o.end);
    if (active) return active.days[dow];
  }

  // Default: closed on weekends, stored hours on weekdays.
  if (dow === 0 || dow === 6) return null;
  if (!weekdayOpen || !weekdayClose) return null;
  return { open: weekdayOpen, close: weekdayClose };
}

// The next instant the building opens, walking forward up to 8 days from `from`.
// Respects overrides (e.g. HC closed Friday → next opening is Monday).
export function nextOpeningDate(
  code: string | null | undefined,
  weekdayOpen: string | null,
  weekdayClose: string | null,
  from: Date
): Date | null {
  for (let offset = 0; offset <= 8; offset++) {
    const d = new Date(from);
    d.setDate(from.getDate() + offset);
    const hrs = effectiveHours(code, weekdayOpen, weekdayClose, d);
    if (!hrs) continue;
    const [h, m] = hrs.open.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    if (d > from) return d;
  }
  return null;
}
