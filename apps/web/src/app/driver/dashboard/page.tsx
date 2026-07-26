"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'shared/src/store/index';
import { logout } from 'shared/src/store/authSlice';
import { apiClient } from 'shared/src/api/axios';
import { LocationAccessModal } from 'shared/src/components/location/LocationAccessModal';
import { motion, AnimatePresence } from 'framer-motion';

/* --- Icon Components --------------------------------------------- */
const Icon = {
  Wallet: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 12h5v4h-5a2 2 0 010-4z" />
    </svg>
  ),
  Star: () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Rides: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 6h3l3 5H5l2-5h3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18" />
    </svg>
  ),
  Earnings: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Flag: () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V5m0 0l6-2 6 2 6-2v14l-6 2-6-2-6 2V5z" />
    </svg>
  ),
  Radar: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      <path strokeLinecap="round" d="M12 12L5 5" />
    </svg>
  ),
};

/* --- Metric Card --------------------------------------------------- */
function MetricCard({ label, value, icon, accent, delay }: {
  label: string; value: string | number; icon: React.ReactNode;
  accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="relative overflow-hidden bg-gray-900/40 backdrop-blur-sm border border-gray-800/60 rounded-2xl p-5 flex flex-col gap-3"
    >
      {/* Subtle corner glow */}
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full blur-xl opacity-30 ${accent}`} />
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${accent} bg-current/10 relative`}
        style={{ background: 'rgba(255,255,255,0.04)' }}>
        <span className={accent === 'text-emerald-400' ? 'text-emerald-400' : accent === 'text-blue-400' ? 'text-blue-400' : accent === 'text-amber-400' ? 'text-amber-400' : 'text-purple-400'}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-white mt-0.5">{value}</p>
      </div>
    </motion.div>
  );
}

/* --- Ride Card ----------------------------------------------------- */
function RideCard({ ride, onAccept, index }: { ride: any; onAccept: () => void; index: number }) {
  const [accepting, setAccepting] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    await new Promise(r => setTimeout(r, 600));
    onAccept();
  };

  const progress = (countdown / 30) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: 'easeOut' }}
      className="relative bg-gray-900/50 border border-gray-800/60 rounded-2xl overflow-hidden"
    >
      {/* Countdown progress bar at top */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.9, ease: 'linear' }}
        className="absolute top-0 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500"
      />

      <div className="p-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          {/* Route info */}
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                ₹{ride.fare}
              </span>
              <span className="text-xs text-gray-500 font-mono">{ride.distance}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400 font-medium">{ride.passenger}</span>
              <span className="text-xs text-amber-400 font-bold">{ride.rating}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 mt-0.5"><Icon.MapPin /></span>
                <p className="text-xs text-gray-300 truncate">{ride.pickup}</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5"><Icon.Flag /></span>
                <p className="text-xs text-gray-400 truncate">{ride.dropoff}</p>
              </div>
            </div>
          </div>

          {/* Countdown + Accept */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            {/* Circular countdown */}
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                <motion.circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={countdown <= 10 ? '#f59e0b' : '#10b981'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 15}`}
                  strokeDashoffset={`${2 * Math.PI * 15 * (1 - countdown / 30)}`}
                  transition={{ duration: 0.9, ease: 'linear' }}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-black ${countdown <= 10 ? 'text-amber-400' : 'text-white'}`}>
                {countdown}s
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              onClick={handleAccept}
              disabled={accepting}
              className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-lg shadow-emerald-900/40 disabled:opacity-70 flex items-center gap-1"
            >
              {accepting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                  className="w-3.5 h-3.5 border-2 border-gray-900/30 border-t-gray-900 rounded-full"
                />
              ) : 'Accept'}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* --- Active Trip Card ---------------------------------------------- */
