// Per-building hour overrides for cases the scraper's flat "weekday 8am–10pm,
// weekends closed" assumption can't express — e.g. a building that's closed on
// Fridays or closes earlier during the summer. Overrides are date-bounded so
// they only apply during the relevant term and revert to the stored hours
// outside that window.
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

const SUMMER_8_5: DayHours = { open: '08:00:00', close: '17:00:00' };

const BUILDING_HOURS_OVERRIDES: Record<string, HoursOverride[]> = {
  // Horn Center — Summer 2026: Mon–Thu 8 AM–5 PM, Fri–Sun closed.
  HC: [
    {
      start: '2026-05-18',
      end: '2026-08-24',
      days: [null, SUMMER_8_5, SUMMER_8_5, SUMMER_8_5, SUMMER_8_5, null, null],
    },
  ],
  // University Library — Mon–Thu 8–8, Fri 8–5, Sat 10–4, Sun closed. Not a
  // real building row; the library feature reads these via effectiveHours('LIB').
  LIB: [
    {
      start: '2000-01-01',
      end: '2100-01-01',
      days: [
        null, // Sun
        { open: '08:00:00', close: '20:00:00' }, // Mon
        { open: '08:00:00', close: '20:00:00' }, // Tue
        { open: '08:00:00', close: '20:00:00' }, // Wed
        { open: '08:00:00', close: '20:00:00' }, // Thu
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
