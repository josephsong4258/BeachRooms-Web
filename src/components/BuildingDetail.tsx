'use client';
import Image from 'next/image';
import { ArrowLeft, Accessibility, Calendar, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { groupRooms, RoomRow, ClosedPanel } from '@/components/building-shared';
import StudySpotRow from '@/components/StudySpotRow';
import { buildingNeighborhood } from '@/lib/neighborhoods';
import { buildingImage } from '@/lib/building-images';
import { effectiveHours } from '@/lib/building-hours';
import { buildingStudySpots, type StudySpot } from '@/data/study-spots';
import type { BuildingWithRooms, RoomAvailability } from '@/types';

interface BuildingDetailProps {
  building: BuildingWithRooms;
  onBack: () => void;
  onRoomClick: (room: RoomAvailability, building: BuildingWithRooms) => void;
  onSpotClick: (spot: StudySpot) => void;
  favoriteRoomIds: Set<string>;
  onToggleFavoriteRoom: (id: string) => void;
  favoriteBuildingIds: Set<string>;
  onToggleFavoriteBuilding: (id: string) => void;
}

function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      <span className="text-muted-foreground/60"> · {count}</span>
    </p>
  );
}

function PhotoHero({
  building,
  imageSrc,
  available,
  total,
}: {
  building: BuildingWithRooms;
  imageSrc: string | null;
  available: number;
  total: number;
}) {
  const open = building.isOpen;
  const hasRoomsOpen = available > 0;

  let pillCls: string;
  let pillDot: string;
  let pillText: string;
  if (!open) {
    pillCls = 'border-[#d4d4d8] bg-[#f4f4f5] text-[#6b7280]';
    pillDot = 'bg-[#6b7280]';
    pillText = building.closedForSemester ? 'Closed for summer' : 'Closed';
  } else if (hasRoomsOpen) {
    pillCls = 'border-[#7ee8a0] bg-[#e6f9ec] text-[#1a9e3f]';
    pillDot = 'bg-[#1a9e3f]';
    pillText = `${available} of ${total} open`;
  } else {
    pillCls = 'border-[#f5a3ab] bg-[#fde8ea] text-[#c9303a]';
    pillDot = 'bg-[#c9303a]';
    pillText = `${available} of ${total} open`;
  }

  return (
    <div className="relative h-[210px] w-full shrink-0 overflow-hidden bg-muted">
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={`${building.name} exterior`}
          fill
          sizes="(max-width: 1024px) 100vw, 420px"
          className="object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, hsl(var(--muted)) 0 14px, hsl(var(--muted-foreground) / 0.06) 14px 28px)',
          }}
        >
          <span className="font-mono text-xs tracking-wide text-muted-foreground/70">
            {building.code} building photo
          </span>
        </div>
      )}
      <div className="absolute bottom-2.5 right-2.5">
        <span
          className={`inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold shadow-md ${pillCls}`}
        >
          <span className={`h-[7px] w-[7px] rounded-full ${pillDot}`} />
          {pillText}
        </span>
      </div>
    </div>
  );
}

export default function BuildingDetail({
  building,
  onBack,
  onRoomClick,
  onSpotClick,
  favoriteRoomIds,
  onToggleFavoriteRoom,
  favoriteBuildingIds,
  onToggleFavoriteBuilding,
}: BuildingDetailProps) {
  const isFavorite = favoriteBuildingIds.has(building.id);
  const accessible = building.rooms.some((r) => r.is_accessible);
  const neighborhood = buildingNeighborhood(building.code);
  // Open study areas (e.g. the Horn Center's), rateable like library floors.
  const spots = buildingStudySpots(building.code);
  // Prefer a DB-provided photo; otherwise use the bundled one for this code.
  const imageSrc = building.imageUrl ?? buildingImage(building.code);
  // Today's effective hours (folds in per-building overrides); null = closed today.
  const todayHours = effectiveHours(
    building.code,
    building.weekday_open,
    building.weekday_close,
    new Date()
  );

  const grouped = groupRooms(building.rooms);
  const available = grouped.available;
  const openingSoon = grouped.openingSoon;
  const occupied = grouped.occupied;

  const groups: { label: string; type: 'available' | 'openingSoon' | 'occupied'; rooms: RoomAvailability[] }[] = [
    { label: 'Available', type: 'available', rooms: available },
    { label: 'Opening soon', type: 'openingSoon', rooms: openingSoon },
    { label: 'Occupied', type: 'occupied', rooms: occupied },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header — same shape as RoomDetail */}
      <div className="flex items-start gap-2 border-b p-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{building.name}</h2>
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium">{building.code}</span>
            {neighborhood && (
              <>
                <span aria-hidden className="text-muted-foreground/50">·</span>
                <span className="truncate">{neighborhood}</span>
              </>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => onToggleFavoriteBuilding(building.id)}
          aria-label={isFavorite ? 'Remove building from favorites' : 'Add building to favorites'}
          aria-pressed={isFavorite}
        >
          <Star
            className={
              isFavorite ? 'h-4 w-4 fill-[#f0b429] text-[#f0b429]' : 'h-4 w-4 text-muted-foreground'
            }
          />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <PhotoHero building={building} imageSrc={imageSrc} available={available.length} total={building.rooms.length} />

        {/* Meta strip — hours + accessibility */}
        <div className="flex items-center gap-4 border-b px-4 py-3 text-[13px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {building.closedForSemester ? (
              <span className="font-semibold text-foreground">Closed for summer</span>
            ) : todayHours ? (
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
          {accessible && (
            <span className="inline-flex items-center gap-1.5">
              <Accessibility className="h-3.5 w-3.5" />
              Accessible
            </span>
          )}
        </div>

        {/* Open study areas (collaborative spaces, rateable like library
            floors). Shown regardless of open/closed so they can be browsed
            and rated anytime. */}
        {spots.length > 0 && (
          <div className="border-b px-4 pb-4 pt-4">
            <SectionLabel label="Study spots" count={spots.length} />
            <div>
              {spots.map((spot) => (
                <StudySpotRow
                  key={spot.placeId}
                  name={spot.name}
                  note={spot.note}
                  type={spot.type}
                  onClick={() => onSpotClick(spot)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Rooms (or closed message) */}
        {building.isOpen ? (
          <div className="flex flex-col gap-4 px-4 pb-5 pt-4">
            {groups.map(
              (g) =>
                g.rooms.length > 0 && (
                  <div key={g.type}>
                    <SectionLabel label={g.label} count={g.rooms.length} />
                    <div>
                      {g.rooms.map((r) => (
                        <RoomRow
                          key={r.id}
                          room={r}
                          type={g.type}
                          buildingCode={building.code}
                          onClick={() => onRoomClick(r, building)}
                          isFavorite={favoriteRoomIds.has(r.id)}
                          onToggleFavorite={() => onToggleFavoriteRoom(r.id)}
                        />
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        ) : (
          <div className="px-4 pb-5 pt-4">
            <ClosedPanel building={building} />
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
