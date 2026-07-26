"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'shared/src/store/index';
import { logout } from 'shared/src/store/authSlice';
import AuthGuard from 'shared/src/components/auth/AuthGuard';
import { apiClient } from 'shared/src/api/axios';
import { motion } from 'framer-motion';

function RoleSelectionContent() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checkingDriver, setCheckingDriver] = useState(false);

  const handleSelectRider = () => {
    router.push('/rider/home');
  };

  const handleSelectDriver = async () => {
    if (user?.phone_number) {
      setCheckingDriver(true);
      try {
        const isCompletedLocally = localStorage.getItem(`moveon_driver_completed_${user.phone_number}`);
        if (isCompletedLocally === 'true') {
          router.push('/driver/dashboard');
          return;
        }

        const res = await apiClient.get(`/driver/onboarding/status?phone_number=${user.phone_number}`);
        const status = res.data;
        
        if (status.approval_status === 'APPROVED' && status.subscription_status === 'ACTIVE') {
          try { localStorage.setItem(`moveon_driver_completed_${user.phone_number}`, 'true'); } catch { /* ignore */ }
          router.push('/driver/dashboard');
          return;
        }
        
        if (status.approval_status === 'APPROVED') {
          router.push('/driver/setup');
          return;
        }
        
        if (
          status.onboarding_status === 'COMPLETED' ||
          status.profile_completed ||
          status.approval_status === 'UNDER_REVIEW'
        ) {
          router.push('/onboarding/driver/pending');
          return;
        }
        
        router.push('/onboarding/driver');
      } catch {
        router.push('/onboarding/driver');
      } finally {
        setCheckingDriver(false);
      }
    } else {
      router.push('/onboarding/driver');
    }
  };

  const handleConfirmSignOut = () => {
    dispatch(logout());
    router.replace('/auth');
  };

  return (
    <div className="min-h-screen bg-[#060b14] text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Header Sign-Out Link */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-20">
        <button
          onClick={() => setShowConfirmModal(true)}
          className="text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-900/60 border border-gray-800"
        >
          <span>←</span> Sign Out
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-auto bg-[#0d1525] rounded-3xl shadow-[0_12px_50px_rgba(0,0,0,0.7)] border border-gray-800/90 p-8 text-center space-y-6 relative z-10"
      >
        
        {/* Brand Header */}
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-wider mb-3">
            ✨ MoveON Platform
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight">Choose Your Role</h1>
          <p className="text-gray-400 text-sm mt-1">Select how you want to use MoveON today</p>
        </div>

        {/* Role Options */}
        <div className="space-y-4">
          <button
            onClick={handleSelectRider}
            className="w-full p-5 rounded-2xl border border-gray-800 bg-gray-950/60 hover:border-blue-500 hover:bg-blue-950/20 text-left transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🚘
              </div>
              <div>
                <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">Book a Ride</h3>
                <p className="text-xs text-gray-400">Request intracity or intercity cabs</p>
              </div>
            </div>
            <span className="text-gray-500 group-hover:text-blue-400 transition-colors font-bold text-lg">→</span>
          </button>

          <button
            onClick={handleSelectDriver}
            disabled={checkingDriver}
            className="w-full p-5 rounded-2xl border border-gray-800 bg-gray-950/60 hover:border-emerald-500 hover:bg-emerald-950/20 text-left transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🚕
              </div>
              <div>
                <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">Drive & Earn</h3>
                <p className="text-xs text-gray-400">Accept passenger bookings & keep 100%</p>
              </div>
            </div>
            <span className="text-gray-500 group-hover:text-emerald-400 transition-colors font-bold text-lg">
              {checkingDriver ? '...' : '→'}
            </span>
          </button>
        </div>
      </motion.div>

      {/* Sign Out Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Sign Out?</h3>
            <p className="text-sm text-gray-400">Are you sure you want to sign out of your account?</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoleSelectionPage() {
  return (
    <AuthGuard>
      <RoleSelectionContent />
    </AuthGuard>
  );
}
