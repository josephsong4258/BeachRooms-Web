'use client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ClassSchedule } from '@/types';

const BLOCK_WIDTH_PX = 56;
const HOUR_MINUTES = 60;

interface TimeBlockProps {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  schedule?: ClassSchedule;
}

function parseMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function TimeBlock({ startTime, endTime, isAvailable, schedule }: TimeBlockProps) {
  const durationMinutes = parseMinutes(endTime) - parseMinutes(startTime);
  const widthPx = Math.max(4, (durationMinutes / HOUR_MINUTES) * BLOCK_WIDTH_PX);

  const label = isAvailable ? 'Available' : (schedule?.course_code ?? 'Class');
  const timeRange = `${formatTime(startTime)} – ${formatTime(endTime)}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`h-8 rounded flex-shrink-0 cursor-default transition-opacity ${
            isAvailable
              ? 'bg-green-400/80 hover:bg-green-400'
              : 'bg-red-400/70 hover:bg-red-400/90'
          }`}
          style={{ width: `${widthPx}px` }}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{timeRange}</p>
        <p className="text-xs text-muted-foreground">{durationMinutes}m</p>
      </TooltipContent>
    </Tooltip>
  );
}
