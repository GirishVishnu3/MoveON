"use client";
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiveRouteMapProps {
  pickup: { lat: number; lon: number; address?: string } | null;
  destination: { lat: number; lon: number; address?: string } | null;
  driverLocation?: { lat: number; lon: number } | null;
  routeGeometry?: GeoJSON.Geometry | null;
}

export default function LiveRouteMap({
  pickup,
  destination,
  driverLocation,
  routeGeometry,
}: LiveRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
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

  // Update Static Markers and Route
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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

    if (pickup) {
      const pickupIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-8 h-8 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">P</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([pickup.lat, pickup.lon], { icon: pickupIcon }).addTo(map);
      if (pickup.address) marker.bindPopup(`<b>Pickup</b><br>${pickup.address}`);
      pickupMarkerRef.current = marker;
      bounds.push([pickup.lat, pickup.lon] as L.LatLngTuple);
    }

    if (destination) {
      const destIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-8 h-8 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white font-bold shadow-lg">D</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([destination.lat, destination.lon], { icon: destIcon }).addTo(map);
      if (destination.address) marker.bindPopup(`<b>Destination</b><br>${destination.address}`);
      destinationMarkerRef.current = marker;
      bounds.push([destination.lat, destination.lon] as L.LatLngTuple);
    }

    if (routeGeometry && 'type' in routeGeometry && routeGeometry.type === 'LineString') {
      const line = routeGeometry as GeoJSON.LineString;
      const latLngs = line.coordinates.map(coord => [coord[1], coord[0]] as L.LatLngTuple);
      const polyline = L.polyline(latLngs, { color: '#2563eb', weight: 5, opacity: 0.8 }).addTo(map);
      polylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    } else if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 15 });
    }
  }, [pickup, destination, routeGeometry]);

  // Handle Driver Location Updates & Animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !driverLocation) return;

    if (!driverMarkerRef.current) {
      // Create initial driver marker
      const carIcon = L.divIcon({
        className: 'custom-car-icon',
        html: `<div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)] border-4 border-gray-900 transition-all duration-1000 ease-in-out">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-900"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3m10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m-10 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0"/></svg>
               </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });
      const marker = L.marker([driverLocation.lat, driverLocation.lon], { icon: carIcon, zIndexOffset: 1000 }).addTo(map);
      driverMarkerRef.current = marker;
      
      // Add CSS transition for smooth movement
      const el = marker.getElement();
      if (el) {
        el.style.transition = 'all 2s linear';
      }
    } else {
      // Smoothly move the existing marker
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lon]);
    }
  }, [driverLocation]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[300px] md:min-h-[400px] rounded-2xl shadow-inner border border-gray-100 overflow-hidden relative z-0"
    />
  );
}
