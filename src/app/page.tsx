'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Map as MapIcon, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { formatDateTimeParam } from '@/lib/time-utils';
import type { AppSettings } from '@/components/SettingsMenu';
import type { CenterTarget } from '@/components/Map';
import type { APIResponse, BuildingWithRooms } from '@/types';

const CampusMap = dynamic(() => import('@/components/Map'), { ssr: false });

const MAP_VISIBLE_KEY = 'beachrooms_map_visible';
const DARK_MODE_KEY = 'beachrooms_dark_mode';
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
  const [darkMode, setDarkMode] = useState(false);
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
    setDarkMode(localStorage.getItem(DARK_MODE_KEY) === 'true');
    // Default on: only an explicit opt-out disables these
    setAutoCenter(localStorage.getItem(AUTO_CENTER_KEY) !== 'false');
    setShowParking(localStorage.getItem(SHOW_PARKING_KEY) !== 'false');
  }, []);

  // Apply dark mode class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

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
    setViewParkingId(null);
    setViewLibrary(false);
    setViewBuildingId(buildingId);
    // On mobile, switch to list view when a marker is clicked
    if (isMobile) setShowMap(false);
  }, [isMobile]);

  const handleParkingClick = useCallback((lotId: string) => {
    setViewBuildingId(null);
    setViewLibrary(false);
    setViewParkingId(lotId);
    if (isMobile) setShowMap(false);
  }, [isMobile]);

  const handleOpenLibrary = useCallback(() => {
    setViewBuildingId(null);
    setViewParkingId(null);
    setViewLibrary(true);
  }, []);

  const handleLibraryClick = useCallback(() => {
    handleOpenLibrary();
    if (isMobile) setShowMap(false);
  }, [handleOpenLibrary, isMobile]);

  function toggleMap() {
    setShowMap((v) => {
      const next = !v;
      localStorage.setItem(MAP_VISIBLE_KEY, String(next));
      return next;
    });
  }

  const handleSettingsChange = useCallback((patch: Partial<AppSettings>) => {
    if (patch.darkMode !== undefined) {
      setDarkMode(patch.darkMode);
      localStorage.setItem(DARK_MODE_KEY, String(patch.darkMode));
    }
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
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b bg-background z-10">
          <Image src="/assets/logo/logo.png" alt="BeachRooms" width={180} height={36} priority className="h-8 w-auto" />
          <Button variant="ghost" size="icon" onClick={toggleMap} aria-label="Toggle map">
            {showMap ? <List className="h-5 w-5" /> : <MapIcon className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — full screen on mobile when map hidden, 37% on desktop (full width when map hidden) */}
          <div
            className={`
              flex flex-col bg-background overflow-hidden
              ${isMobile
                ? showMap ? 'hidden' : 'w-full'
                : showMap ? 'w-[37%] min-w-[300px] max-w-[420px] border-r' : 'w-full'
              }
            `}
          >
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
              settings={{ darkMode, showMap, autoCenter, showParking }}
              onSettingsChange={handleSettingsChange}
            />
          </div>

          {/* Map — full screen on mobile when shown, 63% on desktop */}
          {showMap && (
            <div className="relative flex-1 overflow-hidden">
              <CampusMap
                buildings={buildings}
                onBuildingClick={handleBuildingClick}
                onParkingClick={handleParkingClick}
                onLibraryClick={handleLibraryClick}
                onMapReady={handleMapReady}
                centerTarget={centerTarget}
                showParking={showParking}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
