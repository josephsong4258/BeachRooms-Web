'use client';
// Shared room/building presentation pieces used by both the sidebar list
// (BuildingList) and the building page (BuildingDetail). Extracted from the
// former BuildingAccordion so the two views render rooms identically.
import Image from 'next/image';
import { ChevronRight, Star } from 'lucide-react';
import { nextOpeningDate } from '@/lib/building-hours';
import { campusNow } from '@/lib/campus-time';
import { useReferenceNow } from '@/lib/reference-time';
import type { BuildingWithRooms, RoomAvailability } from '@/types';

export const OPENING_SOON_MINUTES = 30;

// A free gap shorter than this isn't worth walking to — a room that opens for
// only a few minutes before the next class is effectively still occupied.
// Mirrors MIN_USABLE_MINUTES in lib/availability.ts, which already excludes
// such gaps from the detail page's "Free at …" calculation.
const MIN_USABLE_MINUTES = 30;

export type RoomGroup = 'available' | 'openingSoon' | 'occupied';

export function classifyRoom(room: RoomAvailability, now: number): RoomGroup {
  if (room.isAvailable) return 'available';
  if (room.status === 'in_use' && room.currentClassEndsAt) {
    const endsAt = new Date(room.currentClassEndsAt).getTime();
    const minutes = Math.floor((endsAt - now) / 60000);
    // Only "opening soon" if the room is then usably free — i.e. not re-occupied
    // by the next class within MIN_USABLE_MINUTES. Otherwise the list would say
    // "Free in 5 min" while the detail page (correctly) says the next real
    // opening is hours away.
    const nextStart = room.nextClassStartsAt ? new Date(room.nextClassStartsAt).getTime() : null;
    const usableGap =
      nextStart === null || Math.floor((nextStart - endsAt) / 60000) >= MIN_USABLE_MINUTES;
    if (minutes > 0 && minutes <= OPENING_SOON_MINUTES && usableGap) return 'openingSoon';
  }
  return 'occupied';
}

