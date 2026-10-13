"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from 'shared/src/store/index';
import AuthGuard from 'shared/src/components/auth/AuthGuard';
import { apiClient } from 'shared/src/api/axios';
import { motion, AnimatePresence } from 'framer-motion';

import { socket } from 'shared/src/utils/websocket';

import { playRideAlertChime, triggerBrowserNotification, requestNotificationPermission } from 'shared/src/utils/audioAlert';

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [incomingToast, setIncomingToast] = useState<any>(null);

  // Request browser notification permission once loaded
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    async function checkStatus() {
      const phone = user?.phone_number || (user as any)?.phone || (typeof window !== 'undefined' ? localStorage.getItem('moveon_user_phone') : null) || '9876543210';
      try {
        const res = await apiClient.get(`/driver/onboarding/status?phone_number=${encodeURIComponent(phone)}`);
        const status = res.data;
        if (status.onboarding_status === 'COMPLETED' || status.profile_completed || status.approval_status === 'APPROVED' || status.documents_verified) {
          setCheckingStatus(false);
        } else {
          setCheckingStatus(false);
        }
      } catch (e) {
        setCheckingStatus(false);
      }
    }
    checkStatus();

    // Fallback timeout to guarantee page opens instantly
    const timeout = setTimeout(() => {
      setCheckingStatus(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [user]);

  // Dispatch Engine Connection (WebSocket + BroadcastChannel + LocalStorage for multi-tab testing)
  useEffect(() => {
    const handleIncomingRide = (data: any) => {
      console.log('[Driver] Incoming ride received!', data);
      setIncomingToast(data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('incoming_ride_data', JSON.stringify(data));
      }

      // 🔊 Play attention audio chime
      playRideAlertChime();

      // 📲 Trigger system notification if enabled
      const curr = data.currency === 'GBP' ? '£' : '₹';
      triggerBrowserNotification('🚕 MoveON: New Ride in Your Surroundings!', {
        body: `Fare: ${curr}${data.estimated_fare || data.fare || '---'} · Pickup: ${data.pickup_address || 'Nearby Location'}`,
      });
    };

    // 1. WebSocket listener
    const driverId = user?.id || 'DEMO-DRV-1';
    socket.connect(`driver_${driverId}`);
    socket.on('INCOMING_RIDE', handleIncomingRide);

    // 2. BroadcastChannel listener (instant real-time communication between rider & driver tabs)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('moveon_dispatch_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'INCOMING_RIDE' && event.data.ride) {
          handleIncomingRide(event.data.ride);
        }
      };
    } catch {}

    // 3. Storage event listener (fallback cross-window bridge)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'moveon_latest_ride_broadcast' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingRide(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      socket.off('INCOMING_RIDE', handleIncomingRide);
      socket.disconnect();
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  const handleQuickAccept = async (ride: any) => {
    setIncomingToast(null);
    const bookingRef = ride.booking_ref || ride.id;
    try {
      const phone = user?.phone_number || (typeof window !== 'undefined' ? localStorage.getItem('moveon_user_phone') : null) || '9876543210';
      await apiClient.post('/driver/accept-ride', {
        booking_ref: bookingRef,
        phone_number: phone,
        driver_id: user?.id || 'DEMO-DRV-1',
      });
    } catch {}

    // Mark as accepted locally
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`demo_booking_${bookingRef}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.status = 'DRIVER_ASSIGNED';
        parsed.driver = {
          driver_id: user?.id || 'DEMO-DRV-1',
          driver_name: user?.name || 'Partner Driver',
          vehicle_model: 'Toyota Prius • LD21 XYZ',
          rating: 4.9,
          eta_minutes: 3,
        };
        localStorage.setItem(`demo_booking_${bookingRef}`, JSON.stringify(parsed));
      }
      try {
        const bc = new BroadcastChannel('moveon_dispatch_channel');
        bc.postMessage({ type: 'DRIVER_ASSIGNED', booking_ref: bookingRef });
        bc.close();
      } catch {}
    }

    router.push('/driver/dashboard');
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080d17]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-5"
        >
          {/* MoveON Logo mark */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-2xl border-2 border-t-emerald-500 border-r-emerald-500/30 border-b-transparent border-l-transparent"
          />
          <div className="text-center">
            <p className="text-sm font-bold text-white">Verifying Account</p>
            <p className="text-xs text-gray-500 mt-1">Checking driver status...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const isUK = incomingToast?.currency === 'GBP' || (typeof window !== 'undefined' && localStorage.getItem('moveon_selected_country') === 'GB');
  const currencySymbol = isUK ? '£' : '₹';

  return (
    <>
      <AnimatePresence>
        {incomingToast && (
          <motion.div
            initial={{ opacity: 0, y: -70, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[94%] bg-gray-950/95 backdrop-blur-2xl border-2 border-emerald-500 p-4 rounded-3xl shadow-[0_15px_40px_rgba(16,185,129,0.35)] flex flex-col gap-3 text-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl animate-bounce">
                  🚕
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <p className="text-xs uppercase font-black text-emerald-400 tracking-wider">New Ride in Your Surroundings!</p>
                  </div>
                  <p className="text-lg font-black text-white mt-0.5">
                    Fare: {currencySymbol}{incomingToast.estimated_fare || incomingToast.fare || '180'}
                    <span className="text-xs font-normal text-gray-400 ml-2">({incomingToast.distance_km || '4.2'} km)</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIncomingToast(null)}
                className="text-gray-400 hover:text-white p-1 text-lg font-bold"
                title="Dismiss"
              >
                ×
              </button>
            </div>

            <div className="bg-gray-900/80 rounded-xl p-2.5 text-xs text-gray-300 space-y-1">
              <p className="truncate"><strong className="text-emerald-400">📍 Pickup:</strong> {incomingToast.pickup_address || 'Nearby Location'}</p>
              {incomingToast.destination_address && (
                <p className="truncate"><strong className="text-blue-400">🏁 Drop:</strong> {incomingToast.destination_address}</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleQuickAccept(incomingToast)}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Accept Ride</span>
                <span>✓</span>
              </button>
              <button
                onClick={() => router.push('/driver/incoming')}
                className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-xs transition-all"
              >
                View Full
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <DriverLayoutContent>{children}</DriverLayoutContent>;
}
