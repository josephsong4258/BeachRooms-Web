'use client';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, X, RotateCcw } from 'lucide-react';
import Fuse from 'fuse.js';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import TimeTravel from '@/components/TimeTravel';
import BuildingList from '@/components/BuildingList';
import BuildingDetail from '@/components/BuildingDetail';
import ParkingDetail from '@/components/ParkingDetail';
import LibraryDetail from '@/components/LibraryDetail';
import StudySpotDetail from '@/components/StudySpotDetail';
import RoomDetail from '@/components/RoomDetail';
import { PARKING_LOTS } from '@/data/parking';
import { LIBRARY, isLibraryOpen, libraryFloorSpot } from '@/data/library';
import type { StudySpot } from '@/data/study-spots';
import SettingsMenu, { type AppSettings } from '@/components/SettingsMenu';
import FilterMenu, { EMPTY_FILTERS, type RoomFilters } from '@/components/FilterMenu';
import SignInDialog from '@/components/SignInDialog';
import { useFavorites } from '@/lib/use-favorites';
import { effectiveHours } from '@/lib/building-hours';
import { campusNow } from '@/lib/campus-time';
import type { BuildingWithRooms, RoomAvailability } from '@/types';

function parseMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// A room is "free during" a window if the building is open (for refDate's day,
// folding in any hours override) for the whole window and no class overlaps it.
function isRoomFreeDuring(
  room: RoomAvailability,
  building: BuildingWithRooms,
  startMin: number,
  endMin: number,
  refDate: Date
): boolean {
  const hours = effectiveHours(building.code, building.weekday_open, building.weekday_close, refDate);
  if (!hours) return false;
  if (startMin < parseMinutes(hours.open)) return false;
  if (endMin > parseMinutes(hours.close)) return false;
  return !room.todaySchedules.some(
    (s) => parseMinutes(s.start_time) < endMin && parseMinutes(s.end_time) > startMin
  );
}

interface SidebarProps {
  buildings: BuildingWithRooms[];
  isFetching: boolean;
  selectedDateTime: Date | null;
  onDateTimeChange: (dt: Date | null) => void;
  // Which building page is open (null = list). Lives in page.tsx so map-marker
  // taps can open it too.
  viewBuildingId: string | null;
  onOpenBuilding: (building: BuildingWithRooms) => void;
  onCloseBuilding: () => void;
  // Which parking-lot page is open (null = none); opened from map clicks.
  viewParkingId: string | null;
  onCloseParking: () => void;
  // Library overview page (opened from the map pin or the list entry).
  viewLibrary: boolean;
  onOpenLibrary: () => void;
  onCloseLibrary: () => void;
  isMobile: boolean;
  settings: AppSettings;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
}

