'use client';
import { useState } from 'react';
import { ArrowLeft, Accessibility, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import InfoPopover from '@/components/InfoPopover';
import HourBlock from '@/components/HourBlock';
import RoomComments from '@/components/RoomComments';
import RoomRating from '@/components/RoomRating';
import RoomStatusBadge from '@/components/RoomStatusBadge';
import SignInDialog from '@/components/SignInDialog';
import { useFavorites } from '@/lib/use-favorites';
import { effectiveHours } from '@/lib/building-hours';
import { useReferenceNow } from '@/lib/reference-time';
import type { RoomAvailability, BuildingWithRooms, AvailabilityStatus } from '@/types';

interface RoomDetailProps {
  room: RoomAvailability;
  building: BuildingWithRooms;
  onBack: () => void;
  isMobile?: boolean;
}

// Status card styling per availability state (matches the building pill palette).
const STATUS_CARD: Record<
  AvailabilityStatus,
  { label: string; box: string; dot: string; text: string }
> = {
  open: { label: 'Open now', box: 'border-[#7ee8a0] bg-[#e6f9ec]', dot: 'bg-[#1a9e3f]', text: 'text-[#1a9e3f]' },
  limited: { label: 'Limited', box: 'border-[#f0c879] bg-[#fdf4e3]', dot: 'bg-[#b7791f]', text: 'text-[#b7791f]' },
  in_use: { label: 'In use', box: 'border-[#f5a3ab] bg-[#fde8ea]', dot: 'bg-[#c9303a]', text: 'text-[#c9303a]' },
  closed: { label: 'Closed', box: 'border-[#d4d4d8] bg-[#f4f4f5]', dot: 'bg-[#6b7280]', text: 'text-[#6b7280]' },
};

// One block per hour, 8 AM through 9 PM
const TIMELINE_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

function formatClockTime(d: Date): string {
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

// Same phrasing as the room cards in the sidebar list
function StatusLine({ room, building }: { room: RoomAvailability; building: BuildingWithRooms }) {
  // Campus time (or the time-travelled instant) so the close label matches the
  // day the availability data was computed for.
  const referenceNow = useReferenceNow();
  if (room.isAvailable) {
    if (room.nextClassStartsAt && room.minutesUntilNextClass != null) {
      return (
        <>
          Free until <span className="font-bold">{formatClockTime(new Date(room.nextClassStartsAt))}</span>{' '}
          · <span className="font-bold">{formatDuration(room.minutesUntilNextClass)}</span> left
        </>
      );
    }
    // Closes at the building's effective close time today (folds in overrides).
    const todayClose = effectiveHours(
      building.code,
      building.weekday_open,
      building.weekday_close,
      referenceNow
    )?.close;
    if (room.availableDurationMinutes != null && todayClose) {
      const [h, m] = todayClose.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const closeLabel = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
      return (
        <>
          Free until <span className="font-bold">{closeLabel}</span>{' '}
          · <span className="font-bold">{formatDuration(room.availableDurationMinutes)}</span> left
        </>
      );
    }
  }

  const m = room.statusText.match(/Free at (.+?\s[AP]M) for (.+)/);
  if (m) {
    return (
      <>
        Free at <span className="font-bold">{m[1]}</span>
      </>
    );
  }

  return <>{room.statusText.split('\n')[0]}</>;
}

export default function RoomDetail({ room, building, onBack, isMobile = false }: RoomDetailProps) {
  const { signedIn, favoriteRoomIds, toggleRoomFavorite } = useFavorites();
  const [showSignIn, setShowSignIn] = useState(false);
  const isFavorite = favoriteRoomIds.has(room.id);
  // The timeline dims hours before the current hour; the class list dims
  // classes that have already ended. Uses the time-travelled time when set so
  // the schedule shading reflects the selected time, not the wall clock.
  const now = useReferenceNow();
  const currentHour = now.getHours();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const statusCard = STATUS_CARD[room.status];

  const sortedSchedules = [...room.todaySchedules].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  // Today's effective open hours for the timeline shading (null = closed today).
  const todayHours = effectiveHours(
    building.code,
    building.weekday_open,
    building.weekday_close,
    now
  );

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-base">
              {building.code} {room.room_number}
            </h2>
            <RoomStatusBadge status={room.status} />
            {room.is_alc && (
              <InfoPopover
                trigger={
                  <button
                    type="button"
                    aria-label="What are group study rooms?"
                    className="cursor-pointer rounded-full border border-[#c4b5fd] bg-[#ede9fe] px-2 py-0.5 text-[10px] font-semibold text-[#6d28d9]"
                  >
                    Group Study
                  </button>
                }
              >
                Classrooms designed for group work, with movable seating and
                collaborative layouts.
              </InfoPopover>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{building.name}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0"
          onClick={() => (signedIn ? toggleRoomFavorite(room.id) : setShowSignIn(true))}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorite}
        >
          <Star
            className={
              isFavorite
                ? 'h-4 w-4 fill-[#f0b429] text-[#f0b429]'
                : 'h-4 w-4 text-muted-foreground'
            }
          />
        </Button>
      </div>

      <SignInDialog
        open={showSignIn}
        onOpenChange={setShowSignIn}
        message="Sign in to rate rooms and save favorites across your devices."
      />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Status card */}
          <div className={`rounded-xl border px-4 py-3 ${statusCard.box}`}>
            <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${statusCard.text}`}>
              <span className={`h-2 w-2 rounded-full ${statusCard.dot}`} />
              {statusCard.label}
            </div>
            <p className="mt-1 text-[15px] font-medium text-gray-900">
              <StatusLine room={room} building={building} />
            </p>
          </div>

          {/* Availability rating */}
          <RoomRating roomId={room.id} onRequireSignIn={() => setShowSignIn(true)} />

          {/* Room info */}
          {room.is_accessible && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Accessibility className="h-3.5 w-3.5" />
                Accessible
              </span>
            </div>
          )}

          {/* Amenities */}
          {room.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {room.amenities.map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-secondary text-secondary-foreground text-xs px-2.5 py-0.5"
                >
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Today&apos;s Schedule
            </p>
            {/* Cap at the minimized-panel content width (max-w-[420px] − p-4)
                so the aspect-square cells don't balloon when the map is hidden
                and the sidebar goes full width. */}
            <TooltipProvider delayDuration={100}>
              <div className="grid grid-cols-7 gap-1.5 max-w-[388px]">
                {TIMELINE_HOURS.map((h) => (
                  <HourBlock
                    key={h}
                    hour={h}
                    schedules={room.todaySchedules}
                    buildingOpen={todayHours?.open ?? null}
                    buildingClose={todayHours?.close ?? null}
                    past={h < currentHour}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </TooltipProvider>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-[#d9f3e2] ring-1 ring-black/5" /> Open
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded bg-[#f9d9dd] ring-1 ring-black/5" /> Class / Closed
              </span>
            </div>
          </div>

          {/* Schedule list */}
          {sortedSchedules.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Classes Today
              </p>
              <div className="space-y-1.5">
                {sortedSchedules.map((s) => {
                  const [eh, em] = s.end_time.split(':').map(Number);
                  const ended = eh * 60 + em <= nowMinutes;
                  return (
                    <div
                      key={`${s.start_time}-${s.end_time}-${s.course_code ?? ''}`}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                      style={ended ? { opacity: 0.4 } : undefined}
                    >
                      <span className="font-medium">{s.course_code ?? 'Class'}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatTime(s.start_time)} – {formatTime(s.end_time)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          <RoomComments roomId={room.id} />
        </div>
      </ScrollArea>
    </div>
  );
}
