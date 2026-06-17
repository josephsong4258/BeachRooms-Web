'use client';
import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { PARKING_LOTS, isParkingOpenNow, type ParkingLot } from '@/data/parking';
import { LIBRARY, isLibraryOpen } from '@/data/library';
import type { BuildingWithRooms } from '@/types';

const CSULB_CENTER: [number, number] = [-118.113603, 33.778675];
const INITIAL_ZOOM = 17.20;
// Mobile starts zoomed out so the whole campus fits the narrower viewport
const MOBILE_INITIAL_ZOOM = 16.0;
// Pins/labels render smaller on mobile so they don't crowd the narrow viewport
const MOBILE_PIN_SCALE = 0.7;
const INITIAL_PITCH = 56.99;
const INITIAL_BEARING = 21.6;
const MIN_ZOOM = 14;
const MAX_ZOOM = 18;
const CSULB_BOUNDS: [[number, number], [number, number]] = [
  [-118.122, 33.776], // SW [lng, lat]
  [-118.106, 33.792], // NE [lng, lat]
];
// On mobile the bottom sheet covers the lower half of the map, so the southern
// bound is pushed further south — otherwise the bottommost buildings can never
// be panned up out from behind the sheet.
const CSULB_BOUNDS_MOBILE: [[number, number], [number, number]] = [
  [-118.122, 33.768], // SW [lng, lat] — extended ~0.008° south
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
  onParkingClick: (lotId: string) => void;
  onLibraryClick: () => void;
  onMapReady: () => void;
  centerTarget?: CenterTarget | null;
  showParking?: boolean;
  isMobile?: boolean;
  // Which building's page is open (null = list). Used to restore the camera
  // to its pre-selection position when the user presses back.
  selectedBuildingId?: string | null;
}

const PARKING_LAYER_IDS = ['parking-areas-fill', 'parking-areas-outline'];