export default function Sidebar({
  buildings,
  isFetching,
  selectedDateTime,
  onDateTimeChange,
  viewBuildingId,
  onOpenBuilding,
  onCloseBuilding,
  viewParkingId,
  onCloseParking,
  viewLibrary,
  onOpenLibrary,
  onCloseLibrary,
  isMobile,
  settings,
  onSettingsChange,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RoomFilters>(EMPTY_FILTERS);
  const [selectedRoom, setSelectedRoom] = useState<RoomAvailability | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingWithRooms | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  // Which study-spot sub-page is open — a library floor or a building's study
  // area. Reset whenever the parent page (library or building) changes so it
  // never lingers over the wrong context.
  const [selectedSpot, setSelectedSpot] = useState<StudySpot | null>(null);
  useEffect(() => {
    setSelectedSpot(null);
  }, [viewLibrary, viewBuildingId]);

  const {
    signedIn,
    favoriteRoomIds,
    favoriteBuildingIds,
    favoritePlaceIds,
    toggleRoomFavorite,
    toggleBuildingFavorite,
    togglePlaceFavorite,
  } = useFavorites();

  const handleToggleFavoriteRoom = useCallback(
    (id: string) => (signedIn ? toggleRoomFavorite(id) : setShowSignIn(true)),
    [signedIn, toggleRoomFavorite]
  );
  const handleToggleFavoriteBuilding = useCallback(
    (id: string) => (signedIn ? toggleBuildingFavorite(id) : setShowSignIn(true)),
    [signedIn, toggleBuildingFavorite]
  );
  const handleToggleFavoritePlace = useCallback(
    (id: string) => (signedIn ? togglePlaceFavorite(id) : setShowSignIn(true)),
    [signedIn, togglePlaceFavorite]
  );

  // Apply filters (group study, free-from time window) and recompute building counts
  const baseBuildings = useMemo(() => {
    const { groupStudyOnly, minDurationHours } = filters;
    const hasWindow = minDurationHours !== null;
    // Closed-for-summer buildings exist only as grey map pins — they carry no
    // rooms, so they never belong in the list.
    const listable = buildings.filter((b) => !b.closedForSemester);
    if (!groupStudyOnly && !hasWindow) return listable;

    // The window always starts at the current reference time (campus-now, or
    // the Time-Travel instant) and runs for the requested duration, so the
    // filter means "rooms free for at least N hours from here".
    const refDate = selectedDateTime ?? campusNow();
    let windowStartMin = 0;
    let windowEndMin = 0;
    if (hasWindow) {
      windowStartMin = refDate.getHours() * 60 + refDate.getMinutes();
      windowEndMin = windowStartMin + minDurationHours * 60;
    }

    return listable
      .map((b) => {
        let rooms = b.rooms;
        if (groupStudyOnly) rooms = rooms.filter((r) => r.is_alc);
        if (hasWindow) {
          rooms = rooms.filter((r) => isRoomFreeDuring(r, b, windowStartMin, windowEndMin, refDate));
        }
        return {
          ...b,
          rooms,
          totalCount: rooms.length,
          availableCount: rooms.filter((r) => r.isAvailable).length,
        };
      })
      .filter((b) => b.rooms.length > 0);
  }, [buildings, filters, selectedDateTime]);

  // Split the query into a building part and a room-number part.
  // "AS 120" -> building "AS", room "120"; "Liberal Arts" -> building only;
  // "235" -> room only.
  const { buildingSearch, roomSearch } = useMemo(() => {
    const tokens = searchQuery.trim().split(/\s+/).filter(Boolean);
    const last = tokens[tokens.length - 1] ?? '';
    if (tokens.length > 0 && /^\d/.test(last)) {
      return { buildingSearch: tokens.slice(0, -1).join(' '), roomSearch: last };
    }
    return { buildingSearch: searchQuery.trim(), roomSearch: '' };
  }, [searchQuery]);

  const filteredBuildings = useMemo(() => {
    if (!buildingSearch && !roomSearch) return baseBuildings;

    let list = baseBuildings;

    if (roomSearch) {
      const rq = roomSearch.toLowerCase();
      list = list.filter((b) =>
        b.rooms.some((r) => r.room_number.toLowerCase().includes(rq))
      );
    }

    if (buildingSearch) {
      const fuse = new Fuse(list, { keys: ['name', 'code'], threshold: 0.3 });
      const matched = fuse.search(buildingSearch).map((r) => r.item);
      // With a room number present, an unmatched building part falls back to
      // room-only results rather than showing nothing
      list = roomSearch && matched.length === 0 ? list : matched;
    }

    return list;
  }, [baseBuildings, buildingSearch, roomSearch]);

  const isCustomTime = selectedDateTime !== null;

  // Show the library entry unless a search is active that the library doesn't
  // match. Group-study filter also hides it (it has no scraped rooms).
  const libQuery = searchQuery.trim().toLowerCase();
  const showLibraryRow =
    !filters.groupStudyOnly && (libQuery === '' || 'university library'.includes(libQuery));

  // Resolve from the live `buildings` prop (not the filtered list) so the page
  // shows every room and stays fresh across refetches.
  const viewParking = viewParkingId
    ? PARKING_LOTS.find((l) => l.id === viewParkingId) ?? null
    : null;
  const viewBuilding = viewBuildingId
    ? buildings.find((b) => b.id === viewBuildingId) ?? null
    : null;

  // --- Mobile: wire the detail stack into browser history so the native back
  // button (iOS Safari's bottom toolbar arrow, the Android back button, and the
  // edge-swipe-back gesture) pops one detail level instead of leaving the site.
  // Desktop is intentionally left as-is: its in-app arrows close levels directly
  // and never touch history.
  //
  // Close the top-most open detail by exactly one level. The precedence mirrors
  // the `detail` resolution below.
  const goBack = useCallback(() => {
    if (selectedSpot) { setSelectedSpot(null); return; }
    if (viewLibrary) { onCloseLibrary(); return; }
    if (viewParkingId) { onCloseParking(); return; }
    if (selectedRoom) { setSelectedRoom(null); setSelectedBuilding(null); return; }
    if (viewBuildingId) { onCloseBuilding(); return; }
  }, [selectedSpot, viewLibrary, viewParkingId, selectedRoom, viewBuildingId,
      onCloseLibrary, onCloseParking, onCloseBuilding]);

  // How many detail layers are stacked: a page-level page (building / parking /
  // library) plus an optional sub-page (room or study spot).
  const detailDepth =
    (viewBuildingId || viewParkingId || viewLibrary ? 1 : 0) +
    (selectedRoom || selectedSpot ? 1 : 0);

  // Going deeper pushes one history entry per new layer. Going shallower is
  // always the consequence of an actual history pop — native back, or an in-app
  // arrow that now calls history.back() on mobile — so the stack is already in
  // sync and needs no adjustment here.
  const prevDepthRef = useRef(0);
  useEffect(() => {
    if (!isMobile) { prevDepthRef.current = detailDepth; return; }
    for (let d = prevDepthRef.current; d < detailDepth; d++) {
      window.history.pushState({ brDetailDepth: d + 1 }, '');
    }
    prevDepthRef.current = detailDepth;
  }, [detailDepth, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const onPop = () => goBack();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isMobile, goBack]);

  // On mobile every in-app back arrow routes through history (popstate, above,
  // does the actual state change) so app state and the history stack stay in
  // lock-step. On desktop the arrows keep closing their level directly.
  const mobileBack = useCallback(() => window.history.back(), []);

  // The detail page (if any) renders as an overlay above the list rather than
  // replacing it, so the list stays mounted and keeps its scroll position when
  // the user backs out. Order/precedence matters: a study-spot sits on top of
  // its parent (library/building), parking takes over from the map, and a room
  // sits on its still-open building so backing out of the room returns there.
  let detail: React.ReactNode = null;
  if (selectedSpot) {
    detail = <StudySpotDetail spot={selectedSpot} onBack={isMobile ? mobileBack : () => setSelectedSpot(null)} isMobile={isMobile} />;
  } else if (viewLibrary) {
    detail = (
      <LibraryDetail
        onBack={isMobile ? mobileBack : onCloseLibrary}
        onOpenFloor={(floorId) => {
          const floor = LIBRARY.floors.find((f) => f.id === floorId);
          if (floor) setSelectedSpot(libraryFloorSpot(floor));
        }}
        isMobile={isMobile}
      />
    );
  } else if (viewParking) {
    detail = <ParkingDetail lot={viewParking} onBack={isMobile ? mobileBack : onCloseParking} isMobile={isMobile} />;
  } else if (selectedRoom && selectedBuilding) {
    detail = (
      <RoomDetail
        room={selectedRoom}
        building={selectedBuilding}
        onBack={isMobile ? mobileBack : () => { setSelectedRoom(null); setSelectedBuilding(null); }}
        isMobile={isMobile}
      />
    );
  } else if (viewBuilding) {
    detail = (
      <BuildingDetail
        building={viewBuilding}
        onBack={isMobile ? mobileBack : onCloseBuilding}
        onRoomClick={(room, building) => {
          setSelectedRoom(room);
          setSelectedBuilding(building);
          // viewBuilding stays set → backing out of the room returns here
        }}
        onSpotClick={setSelectedSpot}
        favoriteRoomIds={favoriteRoomIds}
        onToggleFavoriteRoom={handleToggleFavoriteRoom}
        favoriteBuildingIds={favoriteBuildingIds}
        onToggleFavoriteBuilding={handleToggleFavoriteBuilding}
        isMobile={isMobile}
      />
    );
  }

  const logo = (
    <Image
      src="/assets/logo/logo.png"
      alt="BeachRooms"
      width={220}
      height={44}
      priority
      className={`${isMobile ? 'h-8' : 'h-10'} w-auto shrink-0`}
    />
  );

  const searchField = (
    <>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search buildings..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`pl-8 pr-8 h-9 rounded-r-none ${isMobile ? 'text-xs' : 'text-sm'}`}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </>
  );

  // Search bar with the filter button fused to its trailing edge as one input
  // group — they share an edge (no gap), but the filter still reads as a button.
  const searchControl = (
    <div className="flex flex-1 min-w-0 items-center">
      <div className="relative flex-1 min-w-0">{searchField}</div>
      <FilterMenu
        className="-ml-px rounded-l-none"
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        isMobile={isMobile}
      />
    </div>
  );

  return (
    <div className="relative h-full">
    <div className="flex flex-col h-full" style={{ display: detail ? 'none' : 'flex' }}>
      {/* Header */}
      <div className={`px-4 ${isMobile ? 'pt-1' : 'pt-4'} pb-3 border-b ${isMobile ? '' : 'space-y-3'}`}>
        {isMobile ? (
          // Single row: logo, search, filter, settings. Time travel lives on the
          // map (top-right) on mobile, not in the sheet header.
          <div className="flex items-center gap-2">
            {logo}
            {searchControl}
            <SettingsMenu settings={settings} onChange={onSettingsChange} isMobile={isMobile} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              {logo}
              <div className="flex items-center gap-1.5">
                <TimeTravel
                  selectedDateTime={selectedDateTime}
                  onDateTimeChange={onDateTimeChange}
                  isFetching={isFetching}
                  isMobile={isMobile}
                />
                <SettingsMenu settings={settings} onChange={onSettingsChange} isMobile={isMobile} />
              </div>
            </div>

            {isCustomTime && (
              <button
                onClick={() => onDateTimeChange(null)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Back to current time
              </button>
            )}

            {/* Search + filter */}
            {searchControl}
          </>
        )}
      </div>

      {/* Room list */}
      <div className="relative flex-1 min-h-0">
        {isFetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full loading-bar" />
            </div>
          </div>
        )}
        <ScrollArea className="h-full">
          <div className="px-2 py-2">
            {filteredBuildings.length > 0 || showLibraryRow ? (
              <BuildingList
                buildings={filteredBuildings}
                onOpenBuilding={onOpenBuilding}
                onRoomClick={(room, building) => {
                  setSelectedRoom(room);
                  setSelectedBuilding(building);
                }}
                searchQuery={roomSearch}
                favoriteRoomIds={favoriteRoomIds}
                favoriteBuildingIds={favoriteBuildingIds}
                onToggleFavoriteRoom={handleToggleFavoriteRoom}
                onToggleFavoriteBuilding={handleToggleFavoriteBuilding}
                libraryEntry={
                  showLibraryRow
                    ? {
                        name: LIBRARY.name,
                        isOpen: isLibraryOpen(),
                        isFavorite: favoritePlaceIds.has(LIBRARY.id),
                        onOpen: onOpenLibrary,
                        onToggleFavorite: () => handleToggleFavoritePlace(LIBRARY.id),
                      }
                    : null
                }
                showFavorites={searchQuery.trim() === ''}
              />
            ) : (
              !isFetching && (
                <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
              )
            )}
          </div>
        </ScrollArea>
      </div>

      <SignInDialog open={showSignIn} onOpenChange={setShowSignIn} />
    </div>

      {/* Detail page overlays the (still-mounted) list above */}
      {detail && <div className="absolute inset-0 bg-background">{detail}</div>}
    </div>
  );
}
