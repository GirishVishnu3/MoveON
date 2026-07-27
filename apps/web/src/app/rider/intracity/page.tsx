"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import TopNavBar from 'shared/src/components/navigation/TopNavBar';
import { RootState } from 'shared/src/store/index';
import { setPickup, setDestination, setRoute, clearRoute } from 'shared/src/store/locationSlice';
import {
  setSelectedVehicle, setIsLoadingFare, setIsConfirming,
  setBookingConfirmed, setCouponResult,
  setTripType, setScheduledAt, setReturnAt,
} from 'shared/src/store/bookingSlice';
import VehicleList from 'shared/src/components/booking/VehicleList';
import FareBreakdownPanel from 'shared/src/components/booking/FareBreakdown';
import CouponSelector from 'shared/src/components/booking/CouponSelector';
import RideSummary from 'shared/src/components/booking/RideSummary';
import RideOptionSelector from 'shared/src/components/booking/RideOptionSelector';
import RideScheduler from 'shared/src/components/booking/RideScheduler';
import BookingConfirmationDialog from 'shared/src/components/booking/BookingConfirmationDialog';
import { apiClient } from 'shared/src/api/axios';
import type { Vehicle, CouponResult } from 'shared/src/types/booking';

import dynamic from 'next/dynamic';
const RouteMap = dynamic(() => import('../../../components/RouteMap'), { ssr: false });

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const POPULAR_CITIES = [
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, center: 'MG Road, Bengaluru', viewbox: '77.30,12.70,77.85,13.25', aliases: ['bengaluru', 'bangalore'] },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, center: 'Marine Drive, Mumbai', viewbox: '72.65,18.75,73.15,19.45', aliases: ['mumbai', 'bombay'] },
  { name: 'Delhi NCR', lat: 28.6139, lon: 77.2090, center: 'Connaught Place, New Delhi', viewbox: '76.75,28.25,77.55,28.95', aliases: ['delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 'ghaziabad', 'faridabad'] },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867, center: 'HITEC City, Hyderabad', viewbox: '78.15,17.10,78.75,17.70', aliases: ['hyderabad', 'secunderabad'] },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, center: 'Anna Salai, Chennai', viewbox: '80.00,12.75,80.40,13.35', aliases: ['chennai', 'madras'] },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, center: 'Park Street, Kolkata', viewbox: '88.15,22.25,88.55,22.85', aliases: ['kolkata', 'calcutta'] },
  { name: 'Pune', lat: 18.5204, lon: 73.8567, center: 'FC Road, Pune', viewbox: '73.55,18.25,74.15,18.85', aliases: ['pune'] },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, center: 'CG Road, Ahmedabad', viewbox: '72.30,22.75,72.85,23.30', aliases: ['ahmedabad', 'gandhinagar'] },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873, center: 'MI Road, Jaipur', viewbox: '75.55,26.65,76.05,27.15', aliases: ['jaipur'] },
  { name: 'Kochi', lat: 9.9312, lon: 76.2673, center: 'MG Road, Kochi', viewbox: '76.05,9.75,76.55,10.25', aliases: ['kochi', 'cochin', 'ernakulam'] },
  { name: 'Vizag', lat: 17.6868, lon: 83.2185, center: 'RK Beach, Visakhapatnam', viewbox: '83.10,17.50,83.40,17.90', aliases: ['vizag', 'visakhapatnam', 'waltair'] },
  { name: 'Vijayawada', lat: 16.5062, lon: 80.6480, center: 'Benz Circle, Vijayawada', viewbox: '80.50,16.30,80.80,16.70', aliases: ['vijayawada', 'bezawada'] },
];

// Helper to format structured address suggestions down to house number/building/street precision
const formatAddressItem = (item: any) => {
  const addr = item.address || {};
  const primaryParts = [];

  if (addr.house_number) primaryParts.push(`#${addr.house_number}`);
  if (addr.building) primaryParts.push(addr.building);
  if (addr.amenity) primaryParts.push(addr.amenity);
  if (addr.shop) primaryParts.push(addr.shop);
  if (addr.office) primaryParts.push(addr.office);
  if (addr.residential) primaryParts.push(addr.residential);
  if (addr.road) primaryParts.push(addr.road);

  const primary = primaryParts.length > 0
    ? primaryParts.join(', ')
    : (addr.suburb || addr.neighbourhood || addr.city_district || item.display_name.split(',')[0].trim());

  const secondaryParts = [];
  if (addr.suburb && !primary.includes(addr.suburb)) secondaryParts.push(addr.suburb);
  if (addr.neighbourhood && !primary.includes(addr.neighbourhood)) secondaryParts.push(addr.neighbourhood);
  if (addr.city_district && !primary.includes(addr.city_district)) secondaryParts.push(addr.city_district);
  if (addr.city || addr.town || addr.village) secondaryParts.push(addr.city || addr.town || addr.village);
  if (addr.state) secondaryParts.push(addr.state);
  if (addr.postcode) secondaryParts.push(addr.postcode);

  const secondary = secondaryParts.length > 0 ? secondaryParts.join(', ') : item.display_name;
  return { primary, secondary, full: item.display_name };
};

