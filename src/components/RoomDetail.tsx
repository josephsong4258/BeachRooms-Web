'use client';
import { useState } from 'react';
import { ArrowLeft, Accessibility, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import HourBlock from '@/components/HourBlock';
import RoomComments from '@/components/RoomComments';
import RoomRating from '@/components/RoomRating';
import RoomStatusBadge from '@/components/RoomStatusBadge';
import SignInDialog from '@/components/SignInDialog';
import { useFavorites } from '@/lib/use-favorites';
import type { RoomAvailability, BuildingWithRooms } from '@/types';

interface RoomDetailProps {
  room: RoomAvailability;
  building: BuildingWithRooms;
  onBack: () => void;
}

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
  if (room.isAvailable) {
    if (room.nextClassStartsAt && room.minutesUntilNextClass != null) {
      return (
        <>
          Available for <span className="font-bold">{formatDuration(room.minutesUntilNextClass)}</span>{' '}
          until <span className="font-bold">{formatClockTime(new Date(room.nextClassStartsAt))}</span>
        </>
      );
    }
    if (room.availableDurationMinutes != null && building.weekday_close) {
      const [h, m] = building.weekday_close.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const closeLabel = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
      return (
        <>
          Available for <span className="font-bold">{formatDuration(room.availableDurationMinutes)}</span>{' '}
          until <span className="font-bold">{closeLabel}</span>
        </>
      );
    }
  }

  const m = room.statusText.match(/Free at (.+?\s[AP]M) for (.+)/);
  if (m) {
    return (
      <>
        Free at <span className="font-bold">{m[1]}</span> for <span className="font-bold">{m[2]}</span>
      </>
    );
  }

  return <>{room.statusText.split('\n')[0]}</>;
}

export default function RoomDetail({ room, building, onBack }: RoomDetailProps) {
  const { signedIn, favoriteRoomIds, toggleRoomFavorite } = useFavorites();
  const [showSignIn, setShowSignIn] = useState(false);
  const isFavorite = favoriteRoomIds.has(room.id);

  const sortedSchedules = [...room.todaySchedules].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
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
              <span className="rounded-full border border-[#7ee8a0] bg-[#e6f9ec] px-2 py-0.5 text-[10px] font-semibold text-[#1a9e3f]">
                Group Study
              </span>
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
          {/* Status text */}
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-sm font-medium">
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
            <TooltipProvider delayDuration={100}>
              <div className="grid grid-cols-7 gap-1.5">
                {TIMELINE_HOURS.map((h) => (
                  <HourBlock
                    key={h}
                    hour={h}
                    schedules={room.todaySchedules}
                    buildingOpen={building.weekday_open}
                    buildingClose={building.weekday_close}
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
                {sortedSchedules.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{s.course_code ?? 'Class'}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatTime(s.start_time)} – {formatTime(s.end_time)}
                    </span>
                  </div>
                ))}
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
