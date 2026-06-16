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

function SectionDivider() {
  return <div className="my-1.5 h-px bg-border" aria-hidden="true" />;
}

function BuildingList({
  buildings,
  onOpenBuilding,
  onRoomClick,
  searchQuery,
  favoriteRoomIds,
  favoriteBuildingIds,
  onToggleFavoriteRoom,
  onToggleFavoriteBuilding,
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

  // Favorited buildings move to the top section rather than appearing twice
  const favoriteBuildings = showFavorites
    ? buildings.filter((b) => favoriteBuildingIds.has(b.id))
    : [];
  const mainBuildings = showFavorites
    ? buildings.filter((b) => !favoriteBuildingIds.has(b.id))
    : buildings;
  const hasFavorites = favoriteRooms.length > 0 || favoriteBuildings.length > 0;

  const renderBuilding = (b: BuildingWithRooms) => (
    <BuildingNavRow
      key={b.id}
      building={b}
      searchQuery={searchQuery}
      isFavorite={favoriteBuildingIds.has(b.id)}
      onToggleFavorite={() => onToggleFavoriteBuilding(b.id)}
      onOpen={() => onOpenBuilding(b)}
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

export default memo(BuildingList);
