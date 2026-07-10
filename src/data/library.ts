// The University Library — a special place (not a scraped classroom building).
// Its floors are browsable, rateable sub-pages keyed by place id 'library:<id>'.
import { effectiveHours, nextOpeningDate } from '@/lib/building-hours';
import { campusNow } from '@/lib/campus-time';
import type { StudyNoise, StudySpot } from '@/data/study-spots';

export type StudyType = StudyNoise;

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
  // Floors listed bottom to top (Lower Level → 5th) so the list reads in
  // walk-up order. The 4th floor is the campus's only designated quiet study
  // area; everything else is collaborative (expect noise), which the noise
  // icon on each row conveys.
  floors: [
    { id: 'lower', name: 'Lower Level', type: 'group' },
    { id: '1', name: '1st Floor', type: 'group' },
    { id: '2', name: '2nd Floor', type: 'group' },
    { id: '3', name: '3rd Floor', type: 'group' },
    { id: '4', name: '4th Floor', type: 'quiet', note: 'The only designated quiet study area on campus' },
    { id: '5', name: '5th Floor', type: 'group' },
  ] as LibraryFloor[],
};

export function libraryFloorImage(floorId: string): string {
  return `/assets/library/${floorId}.webp`;
}

// A library floor as a generic study spot, so it reuses the shared spot page.
export function libraryFloorSpot(floor: LibraryFloor): StudySpot {
  return {
    placeId: `library:${floor.id}`,
    name: floor.name,
    parentName: LIBRARY.name,
    type: floor.type,
    image: libraryFloorImage(floor.id),
    note: floor.note,
  };
}

// The library overview hero (a dedicated exterior shot, not tied to any floor).
export const LIBRARY_IMAGE = '/assets/library/hero.webp';

export function libraryHoursToday(date: Date = campusNow()) {
  return effectiveHours(LIBRARY.hoursCode, null, null, date);
}

export function isLibraryOpen(date: Date = campusNow()): boolean {
  const hrs = libraryHoursToday(date);
  if (!hrs) return false;
  const [oh, om] = hrs.open.split(':').map(Number);
  const [ch, cm] = hrs.close.split(':').map(Number);
  const mins = date.getHours() * 60 + date.getMinutes();
  return mins >= oh * 60 + om && mins <= ch * 60 + cm;
}

export function nextLibraryOpening(from: Date = campusNow()): Date | null {
  return nextOpeningDate(LIBRARY.hoursCode, null, null, from);
}
