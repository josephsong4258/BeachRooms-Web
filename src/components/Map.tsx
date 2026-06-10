'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { BuildingWithRooms } from '@/types';

const CSULB_CENTER: [number, number] = [-118.112521, 33.779218];
const INITIAL_ZOOM = 16.42;
const INITIAL_PITCH = 52.99;
const INITIAL_BEARING = 0;
const MIN_ZOOM = 14;
const MAX_ZOOM = 18;
const CSULB_BOUNDS: [[number, number], [number, number]] = [
  [-118.122, 33.776], // SW [lng, lat]
  [-118.106, 33.792], // NE [lng, lat]
];
const DEFAULT_STYLE = 'mapbox://styles/josephsong23/cmip4pzo400e501st3fdjay4h';

const PIN_IMAGES = [
  { id: 'pin-green', url: '/assets/pins/pin-green.png' },
  { id: 'pin-red', url: '/assets/pins/pin-red.png' },
];

interface MapProps {
  buildings: BuildingWithRooms[];
  onBuildingClick: (buildingId: string) => void;
  onMapReady: () => void;
}

type PinFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, {
  id: string;
  name: string;
  code: string;
  available: boolean;
  availableCount: number;
  totalCount: number;
  isOpen: boolean;
}>;

function toGeoJSON(buildings: BuildingWithRooms[]): PinFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: buildings
      .filter((b) => b.latitude && b.longitude)
      .map((b) => ({
        type: 'Feature',
        properties: {
          id: b.id,
          name: b.name,
          code: b.code,
          available: b.availableCount > 0,
          availableCount: b.availableCount,
          totalCount: b.totalCount,
          isOpen: b.isOpen,
        },
        geometry: { type: 'Point', coordinates: [b.longitude, b.latitude] },
      })),
  };
}

export default function Map({ buildings, onBuildingClick, onMapReady }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const mapLoaded = useRef(false);
  const onMapReadyCalled = useRef(false);

  // Refs for callbacks/data referenced inside Mapbox event handlers, so the
  // handlers always see the latest values without us re-registering them.
  const buildingsRef = useRef(buildings);
  const onBuildingClickRef = useRef(onBuildingClick);
  useEffect(() => { buildingsRef.current = buildings; }, [buildings]);
  useEffect(() => { onBuildingClickRef.current = onBuildingClick; }, [onBuildingClick]);

  function updateBuildingPins() {
    if (!map.current || !mapLoaded.current) return;
    const src = map.current.getSource('building-pins') as mapboxgl.GeoJSONSource | undefined;
    if (!src) return;
    src.setData(toGeoJSON(buildingsRef.current));
  }

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

      // Load pin images — async, ok if layer is added before they finish
      for (const { id, url } of PIN_IMAGES) {
        if (m.hasImage(id)) continue;
        m.loadImage(url, (err, image) => {
          if (err || !image) return;
          if (!m.hasImage(id)) m.addImage(id, image);
        });
      }

      // Building-pin source + symbol layers
      if (!m.getSource('building-pins')) {
        m.addSource('building-pins', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        m.addLayer({
          id: 'building-pins-icon',
          type: 'symbol',
          source: 'building-pins',
          layout: {
            'icon-image': ['case', ['get', 'available'], 'pin-green', 'pin-red'],
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              14, 0.2,
              18, 0.5,
            ],
            'icon-allow-overlap': true,
            'icon-pitch-alignment': 'viewport',
          },
        });

        m.addLayer({
          id: 'building-pins-label',
          type: 'symbol',
          source: 'building-pins',
          layout: {
            'text-field': ['get', 'name'],
            'text-size': [
              'interpolate', ['linear'], ['zoom'],
              13, 9,
              18, 14,
            ],
            'text-font': ['DIN Pro Bold', 'Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.2,
          },
        });
      }

      // Shared popup re-used on each hover
      if (!popup.current) {
        popup.current = new mapboxgl.Popup({
          offset: 14,
          closeButton: false,
          closeOnClick: false,
        });
      }

      m.on('mouseenter', 'building-pins-icon', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as PinFeatureCollection['features'][number]['properties'];
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        m.getCanvas().style.cursor = 'pointer';
        popup.current
          ?.setLngLat(coords)
          .setHTML(
            `<div style="font-family:sans-serif;padding:2px 0">
              <div style="font-weight:600;font-size:13px">${p.name}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:2px">
                ${p.isOpen ? `${p.availableCount}/${p.totalCount} rooms available` : 'Closed'}
              </div>
            </div>`
          )
          .addTo(m);
      });

      m.on('mouseleave', 'building-pins-icon', () => {
        m.getCanvas().style.cursor = '';
        popup.current?.remove();
      });

      m.on('click', 'building-pins-icon', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as PinFeatureCollection['features'][number]['properties'];
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        m.flyTo({ center: coords, zoom: 17, duration: 800 });
        onBuildingClickRef.current(p.id);
      });

      mapLoaded.current = true;
      updateBuildingPins();

      if (!onMapReadyCalled.current) {
        onMapReadyCalled.current = true;
        onMapReady();
      }
    });

    return () => {
      popup.current?.remove();
      popup.current = null;
      map.current?.remove();
      map.current = null;
      mapLoaded.current = false;
      onMapReadyCalled.current = false;
    };
  }, [onMapReady]);

  // Push new building data into the GeoJSON source whenever buildings changes
  useEffect(() => {
    updateBuildingPins();
  }, [buildings]);

  return <div ref={mapContainer} className="w-full h-full" />;
}
