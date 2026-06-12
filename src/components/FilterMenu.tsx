'use client';
import { SlidersHorizontal, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface RoomFilters {
  groupStudyOnly: boolean;
  startTime: string | null; // "HH:MM", null = current time
  minDurationHours: number | null;
}

export const EMPTY_FILTERS: RoomFilters = {
  groupStudyOnly: false,
  startTime: null,
  minDurationHours: null,
};

const DURATION_OPTIONS = [1, 2, 3, 4];

interface FilterMenuProps {
  filters: RoomFilters;
  onChange: (patch: Partial<RoomFilters>) => void;
}

export default function FilterMenu({ filters, onChange }: FilterMenuProps) {
  const activeCount =
    (filters.groupStudyOnly ? 1 : 0) +
    (filters.startTime !== null ? 1 : 0) +
    (filters.minDurationHours !== null ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-8 w-8 shrink-0"
          aria-label="Filters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#1a9e3f] text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</p>

        {/* Start time */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Free starting at</label>
          <input
            type="time"
            value={filters.startTime ?? ''}
            onChange={(e) => onChange({ startTime: e.target.value || null })}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Minimum duration */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Minimum duration</p>
          <div className="flex gap-1.5">
            {DURATION_OPTIONS.map((h) => {
              const selected = filters.minDurationHours === h;
              return (
                <button
                  key={h}
                  onClick={() => onChange({ minDurationHours: selected ? null : h })}
                  aria-pressed={selected}
                  className={`flex-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-[#e6f9ec] border-[#7ee8a0] text-[#1a9e3f]'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {h}h
                </button>
              );
            })}
          </div>
        </div>

        {/* Group study */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            Group study rooms
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="What are group study rooms?"
                    className="text-muted-foreground/70 hover:text-muted-foreground"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-xs">Classrooms designed for group work, with movable seating and
                    collaborative layouts.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          <Switch
            checked={filters.groupStudyOnly}
            onCheckedChange={(v) => onChange({ groupStudyOnly: v })}
            aria-label="Group study rooms"
          />
        </div>

        {activeCount > 0 && (
          <button
            onClick={() =>
              onChange({ groupStudyOnly: false, startTime: null, minDurationHours: null })
            }
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all filters
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
