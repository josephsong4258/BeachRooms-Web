'use client';
import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { PARKING_LOTS, type ParkingLot } from '@/data/parking';
import type { BuildingWithRooms } from '@/types';

const CSULB_CENTER: [number, number] = [-118.113603, 33.778675];
const INITIAL_ZOOM = 17.20;
const INITIAL_PITCH = 56.99;
const INITIAL_BEARING = 21.6;
const MIN_ZOOM = 14;
const MAX_ZOOM = 18;
const CSULB_BOUNDS: [[number, number], [number, number]] = [
  [-118.122, 33.776], // SW [lng, lat]
  [-118.106, 33.792], // NE [lng, lat]
];
const DEFAULT_STYLE = 'mapbox://styles/josephsong23/cmip4pzo400e501st3fdjay4h';

// Per-building label placement overrides (default: below the pin), for spots
// where the default would sit on a neighboring pin or label.
const LABEL_PLACEMENT: Record<string, 'top' | 'right' | 'left'> = {
  ECS: 'top', // Engineering/Computer Science
  ET: 'top', // Engineering Technology
  HSD: 'top', // Human Services & Design
  SPA: 'right', // Social Science/Public Affairs
  EN2: 'left', // Engineering 2
  LA1: 'right', // Liberal Arts 1
  LA2: 'right', // Liberal Arts 2
  LA3: 'right', // Liberal Arts 3
  LA4: 'right', // Liberal Arts 4
  LA5: 'right', // Liberal Arts 5
};

export interface CenterTarget {
  lng: number;
  lat: number;
  key: number; // bump to re-trigger centering on the same building
}

interface MapProps {
  buildings: BuildingWithRooms[];
  onBuildingClick: (buildingId: string) => void;
  onMapReady: () => void;
  centerTarget?: CenterTarget | null;
  showParking?: boolean;
}

const PARKING_LAYER_IDS = ['parking-areas-fill', 'parking-areas-outline'];

function pinUrl(b: BuildingWithRooms): string {
  return b.availableCount > 0 ? '/assets/pins/pin-green.png' : '/assets/pins/pin-red.png';
}

// Employee lots allow general parking weekdays after 5:30 PM and all day
// Saturday and Sunday.
function isEmployeeLotOpenToAll(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return true;
  return d.getHours() > 17 || (d.getHours() === 17 && d.getMinutes() >= 30);
}

// Green = student can park right now, red = they can't
function isParkingOpenNow(lot: ParkingLot): boolean {
  return lot.type === 'student' || isEmployeeLotOpenToAll(new Date());
}

// Traced surface lots render as shaded shapes beneath the 3D buildings.
// Structures (lots with `size`) and untraced lots are NOT in this source:
// they render as DOM marker badges instead — canvas circles/symbols at
// ground level get depth-occluded by the basemap's 3D buildings, which
// would bury a structure's badge inside its own building model.
function isBadgeLot(lot: ParkingLot): boolean {
  return !lot.polygon || !!lot.size;
}

function parkingGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: PARKING_LOTS.filter((lot) => !isBadgeLot(lot)).map((lot) => ({
      type: 'Feature',
      geometry: {
        // GeoJSON rings must be closed: repeat the first vertex at the end
        type: 'Polygon',
        coordinates: [[...lot.polygon!, lot.polygon![0]]],
      },
      properties: {
        name: lot.name,
        lotType: lot.type,
        open: isParkingOpenNow(lot),
      },
    })),
  };
}

function applyParkingChipState(el: HTMLDivElement, lot: ParkingLot): void {
  const open = isParkingOpenNow(lot);
  el.classList.toggle('parking-chip-open', open);
  el.classList.toggle('parking-chip-closed', !open);
}