function ActiveTripCard({ ride, onComplete }: { ride: any; onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30"
      style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.05) 100%)' }}
    >
      {/* Animated top border */}
      <motion.div
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: 'linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6, #10b981)',
          backgroundSize: '200% 100%',
        }}
      />

      <div className="p-5 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-emerald-400"
            />
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">Ride In Progress</span>
          </div>
          <span className="text-xl font-black text-white">₹{ride.fare}</span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-white">
            {ride.passenger[0]}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{ride.passenger}</p>
            <p className="text-xs text-amber-400 font-semibold">{ride.rating}</p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/3 border border-white/5">
            <span className="text-emerald-400 mt-0.5"><Icon.MapPin /></span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Pickup</p>
              <p className="text-xs text-gray-200">{ride.pickup}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/3 border border-white/5">
            <span className="text-blue-400 mt-0.5"><Icon.Flag /></span>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Dropoff</p>
              <p className="text-xs text-gray-200">{ride.dropoff}</p>
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(16,185,129,0.4)' }}
          whileTap={{ scale: 0.97 }}
          onClick={onComplete}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-900/40"
        >
          Complete Trip ✓
        </motion.button>
      </div>
    </motion.div>
  );
}

/* --- Quick Link Button --------------------------------------------- */
function QuickLink({ icon, label, onClick, danger = false }: {
  icon: string; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all border ${
        danger
          ? 'bg-red-950/20 hover:bg-red-950/40 border-red-900/30 text-red-400'
          : 'bg-gray-900/40 hover:bg-gray-800/60 border-gray-800/60 text-gray-300'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-[11px] font-bold">{label}</span>
    </motion.button>
  );
}

/* --- Main Dashboard ----------------------------------------------- */
export default function DriverDashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [acceptedRide, setAcceptedRide] = useState<any | null>(null);
  const [todayEarnings, setTodayEarnings] = useState(0);

  const loadDashboardData = async () => {
    if (!user?.phone_number) return;
    try {
      const res = await apiClient.get(`/driver/auth/me?phone_number=${user.phone_number}`);
      setDriverInfo(res.data);
      setIsOnline(res.data?.online_status === 'ONLINE');
      const statusRes = await apiClient.get(`/driver/onboarding/status?phone_number=${user.phone_number}`);
      setSubscriptionInfo(statusRes.data);
    } catch (err) {
      setError('Could not fetch driver metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboardData(); }, [user]);

  const fetchAvailableRides = async () => {
    try {
      const res = await apiClient.get('/driver/available-rides');
      if (res.data && Array.isArray(res.data)) {
        setAvailableRides(res.data.map((r: any) => ({
          id: r.booking_ref,
          booking_ref: r.booking_ref,
          pickup: r.pickup_address,
          dropoff: r.destination_address,
          distance: `${r.distance_km} km`,
          fare: r.fare,
          passenger: r.rider_name || 'Rider Partner',
          rating: '4.9 ★',
          phone: r.rider_phone
        })));
      }
    } catch (e) {
      // Non-fatal if no active bookings
    }
  };

  useEffect(() => {
    let timer: any;
    if (isOnline) {
      fetchAvailableRides();
      timer = setInterval(fetchAvailableRides, 3000);
    } else {
      setAvailableRides([]);
    }
    return () => clearInterval(timer);
  }, [isOnline]);

  const handleToggleOnline = async () => {
    const dId = driverInfo?.id || 'demo-driver-id';
    setToggling(true);
    setError(null);
    try {
      const newStatus = !isOnline;
      await apiClient.post(`/driver/${dId}/status`, {
        is_online: newStatus, vehicle_category: driverInfo?.vehicle?.category || 'SEDAN',
        lat: 12.9716, lon: 77.5946
      });
      setIsOnline(newStatus);
    } catch {
      // Local fallback for offline prototype mode
      setIsOnline(prev => !prev);
    } finally {
      setToggling(false);
    }
  };

  const handleAcceptRide = async (ride: any) => {
    try {
      const phone = user?.phone_number || (user as any)?.phone || (typeof window !== 'undefined' ? localStorage.getItem('moveon_user_phone') : null) || '9876543210';
      await apiClient.post('/driver/accept-ride', {
        booking_ref: ride.booking_ref || ride.id,
        phone_number: phone,
        driver_id: driverInfo?.id
      });
      setAcceptedRide(ride);
      setAvailableRides(prev => prev.filter(r => r.id !== ride.id));
    } catch (err: any) {
      setAcceptedRide(ride);
      setAvailableRides(prev => prev.filter(r => r.id !== ride.id));
    }
  };

  const handleCompleteTrip = () => {
    if (acceptedRide) setTodayEarnings(e => e + acceptedRide.fare);
    setAcceptedRide(null);
  };

  const handleLogout = () => { dispatch(logout()); router.push('/auth'); };

  const hasActiveSubscription = subscriptionInfo?.subscription_status === 'ACTIVE';
  const driverInitial = driverInfo?.first_name?.[0]?.toUpperCase() || 'D';
  const driverName = `${driverInfo?.first_name || ''} ${driverInfo?.last_name || ''}`.trim() || 'Driver';

  /* Loading Skeleton */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d17] flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-2xl border-2 border-t-emerald-500 border-r-emerald-500/20 border-b-transparent border-l-transparent"
          />
          <p className="text-sm font-semibold text-gray-400">Loading Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d17] text-gray-100 flex flex-col">
      {/* Live Geolocation Access Prompt */}
      <LocationAccessModal />

      {/* -- Sticky Header -- */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-20 border-b border-gray-800/40 bg-[#080d17]/80 backdrop-blur-xl px-4 sm:px-6 py-3.5"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Driver Info & Role Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/auth/select-role')}
              className="text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gray-900/60 border border-gray-800"
              title="Switch Role or Account"
            >
              <span>←</span> Switch Role
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-gray-950 font-black text-base shadow-lg shadow-emerald-900/40">
                {driverInitial}
              </div>
              <motion.div
                animate={{ scale: isOnline ? [1, 1.4, 1] : 1, opacity: isOnline ? [1, 0.4, 1] : 1 }}
                transition={{ duration: 2, repeat: isOnline ? Infinity : 0 }}
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#080d17] ${isOnline ? 'bg-emerald-400' : 'bg-gray-600'}`}
              />
            </div>
            <div>
              <h2 className="text-sm font-black text-white leading-tight">{driverName}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-500 font-mono">{driverInfo?.driver_id_code || 'DRV-XXX'}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase ${
                  hasActiveSubscription
                    ? 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20'
                    : 'text-amber-400 bg-amber-500/8 border-amber-500/20'
                }`}>
                  {hasActiveSubscription ? `${subscriptionInfo?.subscription_plan} PASS` : 'NO PASS'}
                </span>
              </div>
            </div>
          </div>

          {/* Brand */}
          <div className="hidden sm:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <span className="text-lg font-black text-white">Move</span>
            <span className="text-lg font-black" style={{
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>ON</span>
          </div>

          {/* Online Toggle */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleToggleOnline}
            disabled={toggling}
            className={`relative px-5 py-2.5 rounded-xl font-black text-xs tracking-widest uppercase transition-all shadow-lg flex items-center gap-2 overflow-hidden ${
              isOnline
                ? 'bg-emerald-500 text-gray-950 shadow-emerald-900/50'
                : 'bg-gray-800 text-gray-400 shadow-black/30'
            }`}
          >
            {isOnline && (
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
              />
            )}
            {toggling ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full" />
            ) : (
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-gray-950' : 'bg-gray-600'}`} />
            )}
            {isOnline ? 'Online' : 'Go Online'}
          </motion.button>
        </div>
      </motion.header>

      {/* -- Main Content -- */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-red-950/30 border border-red-800/50 text-red-400 text-sm rounded-2xl flex items-center justify-between gap-3 overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <p className="font-medium">{error}</p>
              </div>
              {!hasActiveSubscription && (
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => router.push('/driver/subscription')}
                  className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl whitespace-nowrap">
                  Get Pass →
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subscription Required Banner */}
        <AnimatePresence>
          {!hasActiveSubscription && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="relative overflow-hidden rounded-2xl border border-amber-500/20 p-5"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(17,24,39,0.8) 100%)' }}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl" />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pl-4">
                <div>
                  <p className="text-[10px] uppercase font-black text-amber-400 tracking-widest mb-1">Optional Subscription Pass</p>
                  <h3 className="text-base font-black text-white">Daily ₹9 · Weekly ₹54 · Monthly ₹199</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Keep 100% of your earnings with zero platform commission.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/driver/subscription')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs px-5 py-2.5 rounded-xl whitespace-nowrap shadow-lg shadow-emerald-900/40"
                >
                  Choose Pass →
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Today's Earnings" value={`₹${todayEarnings + (driverInfo?.earnings || 0)}`} icon={<Icon.Earnings />} accent="text-emerald-400" delay={0.1} />
          <MetricCard label="Wallet Balance" value={`₹${driverInfo?.wallet_balance || 0}`} icon={<Icon.Wallet />} accent="text-blue-400" delay={0.15} />
          <MetricCard label="Driver Rating" value={`${driverInfo?.rating || '5.0'} ★`} icon={<Icon.Star />} accent="text-amber-400" delay={0.2} />
          <MetricCard label="Total Rides" value={driverInfo?.completed_rides || 0} icon={<Icon.Rides />} accent="text-purple-400" delay={0.25} />
        </div>

        {/* Active Trip */}
        <AnimatePresence mode="wait">
          {acceptedRide && (
            <ActiveTripCard key="active-trip" ride={acceptedRide} onComplete={handleCompleteTrip} />
          )}
        </AnimatePresence>

        {/* Live Ride Feed */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="bg-gray-900/30 backdrop-blur-sm border border-gray-800/50 rounded-2xl overflow-hidden"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/40">
            <div className="flex items-center gap-2.5">
              <div className="text-gray-400"><Icon.Radar /></div>
              <h3 className="text-sm font-black text-white">Nearby Ride Requests</h3>
            </div>
            {isOnline && (
              <div className="flex items-center gap-1.5">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-emerald-400"
                />
                <span className="text-xs font-bold text-emerald-400">Scanning</span>
              </div>
            )}
          </div>

          <div className="p-4">
            {!isOnline ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-gray-800/60 border border-gray-700/40 flex items-center justify-center text-2xl mx-auto">
                  🛑
                </div>
                <div>
                  <p className="text-sm font-bold text-white">You're Offline</p>
                  <p className="text-xs text-gray-500 mt-1">Toggle online above to start receiving ride requests.</p>
                </div>
              </motion.div>
            ) : availableRides.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center space-y-3"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  className="w-14 h-14 rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center text-2xl mx-auto"
                >
                  📡
                </motion.div>
                <div>
                  <p className="text-sm font-bold text-white">Scanning Area...</p>
                  <p className="text-xs text-gray-500 mt-1">No ride requests yet. Stay nearby a busy zone.</p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {availableRides.map((ride, i) => (
                    <RideCard key={ride.id} ride={ride} index={i} onAccept={() => handleAcceptRide(ride)} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3 px-1">Quick Access</p>
          <div className="grid grid-cols-4 gap-2.5">
            <QuickLink icon="💳" label="Passes" onClick={() => router.push('/driver/subscription')} />
            <QuickLink icon="📋" label="Documents" onClick={() => router.push('/onboarding/driver/pending')} />
            <QuickLink icon="🏦" label="Wallet" onClick={() => router.push('/driver/wallet')} />
            <QuickLink icon="🚪" label="Sign Out" onClick={handleLogout} danger />
          </div>
        </motion.div>

      </main>
    </div>
  );
}
