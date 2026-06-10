'use client';
import { ArrowLeft, Accessibility } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import TimeBlock from '@/components/TimeBlock';
import RoomStatusBadge from '@/components/RoomStatusBadge';
import type { RoomAvailability, BuildingWithRooms } from '@/types';

interface RoomDetailProps {
  room: RoomAvailability;
  building: BuildingWithRooms;
  onBack: () => void;
}

const CAMPUS_OPEN_HOUR = 7;
const CAMPUS_CLOSE_HOUR = 22;

function buildTimelineBlocks(room: RoomAvailability) {
  type Block = { startTime: string; endTime: string; isAvailable: boolean; scheduleIndex?: number };
  const blocks: Block[] = [];
  const schedules = [...room.todaySchedules].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  const openTime = `${String(CAMPUS_OPEN_HOUR).padStart(2, '0')}:00:00`;
  const closeTime = `${String(CAMPUS_CLOSE_HOUR).padStart(2, '0')}:00:00`;

  let cursor = openTime;

  for (let i = 0; i < schedules.length; i++) {
    const s = schedules[i];
    if (s.start_time > cursor) {
      blocks.push({ startTime: cursor, endTime: s.start_time, isAvailable: true });
    }
    if (s.start_time >= closeTime) break;
    blocks.push({ startTime: s.start_time, endTime: s.end_time, isAvailable: false, scheduleIndex: i });
    cursor = s.end_time > cursor ? s.end_time : cursor;
  }

  if (cursor < closeTime) {
    blocks.push({ startTime: cursor, endTime: closeTime, isAvailable: true });
  }

  return blocks.map((b, i) => ({
    ...b,
    schedule: b.scheduleIndex !== undefined ? schedules[b.scheduleIndex] : undefined,
    key: i,
  }));
}

export default function RoomDetail({ room, building, onBack }: RoomDetailProps) {
  const blocks = buildTimelineBlocks(room);
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
          </div>
          <p className="text-xs text-muted-foreground truncate">{building.name}</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Status text */}
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-sm font-medium whitespace-pre-line">{room.statusText}</p>
          </div>

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
          {blocks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Today's Schedule
              </p>
              <TooltipProvider delayDuration={100}>
                <div className="w-full overflow-x-auto">
                  <div className="flex gap-1 pb-2 w-max">
                    {blocks.map((b) => (
                      <TimeBlock
                        key={b.key}
                        startTime={b.startTime}
                        endTime={b.endTime}
                        isAvailable={b.isAvailable}
                        schedule={b.schedule}
                      />
                    ))}
                  </div>
                </div>
              </TooltipProvider>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-green-400/80" /> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-red-400/70" /> Class
                </span>
              </div>
            </div>
          )}

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
        </div>
      </ScrollArea>
    </div>
  );
}
