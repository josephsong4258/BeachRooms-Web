// Study spots are browsable, rateable sub-pages that sit under a parent place:
// the University Library's floors, or the Horn Center's study areas. They are
// keyed by a free-form place id like 'library:4' or 'horn:lab' so their ratings
// and comments reuse the place_ratings / place_comments tables (data-pipeline/
// places.sql) without being tied to the classrooms table.

export type StudyNoise = 'group' | 'quiet';

export interface StudySpot {
  placeId: string; // ratings/comments key, e.g. 'horn:general'
  name: string; // e.g. 'Computer Lab'
  parentName: string; // e.g. 'Horn Center'
  type: StudyNoise; // drives the noise badge + collaborative/quiet disclaimer
  image: string; // full public path to the photo
  note?: string;
}

// Study spots that live inside a scraped classroom building, keyed by building
// code. These render as a section on the building page, mirroring the library's
// floor list. The Horn Center's two open study areas are both collaborative, so
// they read the same "expect noise" disclaimer as the library's group floors.
const HORN_SPOTS: StudySpot[] = [
  {
    placeId: 'horn:general',
    name: 'General Study Area',
    parentName: 'Horn Center',
    type: 'group',
    image: '/assets/horn/general.webp',
  },
  {
    placeId: 'horn:lab',
    name: 'Computer Lab',
    parentName: 'Horn Center',
    type: 'group',
    image: '/assets/horn/lab.webp',
    note: 'University Open Computer Lab',
  },
];

const BUILDING_SPOTS: Record<string, StudySpot[]> = {
  HC: HORN_SPOTS,
};

export function buildingStudySpots(code: string): StudySpot[] {
  return BUILDING_SPOTS[code] ?? [];
}
