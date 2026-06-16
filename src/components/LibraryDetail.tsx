'use client';
import Image from 'next/image';
import { ArrowLeft, Calendar, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LIBRARY,
  LIBRARY_IMAGE,
  libraryHoursToday,
  isLibraryOpen,
  type LibraryFloor,
} from '@/data/library';

interface LibraryDetailProps {
  onBack: () => void;
  onOpenFloor: (floorId: string) => void;
}

function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function FloorRow({ floor, onOpen }: { floor: LibraryFloor; onOpen: () => void }) {
  const quiet = floor.type === 'quiet';
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-border/60 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/40"
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          quiet ? 'bg-[#eef2ff] text-[#4f46e5]' : 'bg-[#fef6e6] text-[#b5850b]'
        }`}
      >
        {quiet ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{floor.name}</span>
        {floor.note && (
          <span className="block truncate text-[13px] text-muted-foreground">{floor.note}</span>
        )}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
    </button>
  );
}

function FloorGroup({
  label,
  floors,
  onOpenFloor,
}: {
  label: string;
  floors: LibraryFloor[];
  onOpenFloor: (id: string) => void;
}) {
  if (floors.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        <span className="text-muted-foreground/60"> · {floors.length}</span>
      </p>
      <div>
        {floors.map((f) => (
          <FloorRow key={f.id} floor={f} onOpen={() => onOpenFloor(f.id)} />
        ))}
      </div>
    </div>
  );
}

export default function LibraryDetail({ onBack, onOpenFloor }: LibraryDetailProps) {
  const open = isLibraryOpen();
  const todayHours = libraryHoursToday();
  const quietFloors = LIBRARY.floors.filter((f) => f.type === 'quiet');
  const groupFloors = LIBRARY.floors.filter((f) => f.type === 'group');

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b p-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{LIBRARY.name}</h2>
          <p className="text-xs text-muted-foreground">{LIBRARY.neighborhood}</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Photo hero */}
        <div className="relative h-[210px] w-full shrink-0 overflow-hidden bg-muted">
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
        <div className="flex items-center gap-4 border-b px-4 py-3 text-[13px] text-muted-foreground">
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

        <div className="space-y-5 p-4">
          <FloorGroup label="Quiet study" floors={quietFloors} onOpenFloor={onOpenFloor} />
          <FloorGroup label="Group study" floors={groupFloors} onOpenFloor={onOpenFloor} />
        </div>
      </ScrollArea>
    </div>
  );
}
