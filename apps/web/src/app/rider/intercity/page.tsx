"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RootState } from 'shared/src/store/index';
import { setPickup, setDestination, setRoute, clearRoute, swapLocations } from 'shared/src/store/locationSlice';
import {
  setSelectedVehicle, setIsLoadingFare, setIsConfirming,
  setBookingConfirmed, setCouponResult, setPreferences,
  setTripType, setScheduledAt, setReturnAt, setPaymentMethod,
} from 'shared/src/store/bookingSlice';
import VehicleList from 'shared/src/components/booking/VehicleList';
import FareBreakdownPanel from 'shared/src/components/booking/FareBreakdown';
import CouponSelector from 'shared/src/components/booking/CouponSelector';
import BookingPreferencesPanel from 'shared/src/components/booking/BookingPreferences';
import RideOptionSelector from 'shared/src/components/booking/RideOptionSelector';
import RideScheduler from 'shared/src/components/booking/RideScheduler';
import BookingConfirmationDialog from 'shared/src/components/booking/BookingConfirmationDialog';
import { apiClient } from 'shared/src/api/axios';
import type { Vehicle } from 'shared/src/types/booking';

import dynamic from 'next/dynamic';
const RouteMap = dynamic(() => import('../../../components/RouteMap'), { ssr: false });

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// Helper to format structured address suggestions cleanly and accurately
const formatAddressItem = (item: any) => {
  const addr = item.address || {};
  const primary =
    addr.amenity ||
    addr.building ||
    addr.shop ||
    addr.office ||
    addr.road ||
    addr.suburb ||
    addr.neighbourhood ||
    addr.city_district ||
    item.display_name.split(',')[0].trim();

  const secondaryParts = [];
  if (addr.suburb && addr.suburb !== primary) secondaryParts.push(addr.suburb);
  if (addr.city_district && addr.city_district !== primary && addr.city_district !== addr.suburb) secondaryParts.push(addr.city_district);
  if (addr.city || addr.town || addr.village) secondaryParts.push(addr.city || addr.town || addr.village);
  if (addr.state) secondaryParts.push(addr.state);
  if (addr.postcode) secondaryParts.push(addr.postcode);

  const secondary = secondaryParts.length > 0 ? secondaryParts.join(', ') : item.display_name;
  return { primary, secondary, full: item.display_name };
};

