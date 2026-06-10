'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { Map as MapIcon, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { formatDateTimeParam } from '@/lib/time-utils';
import type { APIResponse } from '@/types';

const CampusMap = dynamic(() => import('@/components/Map'), { ssr: false });

const MAP_VISIBLE_KEY = 'beachrooms_map_visible';

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
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(true);
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

  // Restore map visibility preference
  useEffect(() => {
    const saved = localStorage.getItem(MAP_VISIBLE_KEY);
    if (saved !== null) setShowMap(saved === 'true');
  }, []);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['rooms', selectedDateTime?.toISOString() ?? 'now'],
    queryFn: () => fetchRooms(selectedDateTime),
    refetchInterval: selectedDateTime ? false : 5 * 60 * 1000,
  });

  const buildings = data?.buildings ?? [];

  const isReady = !isLoading && (isMobile || !showMap || mapReady) && !error;

  useEffect(() => {
    if (isReady) setShowLoadingScreen(false);
  }, [isReady]);

  const handleMapReady = useCallback(() => setMapReady(true), []);

  const handleToggleItem = useCallback((id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleBuildingClick = useCallback((buildingId: string) => {
    setExpandedItems((prev) =>
      prev.includes(buildingId) ? prev : [...prev, buildingId]
    );
    // On mobile, switch to list view when a marker is clicked
    if (isMobile) setShowMap(false);
  }, [isMobile]);

  function toggleMap() {
    setShowMap((v) => {
      const next = !v;
      localStorage.setItem(MAP_VISIBLE_KEY, String(next));
      return next;
    });
  }

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
          {/* Sidebar — full screen on mobile when map hidden, 37% on desktop */}
          <div
            className={`
              flex flex-col border-r bg-background overflow-hidden
              ${isMobile
                ? showMap ? 'hidden' : 'w-full'
                : 'w-[37%] min-w-[300px] max-w-[420px]'
              }
            `}
          >
            <Sidebar
              buildings={buildings}
              isFetching={isFetching && !isLoading}
              selectedDateTime={selectedDateTime}
              onDateTimeChange={setSelectedDateTime}
              expandedItems={expandedItems}
              onToggleItem={handleToggleItem}
              isMobile={isMobile}
            />
          </div>

          {/* Map — full screen on mobile when shown, 63% on desktop */}
          <div
            className={`
              relative flex-1 overflow-hidden
              ${isMobile ? (showMap ? 'block' : 'hidden') : 'block'}
            `}
          >
            {/* Map toggle button on desktop */}
            {!isMobile && (
              <button
                onClick={toggleMap}
                className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm border shadow-sm px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white transition-colors"
              >
                {showMap ? <List className="h-3.5 w-3.5" /> : <MapIcon className="h-3.5 w-3.5" />}
                {showMap ? 'Hide map' : 'Show map'}
              </button>
            )}

            {showMap && (
              <CampusMap
                buildings={buildings}
                onBuildingClick={handleBuildingClick}
                onMapReady={handleMapReady}
              />
            )}

            {!showMap && !isMobile && (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Map hidden
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
