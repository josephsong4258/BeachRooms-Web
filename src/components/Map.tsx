'use client';
import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { BuildingWithRooms } from '@/types';

const CSULB_CENTER: [number, number] = [-118.113356, 33.779057];
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
}

function pinUrl(b: BuildingWithRooms): string {
  return b.availableCount > 0 ? '/assets/pins/pin-green.png' : '/assets/pins/pin-red.png';
}

function popupHtml(b: BuildingWithRooms): string {
  return `<div style="font-family:sans-serif;padding:2px 0">
    <div style="font-weight:600;font-size:13px">${b.name}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:2px">
      ${b.isOpen ? `${b.availableCount}/${b.totalCount} rooms available` : 'Closed'}
    </div>
  </div>`;
}

export default function Map({ buildings, onBuildingClick, onMapReady, centerTarget }: MapProps) {
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
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { onBuildingClickRef.current = onBuildingClick; }, [onBuildingClick]);

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

      if (!onMapReadyCalled.current) {
        onMapReadyCalled.current = true;
        onMapReady();
      }
    });

    return () => {
      popup.current?.remove();
      popup.current = null;
      map.current?.remove(); // also removes the markers
      map.current = null;
      markers.current = {};
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
