"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface LiveRouteMapProps {
  pickup: { lat: number; lon: number; address?: string } | null;
  destination: { lat: number; lon: number; address?: string } | null;
  driverLocation?: { lat: number; lon: number } | null;
  routeGeometry?: GeoJSON.Geometry | null;
}

function Polyline({ path }: { path: google.maps.LatLngLiteral[] }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !window.google) return;
    if (!polylineRef.current) {
      polylineRef.current = new window.google.maps.Polyline({
        strokeColor: '#2563eb',
        strokeWeight: 5,
        strokeOpacity: 0.8,
      });
      polylineRef.current.setMap(map);
    }
    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (!polylineRef.current) return;
    polylineRef.current.setPath(path);
  }, [path]);

  return null;
}

function MapBoundsAdjuster({
  pickup,
  destination,
  driverLocation,
  path
}: {
  pickup: { lat: number; lon: number } | null;
  destination: { lat: number; lon: number } | null;
  driverLocation?: { lat: number; lon: number } | null;
  path: google.maps.LatLngLiteral[];
}) {
  const map = useMap();
  const maps = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !maps || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    if (pickup) {
      bounds.extend({ lat: pickup.lat, lng: pickup.lon });
      hasPoints = true;
    }
    if (destination) {
      bounds.extend({ lat: destination.lat, lng: destination.lon });
      hasPoints = true;
    }
    if (driverLocation) {
      bounds.extend({ lat: driverLocation.lat, lng: driverLocation.lon });
      hasPoints = true;
    }
    path.forEach(p => {
      bounds.extend(p);
      hasPoints = true;
    });

    if (hasPoints) {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [map, maps, pickup, destination, driverLocation, path]);

  return null;
}

export default function LiveRouteMap({
  pickup,
  destination,
  driverLocation,
  routeGeometry,
}: LiveRouteMapProps) {
  const defaultCenter = { lat: 12.9716, lng: 77.5946 }; // Bangalore

  const path = useMemo(() => {
    if (routeGeometry && 'type' in routeGeometry && routeGeometry.type === 'LineString') {
      const line = routeGeometry as GeoJSON.LineString;
      return line.coordinates.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      }));
    }
    return [];
  }, [routeGeometry]);

  return (
    <div className="w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl shadow-inner border border-gray-100 overflow-hidden relative z-0 bg-gray-50">
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={defaultCenter}
        defaultZoom={13}
        disableDefaultUI={true}
        gestureHandling="greedy"
      >
        {pickup && (
          <AdvancedMarker position={{ lat: pickup.lat, lng: pickup.lon }}>
            <div className="w-8 h-8 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">P</div>
          </AdvancedMarker>
        )}

        {destination && (
          <AdvancedMarker position={{ lat: destination.lat, lng: destination.lon }}>
            <div className="w-8 h-8 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">D</div>
          </AdvancedMarker>
        )}

        {driverLocation && (
          <AdvancedMarker 
            position={{ lat: driverLocation.lat, lng: driverLocation.lon }}
            zIndex={1000}
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] border-4 border-gray-900 transition-all duration-1000 ease-in-out">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900">
                <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m-10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0"/>
              </svg>
            </div>
          </AdvancedMarker>
        )}

        {path.length > 0 && <Polyline path={path} />}
        
        <MapBoundsAdjuster pickup={pickup} destination={destination} driverLocation={driverLocation} path={path} />
      </Map>
    </div>
  );
}
