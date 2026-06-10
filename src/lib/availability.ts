import type {
  ClassSchedule,
  ClassroomWithBuilding,
  ClassroomAvailability,
  AvailabilityStatus,
} from '@/types';

export function parseTimeToday(timeString: string, referenceDate: Date = new Date()): Date {
  const parts = timeString.split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  const seconds = parts[2] ?? 0;
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

export function isBuildingOpen(
  building: ClassroomWithBuilding['building'],
  now: Date = new Date()
): { isOpen: boolean; opensAt: Date | null; closesAt: Date | null } {
  const dayOfWeek = now.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isOpen: false, opensAt: null, closesAt: null };
  }

  const openTime = building.weekday_open;
  const closeTime = building.weekday_close;

  if (!openTime || !closeTime) {
    return { isOpen: false, opensAt: null, closesAt: null };
  }

  const opensAt = parseTimeToday(openTime, now);
  const closesAt = parseTimeToday(closeTime, now);
  const isOpen = now >= opensAt && now <= closesAt;

  return { isOpen, opensAt, closesAt };
}

function formatTimeUntil(targetTime: Date, prefix: string): string {
  const hours = targetTime.getHours();
  const minutes = targetTime.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${prefix} ${displayHours}:${displayMinutes} ${ampm}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function formatFreeAtWithDuration(time: Date, durationMinutes: number): string {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `Free at ${displayHours}:${displayMinutes} ${ampm} for ${formatDuration(durationMinutes)}`;
}

function formatTime(time: Date): string {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

function formatFreeUntilWithDuration(fromTime: Date, untilTime: Date, durationMinutes: number): string {
  return `${formatTime(fromTime)} - ${formatTime(untilTime)}\n(${formatDuration(durationMinutes)} free)`;
}

const MIN_USABLE_MINUTES = 30;

interface UsableWindow {
  startsAt: Date;
  durationMinutes: number;
}

export function findNextUsableWindow(
  schedules: ClassSchedule[],
  fromTime: Date,
  buildingCloses: Date
): UsableWindow | null {
  const futureSchedules = schedules
    .map((s) => ({
      start: parseTimeToday(s.start_time, fromTime),
      end: parseTimeToday(s.end_time, fromTime),
    }))
    .filter((s) => s.end > fromTime)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let checkTime = fromTime;

  for (const schedule of futureSchedules) {
    const gapMinutes = Math.floor((schedule.start.getTime() - checkTime.getTime()) / 60000);
    if (gapMinutes >= MIN_USABLE_MINUTES) {
      return { startsAt: checkTime, durationMinutes: gapMinutes };
    }
    checkTime = schedule.end;
  }

  const remainingMinutes = Math.floor((buildingCloses.getTime() - checkTime.getTime()) / 60000);
  if (remainingMinutes >= MIN_USABLE_MINUTES) {
    return { startsAt: checkTime, durationMinutes: remainingMinutes };
  }

  return null;
}

export function calculateAvailability(
  classroom: ClassroomWithBuilding,
  schedules: ClassSchedule[],
  now: Date = new Date()
): ClassroomAvailability {
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const buildingStatus = isBuildingOpen(classroom.building, now);

  if (!buildingStatus.opensAt || !buildingStatus.closesAt) {
    return {
      classroom,
      isAvailable: false,
      isBuildingOpen: false,
      status: 'closed',
      nextClassStartsAt: null,
      currentClassEndsAt: null,
      minutesUntilNextClass: null,
      availableDurationMinutes: null,
      statusText: isWeekend ? 'Closed on weekends' : 'No classes today',
      distanceMiles: null,
      todaySchedules: schedules,
    };
  }

  if (now < buildingStatus.opensAt) {
    return {
      classroom,
      isAvailable: false,
      isBuildingOpen: false,
      status: 'closed',
      nextClassStartsAt: buildingStatus.opensAt,
      currentClassEndsAt: null,
      minutesUntilNextClass: null,
      availableDurationMinutes: null,
      statusText: formatTimeUntil(buildingStatus.opensAt, 'Opens at'),
      distanceMiles: null,
      todaySchedules: schedules,
    };
  }

  if (now > buildingStatus.closesAt) {
    return {
      classroom,
      isAvailable: false,
      isBuildingOpen: false,
      status: 'closed',
      nextClassStartsAt: null,
      currentClassEndsAt: null,
      minutesUntilNextClass: null,
      availableDurationMinutes: null,
      statusText: 'Building closed',
      distanceMiles: null,
      todaySchedules: schedules,
    };
  }

  if (schedules.length === 0) {
    return {
      classroom,
      isAvailable: false,
      isBuildingOpen: buildingStatus.isOpen,
      status: 'closed',
      nextClassStartsAt: null,
      currentClassEndsAt: null,
      minutesUntilNextClass: null,
      availableDurationMinutes: null,
      statusText: 'No classes today',
      distanceMiles: null,
      todaySchedules: schedules,
    };
  }

  let currentClass: ClassSchedule | null = null;
  let nextClass: ClassSchedule | null = null;
  let previousClass: ClassSchedule | null = null;

  for (const schedule of schedules) {
    const startTime = parseTimeToday(schedule.start_time, now);
    const endTime = parseTimeToday(schedule.end_time, now);

    if (now >= startTime && now < endTime) {
      currentClass = schedule;
    } else if (now < startTime) {
      if (!nextClass || startTime < parseTimeToday(nextClass.start_time, now)) {
        nextClass = schedule;
      }
    } else if (endTime <= now) {
      if (!previousClass || endTime > parseTimeToday(previousClass.end_time, now)) {
        previousClass = schedule;
      }
    }
  }

  if (currentClass) {
    const endsAt = parseTimeToday(currentClass.end_time, now);
    const nextWindow = findNextUsableWindow(schedules, endsAt, buildingStatus.closesAt);
    return {
      classroom,
      isAvailable: false,
      isBuildingOpen: true,
      status: 'in_use',
      nextClassStartsAt: nextClass ? parseTimeToday(nextClass.start_time, now) : null,
      currentClassEndsAt: endsAt,
      minutesUntilNextClass: null,
      availableDurationMinutes: null,
      statusText: nextWindow
        ? formatFreeAtWithDuration(nextWindow.startsAt, nextWindow.durationMinutes)
        : 'Busy all day',
      distanceMiles: null,
      todaySchedules: schedules,
    };
  }

  const freeStartTime = previousClass
    ? parseTimeToday(previousClass.end_time, now)
    : buildingStatus.opensAt;

  if (nextClass) {
    const nextStartTime = parseTimeToday(nextClass.start_time, now);
    const minutesUntil = Math.floor((nextStartTime.getTime() - now.getTime()) / 60000);

    if (minutesUntil < MIN_USABLE_MINUTES) {
      const nextWindow = findNextUsableWindow(schedules, now, buildingStatus.closesAt);
      return {
        classroom,
        isAvailable: false,
        isBuildingOpen: true,
        status: 'limited',
        nextClassStartsAt: nextStartTime,
        currentClassEndsAt: null,
        minutesUntilNextClass: minutesUntil,
        availableDurationMinutes: null,
        statusText: nextWindow
          ? formatFreeAtWithDuration(nextWindow.startsAt, nextWindow.durationMinutes)
          : 'Busy all day',
        distanceMiles: null,
        todaySchedules: schedules,
      };
    }

    const fullDurationMinutes = Math.floor(
      (nextStartTime.getTime() - freeStartTime.getTime()) / 60000
    );
    return {
      classroom,
      isAvailable: true,
      isBuildingOpen: true,
      status: 'open',
      nextClassStartsAt: nextStartTime,
      currentClassEndsAt: null,
      minutesUntilNextClass: minutesUntil,
      availableDurationMinutes: fullDurationMinutes,
      statusText: formatFreeUntilWithDuration(freeStartTime, nextStartTime, fullDurationMinutes),
      distanceMiles: null,
      todaySchedules: schedules,
    };
  }

  const closeDurationMinutes = Math.floor(
    (buildingStatus.closesAt.getTime() - freeStartTime.getTime()) / 60000
  );
  return {
    classroom,
    isAvailable: true,
    isBuildingOpen: true,
    status: 'open',
    nextClassStartsAt: null,
    currentClassEndsAt: null,
    minutesUntilNextClass: null,
    availableDurationMinutes: closeDurationMinutes,
    statusText: formatFreeUntilWithDuration(freeStartTime, buildingStatus.closesAt, closeDurationMinutes),
    distanceMiles: null,
    todaySchedules: schedules,
  };
}

export function getStatusColor(status: AvailabilityStatus): string {
  switch (status) {
    case 'open': return '#16a34a';
    case 'in_use': return '#dc2626';
    case 'limited': return '#d97706';
    case 'closed': return '#6b7280';
  }
}

export function getStatusLabel(status: AvailabilityStatus): string {
  switch (status) {
    case 'open': return 'Open';
    case 'in_use': return 'In Use';
    case 'limited': return 'Limited';
    case 'closed': return 'Closed';
  }
}
