'use client';
import { memo, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, ChevronRight, Star } from 'lucide-react';
import type { BuildingWithRooms, RoomAvailability } from '@/types';

const OPENING_SOON_MINUTES = 30;

type RoomGroup = 'available' | 'openingSoon' | 'occupied';

interface BuildingAccordionProps {
  buildings: BuildingWithRooms[];
  expandedItems: string[];
  onToggle: (id: string) => void;
  onRoomClick: (room: RoomAvailability, building: BuildingWithRooms) => void;
  searchQuery: string;
  favoriteRoomIds: Set<string>;
  favoriteBuildingIds: Set<string>;
  onToggleFavoriteRoom: (id: string) => void;
  onToggleFavoriteBuilding: (id: string) => void;
  // Hidden while searching — search results take over the whole list
  showFavorites: boolean;
}

function classifyRoom(room: RoomAvailability, now: number): RoomGroup {
  if (room.isAvailable) return 'available';
  if (room.status === 'in_use' && room.currentClassEndsAt) {
    const minutes = Math.floor((new Date(room.currentClassEndsAt).getTime() - now) / 60000);
    if (minutes > 0 && minutes <= OPENING_SOON_MINUTES) return 'openingSoon';
  }
  return 'occupied';
}

function groupRooms(rooms: RoomAvailability[]) {
  const now = Date.now();
  const available: RoomAvailability[] = [];
  const openingSoon: RoomAvailability[] = [];
  const occupied: RoomAvailability[] = [];

  for (const r of rooms) {
    const group = classifyRoom(r, now);
    if (group === 'available') available.push(r);
    else if (group === 'openingSoon') openingSoon.push(r);
    else occupied.push(r);
  }

  openingSoon.sort((a, b) => {
    const ae = a.currentClassEndsAt ? new Date(a.currentClassEndsAt).getTime() : 0;
    const be = b.currentClassEndsAt ? new Date(b.currentClassEndsAt).getTime() : 0;
    return ae - be;
  });

  return { available, openingSoon, occupied };
}