export function groupRooms(rooms: RoomAvailability[], now: number = campusNow().getTime()) {
  const available: RoomAvailability[] = [];
  const openingSoon: RoomAvailability[] = [];
  const occupied: RoomAvailability[] = [];

  for (const r of rooms) {
    const group = classifyRoom(r, now);
    if (group === 'available') available.push(r);
    else if (group === 'openingSoon') openingSoon.push(r);
    else occupied.push(r);
  }

  openingSoon.sort((a, b) => {
    const ae = a.currentClassEndsAt ? new Date(a.currentClassEndsAt).getTime() : 0;
    const be = b.currentClassEndsAt ? new Date(b.currentClassEndsAt).getTime() : 0;
    return ae - be;
  });

  return { available, openingSoon, occupied };
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function PinIcon({ type }: { type: RoomGroup }) {
  const src =
    type === 'available'
      ? '/assets/pins/pin-green.png'
      : type === 'openingSoon'
        ? '/assets/pins/pin-amber.png'
        : '/assets/pins/pin-red.png';
  return <Image src={src} alt="" width={22} height={22} className="shrink-0" />;
}

function CountdownChip({ minutes }: { minutes: number }) {
  const label = minutes <= 1 ? 'Free in <1 min' : `Free in ${minutes} min`;
  return (
    <span className="rounded-full border border-[#f5d78a] bg-[#fef6e6] px-2 py-0.5 text-[11px] font-semibold text-[#b5850b]">
      {label}
    </span>
  );
}

export function CountBadge({
  available,
  total,
  closed,
}: {
  available: number;
  total: number;
  closed: boolean;
}) {
  if (closed) {
    return (
      <span className="min-w-[37px] text-center rounded-full border border-[#d4d4d8] bg-[#f4f4f5] px-2 py-0.5 text-[10px] font-semibold text-[#6b7280]">
        Closed
      </span>
    );
  }
  const has = available > 0;
  const cls = has
    ? 'bg-[#e6f9ec] border-[#7ee8a0] text-[#1a9e3f]'
    : 'bg-[#fde8ea] border-[#f5a3ab] text-[#c9303a]';
  return (
    <span
      className={`min-w-[37px] text-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {available}/{total}
    </span>
  );
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Next time a closed building opens, as a day/time label. Delegates to the
// shared hours helper so per-building overrides (e.g. Horn Center closed
// Fridays) are reflected. Uses campus time, matching the rest of the client.
export function nextOpening(
  building: BuildingWithRooms
): { dayLabel: string; timeLabel: string } | null {
  const now = campusNow();
  const opensAt = nextOpeningDate(
    building.code,
    building.weekday_open,
    building.weekday_close,
    now
  );
  if (!opensAt) return null;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfOpenDay = new Date(opensAt);
  startOfOpenDay.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfOpenDay.getTime() - startOfToday.getTime()) / 86400000);

  const dayLabel = dayDiff === 0 ? 'today' : dayDiff === 1 ? 'tomorrow' : DAY_NAMES[opensAt.getDay()];
  const h = opensAt.getHours();
  const m = opensAt.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const timeLabel = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  return { dayLabel, timeLabel };
}

export function ClosedPanel({ building }: { building: BuildingWithRooms }) {
  // Closed-for-summer buildings have no scheduled classes this term, so the
  // weekday-hours-based nextOpening would be a misleading "opens tomorrow".
  if (building.closedForSemester) {
    return (
      <div className="px-1 py-1">
        <p className="text-[13px] font-medium text-foreground/80">Closed for the summer</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          No classes are scheduled here this term.
        </p>
      </div>
    );
  }

  const opening = nextOpening(building);
  return (
    <div className="px-1 py-1">
      <p className="text-[13px] font-medium text-foreground/80">Building is closed</p>
      {opening && (
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Opens <span className="font-bold">{opening.dayLabel}</span> at{' '}
          <span className="font-bold">{opening.timeLabel}</span>
        </p>
      )}
    </div>
  );
}

function StatusText({ room, type }: { room: RoomAvailability; type: RoomGroup }) {
  if (type === 'available' && room.nextClassStartsAt && room.minutesUntilNextClass != null) {
    return (
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Free until <span className="font-bold">{formatTime(new Date(room.nextClassStartsAt))}</span>{' '}
        · <span className="font-bold">{formatDuration(room.minutesUntilNextClass)}</span> left
      </p>
    );
  }

  if (type === 'available') {
    // "Free until 11:00 PM (2h 30m)"
    const m = room.statusText.match(/Free until (.+?\s[AP]M)\s*\((.+?)\)/);
    if (m) {
      return (
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Free until <span className="font-bold">{m[1]}</span> · <span className="font-bold">{m[2]}</span> left
        </p>
      );
    }
    // "9:00 AM - 11:00 PM\n(14h free)" — produced when there are no more classes today
    const m2 = room.statusText.match(/[\d:]+\s[AP]M\s*-\s*(.+?\s[AP]M)\s*\n?\((.+?)\s*free\)/);
    if (m2) {
      return (
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Free until <span className="font-bold">{m2[1]}</span> · <span className="font-bold">{m2[2]}</span> left
        </p>
      );
    }
  }

  if (type === 'openingSoon' && room.currentClassEndsAt) {
    return (
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Free at <span className="font-bold">{formatTime(new Date(room.currentClassEndsAt))}</span>
      </p>
    );
  }

  if (type === 'occupied') {
    const m = room.statusText.match(/Free at (.+?\s[AP]M) for (.+)/);
    if (m) {
      return (
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Free at <span className="font-bold">{m[1]}</span>
        </p>
      );
    }
  }

  return (
    <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">
      {room.statusText.split('\n')[0]}
    </p>
  );
}

export function FavoriteStar({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      aria-pressed={active}
      className="shrink-0 p-1"
    >
      <Star
        className={
          active
            ? 'h-3.5 w-3.5 fill-[#f0b429] text-[#f0b429]'
            : 'h-3.5 w-3.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground'
        }
      />
    </button>
  );
}

export function RoomRow({
  room,
  type,
  buildingCode,
  onClick,
  isFavorite,
  onToggleFavorite,
}: {
  room: RoomAvailability;
  type: RoomGroup;
  buildingCode: string;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const now = useReferenceNow();
  const minutesUntilFree =
    type === 'openingSoon' && room.currentClassEndsAt
      ? Math.max(1, Math.floor((new Date(room.currentClassEndsAt).getTime() - now.getTime()) / 60000))
      : null;

  // Wrapper is a div (not a button) so the star can be its own button —
  // nested buttons are invalid HTML
  return (
    <div className="flex w-full items-center border-b border-border/60 py-2 transition-colors last:border-b-0 hover:bg-accent/40">
      <FavoriteStar
        active={isFavorite}
        onToggle={onToggleFavorite}
        label={isFavorite ? 'Remove room from favorites' : 'Add room to favorites'}
      />
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center text-left">
        <PinIcon type={type} />
        <div className="ml-2.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {buildingCode} {room.room_number}
            </span>
            {minutesUntilFree !== null && <CountdownChip minutes={minutesUntilFree} />}
          </div>
          <StatusText room={room} type={type} />
        </div>
        <ChevronRight className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
      </button>
    </div>
  );
}
