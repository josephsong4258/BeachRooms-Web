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
  todaySchedules: ClassSchedule[];
}

export interface BuildingWithRooms {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  weekday_open: string | null;
  weekday_close: string | null;
  isOpen: boolean;
  availableCount: number;
  totalCount: number;
  rooms: RoomAvailability[];
}

export interface APIResponse {
  buildings: BuildingWithRooms[];
  queryTime: string;
}
