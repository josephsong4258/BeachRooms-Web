'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/Sidebar';
import MobileSheet from '@/components/MobileSheet';
import LoadingScreen from '@/components/LoadingScreen';
import { formatDateTimeParam } from '@/lib/time-utils';
import type { AppSettings } from '@/components/SettingsMenu';
import type { CenterTarget } from '@/components/Map';
import type { APIResponse, BuildingWithRooms } from '@/types';

const CampusMap = dynamic(() => import('@/components/Map'), { ssr: false });

const MAP_VISIBLE_KEY = 'beachrooms_map_visible';
const AUTO_CENTER_KEY = 'beachrooms_auto_center';
const SHOW_PARKING_KEY = 'beachrooms_show_parking';

async function fetchRooms(selectedDateTime: Date | null): Promise<APIResponse> {
  let url = '/api/rooms';
  if (selectedDateTime) {
    const { date, time } = formatDateTimeParam(selectedDateTime);
    url += `?date=${date}&time=${time}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch rooms');
  return res.json();
}

export default function Home() {
  const [selectedDateTime, setSelectedDateTime] = useState<Date | null>(null);
  // Which building page is open (null = list). Lifted here so map-marker taps
  // can open it the same way list rows do.
  const [viewBuildingId, setViewBuildingId] = useState<string | null>(null);
  // Which parking-lot page is open (null = none); opened from map clicks.
  const [viewParkingId, setViewParkingId] = useState<string | null>(null);
  // Whether the library overview page is open (opened from the map or the list).
  const [viewLibrary, setViewLibrary] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);
  const [showParking, setShowParking] = useState(true);
  const [centerTarget, setCenterTarget] = useState<CenterTarget | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [mountLoadingScreen, setMountLoadingScreen] = useState(true);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Restore saved settings
  useEffect(() => {
    const savedMap = localStorage.getItem(MAP_VISIBLE_KEY);
    if (savedMap !== null) setShowMap(savedMap === 'true');
    // Default on: only an explicit opt-out disables these
    setAutoCenter(localStorage.getItem(AUTO_CENTER_KEY) !== 'false');
    setShowParking(localStorage.getItem(SHOW_PARKING_KEY) !== 'false');
  }, []);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['rooms', selectedDateTime?.toISOString() ?? 'now'],
    queryFn: () => fetchRooms(selectedDateTime),
    refetchInterval: selectedDateTime ? false : 5 * 60 * 1000,
  });

  const buildings = useMemo(() => data?.buildings ?? [], [data]);

  const isReady = !isLoading && (isMobile || !showMap || mapReady) && !error;

  useEffect(() => {
    if (isReady) setShowLoadingScreen(false);
  }, [isReady]);

  const handleMapReady = useCallback(() => setMapReady(true), []);

  // Opening a building from the list optionally centers the map on it.
  // Opening any detail clears the others so they don't stack in the sidebar.
  const handleOpenBuilding = useCallback((building: BuildingWithRooms) => {
    if (autoCenter && building.latitude && building.longitude) {
      setCenterTarget({ lng: building.longitude, lat: building.latitude, key: Date.now() });
    }
    setViewParkingId(null);
    setViewLibrary(false);
    setViewBuildingId(building.id);
  }, [autoCenter]);

  const handleBuildingClick = useCallback((buildingId: string) => {
    // The map marker already flies to the building, so no extra centering here.
    // On mobile this opens the building as a full-screen slide-over over the map.
    setViewParkingId(null);
    setViewLibrary(false);
    setViewBuildingId(buildingId);
  }, []);

  const handleParkingClick = useCallback((lotId: string) => {
    setViewBuildingId(null);
    setViewLibrary(false);
    setViewParkingId(lotId);
  }, []);

  const handleOpenLibrary = useCallback(() => {
    setViewBuildingId(null);
    setViewParkingId(null);
    setViewLibrary(true);
  }, []);

  const handleLibraryClick = useCallback(() => {
    handleOpenLibrary();
  }, [handleOpenLibrary]);

  const handleSettingsChange = useCallback((patch: Partial<AppSettings>) => {
    if (patch.showMap !== undefined) {
      setShowMap(patch.showMap);
      localStorage.setItem(MAP_VISIBLE_KEY, String(patch.showMap));
    }
    if (patch.autoCenter !== undefined) {
      setAutoCenter(patch.autoCenter);
      localStorage.setItem(AUTO_CENTER_KEY, String(patch.autoCenter));
    }
    if (patch.showParking !== undefined) {
      setShowParking(patch.showParking);
      localStorage.setItem(SHOW_PARKING_KEY, String(patch.showParking));
    }
  }, []);

  // On mobile, any open detail page (building / room / parking / library / spot)
  // turns the bottom sheet into a full-screen slide-over. Room and spot pages
  // are reached only through a building or the library, so these page-level
  // flags cover every detail the Sidebar can show.
  const mobileDetailOpen = !!(viewBuildingId || viewParkingId || viewLibrary);

  const sidebar = (
    <Sidebar
      buildings={buildings}
      isFetching={isFetching && !isLoading}
      selectedDateTime={selectedDateTime}
      onDateTimeChange={setSelectedDateTime}
      viewBuildingId={viewBuildingId}
      onOpenBuilding={handleOpenBuilding}
      onCloseBuilding={() => setViewBuildingId(null)}
      viewParkingId={viewParkingId}
      onCloseParking={() => setViewParkingId(null)}
      viewLibrary={viewLibrary}
      onOpenLibrary={handleOpenLibrary}
      onCloseLibrary={() => setViewLibrary(false)}
      isMobile={isMobile}
      settings={{ showMap, autoCenter, showParking }}
      onSettingsChange={handleSettingsChange}
    />
  );

  const map = (
    <CampusMap
      buildings={buildings}
      onBuildingClick={handleBuildingClick}
      onParkingClick={handleParkingClick}
      onLibraryClick={handleLibraryClick}
      onMapReady={handleMapReady}
      centerTarget={centerTarget}
      showParking={showParking}
      isMobile={isMobile}
      selectedBuildingId={viewBuildingId}
    />
  );

  return (
    <>
      {mountLoadingScreen && (
        <LoadingScreen
          show={showLoadingScreen}
          onExited={() => setMountLoadingScreen(false)}
          error={error ? String(error) : null}
        />
      )}

      <div className="h-dvh flex flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {isMobile ? (
            // Mobile: full-bleed map with the list as a draggable bottom sheet.
            <div className="relative flex-1 overflow-hidden">
              <div className="absolute inset-0">{map}</div>
              <MobileSheet detailOpen={mobileDetailOpen}>{sidebar}</MobileSheet>
            </div>
          ) : (
            // Desktop: sidebar list (37%) beside the map (63%); full width when
            // the map is hidden.
            <>
              <div
                className={`flex flex-col bg-background overflow-hidden ${
                  showMap ? 'w-[37%] min-w-[300px] max-w-[420px] border-r' : 'w-full'
                }`}
              >
                {sidebar}
              </div>
              {showMap && <div className="relative flex-1 overflow-hidden">{map}</div>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
