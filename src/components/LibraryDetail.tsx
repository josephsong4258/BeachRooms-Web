'use client';
import Image from 'next/image';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import StudySpotRow from '@/components/StudySpotRow';
import {
  LIBRARY,
  LIBRARY_IMAGE,
  libraryHoursToday,
  isLibraryOpen,
} from '@/data/library';

interface LibraryDetailProps {
  onBack: () => void;
  onOpenFloor: (floorId: string) => void;
  isMobile: boolean;
}

function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function LibraryDetail({ onBack, onOpenFloor, isMobile }: LibraryDetailProps) {
  const open = isLibraryOpen();
  const todayHours = libraryHoursToday();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{LIBRARY.name}</h2>
          <p className="text-xs text-muted-foreground">{LIBRARY.neighborhood}</p>
        </div>
      </div>

      {/* Radix wraps the viewport content in a `display:table; min-width:100%`
          div, which sizes to its widest child. The 4th-floor `truncate` note
          (white-space:nowrap) would otherwise force that table — and the w-full
          hero — wider than the column, clipping the right edge. Forcing the
          wrapper to `block` makes it fill the width and lets truncate work. */}
      <ScrollArea className="flex-1 [&_[data-radix-scroll-area-viewport]>div]:!block">
        {/* Photo hero */}
        <div className={`relative ${isMobile ? 'h-[140px]' : 'h-[210px]'} w-full shrink-0 overflow-hidden bg-muted`}>
          <Image
            src={LIBRARY_IMAGE}
            alt="University Library"
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            className="object-cover"
          />
          <div className="absolute bottom-2.5 right-2.5">
            <span
              className={`inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold shadow-md ${
                open
                  ? 'border-[#7ee8a0] bg-[#e6f9ec] text-[#1a9e3f]'
                  : 'border-[#d4d4d8] bg-[#f4f4f5] text-[#6b7280]'
              }`}
            >
              <span className={`h-[7px] w-[7px] rounded-full ${open ? 'bg-[#1a9e3f]' : 'bg-[#6b7280]'}`} />
              {open ? 'Open' : 'Closed'}
            </span>
          </div>
        </div>

        {/* Hours */}
        <div className={`flex items-center gap-4 border-b px-4 text-[13px] text-muted-foreground ${isMobile ? 'py-2' : 'py-3'}`}>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {todayHours ? (
              <>
                Open{' '}
                <span className="font-semibold text-foreground">
                  {formatClock(todayHours.open)} – {formatClock(todayHours.close)}
                </span>
              </>
            ) : (
              <span className="font-semibold text-foreground">Closed today</span>
            )}
          </span>
        </div>

        {/* Floors, listed Lower Level → 5th. One ordered list: the noise icon
            on each row marks quiet vs. collaborative, so no further grouping. */}
        <div className={`px-4 pb-4 ${isMobile ? 'pt-2' : 'pt-4'}`}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Floors
            <span className="text-muted-foreground/60"> · {LIBRARY.floors.length}</span>
          </p>
          <div>
            {LIBRARY.floors.map((f) => (
              <StudySpotRow
                key={f.id}
                name={f.name}
                note={f.note}
                type={f.type}
                onClick={() => onOpenFloor(f.id)}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
