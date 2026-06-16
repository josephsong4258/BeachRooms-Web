// The University Library — a special place (not a scraped classroom building).
// Its floors are browsable, rateable sub-pages keyed by place id 'library:<id>'.
import { effectiveHours, nextOpeningDate } from '@/lib/building-hours';

export type StudyType = 'group' | 'quiet';

export interface LibraryFloor {
  id: string; // place-id suffix + image filename, e.g. '5', '4', 'lower'
  name: string;
  type: StudyType;
  note?: string;
}

export const LIBRARY = {
  id: 'library',
  name: 'University Library',
  neighborhood: 'Upper Campus',
  latitude: 33.777309,
  longitude: -118.114746,
  // Hours live in building-hours.ts under the 'LIB' code so they reuse the
  // shared effective-hours / next-opening logic (incl. Saturday support).
  hoursCode: 'LIB',
  // Floors, top to bottom. The 4th floor is the campus's only designated quiet
  // study area; everything else is collaborative (expect noise).
  floors: [
    { id: '5', name: '5th Floor', type: 'group' },
    { id: '4', name: '4th Floor', type: 'quiet', note: 'The only designated quiet study area on campus' },
    { id: '3', name: '3rd Floor', type: 'group' },
    { id: '2', name: '2nd Floor', type: 'group' },
    { id: '1', name: '1st Floor', type: 'group', note: 'Spidell Technology Center' },
    { id: 'lower', name: 'Lower Level', type: 'group' },
  ] as LibraryFloor[],
};

export function libraryFloorImage(floorId: string): string {
  return `/assets/library/${floorId}.webp`;
}

// The library hero photo (1st floor / main level).
export const LIBRARY_IMAGE = libraryFloorImage('1');

export function libraryHoursToday(date: Date = new Date()) {
  return effectiveHours(LIBRARY.hoursCode, null, null, date);
}

export function isLibraryOpen(date: Date = new Date()): boolean {
  const hrs = libraryHoursToday(date);
  if (!hrs) return false;
  const [oh, om] = hrs.open.split(':').map(Number);
  const [ch, cm] = hrs.close.split(':').map(Number);
  const mins = date.getHours() * 60 + date.getMinutes();
  return mins >= oh * 60 + om && mins <= ch * 60 + cm;
}

export function nextLibraryOpening(from: Date = new Date()): Date | null {
  return nextOpeningDate(LIBRARY.hoursCode, null, null, from);
}