export default function IntracityPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const location = useSelector((s: RootState) => s.location);
  const booking = useSelector((s: RootState) => s.booking);
  const auth = useSelector((s: RootState) => s.auth);

  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [pickupInput, setPickupInput] = useState(location.pickup?.address || '');
  const [destInput, setDestInput] = useState(location.destination?.address || '');
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fill pickup from GPS with High Precision
  useEffect(() => {
    if (!location.pickup && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `${NOMINATIM_URL}/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1&extratags=1`,
              { headers: { 'User-Agent': 'MoveON/1.0' } }
            );
            const data = await res.json();
            const formatted = formatAddressItem(data);
            const addressStr = `${formatted.primary}, ${formatted.secondary}`;
            dispatch(setPickup({ lat: pos.coords.latitude, lon: pos.coords.longitude, address: addressStr }));
            setPickupInput(addressStr);
          } catch { /* ignore */ }
        },
        () => { /* ignore */ },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else if (location.pickup?.address) {
      setPickupInput(location.pickup.address);
    }
  }, []);

  // Handle City Change: Reset destination & vehicles so Intracity stays strictly within the selected city
  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    setError('');
    setVehicles([]);
    dispatch(setDestination(null));
    dispatch(clearRoute());
    dispatch(setSelectedVehicle(null));
    setDestInput('');
    setPickupSuggestions([]);
    setDestSuggestions([]);

    const cityData = POPULAR_CITIES.find(c => c.name === cityName);
    if (cityData) {
      const address = cityData.center;
      dispatch(setPickup({ lat: cityData.lat, lon: cityData.lon, address }));
      setPickupInput(address);
    }
  };

  // Strictly Scoped Search suggestions restricted ONLY to the selected city
  const searchPlaces = useCallback((q: string, setSuggestions: (s: any[]) => void, city: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 1) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const cityData = POPULAR_CITIES.find(c => c.name === city);
        const viewboxParam = cityData?.viewbox ? `&viewbox=${cityData.viewbox}&bounded=1` : '';

        // Query strictly bounded to selected city in India
        const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(q + ', ' + city)}&format=json&addressdetails=1&extratags=1&namedetails=1&countrycodes=in&dedupe=1&limit=10${viewboxParam}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MoveON/1.0' } });
        const data = await res.json();

        // Strict filter to verify every suggestion matches the selected city
        const aliases = cityData?.aliases || [city.toLowerCase()];
        const filtered = (data || []).filter((item: any) => {
          const displayName = (item.display_name || '').toLowerCase();
          const addr = item.address || {};
          const itemCity = (addr.city || addr.town || addr.village || addr.state_district || addr.county || '').toLowerCase();
          return aliases.some((alias: string) => displayName.includes(alias) || itemCity.includes(alias));
        });

        setSuggestions(filtered.length > 0 ? filtered : (data || []));
      } catch { setSuggestions([]); }
    }, 250);
  }, []);

  const selectPickup = (item: any) => {
    const formatted = formatAddressItem(item);
    const addressStr = `${formatted.primary}, ${formatted.secondary}`;
    dispatch(setPickup({ lat: parseFloat(item.lat), lon: parseFloat(item.lon), address: addressStr }));
    setPickupInput(addressStr);
    setPickupSuggestions([]);
  };

  const selectCustomPickup = () => {
    const cityData = POPULAR_CITIES.find(c => c.name === selectedCity);
    const lat = location.pickup?.lat || cityData?.lat || 12.9716;
    const lon = location.pickup?.lon || cityData?.lon || 77.5946;
    dispatch(setPickup({ lat, lon, address: pickupInput }));
    setPickupSuggestions([]);
  };

  const selectDest = (item: any) => {
    const formatted = formatAddressItem(item);
    const addressStr = `${formatted.primary}, ${formatted.secondary}`;
    dispatch(setDestination({ lat: parseFloat(item.lat), lon: parseFloat(item.lon), address: addressStr }));
    setDestInput(addressStr);
    setDestSuggestions([]);
  };

  const selectCustomDest = () => {
    const cityData = POPULAR_CITIES.find(c => c.name === selectedCity);
    const lat = location.destination?.lat || (cityData ? cityData.lat + 0.03 : 12.99);
    const lon = location.destination?.lon || (cityData ? cityData.lon + 0.03 : 77.61);
    dispatch(setDestination({ lat, lon, address: destInput }));
    setDestSuggestions([]);
  };

  // Auto-fetch fares when pickup + destination are both set
  useEffect(() => {
    if (!location.pickup || !location.destination) return;
    fetchFareEstimates();
  }, [location.pickup, location.destination]);

  const fetchFareEstimates = async () => {
    if (!location.pickup || !location.destination) return;
    dispatch(setIsLoadingFare(true));
    setError('');
    try {
      // Get route first
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${location.pickup.lon},${location.pickup.lat};${location.destination.lon},${location.destination.lat}?overview=full&geometries=geojson`
      );
      const routeData = await routeRes.json();
      let distanceKm = 5, durationMin = 15;
      if (routeData?.routes?.[0]) {
        distanceKm = routeData.routes[0].distance / 1000;
        durationMin = routeData.routes[0].duration / 60;
        dispatch(setRoute({ distanceMeters: routeData.routes[0].distance, durationSeconds: routeData.routes[0].duration, geometry: routeData.routes[0].geometry }));
      }

      // Intracity rides are limited to same-city rides (max 80 km)
      if (distanceKm > 80) {
        setError('IntraCity rides are only for local travel within the same city. For long-distance intercity travel, please select "InterCity Ride".');
        setVehicles([]);
        return;
      }

      const res = await apiClient.post('/booking/estimate', {
        ride_type: 'INTRACITY',
        distance_km: distanceKm,
        duration_min: durationMin,
        pickup_lat: location.pickup.lat,
        pickup_lon: location.pickup.lon,
        destination_lat: location.destination.lat,
        destination_lon: location.destination.lon,
      });
      setVehicles(res.data.vehicles);
    } catch (e) {
      setError('Could not fetch fare estimates. Please check your connection.');
    } finally {
      dispatch(setIsLoadingFare(false));
    }
  };

  const handlePickupDragEnd = async (lat: number, lon: number) => {
    setError('');
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'MoveON/1.0' } }
      );
      const data = await res.json();
      
      const cityData = POPULAR_CITIES.find(c => c.name === selectedCity);
      const aliases = cityData?.aliases || [selectedCity.toLowerCase()];
      const displayName = (data.display_name || '').toLowerCase();
      const addr = data.address || {};
      const itemCity = (addr.city || addr.town || addr.village || addr.state_district || addr.county || '').toLowerCase();
      
      if (!aliases.some((alias: string) => displayName.includes(alias) || itemCity.includes(alias))) {
        setError(`Please drag the pin to a location inside ${selectedCity}. Intracity rides cannot cross city lines.`);
        return;
      }

      const formatted = formatAddressItem(data);
      const addressStr = `${formatted.primary}, ${formatted.secondary}`;
      dispatch(setPickup({ lat, lon, address: addressStr }));
      setPickupInput(addressStr);
    } catch { /* ignore */ }
  };

  const handleDestDragEnd = async (lat: number, lon: number) => {
    setError('');
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'MoveON/1.0' } }
      );
      const data = await res.json();
      
      const cityData = POPULAR_CITIES.find(c => c.name === selectedCity);
      const aliases = cityData?.aliases || [selectedCity.toLowerCase()];
      const displayName = (data.display_name || '').toLowerCase();
      const addr = data.address || {};
      const itemCity = (addr.city || addr.town || addr.village || addr.state_district || addr.county || '').toLowerCase();
      
      if (!aliases.some((alias: string) => displayName.includes(alias) || itemCity.includes(alias))) {
        setError(`Please drag the pin to a destination inside ${selectedCity}. Intracity rides cannot cross city lines.`);
        return;
      }

      const formatted = formatAddressItem(data);
      const addressStr = `${formatted.primary}, ${formatted.secondary}`;
      dispatch(setDestination({ lat, lon, address: addressStr }));
      setDestInput(addressStr);
    } catch { /* ignore */ }
  };

  const handleConfirm = async () => {
    if (!booking.selectedVehicle || !location.pickup || !location.destination) return;
    dispatch(setIsConfirming(true));
    try {
      const couponDiscount = booking.couponResult?.valid ? (booking.couponResult.discount_amount || 0) : 0;
      const res = await apiClient.post('/booking/confirm', {
        rider_id: auth.user?.id || 'anonymous',
        ride_type: 'INTRACITY',
        trip_type: booking.tripType,
        vehicle_category: booking.selectedVehicle.category,
        pickup_lat: location.pickup.lat,
        pickup_lon: location.pickup.lon,
        pickup_address: location.pickup.address,
        destination_lat: location.destination.lat,
        destination_lon: location.destination.lon,
        destination_address: location.destination.address,
        fare_breakdown: booking.selectedVehicle.fare_breakdown,
        distance_km: booking.selectedVehicle.fare_breakdown.distance_km,
        duration_min: booking.selectedVehicle.fare_breakdown.duration_min,
        route_geometry: location.route?.geometry,
        coupon_code: booking.couponResult?.valid ? booking.couponResult.code : null,
        coupon_discount: couponDiscount,
        payment_method: booking.paymentMethod,
        scheduled_at: booking.scheduledAt,
        return_at: booking.returnAt,
        preferences: booking.preferences,
        idempotency_key: `${auth.user?.id}-${Date.now()}`,
      });
      dispatch(setBookingConfirmed({ bookingRef: res.data.booking_ref, status: res.data.status }));
      router.push(`/rider/booking/${res.data.booking_ref}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Booking failed. Please try again.');
      dispatch(setIsConfirming(false));
    }
  };

  const couponDiscount = booking.couponResult?.valid ? (booking.couponResult.discount_amount || 0) : 0;
  const totalFare = booking.selectedVehicle
    ? Math.max(0, booking.selectedVehicle.fare - couponDiscount)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TopNavBar
        title="IntraCity Ride"
        rightAction={
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>City: {selectedCity}</span>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Controls and details */}
        <div className="flex flex-col gap-4">

          {/* City Selection Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shadow-sm">
                  🏙️
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Step 1: Select Your City</p>
                  <p className="text-sm font-bold text-gray-900">Ride in {selectedCity}</p>
                </div>
              </div>

              <select
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {POPULAR_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    📍 {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick City Pill Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
              {POPULAR_CITIES.slice(0, 5).map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleCityChange(c.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCity === c.name
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Trip type selector */}
          <RideOptionSelector
            selected={booking.tripType}
            onChange={(t) => dispatch(setTripType(t))}
          />

          {/* Schedule picker */}
          {(booking.tripType === 'SCHEDULED' || booking.tripType === 'ROUND_TRIP') && (
            <RideScheduler
              tripType={booking.tripType as 'SCHEDULED' | 'ROUND_TRIP'}
              scheduledAt={booking.scheduledAt}
              returnAt={booking.returnAt}
              onScheduledAtChange={(v) => dispatch(setScheduledAt(v))}
              onReturnAtChange={(v) => dispatch(setReturnAt(v))}
            />
          )}

          {/* Location Inputs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
            {/* Pickup */}
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                <input
                  className="flex-1 text-sm py-2 outline-none text-gray-800 placeholder-gray-400 font-medium"
                  placeholder={`Search pickup landmark, building, street in ${selectedCity}...`}
                  value={pickupInput}
                  onChange={e => {
                    setPickupInput(e.target.value);
                    searchPlaces(e.target.value, setPickupSuggestions, selectedCity);
                  }}
                />
                {pickupInput && (
                  <button
                    onClick={() => {
                      setPickupInput('');
                      setPickupSuggestions([]);
                      dispatch(setPickup(null));
                      dispatch(clearRoute());
                      dispatch(setSelectedVehicle(null));
                      setVehicles([]);
                    }}
                    className="text-gray-300 hover:text-gray-500 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
              {(pickupSuggestions.length > 0 || (pickupInput.trim().length > 2 && !location.pickup)) && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {pickupSuggestions.map((s, i) => {
                    const parsed = formatAddressItem(s);
                    return (
                      <button key={i} onClick={() => selectPickup(s)} className="w-full text-left px-4 py-3 hover:bg-blue-50/50 transition-colors flex items-start gap-3">
                        <span className="text-base mt-0.5">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{parsed.primary}</p>
                          <p className="text-xs text-gray-500 truncate">{parsed.secondary}</p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Always allow setting custom entered location */}
                  {pickupInput.trim().length > 0 && (
                    <button
                      onClick={selectCustomPickup}
                      className="w-full text-left px-4 py-3 bg-blue-50/80 hover:bg-blue-100/80 transition-colors flex items-center gap-3 text-blue-700 font-semibold text-sm"
                    >
                      <span>🎯</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blue-500 font-medium uppercase tracking-wider">Set Custom Pickup Address</p>
                        <p className="text-sm font-bold truncate">"{pickupInput}"</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-200" />

            {/* Destination */}
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <input
                  className="flex-1 text-sm py-2 outline-none text-gray-800 placeholder-gray-400 font-medium"
                  placeholder={`Search destination landmark, building, street in ${selectedCity}...`}
                  value={destInput}
                  onChange={e => {
                    setDestInput(e.target.value);
                    searchPlaces(e.target.value, setDestSuggestions, selectedCity);
                  }}
                />
                {destInput && (
                  <button
                    onClick={() => {
                      setDestInput('');
                      setDestSuggestions([]);
                      dispatch(setDestination(null));
                      dispatch(clearRoute());
                      dispatch(setSelectedVehicle(null));
                      setVehicles([]);
                    }}
                    className="text-gray-300 hover:text-gray-500 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
              {(destSuggestions.length > 0 || (destInput.trim().length > 2 && !location.destination)) && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {destSuggestions.map((s, i) => {
                    const parsed = formatAddressItem(s);
                    return (
                      <button key={i} onClick={() => selectDest(s)} className="w-full text-left px-4 py-3 hover:bg-blue-50/50 transition-colors flex items-start gap-3">
                        <span className="text-base mt-0.5">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{parsed.primary}</p>
                          <p className="text-xs text-gray-500 truncate">{parsed.secondary}</p>
                        </div>
                      </button>
                    );
                  })}

                  {/* Always allow setting custom entered destination */}
                  {destInput.trim().length > 0 && (
                    <button
                      onClick={selectCustomDest}
                      className="w-full text-left px-4 py-3 bg-red-50/80 hover:bg-red-100/80 transition-colors flex items-center gap-3 text-red-700 font-semibold text-sm"
                    >
                      <span>🎯</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-red-500 font-medium uppercase tracking-wider">Set Custom Destination Address</p>
                        <p className="text-sm font-bold truncate">"{destInput}"</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

          {/* Vehicle List */}
          {(vehicles.length > 0 || booking.isLoadingFare) && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-gray-700 px-1">Available Rides</h2>
              <VehicleList
                vehicles={vehicles}
                selectedCategory={booking.selectedVehicle?.category || null}
                onSelect={(v) => dispatch(setSelectedVehicle(v))}
                couponDiscount={couponDiscount}
                isLoading={booking.isLoadingFare}
              />
            </div>
          )}

          {/* Fare Breakdown + Coupon */}
          {booking.selectedVehicle && (
            <>


              <CouponSelector
                rideType="INTRACITY"
                fare={booking.selectedVehicle.fare}
                onCouponApplied={(r) => dispatch(setCouponResult(r))}
                onCouponCleared={() => dispatch(setCouponResult(null))}
                appliedCoupon={booking.couponResult}
              />

            </>
          )}

          {/* Bottom Confirm Bar */}
          {booking.selectedVehicle && location.pickup && location.destination && (
            <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg -mx-4 px-4 py-4 z-20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">{booking.selectedVehicle.display_name}</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalFare.toFixed(0)}</p>
                </div>
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-200"
                >
                  Book Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Interactive Map */}
        <div className="lg:sticky lg:top-4 h-[300px] lg:h-[calc(100vh-100px)] z-10">
          <RouteMap
            pickup={location.pickup}
            destination={location.destination}
            routeGeometry={location.route?.geometry}
            onPickupDragEnd={handlePickupDragEnd}
            onDestinationDragEnd={handleDestDragEnd}
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <BookingConfirmationDialog
        open={showConfirmDialog}
        vehicle={booking.selectedVehicle}
        totalFare={totalFare}
        pickupAddress={location.pickup?.address || ''}
        destinationAddress={location.destination?.address || ''}
        bookingRef={booking.bookingRef}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirm}
        isConfirming={booking.isConfirming}
      />
    </div>
  );
}