function parkingPopupHtml(name: string, lotType: string, open: boolean): string {
  if (lotType === 'student') {
    return `<div style="padding:2px 0">
      <div style="font-weight:600;font-size:13px">${name}</div>
      <div style="font-size:12px;color:#1a9e3f;margin-top:2px">Student parking</div>
    </div>`;
  }
  if (open) {
    return `<div style="padding:2px 0">
      <div style="font-weight:600;font-size:13px">${name}</div>
      <div style="font-size:12px;color:#1a9e3f;margin-top:2px">You can park here now</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;max-width:200px">
        Employee lot. Open to students after 5:30 PM.
      </div>
    </div>`;
  }

  // Restricted right now, so it's a weekday before 5:30 PM; count down to it
  const now = new Date();
  const minutesUntilOpen = 17 * 60 + 30 - (now.getHours() * 60 + now.getMinutes());
  const h = Math.floor(minutesUntilOpen / 60);
  const m = minutesUntilOpen % 60;
  const countdown = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return `<div style="padding:2px 0">
    <div style="font-weight:600;font-size:13px">${name}</div>
    <div style="font-size:12px;color:#c9303a;margin-top:2px">
      Employee parking only.
    </div>
    <div style="font-size:11px;color:#6b7280;margin-top:2px;max-width:200px">
      Employee parking lots open to students in ${countdown} (5:30 PM).
    </div>
  </div>`;
}

function popupHtml(b: BuildingWithRooms): string {
  return `<div style="padding:2px 0">
    <div style="font-weight:600;font-size:13px">${b.name}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:2px">
      ${b.isOpen ? `${b.availableCount}/${b.totalCount} rooms available` : 'Closed'}
    </div>
  </div>`;
}