function pinUrl(b: BuildingWithRooms): string {
  // Closed (after hours / weekend) reads as a neutral gray orb, distinct from
  // an open-but-full building (red).
  if (!b.isOpen) return '/assets/pins/pin-gray.png';
  return b.availableCount > 0 ? '/assets/pins/pin-green.png' : '/assets/pins/pin-red.png';
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
        id: lot.id,
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
      Open to students in ${countdown} (5:30 PM).
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

function libraryPopupHtml(): string {
  const open = isLibraryOpen();
  return `<div style="padding:2px 0">
    <div style="font-weight:600;font-size:13px">${LIBRARY.name}</div>
    <div style="font-size:12px;color:${open ? '#1a9e3f' : '#6b7280'};margin-top:2px">
      ${open ? 'Open' : 'Closed'}
    </div>
  </div>`;
}

export default function Map({
  buildings,
  onBuildingClick,
  onParkingClick,
  onLibraryClick,
  onMapReady,
  centerTarget,
  showParking = true,
  isMobile = false,
  selectedBuildingId = null,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  // Building id -> marker. DOM markers live outside the WebGL pipeline, so
  // no collision/occlusion system can ever hide them.
  const markers = useRef<Record<string, mapboxgl.Marker>>({});
  const onMapReadyCalled = useRef(false);
  // Re-applies pin/label sizing; held in a ref so the mobile-breakpoint effect
  // can re-run it when the viewport crosses the mobile threshold.
  const applyPinScaleRef = useRef<(() => void) | null>(null);
  // Camera position captured the moment a building is opened, so pressing back
  // can fly the map back to the overview it came from.
  const savedCamera = useRef<{
    center: mapboxgl.LngLat;
    zoom: number;
    pitch: number;
    bearing: number;
  } | null>(null);

  // Refs for callbacks/data referenced inside Mapbox event handlers, so the
  // handlers always see the latest values without us re-registering them.
  const buildingsRef = useRef(buildings);
  const onBuildingClickRef = useRef(onBuildingClick);
  const onParkingClickRef = useRef(onParkingClick);
  const onLibraryClickRef = useRef(onLibraryClick);
  const showParkingRef = useRef(showParking);
  // Mobile shows the short building code (e.g. "ECS") instead of the full name,
  // which would otherwise crowd the smaller viewport.
  const isMobileRef = useRef(isMobile);
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { onBuildingClickRef.current = onBuildingClick; }, [onBuildingClick]);
  useEffect(() => { onParkingClickRef.current = onParkingClick; }, [onParkingClick]);
  useEffect(() => { onLibraryClickRef.current = onLibraryClick; }, [onLibraryClick]);

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

  // Fly to a building, snapshotting the current camera the first time we leave
  // the overview so pressing back can restore it. Switching directly between
  // buildings keeps the original snapshot (only the first leave is remembered).
  const flyToBuilding = useCallback((lng: number, lat: number) => {
    const m = map.current;
    if (!m) return;
    if (!savedCamera.current) {
      savedCamera.current = {
        center: m.getCenter(),
        zoom: m.getZoom(),
        pitch: m.getPitch(),
        bearing: m.getBearing(),
      };
    }
    m.flyTo({ center: [lng, lat], zoom: 17, duration: 800 });
  }, []);

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
      flyToBuilding(b.longitude, b.latitude);
      onBuildingClickRef.current(buildingId);
    });
    return el;
  }, [flyToBuilding]);

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
      label.textContent = isMobileRef.current ? (b.code ?? b.name) : (b.name ?? b.code);
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
      zoom: isMobile ? MOBILE_INITIAL_ZOOM : INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      maxBounds: isMobile ? CSULB_BOUNDS_MOBILE : CSULB_BOUNDS,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    // Scale markers with zoom (mirrors the old symbol-layer size ramps) via
    // CSS vars the .building-marker styles read.
    const container = mapContainer.current;
    const applyPinScale = () => {
      const z = map.current?.getZoom() ?? INITIAL_ZOOM;
      const iconT = Math.min(Math.max((z - 14) / (18 - 14), 0), 1);
      const fontT = Math.min(Math.max((z - 13) / (18 - 13), 0), 1);
      const scale = isMobileRef.current ? MOBILE_PIN_SCALE : 1;
      container.style.setProperty('--pin-size', `${Math.round((13 + 19 * iconT) * scale)}px`);
      container.style.setProperty('--pin-font', `${((8 + 4 * fontT) * scale).toFixed(1)}px`);
    };
    applyPinScaleRef.current = applyPinScale;
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

    // Library — a single static DOM marker (it isn't a scraped building, so it
    // lives outside updateBuildingPins). Green when open, gray when closed.
    {
      const libEl = document.createElement('div');
      libEl.className = 'building-marker';
      const libImg = document.createElement('img');
      libImg.alt = '';
      libImg.draggable = false;
      libImg.src = isLibraryOpen() ? '/assets/pins/pin-green.png' : '/assets/pins/pin-gray.png';
      const libLabel = document.createElement('div');
      libLabel.className = 'building-marker-label';
      libLabel.textContent = 'Library';
      libEl.append(libImg, libLabel);
      libEl.addEventListener('mouseenter', () => {
        const m = map.current;
        if (m) popup.current?.setLngLat([LIBRARY.longitude, LIBRARY.latitude]).setHTML(libraryPopupHtml()).addTo(m);
      });
      libEl.addEventListener('mouseleave', () => popup.current?.remove());
      libEl.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.current?.remove();
        onLibraryClickRef.current();
      });
      new mapboxgl.Marker({ element: libEl, anchor: 'center' })
        .setLngLat([LIBRARY.longitude, LIBRARY.latitude])
        .addTo(map.current);
    }

    // Structure/untraced-lot badges: DOM markers so the 3D buildings can't
    // occlude them (same reason the building pins are DOM markers)
    for (const lot of PARKING_LOTS) {
      if (!isBadgeLot(lot)) continue;
      const el = document.createElement('div');
      el.className = 'parking-chip';
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
      // Click opens the lot's page (with photo + ratings/comments)
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.current?.remove();
        onParkingClickRef.current(lot.id);
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
        // promoteId lets feature-state key off the lot name so hover can firm
        // up just the lot under the cursor.
        m.addSource('parking', { type: 'geojson', data: parkingGeoJSON(), promoteId: 'name' });
        // Traced lots: shaded shape with an outline
        // The style imports the Mapbox Standard basemap, whose 3D buildings
        // live inside the import where beforeId can't reach. slot 'middle'
        // places these above roads but beneath the basemap's buildings, so
        // lots read as paint on the ground and buildings occlude them.
        // Faint by default so they recede; the hovered lot firms up to full
        // color via the 'hover' feature-state (set in the handlers below).
        m.addLayer({
          id: 'parking-areas-fill',
          type: 'fill',
          source: 'parking',
          slot: 'middle',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': ['case', ['get', 'open'], '#22a04a', '#d23b44'],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0.1],
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
            'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0.4],
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
        // Track the lot under the cursor so only it firms up. mousemove (not
        // mouseenter) keeps the hovered feature current as the pointer slides
        // between adjacent lots; click covers touch devices.
        let hoveredLot: string | number | null = null;
        const setHover = (id: string | number | null) => {
          if (hoveredLot === id) return;
          if (hoveredLot !== null) {
            m.setFeatureState({ source: 'parking', id: hoveredLot }, { hover: false });
          }
          hoveredLot = id;
          if (id !== null) {
            m.setFeatureState({ source: 'parking', id }, { hover: true });
          }
        };
        m.on('mousemove', 'parking-areas-fill', (e) => {
          const f = e.features?.[0];
          if (f?.id == null) return;
          m.getCanvas().style.cursor = 'pointer';
          setHover(f.id);
          showParkingPopup(e);
        });
        m.on('mouseleave', 'parking-areas-fill', () => {
          m.getCanvas().style.cursor = '';
          setHover(null);
          popup.current?.remove();
        });
        // Click a lot opens its page (photo + ratings/comments)
        m.on('click', 'parking-areas-fill', (e) => {
          const f = e.features?.[0];
          const id = f?.properties?.id;
          if (typeof id === 'string') {
            popup.current?.remove();
            onParkingClickRef.current(id);
          }
        });

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

  // Re-label and re-size pins when crossing the mobile/desktop breakpoint
  // (resize/rotate): mobile uses the short code and a smaller pin/label.
  useEffect(() => {
    isMobileRef.current = isMobile;
    updateBuildingPins();
    applyPinScaleRef.current?.();
    map.current?.setMaxBounds(isMobile ? CSULB_BOUNDS_MOBILE : CSULB_BOUNDS);
  }, [isMobile, updateBuildingPins]);

  // Fly to a building when asked (auto-center setting)
  useEffect(() => {
    if (!centerTarget || !map.current) return;
    flyToBuilding(centerTarget.lng, centerTarget.lat);
  }, [centerTarget, flyToBuilding]);

  // Pressing back (building page closed) flies the map back to the overview it
  // came from, so the user doesn't get stranded zoomed in.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    if (!selectedBuildingId && savedCamera.current) {
      m.flyTo({ ...savedCamera.current, duration: 800 });
      savedCamera.current = null;
    }
  }, [selectedBuildingId]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
