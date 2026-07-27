"use client";
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface RouteMapProps {
  pickup: { lat: number; lon: number; address?: string } | null;
  destination: { lat: number; lon: number; address?: string } | null;
  routeGeometry?: GeoJSON.Geometry | null;
  onPickupDragEnd?: (lat: number, lon: number) => void;
  onDestinationDragEnd?: (lat: number, lon: number) => void;
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
  path
}: {
  pickup: { lat: number; lon: number } | null;
  destination: { lat: number; lon: number } | null;
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
    path.forEach(p => {
      bounds.extend(p);
      hasPoints = true;
    });

    if (hasPoints) {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    }
  }, [map, maps, pickup, destination, path]);

  return null;
}

export default function RouteMap({
  pickup,
  destination,
  routeGeometry,
  onPickupDragEnd,
  onDestinationDragEnd,
}: RouteMapProps) {
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
    <div className="w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl shadow-inner border border-gray-100 overflow-hidden relative bg-gray-50">
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={defaultCenter}
        defaultZoom={13}
        disableDefaultUI={true}
        gestureHandling="greedy"
      >
        {pickup && (
          <AdvancedMarker
            position={{ lat: pickup.lat, lng: pickup.lon }}
            draggable={!!onPickupDragEnd}
            onDragEnd={(e) => {
              if (e.latLng && onPickupDragEnd) {
                onPickupDragEnd(e.latLng.lat(), e.latLng.lng());
              }
            }}
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">P</div>
          </AdvancedMarker>
        )}

        {destination && (
          <AdvancedMarker
            position={{ lat: destination.lat, lng: destination.lon }}
            draggable={!!onDestinationDragEnd}
            onDragEnd={(e) => {
              if (e.latLng && onDestinationDragEnd) {
                onDestinationDragEnd(e.latLng.lat(), e.latLng.lng());
              }
            }}
          >
            <div className="w-8 h-8 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">D</div>
          </AdvancedMarker>
        )}

        {path.length > 0 && <Polyline path={path} />}
        
        <MapBoundsAdjuster pickup={pickup} destination={destination} path={path} />
      </Map>
    </div>
  );
}
