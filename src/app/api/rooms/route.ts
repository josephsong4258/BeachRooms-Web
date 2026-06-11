import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateAvailability, isBuildingOpen } from '@/lib/availability';
import type {
  ClassroomWithBuilding,
  ClassSchedule,
  BuildingWithRooms,
  RoomAvailability,
  APIResponse,
} from '@/types';

const CURRENT_SEMESTER = 'Summer 2026';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const timeParam = searchParams.get('time');

  let queryTime = new Date();
  if (dateParam && timeParam) {
    const parsed = new Date(`${dateParam}T${timeParam}`);
    if (!isNaN(parsed.getTime())) queryTime = parsed;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const dayOfWeek = queryTime.getDay();

  const { data: classroomsData, error: classroomsError } = await supabase
    .from('classrooms')
    .select('*, building:buildings(*)')
    .order('room_number');

  if (classroomsError) {
    return NextResponse.json({ error: classroomsError.message }, { status: 500 });
  }

  // Paginate schedules — Supabase has a 1000 row default limit
  const allSchedules: ClassSchedule[] = [];
  const PAGE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('class_schedules')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('semester', CURRENT_SEMESTER)
      .range(offset, offset + PAGE - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    allSchedules.push(...(batch ?? []));
    hasMore = (batch?.length ?? 0) === PAGE;
    offset += PAGE;
  }

  const buildingsMap: Record<string, BuildingWithRooms> = {};

  for (const classroom of classroomsData ?? []) {
    const cw = classroom as unknown as ClassroomWithBuilding;
    if (!cw.building) continue;
    // "OFF" = off-campus locations, not a real building
    if (cw.building.code === 'OFF') continue;

    const { building } = cw;
    const roomSchedules = allSchedules.filter((s) => s.classroom_id === classroom.id);
    const avail = calculateAvailability(cw, roomSchedules, queryTime);
    const buildingStatus = isBuildingOpen(building, queryTime);

    if (!buildingsMap[building.id]) {
      buildingsMap[building.id] = {
        id: building.id,
        name: building.name ?? building.code,
        code: building.code,
        latitude: building.latitude,
        longitude: building.longitude,
        weekday_open: building.weekday_open,
        weekday_close: building.weekday_close,
        isOpen: buildingStatus.isOpen,
        availableCount: 0,
        totalCount: 0,
        rooms: [],
      };
    }

    const bd = buildingsMap[building.id];

    const room: RoomAvailability = {
      id: classroom.id,
      room_number: classroom.room_number,
      is_accessible: classroom.is_accessible,
      is_alc: classroom.is_alc ?? false,
      amenities: classroom.amenities ?? [],
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

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
