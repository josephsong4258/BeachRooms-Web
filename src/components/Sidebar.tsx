'use client';
import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, X, Calendar, RotateCcw } from 'lucide-react';
import Fuse from 'fuse.js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BuildingAccordion from '@/components/BuildingAccordion';
import RoomDetail from '@/components/RoomDetail';
import { formatTimeDisplay } from '@/lib/time-utils';
import type { BuildingWithRooms, RoomAvailability } from '@/types';

interface SidebarProps {
  buildings: BuildingWithRooms[];
  isFetching: boolean;
  selectedDateTime: Date | null;
  onDateTimeChange: (dt: Date | null) => void;
  expandedItems: string[];
  onToggleItem: (id: string) => void;
  isMobile: boolean;
}

export default function Sidebar({
  buildings,
  isFetching,
  selectedDateTime,
  onDateTimeChange,
  expandedItems,
  onToggleItem,
  isMobile,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomAvailability | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingWithRooms | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState('');
  const [pickerTime, setPickerTime] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(buildings, {
        keys: ['name', 'code'],
        threshold: 0.3,
      }),
    [buildings]
  );

  const filteredBuildings = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return buildings;

    // Check if searching for a room number
    const roomQuery = query.replace(/[a-z]+\s*/i, '').trim();
    if (roomQuery && /^\d+/.test(roomQuery)) {
      return buildings
        .map((b) => ({
          ...b,
          rooms: b.rooms.filter((r) => r.room_number.toLowerCase().includes(roomQuery.toLowerCase())),
        }))
        .filter((b) => b.rooms.length > 0);
    }

    const results = fuse.search(query);
    return results.map((r) => r.item);
  }, [buildings, searchQuery, fuse]);

  const isCustomTime = selectedDateTime !== null;

  function openDatePicker() {
    const now = selectedDateTime ?? new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setPickerDate(`${y}-${m}-${d}`);
    setPickerTime(`${h}:${min}`);
    setShowDatePicker(true);
  }

  function applyDateTime() {
    if (!pickerDate || !pickerTime) return;
    const dt = new Date(`${pickerDate}T${pickerTime}:00`);
    if (!isNaN(dt.getTime())) onDateTimeChange(dt);
    setShowDatePicker(false);
  }

  const totalAvailable = buildings.reduce((sum, b) => sum + b.availableCount, 0);
  const totalRooms = buildings.reduce((sum, b) => sum + b.totalCount, 0);

  const DatePickerContent = (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Date</label>
        <input
          type="date"
          value={pickerDate}
          onChange={(e) => setPickerDate(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Time</label>
        <input
          type="time"
          value={pickerTime}
          onChange={(e) => setPickerTime(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Button onClick={applyDateTime} className="w-full">Apply</Button>
    </div>
  );

  if (selectedRoom && selectedBuilding) {
    return (
      <RoomDetail
        room={selectedRoom}
        building={selectedBuilding}
        onBack={() => { setSelectedRoom(null); setSelectedBuilding(null); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <Image
            src="/assets/logo/logo.png"
            alt="BeachRooms"
            width={220}
            height={44}
            priority
            className="h-10 w-auto"
          />
          <Button
            variant={isCustomTime ? 'secondary' : 'outline'}
            size="sm"
            onClick={openDatePicker}
            disabled={isFetching}
            className="gap-1.5 text-xs"
          >
            <Calendar className="h-3.5 w-3.5" />
            {isCustomTime ? formatTimeDisplay(selectedDateTime) : 'Now'}
          </Button>
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buildings or rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
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
            {filteredBuildings.length === 0 && !isFetching ? (
              <p className="text-center text-sm text-muted-foreground py-8">No results found</p>
            ) : (
              <BuildingAccordion
                buildings={filteredBuildings}
                expandedItems={expandedItems}
                onToggle={onToggleItem}
                onRoomClick={(room, building) => {
                  setSelectedRoom(room);
                  setSelectedBuilding(building);
                }}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Date picker — drawer on mobile, dialog on desktop */}
      {isMobile ? (
        <Drawer open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Check availability at...</DrawerTitle>
            </DrawerHeader>
            {DatePickerContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle>Check availability at...</DialogTitle>
            </DialogHeader>
            {DatePickerContent}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
