'use client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ClassSchedule } from '@/types';

interface HourBlockProps {
  hour: number; // block covers [hour:00, hour+1:00)
  schedules: ClassSchedule[];
  buildingOpen: string | null; // "HH:MM:SS"
  buildingClose: string | null;
}

function parseMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function HourBlock({ hour, schedules, buildingOpen, buildingClose }: HourBlockProps) {
  const blockStart = hour * 60;
  const blockEnd = blockStart + 60;

  const openMin = buildingOpen ? parseMinutes(buildingOpen) : null;
  const closeMin = buildingClose ? parseMinutes(buildingClose) : null;

  // Portions of this hour outside the building's open hours
  const closedSegments: { left: number; width: number }[] = [];
  if (openMin === null || closeMin === null) {
    closedSegments.push({ left: 0, width: 100 });
  } else {
    if (openMin > blockStart) {
      const end = Math.min(openMin, blockEnd);
      closedSegments.push({ left: 0, width: ((end - blockStart) / 60) * 100 });
    }
    if (closeMin < blockEnd) {
      const start = Math.max(closeMin, blockStart);
      closedSegments.push({
        left: ((start - blockStart) / 60) * 100,
        width: ((blockEnd - start) / 60) * 100,
      });
    }
  }

  const classSegments = schedules
    .map((s) => ({
      schedule: s,
      start: Math.max(parseMinutes(s.start_time), blockStart),
      end: Math.min(parseMinutes(s.end_time), blockEnd),
    }))
    .filter((seg) => seg.end > seg.start);

  const fullyClosed = closedSegments.some((c) => c.width >= 100);
  const label = `${hour % 12 || 12} ${hour >= 12 ? 'PM' : 'AM'}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative aspect-square rounded-lg overflow-hidden bg-[#d9f3e2] ring-1 ring-black/5 cursor-default">
          {closedSegments.map((c, i) => (
            <div
              key={`closed-${i}`}
              className="absolute inset-y-0 bg-[#f9d9dd]"
              style={{ left: `${c.left}%`, width: `${c.width}%` }}
            />
          ))}
          {classSegments.map((seg) => (
            <div
              key={seg.schedule.id}
              className="absolute inset-y-0 bg-[#f9d9dd]"
              style={{
                left: `${((seg.start - blockStart) / 60) * 100}%`,
                width: `${((seg.end - seg.start) / 60) * 100}%`,
              }}
            />
          ))}
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-gray-600">
            {label}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">
          {formatClock(blockStart)} – {formatClock(blockEnd)}
        </p>
        {fullyClosed ? (
          <p className="text-xs text-muted-foreground">Building closed</p>
        ) : classSegments.length > 0 ? (
          classSegments.map((seg) => (
            <p key={seg.schedule.id} className="text-xs text-muted-foreground">
              {seg.schedule.course_code ?? 'Class'}:{' '}
              {formatClock(parseMinutes(seg.schedule.start_time))} –{' '}
              {formatClock(parseMinutes(seg.schedule.end_time))}
            </p>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Available</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
