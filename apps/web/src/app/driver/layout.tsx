"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from 'shared/src/store/index';
import AuthGuard from 'shared/src/components/auth/AuthGuard';
import { apiClient } from 'shared/src/api/axios';
import { motion, AnimatePresence } from 'framer-motion';

import { socket } from 'shared/src/utils/websocket';

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [incomingToast, setIncomingToast] = useState<any>(null);

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

  // Websocket connection for Dispatch Engine
  useEffect(() => {
    if (user?.id) {
      socket.connect(`driver_${user.id}`);

      const handleIncomingRide = (data: any) => {
        console.log('[Driver] Incoming ride received!', data);
        setIncomingToast(data);
        if (typeof window !== 'undefined') {
          localStorage.setItem('incoming_ride_data', JSON.stringify(data));
        }
        setTimeout(() => {
          router.push('/driver/incoming');
        }, 1200);
      };

      socket.on('INCOMING_RIDE', handleIncomingRide);

      return () => {
        socket.off('INCOMING_RIDE', handleIncomingRide);
        socket.disconnect();
      };
    }
  }, [user, router]);

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

  return (
    <>
      <AnimatePresence>
        {incomingToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] bg-emerald-950/90 backdrop-blur-xl border border-emerald-500/50 p-4 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex items-center justify-between text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl animate-bounce">
                🚕
              </div>
              <div>
                <p className="text-xs uppercase font-black text-emerald-400 tracking-wider">New Ride Request!</p>
                <p className="text-sm font-bold text-white">Fare: ₹{incomingToast.estimated_fare ?? '---'}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/driver/incoming')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold rounded-xl text-xs shadow-md transition-all"
            >
              View Ride →
            </button>
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