export default function Map({
  buildings,
  onBuildingClick,
  onMapReady,
  centerTarget,
  showParking = true,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  // Building id -> marker. DOM markers live outside the WebGL pipeline, so
  // no collision/occlusion system can ever hide them.
  const markers = useRef<Record<string, mapboxgl.Marker>>({});
  const onMapReadyCalled = useRef(false);

  // Refs for callbacks/data referenced inside Mapbox event handlers, so the
  // handlers always see the latest values without us re-registering them.
  const buildingsRef = useRef(buildings);
  const onBuildingClickRef = useRef(onBuildingClick);
  const showParkingRef = useRef(showParking);
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { onBuildingClickRef.current = onBuildingClick; }, [onBuildingClick]);

  // Badge chips for structures/untraced lots (DOM markers, like the pins)
  const parkingChips = useRef<{ el: HTMLDivElement; lot: ParkingLot }[]>([]);

  // Toggle parking layers and badge chips; the ref carries the initial value
  // into the map's load handler for the first render
  useEffect(() => {
    showParkingRef.current = showParking;
    for (const { el } of parkingChips.current) {
      el.style.display = showParking ? '' : 'none';
    }
    const m = map.current;
    if (!m) return;
    const visibility = showParking ? 'visible' : 'none';
    for (const id of PARKING_LAYER_IDS) {
      if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', visibility);
    }
  }, [showParking]);

  const makeMarkerElement = useCallback(function makeMarkerElement(buildingId: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'building-marker';
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    const label = document.createElement('div');
    label.className = 'building-marker-label';
    el.append(img, label);

    el.addEventListener('mouseenter', () => {
      const m = map.current;
      const b = buildingsRef.current.find((x) => x.id === buildingId);
      if (!m || !b) return;
      popup.current?.setLngLat([b.longitude, b.latitude]).setHTML(popupHtml(b)).addTo(m);
    });
    el.addEventListener('mouseleave', () => popup.current?.remove());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = map.current;
      const b = buildingsRef.current.find((x) => x.id === buildingId);
      if (!m || !b) return;
      m.flyTo({ center: [b.longitude, b.latitude], zoom: 17, duration: 800 });
      onBuildingClickRef.current(buildingId);
    });
    return el;
  }, []);

  const updateBuildingPins = useCallback(() => {
    const m = map.current;
    if (!m) return;

    const seen = new Set<string>();
    for (const b of buildingsRef.current) {
      if (!b.latitude || !b.longitude) continue;
      seen.add(b.id);

      let marker = markers.current[b.id];
      if (!marker) {
        marker = new mapboxgl.Marker({ element: makeMarkerElement(b.id), anchor: 'center' });
        marker.setLngLat([b.longitude, b.latitude]).addTo(m);
        markers.current[b.id] = marker;
      } else {
        marker.setLngLat([b.longitude, b.latitude]);
      }

      const el = marker.getElement();
      (el.querySelector('img') as HTMLImageElement).src = pinUrl(b);
      const label = el.querySelector('.building-marker-label') as HTMLDivElement;
      label.textContent = b.name ?? b.code;
      const placement = LABEL_PLACEMENT[b.code];
      label.className = `building-marker-label${placement ? ` label-${placement}` : ''}`;
    }

    for (const [id, marker] of Object.entries(markers.current)) {
      if (!seen.has(id)) {
        marker.remove();
        delete markers.current[id];
      }
    }
  }, [makeMarkerElement]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? DEFAULT_STYLE,
      center: CSULB_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: CSULB_BOUNDS,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    // Scale markers with zoom (mirrors the old symbol-layer size ramps) via
    // CSS vars the .building-marker styles read.
    const container = mapContainer.current;
    const applyPinScale = () => {
      const z = map.current?.getZoom() ?? INITIAL_ZOOM;
      const iconT = Math.min(Math.max((z - 14) / (18 - 14), 0), 1);
      const fontT = Math.min(Math.max((z - 13) / (18 - 13), 0), 1);
      container.style.setProperty('--pin-size', `${Math.round(13 + 19 * iconT)}px`);
      container.style.setProperty('--pin-font', `${(8 + 4 * fontT).toFixed(1)}px`);
    };
    applyPinScale();
    map.current.on('zoom', applyPinScale);

    if (!popup.current) {
      popup.current = new mapboxgl.Popup({
        offset: 14,
        closeButton: false,
        closeOnClick: false,
      });
    }

    // Markers don't need the style to be loaded
    updateBuildingPins();

    // Structure/untraced-lot badges: DOM markers so the 3D buildings can't
    // occlude them (same reason the building pins are DOM markers)
    for (const lot of PARKING_LOTS) {
      if (!isBadgeLot(lot)) continue;
      const el = document.createElement('div');
      el.className = 'parking-chip';
      el.style.setProperty('--badge-scale', String(lot.size ?? 1));
      el.textContent = 'P';
      applyParkingChipState(el, lot);
      if (!showParkingRef.current) el.style.display = 'none';
      const showPopup = () => {
        const m = map.current;
        if (!m) return;
        popup.current
          ?.setLngLat([lot.longitude, lot.latitude])
          .setHTML(parkingPopupHtml(lot.name, lot.type, isParkingOpenNow(lot)))
          .addTo(m);
      };
      el.addEventListener('mouseenter', showPopup);
      el.addEventListener('mouseleave', () => popup.current?.remove());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        showPopup();
      });
      new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lot.longitude, lot.latitude])
        .addTo(map.current);
      parkingChips.current.push({ el, lot });
    }

    // Set once the style loads (the polygon layers need the style)
    let parkingTimer: number | undefined;

    // Dev-only coordinate picker, stripped from production builds.
    //   click       -> copies "latitude: ..., longitude: ..." (and resets any trace)
    //   shift+click -> appends a vertex to a polygon trace; the full
    //                  "polygon: [...]" snippet is copied after every click
    if (process.env.NODE_ENV === 'development') {
      // Mapbox's shift+drag box zoom captures shift+clicks before they reach
      // the click handler; disable it in dev so the polygon tracer works
      map.current.boxZoom.disable();
      // Expose for debugging tools (scripts/map-debug.js)
      (window as unknown as { __map?: mapboxgl.Map }).__map = map.current;

      // Feedback goes to a click-through HUD in the corner (a popup at the
      // click point would block the next vertex click)
      const coordHud = document.createElement('div');
      coordHud.style.cssText =
        'position:absolute;bottom:10px;left:10px;z-index:10;display:none;' +
        'background:rgba(0,0,0,.75);color:#fff;font:11px/1.4 monospace;' +
        'padding:4px 8px;border-radius:4px;pointer-events:none;max-width:70%;';
      container.appendChild(coordHud);
      let hudTimer: number | undefined;

      let trace: [number, number][] = [];
      map.current.on('click', (e) => {
        const lat = Number(e.lngLat.lat.toFixed(6));
        const lng = Number(e.lngLat.lng.toFixed(6));
        let snippet: string;
        let label: string;
        if (e.originalEvent.shiftKey) {
          trace.push([lng, lat]);
          snippet = `polygon: [${trace.map(([x, y]) => `[${x}, ${y}]`).join(', ')}]`;
          label = `Polygon point ${trace.length} - copied`;
        } else {
          trace = [];
          snippet = `latitude: ${lat}, longitude: ${lng}`;
          label = 'Copied';
        }
        navigator.clipboard?.writeText(snippet).catch(() => {});
        console.log(`[coords] ${snippet}`);
        coordHud.textContent = `${label}: ${
          snippet.length > 90 ? '…' + snippet.slice(-90) : snippet
        }`;
        coordHud.style.display = 'block';
        if (hudTimer !== undefined) window.clearTimeout(hudTimer);
        hudTimer = window.setTimeout(() => {
          coordHud.style.display = 'none';
        }, 2500);
      });
    }

    map.current.on('load', () => {
      const m = map.current;
      if (!m) return;

      // 3D building extrusions
      if (!m.getSource('mapbox-streets')) {
        m.addSource('mapbox-streets', {
          type: 'vector',
          url: 'mapbox://mapbox.mapbox-streets-v8',
        });
        m.addLayer({
          id: '3d-buildings',
          source: 'mapbox-streets',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          filter: ['==', 'extrude', 'true'],
          paint: {
            'fill-extrusion-color': 'hsl(40, 43%, 93%)',
            'fill-extrusion-height': [
              'interpolate', ['linear'], ['zoom'],
              14, 0,
              14.5, ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate', ['linear'], ['zoom'],
              14, 0,
              14.5, ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.6,
          },
        });
      }

      // Parking areas: translucent ground-hugging circles, green when the
      // student can park there right now, red when they can't. Canvas layer,
      // so they sit beneath the building pins instead of competing with them.
      if (!m.getSource('parking')) {
        m.addSource('parking', { type: 'geojson', data: parkingGeoJSON() });
        // Traced lots: shaded shape with an outline
        // The style imports the Mapbox Standard basemap, whose 3D buildings
        // live inside the import where beforeId can't reach. slot 'middle'
        // places these above roads but beneath the basemap's buildings, so
        // lots read as paint on the ground and buildings occlude them.
        m.addLayer({
          id: 'parking-areas-fill',
          type: 'fill',
          source: 'parking',
          slot: 'middle',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': ['case', ['get', 'open'], '#22a04a', '#d23b44'],
            'fill-opacity': 0.25,
          },
        });
        m.addLayer({
          id: 'parking-areas-outline',
          type: 'line',
          source: 'parking',
          slot: 'middle',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'line-color': ['case', ['get', 'open'], '#1a9e3f', '#c9303a'],
            'line-opacity': 0.7,
            'line-width': 1.5,
          },
        });
        // Respect the setting if it was off before the style finished loading
        if (!showParkingRef.current) {
          for (const id of PARKING_LAYER_IDS) m.setLayoutProperty(id, 'visibility', 'none');
        }

        const showParkingPopup = (e: mapboxgl.MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { name: string; lotType: string; open: boolean | string };
          const open = p.open === true || p.open === 'true';
          popup.current
            ?.setLngLat(e.lngLat)
            .setHTML(parkingPopupHtml(p.name, p.lotType, open))
            .addTo(m);
        };
        // mouseenter covers desktop hover; click covers touch devices
        m.on('mouseenter', 'parking-areas-fill', (e) => {
          m.getCanvas().style.cursor = 'pointer';
          showParkingPopup(e);
        });
        m.on('mouseleave', 'parking-areas-fill', () => {
          m.getCanvas().style.cursor = '';
          popup.current?.remove();
        });
        m.on('click', 'parking-areas-fill', showParkingPopup);

        // Employee lots flip between restricted/open at 5:30 PM
        parkingTimer = window.setInterval(() => {
          (m.getSource('parking') as mapboxgl.GeoJSONSource | undefined)?.setData(parkingGeoJSON());
          for (const { el, lot } of parkingChips.current) applyParkingChipState(el, lot);
        }, 60_000);
      }

      if (!onMapReadyCalled.current) {
        onMapReadyCalled.current = true;
        onMapReady();
      }
    });

    return () => {
      if (parkingTimer !== undefined) window.clearInterval(parkingTimer);
      popup.current?.remove();
      popup.current = null;
      map.current?.remove(); // also removes the markers
      map.current = null;
      markers.current = {};
      parkingChips.current = [];
      onMapReadyCalled.current = false;
    };
  }, [onMapReady, updateBuildingPins]);

  // Reconcile markers whenever buildings changes
  useEffect(() => {
    updateBuildingPins();
  }, [buildings, updateBuildingPins]);

  // Fly to a building when asked (auto-center setting)
  useEffect(() => {
    if (!centerTarget || !map.current) return;
    map.current.flyTo({
      center: [centerTarget.lng, centerTarget.lat],
      zoom: 17,
      duration: 800,
    });
  }, [centerTarget]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
