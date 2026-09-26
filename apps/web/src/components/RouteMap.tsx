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

interface RouteMapProps {
  pickup: { lat: number; lon: number; address?: string } | null;
  destination: { lat: number; lon: number; address?: string } | null;
  routeGeometry?: GeoJSON.Geometry | null;
  onPickupDragEnd?: (lat: number, lon: number) => void;
  onDestinationDragEnd?: (lat: number, lon: number) => void;
}

function FitBounds({
  pickup,
  destination,
  path,
}: {
  pickup: { lat: number; lon: number } | null;
  destination: { lat: number; lon: number } | null;
  path: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (pickup) points.push([pickup.lat, pickup.lon]);
    if (destination) points.push([destination.lat, destination.lon]);
    points.push(...path);

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, pickup, destination, path]);

  return null;
}

export default function RouteMap({
  pickup,
  destination,
  routeGeometry,
  onPickupDragEnd,
  onDestinationDragEnd,
}: RouteMapProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  const defaultCenter: [number, number] = useMemo(() => {
    if (pickup) return [pickup.lat, pickup.lon];
    return [12.9716, 77.5946]; // Default Bangalore
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
    <div className="w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl shadow-inner border border-gray-100 overflow-hidden relative bg-gray-50">
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
          <Marker
            position={[pickup.lat, pickup.lon]}
            icon={pickupIcon}
            draggable={!!onPickupDragEnd}
            eventHandlers={{
              dragend: (e) => {
                const latlng = e.target.getLatLng();
                onPickupDragEnd?.(latlng.lat, latlng.lng);
              },
            }}
          >
            {pickup.address && <Popup>{pickup.address}</Popup>}
          </Marker>
        )}

        {destination && (
          <Marker
            position={[destination.lat, destination.lon]}
            icon={destIcon}
            draggable={!!onDestinationDragEnd}
            eventHandlers={{
              dragend: (e) => {
                const latlng = e.target.getLatLng();
                onDestinationDragEnd?.(latlng.lat, latlng.lng);
              },
            }}
          >
            {destination.address && <Popup>{destination.address}</Popup>}
          </Marker>
        )}

        {path.length > 0 && (
          <Polyline positions={path} color="#2563eb" weight={5} opacity={0.8} />
        )}

        <FitBounds pickup={pickup} destination={destination} path={path} />
      </MapContainer>
    </div>
  );
}
