'use client';
import { createContext, useContext, type ReactNode } from 'react';

// The "reference now" for all time-relative UI: the time-travelled time when the
// user has picked one, otherwise the real current time. Countdown chips, the
// schedule timeline's past/ended shading, and room classification all read this
// so they reflect the selected time instead of the wall clock.
const ReferenceTimeContext = createContext<Date | null>(null);

export function ReferenceTimeProvider({
  value,
  children,
}: {
  value: Date | null;
  children: ReactNode;
}) {
  return <ReferenceTimeContext.Provider value={value}>{children}</ReferenceTimeContext.Provider>;
}

// Returns the time-travelled time if one is set, otherwise a fresh real-now.
export function useReferenceNow(): Date {
  return useContext(ReferenceTimeContext) ?? new Date();
}
