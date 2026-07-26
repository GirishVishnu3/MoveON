'use client';

import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store/index';
import { apiClient } from 'shared/src/api/axios';
import {
  setIncomingRide,
  tickCountdown,
  clearIncomingRide,
  setWsConnected,
} from 'shared/src/store/dispatchSlice';
import { socket } from 'shared/src/utils/websocket';
import { useRouter } from 'next/navigation';

/* ─── Countdown ring ─────────────────────────────────────────────────────── */
function CountdownRing({ value, max }: { value: number; max: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const progress = (value / max) * circ;
  const color = value > 8 ? '#22c55e' : value > 4 ? '#f59e0b' : '#ef4444';

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${progress} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }}
      />
      <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill="white">
        {value}
      </text>
    </svg>
  );
}

/* ─── Main driver incoming ride page ─────────────────────────────────────── */
export default function DriverIncomingPage() {
  const router = useRouter();
  const rdxDispatch = useDispatch<AppDispatch>();

  const auth = useSelector((s: RootState) => s.auth);
  const dispatchState = useSelector((s: RootState) => s.dispatch);

  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [vehicleCategory, setVehicleCategory] = useState('SUV');

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_TIMEOUT = dispatchState.incomingRide?.timeout ?? 15;

  /* WebSocket — connect as driver_{user_id} */
  useEffect(() => {
    if (!auth.user?.id) return;

    const clientId = `driver_${auth.user.id}`;
    socket.connect(clientId);

    const handleConnected = () => rdxDispatch(setWsConnected(true));
    const handleDisconnected = () => rdxDispatch(setWsConnected(false));

    const handleIncomingRide = (data: any) => {
      rdxDispatch(setIncomingRide({
        booking_ref: data.booking_ref,
        pickup_lat: data.pickup_lat,
        pickup_lon: data.pickup_lon,
        pickup_address: data.pickup_address ?? 'Pickup Location',
        destination_address: data.destination_address ?? 'Destination',
        estimated_fare: data.estimated_fare,
        timeout: data.timeout ?? 15,
      }));
    };

    socket.on('__connected', handleConnected);
    socket.on('__disconnected', handleDisconnected);
    socket.on('INCOMING_RIDE', handleIncomingRide);

    return () => {
      socket.off('__connected', handleConnected);
      socket.off('__disconnected', handleDisconnected);
      socket.off('INCOMING_RIDE', handleIncomingRide);
      socket.disconnect();
    };
  }, [auth.user?.id]);

  /* Countdown timer */
  useEffect(() => {
    if (dispatchState.incomingRide) {
      countdownRef.current = setInterval(() => {
        rdxDispatch(tickCountdown());
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [!!dispatchState.incomingRide]);

  /* Auto-dismiss on countdown reaching 0 */
  useEffect(() => {
    if (dispatchState.timeoutCountdown === 0 && dispatchState.incomingRide) {
      rdxDispatch(clearIncomingRide());
    }
  }, [dispatchState.timeoutCountdown]);

  /* Toggle online/offline */
  const toggleStatus = async () => {
    if (!auth.user?.id) return;
    setTogglingStatus(true);
    try {
      const newStatus = !isOnline;
      // Default to Bangalore (to match Rider's default) so we can easily test local dispatch
      const defaultLat = 12.9716;
      const defaultLon = 77.5946;

      await apiClient.post(`/driver/${auth.user.id}/status`, {
        is_online: newStatus,
        vehicle_category: vehicleCategory,
        lat: defaultLat,
        lon: defaultLon
      });
      setIsOnline(newStatus);
    } catch {
      setActionError('Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  /* Accept ride */
  const handleAccept = async () => {
    if (!dispatchState.incomingRide) return;
    setAccepting(true);
    setActionError('');
    try {
      await apiClient.post(`/booking/${dispatchState.incomingRide.booking_ref}/accept`);
      rdxDispatch(clearIncomingRide());
      router.push(`/driver/trip/${dispatchState.incomingRide.booking_ref}`);
    } catch (err: any) {
      setActionError(err.response?.data?.detail ?? 'Failed to accept ride');
    } finally {
      setAccepting(false);
    }
  };

  /* Reject ride */
  const handleReject = async () => {
    if (!dispatchState.incomingRide) return;
    setRejecting(true);
    try {
      await apiClient.post(`/booking/${dispatchState.incomingRide.booking_ref}/reject`);
      rdxDispatch(clearIncomingRide());
    } catch {
      // Silent fail — dispatch engine will timeout anyway
      rdxDispatch(clearIncomingRide());
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">Driver Dashboard</h1>
        <div className="flex items-center gap-3">
          <select 
            value={vehicleCategory} 
            onChange={(e) => setVehicleCategory(e.target.value)}
            disabled={isOnline || togglingStatus}
            className="bg-white/10 border border-white/20 text-sm text-white rounded-lg px-2 py-1 outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value="BIKE" className="bg-slate-900 text-white">Bike</option>
            <option value="AUTO" className="bg-slate-900 text-white">Auto</option>
            <option value="CAR" className="bg-slate-900 text-white">Car</option>
            <option value="SUV" className="bg-slate-900 text-white">SUV</option>
          </select>
          <span className="text-sm text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
          <button
            onClick={toggleStatus}
            disabled={togglingStatus}
            className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
              isOnline ? 'bg-green-500 shadow-lg shadow-green-500/40' : 'bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                isOnline ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Idle state */}
        {!dispatchState.incomingRide && (
          <div className="text-center flex flex-col items-center gap-6 max-w-sm">
            <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">
                {isOnline ? 'Waiting for Rides' : 'You\'re Offline'}
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                {isOnline
                  ? 'Ride requests will appear here when passengers need a driver nearby.'
                  : 'Toggle the switch above to go online and start receiving ride requests.'}
              </p>
            </div>
            {isOnline && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-green-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <span className="text-green-400 text-sm font-medium">Listening for requests…</span>
              </div>
            )}
          </div>
        )}

        {/* Incoming ride card */}
        {dispatchState.incomingRide && (
          <div className="w-full max-w-sm flex flex-col gap-4 animate-[slideUp_0.4s_ease]">
            {/* Countdown */}
            <div className="flex flex-col items-center gap-2">
              <CountdownRing value={dispatchState.timeoutCountdown} max={MAX_TIMEOUT} />
              <p className="text-gray-400 text-sm">Respond before time runs out</p>
            </div>

            {/* Ride details card */}
            <div className="bg-white/8 backdrop-blur-sm rounded-3xl border border-white/15 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white">New Ride Request</h3>
                <span className="text-xs text-blue-300 font-semibold bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                  {dispatchState.incomingRide.booking_ref}
                </span>
              </div>

              {/* Route */}
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pickup</p>
                    <p className="text-sm text-gray-200 mt-0.5">{dispatchState.incomingRide.pickup_address}</p>
                  </div>
                </div>
                <div className="ml-[5px] border-l-2 border-dashed border-white/10 h-3" />
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Destination</p>
                    <p className="text-sm text-gray-200 mt-0.5">{dispatchState.incomingRide.destination_address}</p>
                  </div>
                </div>
              </div>

              {/* Fare */}
              {dispatchState.incomingRide.estimated_fare != null && (
                <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Estimated Fare</span>
                  <span className="text-2xl font-black text-green-400">
                    ₹{dispatchState.incomingRide.estimated_fare.toFixed(0)}
                  </span>
                </div>
              )}
            </div>

            {actionError && (
              <p className="text-red-400 text-sm text-center">{actionError}</p>
            )}

            {/* Accept / Reject */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReject}
                disabled={rejecting || accepting}
                className="py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold transition-all"
              >
                {rejecting ? '…' : 'Decline'}
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting || rejecting}
                className="py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold transition-all shadow-xl shadow-green-900/50"
              >
                {accepting ? 'Accepting…' : 'Accept Ride'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
