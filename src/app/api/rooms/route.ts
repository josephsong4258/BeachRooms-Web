import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { calculateAvailability, campusNow } from '@/lib/availability';
import { ROOMS_CACHE_TAG } from '@/lib/cache';
import type {
  ClassroomWithBuilding,
  ClassSchedule,
  BuildingWithRooms,
  RoomAvailability,
  APIResponse,
} from '@/types';

// Schedules only change when the scraper re-runs, so the data fetches are
// cached. The pipeline busts the cache via /api/revalidate after each run;
// the hourly revalidate is just a fallback. Availability is still computed
// per-request from the cached rows.
const CACHE_SECONDS = 3600;

// Only the columns the app uses — the table also stores course_title,
// instructor_name, and created_at, which would otherwise be held in the
// cache and shipped to every client inside todaySchedules.
const SCHEDULE_COLUMNS =
  'id, classroom_id, day_of_week, start_time, end_time, semester, course_code';

const getClassrooms = unstable_cache(
  async () => {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*, building:buildings(*)')
      .order('room_number');
    if (error) throw new Error(error.message);
    return data as unknown as ClassroomWithBuilding[];
  },
  ['classrooms'],
  { revalidate: CACHE_SECONDS, tags: [ROOMS_CACHE_TAG] }
);

// No semester filter: the scraper wipes the whole table on every run, so it
// only ever holds the current semester. Filtering on a hardcoded label here
// would silently match zero rows after a semester rollover.
const getSchedulesForDay = unstable_cache(
  async (dayOfWeek: number) => {
    const allSchedules: ClassSchedule[] = [];
    const PAGE = 1000;
    let offset = 0;
    let hasMore = true;

    // Paginate — Supabase has a 1000 row default limit. The explicit order
    // keeps pagination stable; without it Postgres may return rows in a
    // different order per page query, duplicating or skipping rows.
    while (hasMore) {
      const { data: batch, error } = await supabase
        .from('class_schedules')
        .select(SCHEDULE_COLUMNS)
        .eq('day_of_week', dayOfWeek)
        .order('id')
        .range(offset, offset + PAGE - 1);

      if (error) throw new Error(error.message);
      allSchedules.push(...((batch ?? []) as ClassSchedule[]));
      hasMore = (batch?.length ?? 0) === PAGE;
      offset += PAGE;
    }

    // Zero rows on a weekday means the table is empty or mid-rescrape — every
    // semester has weekday classes. Fail (uncached) rather than cache a
    // snapshot that shows the whole campus free for an hour. Weekends
    // legitimately have no rows.
    if (allSchedules.length === 0 && dayOfWeek !== 0 && dayOfWeek !== 6) {
      throw new Error('No schedule data available — try again shortly');
    }
    return allSchedules;
  },
  ['schedules'],
  { revalidate: CACHE_SECONDS, tags: [ROOMS_CACHE_TAG] }
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const timeParam = searchParams.get('time');

  // Default to campus wall-clock time — the server's own timezone (UTC on
  // Vercel) would query the wrong day and hours every Pacific evening.
  // Explicit params are already campus wall-clock by construction.
  let queryTime = campusNow();
  if (dateParam && timeParam) {
    const parsed = new Date(`${dateParam}T${timeParam}`);
    if (!isNaN(parsed.getTime())) queryTime = parsed;
  }

  const dayOfWeek = queryTime.getDay();

  let classroomsData: ClassroomWithBuilding[];
  let allSchedules: ClassSchedule[];
  try {
    [classroomsData, allSchedules] = await Promise.all([
      getClassrooms(),
      getSchedulesForDay(dayOfWeek),
    ]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load rooms' },
      { status: 500 }
    );
  }

  const schedulesByRoom = new Map<string, ClassSchedule[]>();
  for (const s of allSchedules) {
    const list = schedulesByRoom.get(s.classroom_id);
    if (list) list.push(s);
    else schedulesByRoom.set(s.classroom_id, [s]);
  }

  const buildingsMap: Record<string, BuildingWithRooms> = {};

  for (const cw of classroomsData) {
    if (!cw.building) continue;
    // "OFF" = off-campus locations, not a real building
    if (cw.building.code === 'OFF') continue;

    const { building } = cw;
    const roomSchedules = schedulesByRoom.get(cw.id) ?? [];
    const avail = calculateAvailability(cw, roomSchedules, queryTime);

    if (!buildingsMap[building.id]) {
      buildingsMap[building.id] = {
        id: building.id,
        name: building.name ?? building.code,
        code: building.code,
        latitude: building.latitude,
        longitude: building.longitude,
        weekday_open: building.weekday_open,
        weekday_close: building.weekday_close,
        isOpen: avail.isBuildingOpen,
        availableCount: 0,
        totalCount: 0,
        rooms: [],
      };
    }

    const bd = buildingsMap[building.id];

    const room: RoomAvailability = {
      id: cw.id,
      room_number: cw.room_number,
      is_accessible: cw.is_accessible,
      is_alc: cw.is_alc ?? false,
      amenities: cw.amenities ?? [],
      status: avail.status,
      isAvailable: avail.isAvailable,
      isBuildingOpen: avail.isBuildingOpen,
      statusText: avail.statusText,
      nextClassStartsAt: avail.nextClassStartsAt?.toISOString() ?? null,
      currentClassEndsAt: avail.currentClassEndsAt?.toISOString() ?? null,
      minutesUntilNextClass: avail.minutesUntilNextClass,
      availableDurationMinutes: avail.availableDurationMinutes,
      todaySchedules: roomSchedules,
    };

    bd.rooms.push(room);
    bd.totalCount++;
    if (avail.isAvailable) bd.availableCount++;
  }

  const buildings: BuildingWithRooms[] = Object.values(buildingsMap);

  for (const bd of buildings) {
    bd.rooms.sort((a: RoomAvailability, b: RoomAvailability) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
    });
  }

  buildings.sort((a: BuildingWithRooms, b: BuildingWithRooms) => {
    if (a.availableCount !== b.availableCount) return b.availableCount - a.availableCount;
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const response: APIResponse = { buildings, queryTime: queryTime.toISOString() };

  // CDN caches each URL (incl. date/time params) briefly so bursts of users
  // share one computation. Availability is minute-granular, so cap the total
  // staleness (s-maxage + stale-while-revalidate) at about a minute.
  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30' },
  });
}
