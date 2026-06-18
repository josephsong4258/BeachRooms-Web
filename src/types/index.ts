export type AvailabilityStatus = 'open' | 'in_use' | 'limited' | 'closed';

export interface Building {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  address: string | null;
  weekday_open: string | null;
  weekday_close: string | null;
  saturday_open: string | null;
  saturday_close: string | null;
  sunday_open: string | null;
  sunday_close: string | null;
  // Optional exterior photo for the building page. Column may not exist yet —
  // the building page falls back to a placeholder when it's null.
  image_url?: string | null;
}

export interface Classroom {
  id: string;
  building_id: string;
  room_number: string;
  is_accessible: boolean;
  is_alc: boolean;
  amenities: string[];
}

export interface ClassSchedule {
  id: string;
  classroom_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  semester: string;
  course_code: string | null;
}

export interface ClassroomWithBuilding extends Classroom {
  building: Building;
}

// The subset of a class schedule the client actually renders. The full
// ClassSchedule also carries id/classroom_id (36-char UUIDs), day_of_week, and
// semester, none of which the UI reads — they're dropped before serialization
// to keep the per-request payload (and Vercel egress) small at scale.
export interface RoomSchedule {
  start_time: string;
  end_time: string;
  course_code: string | null;
}

export interface ClassroomAvailability {
  classroom: ClassroomWithBuilding;
  isAvailable: boolean;
  isBuildingOpen: boolean;
  status: AvailabilityStatus;
  nextClassStartsAt: Date | null;
  currentClassEndsAt: Date | null;
  minutesUntilNextClass: number | null;
  availableDurationMinutes: number | null;
  statusText: string;
  distanceMiles: number | null;
  todaySchedules: ClassSchedule[];
}

// Serialized for API JSON responses
export interface RoomAvailability {
  id: string;
  room_number: string;
  is_accessible: boolean;
  is_alc: boolean;
  amenities: string[];
  status: AvailabilityStatus;
  isAvailable: boolean;
  isBuildingOpen: boolean;
  statusText: string;
  nextClassStartsAt: string | null;
  currentClassEndsAt: string | null;
  minutesUntilNextClass: number | null;
  availableDurationMinutes: number | null;
  todaySchedules: RoomSchedule[];
}

export interface BuildingWithRooms {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  weekday_open: string | null;
  weekday_close: string | null;
  // Exterior photo for the building page; null falls back to a placeholder.
  imageUrl: string | null;
  isOpen: boolean;
  availableCount: number;
  totalCount: number;
  rooms: RoomAvailability[];
}

export interface APIResponse {
  buildings: BuildingWithRooms[];
  queryTime: string;
}

export interface RoomComment {
  id: string;
  classroom_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Embedded by PostgREST via the comments.user_id -> profiles FK
  profile: { display_name: string } | null;
}
