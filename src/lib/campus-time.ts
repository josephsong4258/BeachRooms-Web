// The one campus clock, shared by the server availability engine and every
// client-side "is it open right now?" check, so both always agree on the
// campus wall-clock time regardless of where the code runs (Vercel is UTC,
// visitors can be in any timezone).
//
// This module is pure (no server-only deps) so it's safe to import anywhere.

export const CAMPUS_TIME_ZONE = 'America/Los_Angeles';

const wallClockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23', // never "24" at midnight
});

// A Date whose *local* fields hold campus wall-clock time. Only its local
// fields (getDay/getHours/...) are meaningful — it is not the true instant.
// This matches how the whole codebase treats time: schedule strings are naive
// campus wall-clock, and all math uses local-time Date methods.
//
// Built from Intl.DateTimeFormat parts rather than the
// `new Date(date.toLocaleString(...))` trick, whose output isn't a format
// Date.parse is required to understand outside V8 (Safari).
export function campusNow(): Date {
  const parts: Record<string, string> = {};
  for (const p of wallClockFormat.formatToParts(new Date())) parts[p.type] = p.value;
  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
}
