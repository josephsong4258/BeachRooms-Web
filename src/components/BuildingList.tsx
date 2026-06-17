'use client';
import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  classifyRoom,
  CountBadge,
  FavoriteStar,
  RoomRow,
} from '@/components/building-shared';
import type { BuildingWithRooms, RoomAvailability } from '@/types';

// The University Library is a "special place" (no scraped rooms, so it's not in
// `buildings`), but it lists and favorites like a building. Passed in so it can
// be interleaved alphabetically and pinned to the favorites section.
export interface LibraryEntry {
  name: string;
  isOpen: boolean;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}

interface BuildingListProps {
  buildings: BuildingWithRooms[];
  onOpenBuilding: (building: BuildingWithRooms) => void;
  onRoomClick: (room: RoomAvailability, building: BuildingWithRooms) => void;
  // Room-number query; narrows the count and hides buildings with no match
  searchQuery: string;
  favoriteRoomIds: Set<string>;
  favoriteBuildingIds: Set<string>;
  onToggleFavoriteRoom: (id: string) => void;
  onToggleFavoriteBuilding: (id: string) => void;
  // The library, or null when search/filters hide it
  libraryEntry: LibraryEntry | null;
  // Hidden while searching — search results take over the whole list
  showFavorites: boolean;
}

// A building row that navigates to its page (chevron-right) instead of
// expanding inline. Mirrors the old BuildingItem header metrics.
function BuildingNavRow({
  building,
  searchQuery,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  building: BuildingWithRooms;
  searchQuery: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}) {
  const q = searchQuery.trim().toLowerCase();
  const rooms = q
    ? building.rooms.filter((r) => r.room_number.toLowerCase().includes(q))
    : building.rooms;

  if (q && rooms.length === 0) return null;

  const available = rooms.filter((r) => r.isAvailable).length;

  return (
    <div className="flex w-full items-center border-b border-border/60 py-2 pr-1 transition-colors hover:bg-accent/40">
      <FavoriteStar
        active={isFavorite}
        onToggle={onToggleFavorite}
        label={isFavorite ? 'Remove building from favorites' : 'Add building to favorites'}
      />
      <button
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center justify-between text-left"
      >
        <span className="ml-1 truncate text-sm font-semibold text-foreground/85">
          {building.name}
        </span>
        <div className="flex shrink-0 items-center gap-2 pl-2">
          <CountBadge available={available} total={rooms.length} closed={!building.isOpen} />
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
      </button>
    </div>
  );
}

// The library row: same shape as BuildingNavRow, but a status pill (Open/Closed)
// stands in for the room-count badge, and it navigates to the library page.
function LibraryNavRow({ entry }: { entry: LibraryEntry }) {
  return (
    <div className="flex w-full items-center border-b border-border/60 py-2 pr-1 transition-colors hover:bg-accent/40">
      <FavoriteStar
        active={entry.isFavorite}
        onToggle={entry.onToggleFavorite}
        label={entry.isFavorite ? 'Remove library from favorites' : 'Add library to favorites'}
      />
      <button
        onClick={entry.onOpen}
        className="flex min-w-0 flex-1 items-center justify-between text-left"
      >
        <span className="ml-1 truncate text-sm font-semibold text-foreground/85">{entry.name}</span>
        <div className="flex shrink-0 items-center gap-2 pl-2">
          <span
            className={`min-w-[37px] rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold ${
              entry.isOpen
                ? 'border-[#7ee8a0] bg-[#e6f9ec] text-[#1a9e3f]'
                : 'border-[#d4d4d8] bg-[#f4f4f5] text-[#6b7280]'
            }`}
          >
            {entry.isOpen ? 'Open' : 'Closed'}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
      </button>
    </div>
  );
}

function SectionDivider() {
  return <div className="my-1.5 h-px bg-border" aria-hidden="true" />;
}

// One alphabetical stream of building + library rows; the library carries its
// own favorite/open state since it isn't a BuildingWithRooms.
type NavRow =
  | { kind: 'building'; name: string; building: BuildingWithRooms }
  | { kind: 'library'; name: string; entry: LibraryEntry };

function BuildingList({
  buildings,
  onOpenBuilding,
  onRoomClick,
  searchQuery,
  favoriteRoomIds,
  favoriteBuildingIds,
  onToggleFavoriteRoom,
  onToggleFavoriteBuilding,
  libraryEntry,
  showFavorites,
}: BuildingListProps) {
  const now = Date.now();

  // Pinned favorite rooms, sorted: available first, then by building code and
  // numeric room number
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

  // Buildings + the library, as one stream sorted by name.
  const allRows: NavRow[] = buildings.map((b) => ({ kind: 'building', name: b.name, building: b }));
  if (libraryEntry) {
    allRows.push({ kind: 'library', name: libraryEntry.name, entry: libraryEntry });
  }
  const isRowFavorite = (r: NavRow) =>
    r.kind === 'building' ? favoriteBuildingIds.has(r.building.id) : r.entry.isFavorite;
  const byName = (a: NavRow, b: NavRow) => a.name.localeCompare(b.name);

  // Favorited rows move to the top section rather than appearing twice.
  const favoriteRows = showFavorites ? allRows.filter(isRowFavorite).sort(byName) : [];
  const mainRows = (showFavorites ? allRows.filter((r) => !isRowFavorite(r)) : allRows).sort(byName);
  const hasFavorites = favoriteRooms.length > 0 || favoriteRows.length > 0;

  const renderRow = (r: NavRow) =>
    r.kind === 'building' ? (
      <BuildingNavRow
        key={r.building.id}
        building={r.building}
        searchQuery={searchQuery}
        isFavorite={favoriteBuildingIds.has(r.building.id)}
        onToggleFavorite={() => onToggleFavoriteBuilding(r.building.id)}
        onOpen={() => onOpenBuilding(r.building)}
      />
    ) : (
      <LibraryNavRow key="library" entry={r.entry} />
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
          {favoriteRows.map(renderRow)}
          <SectionDivider />
        </>
      )}
      {mainRows.map(renderRow)}
    </div>
  );
}

export default memo(BuildingList);
