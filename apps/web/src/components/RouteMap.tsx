"use client";
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface RouteMapProps {
  pickup: { lat: number; lon: number; address?: string } | null;
  destination: { lat: number; lon: number; address?: string } | null;
  // Accept any GeoJSON geometry (LineString or MultiLineString) from OSRM
  routeGeometry?: GeoJSON.Geometry | null;
  onPickupDragEnd?: (lat: number, lon: number) => void;
  onDestinationDragEnd?: (lat: number, lon: number) => void;
}

export default function RouteMap({
  pickup,
  destination,
  routeGeometry,
  onPickupDragEnd,
  onDestinationDragEnd,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix default Leaflet icon paths
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    const defaultLat = 12.9716; // default Bangalore
    const defaultLon = 77.5946;

    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers and Fit Bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing layers if necessary
    if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }
    if (destinationMarkerRef.current) {
      map.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const bounds: L.LatLngTuple[] = [];

    // Create Pickup Marker
    if (pickup) {
      const pickupIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-8 h-8 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">P</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([pickup.lat, pickup.lon], {
        draggable: !!onPickupDragEnd,
        icon: pickupIcon,
      }).addTo(map);

      if (pickup.address) {
        marker.bindPopup(`<b>Pickup</b><br>${pickup.address}`);
      }

      if (onPickupDragEnd) {
        marker.on('dragend', (e: L.LeafletEvent) => {
          const latLng = e.target.getLatLng();
          onPickupDragEnd(latLng.lat, latLng.lng);
        });
      }

      pickupMarkerRef.current = marker;
      bounds.push([pickup.lat, pickup.lon] as L.LatLngTuple);
    }

    // Create Destination Marker
    if (destination) {
      const destIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-8 h-8 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">D</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([destination.lat, destination.lon], {
        draggable: !!onDestinationDragEnd,
        icon: destIcon,
      }).addTo(map);

      if (destination.address) {
        marker.bindPopup(`<b>Destination</b><br>${destination.address}`);
      }

      if (onDestinationDragEnd) {
        marker.on('dragend', (e: L.LeafletEvent) => {
          const latLng = e.target.getLatLng();
          onDestinationDragEnd(latLng.lat, latLng.lng);
        });
      }

      destinationMarkerRef.current = marker;
      bounds.push([destination.lat, destination.lon] as L.LatLngTuple);
    }

    // Draw route geometry if it's a LineString
    if (routeGeometry && 'type' in routeGeometry && routeGeometry.type === 'LineString') {
      const line = routeGeometry as GeoJSON.LineString;
      const latLngs = line.coordinates.map(coord => [coord[1], coord[0]] as L.LatLngTuple);
      const polyline = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.8,
      }).addTo(map);
      polylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } else if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 15 });
    }
  }, [pickup, destination, routeGeometry, onPickupDragEnd, onDestinationDragEnd]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl shadow-inner border border-gray-100 overflow-hidden"
    />
  );
}
