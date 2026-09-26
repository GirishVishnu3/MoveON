"use client";
import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icon issue with webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const pickupIcon = L.divIcon({
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#2563eb;border:4px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">P</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const destIcon = L.divIcon({
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#dc2626;border:4px solid white;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">D</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const driverIcon = L.divIcon({
  html: `<div style="width:48px;height:48px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(0,0,0,0.3);border:4px solid #111827;transition:all 1s ease-in-out">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m-10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

interface LiveRouteMapProps {
  pickup: { lat: number; lon: number; address?: string } | null;
  destination: { lat: number; lon: number; address?: string } | null;
  driverLocation?: { lat: number; lon: number } | null;
  routeGeometry?: GeoJSON.Geometry | null;
}

function FitBounds({
  pickup,
  destination,
  driverLocation,
  path,
}: {
  pickup: { lat: number; lon: number } | null;
  destination: { lat: number; lon: number } | null;
  driverLocation?: { lat: number; lon: number } | null;
  path: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (pickup) points.push([pickup.lat, pickup.lon]);
    if (destination) points.push([destination.lat, destination.lon]);
    if (driverLocation) points.push([driverLocation.lat, driverLocation.lon]);
    points.push(...path);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, pickup, destination, driverLocation, path]);

  return null;
}

export default function LiveRouteMap({
  pickup,
  destination,
  driverLocation,
  routeGeometry,
}: LiveRouteMapProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  const defaultCenter: [number, number] = useMemo(() => {
    if (pickup) return [pickup.lat, pickup.lon];
    return [12.9716, 77.5946]; // Bangalore
  }, [pickup?.lat, pickup?.lon]);

  const path = useMemo((): [number, number][] => {
    if (routeGeometry && 'type' in routeGeometry && routeGeometry.type === 'LineString') {
      const line = routeGeometry as GeoJSON.LineString;
      return line.coordinates.map(coord => [coord[1], coord[0]]);
    }
    return [];
  }, [routeGeometry]);

  if (!mounted) {
    return (
      <div className="w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl shadow-inner border border-gray-100 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
        Loading map...
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl shadow-inner border border-gray-100 overflow-hidden relative z-0 bg-gray-50">
      <MapContainer
        key={pickup ? `map-${Math.round(pickup.lat * 100)}-${Math.round(pickup.lon * 100)}` : 'map-default'}
        center={defaultCenter}
        zoom={13}
        style={{ width: '100%', height: '100%', minHeight: '300px' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pickup && (
          <Marker position={[pickup.lat, pickup.lon]} icon={pickupIcon}>
            {pickup.address && <Popup>{pickup.address}</Popup>}
          </Marker>
        )}

        {destination && (
          <Marker position={[destination.lat, destination.lon]} icon={destIcon}>
            {destination.address && <Popup>{destination.address}</Popup>}
          </Marker>
        )}

        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lon]}
            icon={driverIcon}
            zIndexOffset={1000}
          >
            <Popup>Driver</Popup>
          </Marker>
        )}

        {path.length > 0 && (
          <Polyline positions={path} color="#2563eb" weight={5} opacity={0.8} />
        )}

        <FitBounds
          pickup={pickup}
          destination={destination}
          driverLocation={driverLocation}
          path={path}
        />
      </MapContainer>
    </div>
  );
}
