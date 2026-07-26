'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store/index';
import { apiClient } from 'shared/src/api/axios';
import {
  startSearch,
  driverAssigned,
  dispatchFailed,
  dispatchCancelled,
  updateStatusMessage,
  setWsConnected,
  resetDispatch,
} from 'shared/src/store/dispatchSlice';
import { socket } from 'shared/src/utils/websocket';
import Link from 'next/link';

/* ─── Animated search ring ──────────────────────────────────────────────── */
function PulseRings() {
  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute rounded-full border-2 border-blue-400 animate-ping opacity-30"
          style={{
            width: `${80 + i * 28}px`,
            height: `${80 + i * 28}px`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: '1.8s',
          }}
        />
      ))}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-400/40 z-10">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      </div>
    </div>
  );
}

/* ─── Driver assigned card ────────────────────────────────────────────────── */
function DriverCard({ driver }: { driver: { driver_id: string; driver_name: string; vehicle_model?: string; rating?: number; eta_minutes?: number } }) {
  return (
    <div className="bg-white rounded-3xl border border-green-100 shadow-xl shadow-green-100/60 p-6 flex flex-col gap-4 animate-[slideUp_0.5s_ease]">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
          {driver.driver_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{driver.driver_name}</h3>
          {driver.vehicle_model && (
            <p className="text-sm text-gray-500">{driver.vehicle_model}</p>
          )}
          {driver.rating && (
            <div className="flex items-center gap-1 mt-1">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700">{driver.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        {driver.eta_minutes && (
          <div className="text-right">
            <p className="text-2xl font-black text-green-600">{driver.eta_minutes}</p>
            <p className="text-xs text-gray-400">mins away</p>
          </div>
        )}
      </div>
      <div className="h-px bg-gray-100" />
      <p className="text-sm text-green-700 font-semibold text-center animate-pulse">
        🚗 Driver is on the way to your location
      </p>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function BookingStatusPage() {
  const router = useRouter();
  const params = useParams();
  const bookingRef = params.bookingRef as string;
  const rdxDispatch = useDispatch<AppDispatch>();

  const auth = useSelector((s: RootState) => s.auth);
  const dispatchState = useSelector((s: RootState) => s.dispatch);

  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [detailError, setDetailError] = useState('');

  /* Fetch booking details */
  const fetchBookingDetails = useCallback(async () => {
    try {
      const res = await apiClient.get(`/booking/${bookingRef}`);
      setBookingDetails(res.data);
      setDetailError('');

      // Sync redux status from polling if WS hasn't fired
      if (res.data.status === 'DRIVER_ASSIGNED' && dispatchState.status !== 'driver_assigned') {
        rdxDispatch(driverAssigned({
          driver_id: res.data.driver_id ?? 'unknown',
          driver_name: res.data.driver_name ?? 'Your Driver',
        }));
      }
      if (res.data.status === 'FAILED' && dispatchState.status !== 'failed') {
        rdxDispatch(dispatchFailed('No drivers accepted the ride.'));
      }
      if (res.data.status === 'CANCELLED' && dispatchState.status !== 'cancelled') {
        rdxDispatch(dispatchCancelled());
      }
    } catch {
      setDetailError('Could not retrieve booking details.');
    } finally {
      setLoadingDetails(false);
    }
  }, [bookingRef, dispatchState.status, rdxDispatch]);

  /* WebSocket connection */
  useEffect(() => {
    if (!bookingRef) return;

    rdxDispatch(startSearch(bookingRef));

    const clientId = `rider_${bookingRef}`;
    socket.connect(clientId);

    const handleConnected = () => rdxDispatch(setWsConnected(true));
    const handleDisconnected = () => rdxDispatch(setWsConnected(false));

    const handleDispatchUpdate = (data: any) => {
      rdxDispatch(updateStatusMessage(data.status ?? 'Searching...'));
    };

    const handleDriverAssigned = (data: any) => {
      rdxDispatch(driverAssigned({
        driver_id: data.driver_id,
        driver_name: data.driver_name,
        vehicle_model: data.vehicle_model,
        rating: data.rating,
        eta_minutes: data.eta_minutes,
      }));
    };

    const handleDispatchFailed = (data: any) => {
      rdxDispatch(dispatchFailed(data.reason ?? 'No drivers available'));
    };

    socket.on('__connected', handleConnected);
    socket.on('__disconnected', handleDisconnected);
    socket.on('DISPATCH_UPDATE', handleDispatchUpdate);
    socket.on('DRIVER_ASSIGNED', handleDriverAssigned);
    socket.on('DISPATCH_FAILED', handleDispatchFailed);

    // Fetch initial details
    fetchBookingDetails();

    // Poll every 5s as fallback
    const pollInterval = setInterval(fetchBookingDetails, 5000);

    return () => {
      socket.off('__connected', handleConnected);
      socket.off('__disconnected', handleDisconnected);
      socket.off('DISPATCH_UPDATE', handleDispatchUpdate);
      socket.off('DRIVER_ASSIGNED', handleDriverAssigned);
      socket.off('DISPATCH_FAILED', handleDispatchFailed);
      socket.disconnect();
      clearInterval(pollInterval);
      rdxDispatch(resetDispatch());
    };
  }, [bookingRef, fetchBookingDetails, rdxDispatch]);

  /* Cancel booking */
  const handleCancel = async () => {
    if (!bookingRef) return;
    setCancelling(true);
    try {
      await apiClient.post(`/booking/${bookingRef}/cancel`);
      rdxDispatch(dispatchCancelled());
      fetchBookingDetails();
    } catch (err: any) {
      setDetailError(err.response?.data?.detail ?? 'Failed to cancel booking.');
    } finally {
      setCancelling(false);
    }
  };

  // Derive effective status from Redux (real-time WS) or fall back to fetched booking data
  const bookingApiStatus = bookingDetails?.status;
  const effectiveStatus = dispatchState.status || (
    bookingApiStatus === 'DRIVER_ASSIGNED' ? 'driver_assigned' :
    bookingApiStatus === 'CANCELLED' ? 'cancelled' :
    bookingApiStatus === 'FAILED' ? 'failed' :
    'searching'
  );

  const isSearching = effectiveStatus === 'searching';
  const isAssigned = effectiveStatus === 'driver_assigned';
  const isFailed = effectiveStatus === 'failed';
  const isCancelled = effectiveStatus === 'cancelled';
  const isFinalState = isAssigned || isFailed || isCancelled;

  if (loadingDetails && !bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
          <p className="text-blue-200 font-medium">Loading booking details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <Link href="/rider/home" className="text-blue-300 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Ride Status</h1>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${dispatchState.wsConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
          <span className="text-gray-400">{dispatchState.wsConnected ? 'Live' : 'Polling'}</span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Status hero */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-8 flex flex-col items-center text-center gap-6">
          {isSearching && (
            <>
              <PulseRings />
              <div>
                <h2 className="text-2xl font-black mb-1">Searching for Driver</h2>
                <p className="text-blue-300 text-sm">{dispatchState.statusMessage || 'Looking for nearby drivers…'}</p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </>
          )}

          {isAssigned && dispatchState.assignedDriver && (
            <>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-4xl shadow-2xl shadow-green-500/40 animate-[bounceIn_0.5s_ease]">
                ✓
              </div>
              <div>
                <h2 className="text-2xl font-black text-green-400 mb-1">Driver Assigned!</h2>
                <p className="text-green-300 text-sm">{dispatchState.statusMessage}</p>
              </div>
            </>
          )}

          {isFailed && (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center text-4xl">😔</div>
              <div>
                <h2 className="text-2xl font-black text-red-400 mb-1">No Drivers Found</h2>
                <p className="text-red-300 text-sm">{dispatchState.errorReason}</p>
              </div>
            </>
          )}

          {isCancelled && (
            <>
              <div className="w-20 h-20 rounded-full bg-gray-500/20 flex items-center justify-center text-4xl">❌</div>
              <div>
                <h2 className="text-2xl font-black text-gray-300 mb-1">Ride Cancelled</h2>
                <p className="text-gray-400 text-sm">This booking has been cancelled.</p>
              </div>
            </>
          )}
        </div>

        {/* Driver card */}
        {isAssigned && dispatchState.assignedDriver && (
          <DriverCard driver={dispatchState.assignedDriver} />
        )}

        {/* Booking details */}
        {bookingDetails && (
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-5 flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Booking Ref</span>
              <span className="font-bold text-blue-300">{bookingDetails.booking_ref}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ride Type</span>
              <span className="font-semibold capitalize">{bookingDetails.ride_type?.toLowerCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Vehicle</span>
              <span className="font-semibold capitalize">{bookingDetails.vehicle_category?.toLowerCase().replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Payment</span>
              <span className="font-semibold">{bookingDetails.payment_method}</span>
            </div>
          </div>
        )}

        {/* Route */}
        {bookingDetails && (
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pickup</p>
                <p className="text-sm text-gray-200 font-medium mt-0.5">{bookingDetails.pickup_address}</p>
              </div>
            </div>
            <div className="ml-[5px] border-l-2 border-dashed border-white/20 h-4" />
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Destination</p>
                <p className="text-sm text-gray-200 font-medium mt-0.5">{bookingDetails.destination_address}</p>
              </div>
            </div>
          </div>
        )}

        {detailError && (
          <p className="text-red-400 text-sm text-center">{detailError}</p>
        )}

        {/* Actions */}
        {isSearching && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold transition-all border border-red-500/20"
          >
            {cancelling ? 'Cancelling…' : 'Cancel Ride'}
          </button>
        )}

        {isFinalState && (
          <Link
            href="/rider/home"
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl text-center shadow-xl shadow-blue-900/50 transition-all"
          >
            {isAssigned ? 'View Trip' : 'Book Another Ride'}
          </Link>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