function formatTime(d: Date): string {
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

function PinIcon({ type }: { type: RoomGroup }) {
  const src =
    type === 'available'
      ? '/assets/pins/pin-green.png'
      : type === 'openingSoon'
        ? '/assets/pins/pin-amber.png'
        : '/assets/pins/pin-red.png';
  return <Image src={src} alt="" width={22} height={22} className="shrink-0" />;
}

function CountdownChip({ minutes }: { minutes: number }) {
  const label = minutes <= 1 ? 'Free in <1 min' : `Free in ${minutes} min`;
  return (
    <span className="rounded-full border border-[#f5d78a] bg-[#fef6e6] px-2 py-0.5 text-[11px] font-semibold text-[#b5850b]">
      {label}
    </span>
  );
}

function CountBadge({ available, total }: { available: number; total: number }) {
  const has = available > 0;
  const cls = has
    ? 'bg-[#e6f9ec] border-[#7ee8a0] text-[#1a9e3f]'
    : 'bg-[#fde8ea] border-[#f5a3ab] text-[#c9303a]';
  return (
    <span
      className={`min-w-[37px] text-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {available}/{total}
    </span>
  );
}

function StatusText({ room, type }: { room: RoomAvailability; type: RoomGroup }) {
  if (type === 'available' && room.nextClassStartsAt && room.minutesUntilNextClass != null) {
    return (
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Available for <span className="font-bold">{formatDuration(room.minutesUntilNextClass)}</span>{' '}
        until <span className="font-bold">{formatTime(new Date(room.nextClassStartsAt))}</span>
      </p>
    );
  }

  if (type === 'available') {
    // "Free until 11:00 PM (2h 30m)"
    const m = room.statusText.match(/Free until (.+?\s[AP]M)\s*\((.+?)\)/);
    if (m) {
      return (
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Available for <span className="font-bold">{m[2]}</span> until{' '}
          <span className="font-bold">{m[1]}</span>
        </p>
      );
    }
    // "9:00 AM - 11:00 PM\n(14h free)" — produced when there are no more classes today
    const m2 = room.statusText.match(/[\d:]+\s[AP]M\s*-\s*(.+?\s[AP]M)\s*\n?\((.+?)\s*free\)/);
    if (m2) {
      return (
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Available for <span className="font-bold">{m2[2]}</span> until{' '}
          <span className="font-bold">{m2[1]}</span>
        </p>
      );
    }
  }

  if (type === 'openingSoon' && room.currentClassEndsAt) {
    return (
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Free at <span className="font-bold">{formatTime(new Date(room.currentClassEndsAt))}</span>
      </p>
    );
  }

  if (type === 'occupied') {
    const m = room.statusText.match(/Free at (.+?\s[AP]M) for (.+)/);
    if (m) {
      return (
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Free at <span className="font-bold">{m[1]}</span> for <span className="font-bold">{m[2]}</span>
        </p>
      );
    }
  }

  return (
    <p className="mt-0.5 text-[13px] text-muted-foreground line-clamp-1">
      {room.statusText.split('\n')[0]}
    </p>
  );
}

function FavoriteStar({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      aria-pressed={active}
      className="shrink-0 p-1"
    >
      <Star
        className={
          active
            ? 'h-3.5 w-3.5 fill-[#f0b429] text-[#f0b429]'
            : 'h-3.5 w-3.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground'
        }
      />
    </button>
  );
}

function RoomRow({
  room,
  type,
  buildingCode,
  onClick,
  isFavorite,
  onToggleFavorite,
}: {
  room: RoomAvailability;
  type: RoomGroup;
  buildingCode: string;
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const minutesUntilFree =
    type === 'openingSoon' && room.currentClassEndsAt
      ? Math.max(1, Math.floor((new Date(room.currentClassEndsAt).getTime() - Date.now()) / 60000))
      : null;

  // Wrapper is a div (not a button) so the star can be its own button —
  // nested buttons are invalid HTML
  return (
    <div className="flex w-full items-center border-b border-border/60 py-2 pl-1 transition-colors last:border-b-0 hover:bg-accent/40">
      <FavoriteStar
        active={isFavorite}
        onToggle={onToggleFavorite}
        label={isFavorite ? 'Remove room from favorites' : 'Add room to favorites'}
      />
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center text-left">
        <PinIcon type={type} />
        <div className="ml-2.5 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {buildingCode} {room.room_number}
            </span>
            {minutesUntilFree !== null && <CountdownChip minutes={minutesUntilFree} />}
          </div>
          <StatusText room={room} type={type} />
        </div>
      </button>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
    </div>
  );
}

function SectionHeader({
  label,
  expanded,
  onToggle,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between py-1 pr-1 text-foreground/70"
    >
      <span className="text-[13px] font-medium">{label}</span>
      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );
}

function BuildingItem({
  building,
  expanded,
  onToggleBuilding,
  onRoomClick,
  searchQuery,
  isFavorite,
  onToggleFavorite,
  favoriteRoomIds,
  onToggleFavoriteRoom,
}: {
  building: BuildingWithRooms;
  expanded: boolean;
  onToggleBuilding: (id: string) => void;
  onRoomClick: (room: RoomAvailability, building: BuildingWithRooms) => void;
  searchQuery: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  favoriteRoomIds: Set<string>;
  onToggleFavoriteRoom: (id: string) => void;
}) {
  const [availOpen, setAvailOpen] = useState(true);
  const [soonOpen, setSoonOpen] = useState(true);
  const [occOpen, setOccOpen] = useState(false);

  const grouped = useMemo(() => groupRooms(building.rooms), [building.rooms]);

  const q = searchQuery.trim().toLowerCase();
  const filt = (rs: RoomAvailability[]) =>
    q ? rs.filter((r) => r.room_number.toLowerCase().includes(q)) : rs;

  const available = filt(grouped.available);
  const openingSoon = filt(grouped.openingSoon);
  const occupied = filt(grouped.occupied);
  const totalVisible = available.length + openingSoon.length + occupied.length;

  if (q && totalVisible === 0) return null;

  return (
    <div className="border-b border-border/60">
      <div className="flex w-full items-center py-2 pr-1">
        <FavoriteStar
          active={isFavorite}
          onToggle={onToggleFavorite}
          label={isFavorite ? 'Remove building from favorites' : 'Add building to favorites'}
        />
        <button
          onClick={() => onToggleBuilding(building.id)}
          className="flex min-w-0 flex-1 items-center justify-between text-left"
        >
          <span className="ml-1 truncate text-sm font-semibold text-foreground/85">{building.name}</span>
          <div className="flex shrink-0 items-center gap-2 pl-2">
            <CountBadge available={available.length} total={totalVisible} />
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-foreground/70" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-foreground/70" />
            )}
          </div>
        </button>
      </div>

      {expanded && (
        <div className="pb-1">
          {available.length > 0 && (
            <>
              <SectionHeader
                label="Available"
                expanded={availOpen}
                onToggle={() => setAvailOpen(!availOpen)}
              />
              {availOpen &&
                available.map((r) => (
                  <RoomRow
                    key={r.id}
                    room={r}
                    type="available"
                    buildingCode={building.code}
                    onClick={() => onRoomClick(r, building)}
                    isFavorite={favoriteRoomIds.has(r.id)}
                    onToggleFavorite={() => onToggleFavoriteRoom(r.id)}
                  />
                ))}
            </>
          )}

          {openingSoon.length > 0 && (
            <>
              <SectionHeader
                label="Opening Soon"
                expanded={soonOpen}
                onToggle={() => setSoonOpen(!soonOpen)}
              />
              {soonOpen &&
                openingSoon.map((r) => (
                  <RoomRow
                    key={r.id}
                    room={r}
                    type="openingSoon"
                    buildingCode={building.code}
                    onClick={() => onRoomClick(r, building)}
                    isFavorite={favoriteRoomIds.has(r.id)}
                    onToggleFavorite={() => onToggleFavoriteRoom(r.id)}
                  />
                ))}
            </>
          )}

          {occupied.length > 0 && (
            <>
              <SectionHeader
                label="Occupied"
                expanded={occOpen}
                onToggle={() => setOccOpen(!occOpen)}
              />
              {occOpen &&
                occupied.map((r) => (
                  <RoomRow
                    key={r.id}
                    room={r}
                    type="occupied"
                    buildingCode={building.code}
                    onClick={() => onRoomClick(r, building)}
                    isFavorite={favoriteRoomIds.has(r.id)}
                    onToggleFavorite={() => onToggleFavoriteRoom(r.id)}
                  />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SectionDivider() {
  return <div className="my-1.5 h-px bg-border" aria-hidden="true" />;
}

function BuildingAccordion({
  buildings,
  expandedItems,
  onToggle,
  onRoomClick,
  searchQuery,
  favoriteRoomIds,
  favoriteBuildingIds,
  onToggleFavoriteRoom,
  onToggleFavoriteBuilding,
  showFavorites,
}: BuildingAccordionProps) {
  const now = Date.now();

  // Pinned favorite rooms, sorted like rooms within a building: available
  // first, then by building code and numeric room number
  const favoriteRooms = showFavorites
    ? buildings
        .flatMap((b) =>
          b.rooms
            .filter((r) => favoriteRoomIds.has(r.id))
            .map((r) => ({ room: r, building: b }))
        )
        .sort((a, b) => {
          if (a.room.isAvailable !== b.room.isAvailable) return a.room.isAvailable ? -1 : 1;
          const byCode = a.building.code.localeCompare(b.building.code);
          if (byCode !== 0) return byCode;
          return a.room.room_number.localeCompare(b.room.room_number, undefined, { numeric: true });
        })
    : [];

  // Favorited buildings move to the top section rather than appearing twice
  const favoriteBuildings = showFavorites
    ? buildings.filter((b) => favoriteBuildingIds.has(b.id))
    : [];
  const mainBuildings = showFavorites
    ? buildings.filter((b) => !favoriteBuildingIds.has(b.id))
    : buildings;
  const hasFavorites = favoriteRooms.length > 0 || favoriteBuildings.length > 0;

  const renderBuilding = (b: BuildingWithRooms) => (
    <BuildingItem
      key={b.id}
      building={b}
      expanded={expandedItems.includes(b.id)}
      onToggleBuilding={onToggle}
      onRoomClick={onRoomClick}
      searchQuery={searchQuery}
      isFavorite={favoriteBuildingIds.has(b.id)}
      onToggleFavorite={() => onToggleFavoriteBuilding(b.id)}
      favoriteRoomIds={favoriteRoomIds}
      onToggleFavoriteRoom={onToggleFavoriteRoom}
    />
  );

  return (
    <div className="w-full px-2">
      {hasFavorites && (
        <>
          {favoriteRooms.map(({ room, building }) => (
            <RoomRow
              key={`fav-${room.id}`}
              room={room}
              type={classifyRoom(room, now)}
              buildingCode={building.code}
              onClick={() => onRoomClick(room, building)}
              isFavorite
              onToggleFavorite={() => onToggleFavoriteRoom(room.id)}
            />
          ))}
          {favoriteRooms.length > 0 && favoriteBuildings.length > 0 && <SectionDivider />}
          {favoriteBuildings.map(renderBuilding)}
          <SectionDivider />
        </>
      )}
      {mainBuildings.map(renderBuilding)}
    </div>
  );
}

export default memo(BuildingAccordion);
