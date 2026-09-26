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
import CountryCitySelector from 'shared/src/components/location/CountryCitySelector';
import { COUNTRIES, CITIES_BY_COUNTRY, CountryCode, CityData, getCountryForCity, getCurrencyForCountry } from 'shared/src/data/citiesData';

import dynamic from 'next/dynamic';
const RouteMap = dynamic(() => import('../../../components/RouteMap'), { ssr: false });

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// Helper to format structured address suggestions down to exact building/house/street/postcode precision
const formatAddressItem = (item: any) => {
  const addr = item.address || {};
  const primaryParts: string[] = [];

  if (addr.house_number) primaryParts.push(`#${addr.house_number}`);
  if (addr.building) primaryParts.push(addr.building);
  if (addr.amenity) primaryParts.push(addr.amenity);
  if (addr.shop) primaryParts.push(addr.shop);
  if (addr.office) primaryParts.push(addr.office);
  if (addr.tourism) primaryParts.push(addr.tourism);
  if (addr.historic) primaryParts.push(addr.historic);
  if (addr.leisure) primaryParts.push(addr.leisure);
  if (addr.residential) primaryParts.push(addr.residential);
  if (addr.commercial) primaryParts.push(addr.commercial);
  if (addr.road) primaryParts.push(addr.road);
  if (addr.pedestrian && !primaryParts.includes(addr.pedestrian)) primaryParts.push(addr.pedestrian);

  const primary = primaryParts.length > 0
    ? primaryParts.join(', ')
    : (addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || item.display_name.split(',')[0].trim());

  const secondaryParts: string[] = [];
  if (addr.suburb && !primary.includes(addr.suburb)) secondaryParts.push(addr.suburb);
  if (addr.neighbourhood && !primary.includes(addr.neighbourhood)) secondaryParts.push(addr.neighbourhood);
  if (addr.quarter && !primary.includes(addr.quarter)) secondaryParts.push(addr.quarter);
  if (addr.city_district && !primary.includes(addr.city_district)) secondaryParts.push(addr.city_district);
  if (addr.city || addr.town || addr.village) secondaryParts.push(addr.city || addr.town || addr.village);
  if (addr.county && !secondaryParts.includes(addr.county)) secondaryParts.push(addr.county);
  if (addr.state && !secondaryParts.includes(addr.state)) secondaryParts.push(addr.state);
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

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('IN');
  const [selectedCity, setSelectedCity] = useState('Bengaluru');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlCountry = params.get('country') as CountryCode;
    const savedCountry = localStorage.getItem('moveon_selected_country') as CountryCode;
    const activeCountry = (urlCountry === 'GB' || urlCountry === 'IN') 
      ? urlCountry 
      : ((savedCountry === 'GB' || savedCountry === 'IN') ? savedCountry : 'IN');

    setSelectedCountry(activeCountry);
    if (activeCountry === 'GB') {
      setSelectedCity('London');
    } else {
      setSelectedCity('Bengaluru');
    }
  }, []);
  const [pickupInput, setPickupInput] = useState(location.pickup?.address || '');
  const [destInput, setDestInput] = useState(location.destination?.address || '');
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isLocating, setIsLocating] = useState(false);

  // Fetch live high-precision device location and reverse-geocode to pickup input
  const fetchLiveDeviceLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(
            `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&extratags=1`,
            { headers: { 'User-Agent': 'MoveON/1.0' } }
          );
          const data = await res.json();
          const formatted = formatAddressItem(data);
          const addressStr = `${formatted.primary}, ${formatted.secondary}`;
          dispatch(setPickup({ lat, lon, address: addressStr }));
          setPickupInput(addressStr);

          // Auto match city within active country cities
          const addr = data.address || {};
          const itemLocationStr = `${addr.city || ''} ${addr.town || ''} ${addr.village || ''} ${addr.county || ''} ${data.display_name || ''}`.toLowerCase();
          const countryCities = CITIES_BY_COUNTRY[selectedCountry] || [];
          const matchedCity = countryCities.find(c => c.aliases.some(alias => itemLocationStr.includes(alias)));
          if (matchedCity) {
            setSelectedCity(matchedCity.name);
          }
        } catch (e) {
          console.error('Reverse geocode error:', e);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [dispatch, selectedCountry]);

  // Auto-fill pickup from GPS with High Precision on initial mount
  useEffect(() => {
    fetchLiveDeviceLocation();
  }, [fetchLiveDeviceLocation]);

  // Handle City Change: Reset destination & vehicles so Intracity stays strictly within the selected city
  const handleCityChange = (cityData: CityData) => {
    setSelectedCity(cityData.name);
    setError('');
    setVehicles([]);
    dispatch(setDestination(null));
    dispatch(clearRoute());
    dispatch(setSelectedVehicle(null));
    setDestInput('');
    setPickupSuggestions([]);
    setDestSuggestions([]);
    dispatch(setPickup({ lat: cityData.lat, lon: cityData.lon, address: cityData.center }));
    setPickupInput(cityData.center);
  };

  // Handle Country Change: switch country and reset to its default city
  const handleCountryChange = (countryCode: CountryCode) => {
    setSelectedCountry(countryCode);
    const cities = CITIES_BY_COUNTRY[countryCode];
    if (cities?.length > 0) handleCityChange(cities[0]);
  };

  // High precision location search restricted to the active country
  const searchPlaces = useCallback((q: string, setSuggestions: (s: any[]) => void, city: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 1) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const countryCode = selectedCountry === 'GB' ? 'gb' : 'in';
        const queryLower = q.toLowerCase();
        const cityLower = city.toLowerCase();

        // Query both exact term and city-bounded term for maximum precision
        const searchQuery = queryLower.includes(cityLower) ? q : `${q}, ${city}`;
        const url = `${NOMINATIM_URL}/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&extratags=1&namedetails=1&countrycodes=${countryCode}&dedupe=1&limit=10`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MoveON/1.0' } });
        const data = await res.json();

        setSuggestions(data || []);
      } catch { setSuggestions([]); }
    }, 200);
  }, [selectedCountry]);

  const selectPickup = (item: any) => {
    const formatted = formatAddressItem(item);
    const addressStr = `${formatted.primary}, ${formatted.secondary}`;
    dispatch(setPickup({ lat: parseFloat(item.lat), lon: parseFloat(item.lon), address: addressStr }));
    setPickupInput(addressStr);
    setPickupSuggestions([]);
  };

  const selectCustomPickup = () => {
    const allCities = [...CITIES_BY_COUNTRY.IN, ...CITIES_BY_COUNTRY.GB];
    const cityData = allCities.find(c => c.name === selectedCity);
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
    const allCities = [...CITIES_BY_COUNTRY.IN, ...CITIES_BY_COUNTRY.GB];
    const cityData = allCities.find(c => c.name === selectedCity);
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
        country_code: selectedCountry,
      });
      // In UK, only two types of vehicles: 4-seater and 6-seater
      let returnedVehicles: Vehicle[] = res.data.vehicles || [];
      if (selectedCountry === 'GB') {
        returnedVehicles = returnedVehicles.filter(
          v => v.category === 'SEDAN' || v.category === 'SUV'
        );
      }
      setVehicles(returnedVehicles);
    } catch (e: any) {
      console.error('Fare estimation error:', e);
      const detail = e?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Could not fetch fare estimates. Please check your connection.');
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
      
      const allCities = [...CITIES_BY_COUNTRY.IN, ...CITIES_BY_COUNTRY.GB];
      const cityData = allCities.find(c => c.name === selectedCity);
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
      
      const allCities = [...CITIES_BY_COUNTRY.IN, ...CITIES_BY_COUNTRY.GB];
      const cityData = allCities.find(c => c.name === selectedCity);
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

  const currencyInfo = getCurrencyForCountry(selectedCountry);
  const currencySymbol = currencyInfo.symbol;

  const currentCountry = COUNTRIES.find(c => c.code === selectedCountry);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TopNavBar
        title="IntraCity Ride"
        rightAction={
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-700">
            <span className="text-sm">{currentCountry?.flag}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>{selectedCity}</span>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Controls and details */}
        <div className="flex flex-col gap-4">

          {/* Country & City Selection Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <CountryCitySelector
              selectedCountry={selectedCountry}
              selectedCity={selectedCity}
              onCountryChange={handleCountryChange}
              onCityChange={handleCityChange}
            />
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
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5 mb-1">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">2</span>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Step 2: Enter Pickup &amp; Destination</span>
            </div>
            {/* Pickup */}
            <div className="relative">
              <div className="flex items-center gap-2">
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
                
                {/* Live Location GPS Pinpoint Button */}
                <button
                  type="button"
                  onClick={fetchLiveDeviceLocation}
                  disabled={isLocating}
                  title="Use Live Device Location"
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-200 px-2.5 py-1.5 rounded-xl transition-all flex-shrink-0"
                >
                  <span className={`text-sm ${isLocating ? 'animate-spin' : 'animate-pulse'}`}>🎯</span>
                  <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'Live GPS'}</span>
                </button>

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
                    className="text-gray-300 hover:text-gray-500 text-lg leading-none px-1"
                  >
                    ×
                  </button>
                )}
              </div>

              {(pickupSuggestions.length > 0 || (pickupInput.trim().length > 2 && !location.pickup)) && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {/* Always offer Live GPS Location option in dropdown */}
                  <button
                    onClick={() => {
                      fetchLiveDeviceLocation();
                      setPickupSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-3 bg-blue-50/80 hover:bg-blue-100/80 transition-colors flex items-center gap-3 text-blue-700 font-semibold text-sm"
                  >
                    <span className="text-base">🎯</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-500 font-medium uppercase tracking-wider">Device GPS Location</p>
                      <p className="text-sm font-bold truncate">Use Current Live Device Position</p>
                    </div>
                  </button>

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
              <div className="flex items-center gap-2 px-1">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">3</span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">Step 3: Choose Vehicle &amp; Book</h2>
              </div>
              <VehicleList
                vehicles={vehicles}
                selectedCategory={booking.selectedVehicle?.category || null}
                onSelect={(v) => dispatch(setSelectedVehicle(v))}
                couponDiscount={couponDiscount}
                isLoading={booking.isLoadingFare}
                currencySymbol={currencySymbol}
              />
            </div>
          )}

          {/* Fare Breakdown + Coupon */}
          {booking.selectedVehicle && (
            <>
              <FareBreakdownPanel
                fare={booking.selectedVehicle.fare_breakdown}
                couponDiscount={couponDiscount}
                currencySymbol={currencySymbol}
              />

              <CouponSelector
                rideType="INTRACITY"
                fare={booking.selectedVehicle.fare}
                onCouponApplied={(r) => dispatch(setCouponResult(r))}
                onCouponCleared={() => dispatch(setCouponResult(null))}
                appliedCoupon={booking.couponResult}
                currencySymbol={currencySymbol}
              />

            </>
          )}

          {/* Bottom Confirm Bar */}
          {booking.selectedVehicle && location.pickup && location.destination && (
            <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg -mx-4 px-4 py-4 z-20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-500">{booking.selectedVehicle.display_name}</p>
                  <p className="text-2xl font-bold text-gray-900">{currencySymbol}{totalFare.toFixed(0)}</p>
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
        currencySymbol={currencySymbol}
      />
    </div>
  );
}
