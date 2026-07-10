'use client';
import { useState } from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { campusNow } from '@/lib/campus-time';
import { formatTimeDisplay } from '@/lib/time-utils';

// Time-travel control: a trigger pill ("Now" or the picked time) plus the
// date/time picker (drawer on mobile, dialog on desktop). Self-contained so it
// can live in the sidebar header (desktop) or float over the map (mobile).
interface TimeTravelProps {
  selectedDateTime: Date | null;
  onDateTimeChange: (dt: Date | null) => void;
  isFetching: boolean;
  isMobile: boolean;
  // Extra classes for the trigger button (e.g. absolute positioning on the map).
  className?: string;
  // Smaller trigger for the map overlay, where space is tight.
  compact?: boolean;
}

export default function TimeTravel({
  selectedDateTime,
  onDateTimeChange,
  isFetching,
  isMobile,
  className,
  compact = false,
}: TimeTravelProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState('');
  const [pickerTime, setPickerTime] = useState('');
  const isCustomTime = selectedDateTime !== null;

  function openDatePicker() {
    // Prefill with campus time: the picked value is interpreted as campus
    // wall-clock by the API, so the default should read as campus time too.
    const now = selectedDateTime ?? campusNow();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setPickerDate(`${y}-${m}-${d}`);
    setPickerTime(`${h}:${min}`);
    setShowDatePicker(true);
  }

  function applyDateTime() {
    if (!pickerDate || !pickerTime) return;
    const dt = new Date(`${pickerDate}T${pickerTime}:00`);
    if (!isNaN(dt.getTime())) onDateTimeChange(dt);
    setShowDatePicker(false);
  }

  function resetToNow() {
    onDateTimeChange(null);
    setShowDatePicker(false);
  }

  const pickerContent = (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Date</label>
        <input
          type="date"
          value={pickerDate}
          onChange={(e) => setPickerDate(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Time</label>
        <input
          type="time"
          value={pickerTime}
          onChange={(e) => setPickerTime(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button onClick={applyDateTime} className="w-full">Apply</Button>
      {isCustomTime && (
        <Button
          variant="ghost"
          onClick={resetToNow}
          className="w-full gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Back to current time
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Button
        variant={isCustomTime ? 'secondary' : 'outline'}
        size="sm"
        onClick={openDatePicker}
        disabled={isFetching}
        className={`${compact ? 'h-7 gap-1 px-2 text-[11px]' : 'gap-1.5 text-xs'} ${className ?? ''}`}
      >
        <Calendar className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {isCustomTime ? formatTimeDisplay(selectedDateTime) : 'Now'}
      </Button>

      {isMobile ? (
        <Drawer open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Check availability at...</DrawerTitle>
            </DrawerHeader>
            {pickerContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Check availability at...</DialogTitle>
            </DialogHeader>
            {pickerContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