export default function IntercityPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const location = useSelector((s: RootState) => s.location);
  const booking = useSelector((s: RootState) => s.booking);
  const auth = useSelector((s: RootState) => s.auth);

  const [pickupInput, setPickupInput] = useState(location.pickup?.address || '');
  const [destInput, setDestInput] = useState(location.destination?.address || '');
  const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState('');
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlaces = useCallback((q: string, setSuggestions: (s: any[]) => void) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${NOMINATIM_URL}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6`,
          { headers: { 'User-Agent': 'MoveON/1.0' } });
        setSuggestions(await res.json());
      } catch { setSuggestions([]); }
    }, 350);
  }, []);

  const selectPickup = (item: any) => {
    const formatted = formatAddressItem(item);
    const addressStr = `${formatted.primary}, ${formatted.secondary}`;
    dispatch(setPickup({ lat: parseFloat(item.lat), lon: parseFloat(item.lon), address: addressStr }));
    setPickupInput(addressStr);
    setPickupSuggestions([]);
  };

  const selectDest = (item: any) => {
    const formatted = formatAddressItem(item);
    const addressStr = `${formatted.primary}, ${formatted.secondary}`;
    dispatch(setDestination({ lat: parseFloat(item.lat), lon: parseFloat(item.lon), address: addressStr }));
    setDestInput(addressStr);
    setDestSuggestions([]);
  };

  const handleSwap = () => {
    dispatch(swapLocations());
    setPickupInput(location.destination?.address || '');
    setDestInput(location.pickup?.address || '');
  };

  useEffect(() => {
    if (location.pickup && location.destination) fetchFareEstimates();
  }, [location.pickup, location.destination]);

  const fetchFareEstimates = async () => {
    if (!location.pickup || !location.destination) return;
    dispatch(setIsLoadingFare(true));
    setError('');
    try {
      const routeRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${location.pickup.lon},${location.pickup.lat};${location.destination.lon},${location.destination.lat}?overview=full&geometries=geojson`
      );
      const routeData = await routeRes.json();
      let distanceKm = 100, durationMin = 90;
      if (routeData?.routes?.[0]) {
        distanceKm = routeData.routes[0].distance / 1000;
        durationMin = routeData.routes[0].duration / 60;
        dispatch(setRoute({ distanceMeters: routeData.routes[0].distance, durationSeconds: routeData.routes[0].duration, geometry: routeData.routes[0].geometry }));
      }
      setRouteInfo({ distanceKm, durationMin });

      const isRoundTrip = booking.tripType === 'ROUND_TRIP';
      const res = await apiClient.post('/booking/estimate', {
        ride_type: 'INTERCITY',
        distance_km: distanceKm,
        duration_min: durationMin,
        pickup_lat: location.pickup.lat,
        pickup_lon: location.pickup.lon,
        destination_lat: location.destination.lat,
        destination_lon: location.destination.lon,
        is_round_trip: isRoundTrip,
      });
      setVehicles(res.data.vehicles);
    } catch (e) {
      setError('Could not fetch route or fare estimates.');
    } finally {
      dispatch(setIsLoadingFare(false));
    }
  };

  const handlePickupDragEnd = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'MoveON/1.0' } }
      );
      const data = await res.json();
      const formatted = formatAddressItem(data);
      const addressStr = `${formatted.primary}, ${formatted.secondary}`;
      dispatch(setPickup({ lat, lon, address: addressStr }));
      setPickupInput(addressStr);
    } catch { /* ignore */ }
  };

  const handleDestDragEnd = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `${NOMINATIM_URL}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'MoveON/1.0' } }
      );
      const data = await res.json();
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
        ride_type: 'INTERCITY',
        trip_type: booking.tripType,
        vehicle_category: booking.selectedVehicle.category,
        pickup_lat: location.pickup.lat,
        pickup_lon: location.pickup.lon,
        pickup_address: location.pickup.address,
        destination_lat: location.destination.lat,
        destination_lon: location.destination.lon,
        destination_address: location.destination.address,
        fare_breakdown: booking.selectedVehicle.fare_breakdown,
        distance_km: routeInfo?.distanceKm || 0,
        duration_min: routeInfo?.durationMin || 0,
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
      setError(e.response?.data?.detail || 'Booking failed.');
      dispatch(setIsConfirming(false));
    }
  };

  const couponDiscount = booking.couponResult?.valid ? (booking.couponResult.discount_amount || 0) : 0;
  const totalFare = booking.selectedVehicle ? Math.max(0, booking.selectedVehicle.fare - couponDiscount) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <Link 
          href="/rider/home" 
          className="flex items-center text-xs font-bold text-gray-700 hover:text-blue-600 transition-colors gap-1.5 py-1.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200"
        >
          <span>←</span> Back to Home
        </Link>
        <h1 className="text-lg font-bold text-gray-900">InterCity Ride</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Controls and details */}
        <div className="flex flex-col gap-4">
          <RideOptionSelector selected={booking.tripType} onChange={(t) => dispatch(setTripType(t))} />

          {(booking.tripType === 'SCHEDULED' || booking.tripType === 'ROUND_TRIP') && (
            <RideScheduler tripType={booking.tripType as any} scheduledAt={booking.scheduledAt} returnAt={booking.returnAt}
              onScheduledAtChange={(v) => dispatch(setScheduledAt(v))} onReturnAtChange={(v) => dispatch(setReturnAt(v))} />
          )}

          {/* Location Inputs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                <input className="flex-1 text-sm py-2 outline-none text-gray-800 placeholder-gray-400 font-medium"
                  placeholder="From city or landmark..." value={pickupInput}
                  onChange={e => { setPickupInput(e.target.value); searchPlaces(e.target.value, setPickupSuggestions); }} />
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
              {pickupSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-50 max-h-64 overflow-y-auto">
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
                </div>
              )}
            </div>

            {/* Swap button */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-dashed border-gray-200" />
              <button onClick={handleSwap} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 transition-colors" title="Swap locations">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
              <div className="flex-1 border-t border-dashed border-gray-200" />
            </div>

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <input className="flex-1 text-sm py-2 outline-none text-gray-800 placeholder-gray-400 font-medium"
                  placeholder="To city or landmark..." value={destInput}
                  onChange={e => { setDestInput(e.target.value); searchPlaces(e.target.value, setDestSuggestions); }} />
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
              {destSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-50 max-h-64 overflow-y-auto">
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
                </div>
              )}
            </div>

            {routeInfo && (
              <div className="flex gap-4 pt-1 border-t border-gray-100 text-sm text-gray-500">
                <span>📏 {routeInfo.distanceKm.toFixed(0)} km</span>
                <span>⏱ ~{Math.ceil(routeInfo.durationMin / 60)}h {Math.ceil(routeInfo.durationMin % 60)}m</span>
              </div>
            )}
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

          {(vehicles.length > 0 || booking.isLoadingFare) && (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-gray-700 px-1">Available Rides</h2>
              <VehicleList vehicles={vehicles} selectedCategory={booking.selectedVehicle?.category || null}
                onSelect={(v) => dispatch(setSelectedVehicle(v))} couponDiscount={couponDiscount} isLoading={booking.isLoadingFare} />
            </div>
          )}

          {booking.selectedVehicle && (
            <>

              <CouponSelector rideType="INTERCITY" fare={booking.selectedVehicle.fare}
                onCouponApplied={(r) => dispatch(setCouponResult(r))} onCouponCleared={() => dispatch(setCouponResult(null))}
                appliedCoupon={booking.couponResult} />
              <BookingPreferencesPanel preferences={booking.preferences} onChange={(p) => dispatch(setPreferences(p))} />
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Payment Method</h3>
                <div className="flex gap-2">
                  {['CASH', 'WALLET', 'CARD', 'UPI'].map(method => (
                    <button key={method} onClick={() => dispatch(setPaymentMethod(method))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                        booking.paymentMethod === method ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      {method === 'CASH' ? '💵' : method === 'WALLET' ? '👜' : method === 'CARD' ? '💳' : '📱'} {method}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {booking.selectedVehicle && location.pickup && location.destination && (
            <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg -mx-4 px-4 py-4 z-20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{booking.selectedVehicle.display_name}</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totalFare.toFixed(0)}</p>
                </div>
                <button onClick={() => setShowConfirmDialog(true)}
                  className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-blue-200">
                  Book Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Route Map */}
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

      <BookingConfirmationDialog open={showConfirmDialog} vehicle={booking.selectedVehicle} totalFare={totalFare}
        pickupAddress={location.pickup?.address || ''} destinationAddress={location.destination?.address || ''}
        bookingRef={booking.bookingRef} onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirm} isConfirming={booking.isConfirming} />
    </div>
  );
}
