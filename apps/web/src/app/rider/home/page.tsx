"use client";
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setRideType } from 'shared/src/store/locationSlice';
import { RootState } from 'shared/src';
import { FaMapPin, FaCar, FaUser, FaWallet, FaHistory } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationBadge from 'shared/src/components/notifications/NotificationBadge';
import { LocationAccessModal } from 'shared/src/components/location/LocationAccessModal';
import { motion } from 'framer-motion';

export default function RiderHomePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setHasLocationPermission(true),
        (err) => {
          console.warn('Geolocation denied', err);
          setHasLocationPermission(false);
        }
      );
    } else {
      setHasLocationPermission(false);
    }
  }, []);

  const handleSelect = (type: 'INTERCITY' | 'INTRACITY') => {
    dispatch(setRideType(type));
    if (type === 'INTERCITY') router.push('/rider/intercity');
    else router.push('/rider/intracity');
  };

  return (
    <div className="min-h-screen bg-[#060b14] text-white flex flex-col relative overflow-hidden">
      {/* Live Location Accessibility Modal */}
      <LocationAccessModal />

      {/* Background Radial Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0d1525]/80 backdrop-blur-xl border-b border-gray-800/80 sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/auth/select-role')}
            className="flex items-center text-xs font-bold text-gray-400 hover:text-white transition-colors gap-1.5 py-1.5 px-3 rounded-xl bg-gray-900/60 border border-gray-800"
          >
            <span>←</span> Switch Role
          </button>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            MoveON
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <NotificationBadge />
          <Link 
            href="/rider/wallet" 
            className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white p-2 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-all"
          >
            <FaWallet size={14} className="text-emerald-400" />
            <span>Wallet</span>
          </Link>
          <Link 
            href="/rider/history" 
            className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white p-2 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-all"
          >
            <FaHistory size={14} className="text-blue-400" />
            <span>Trips</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10 max-w-4xl mx-auto w-full">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            Instant Dispatch
          </span>
          <h1 className="text-4xl font-black text-white tracking-tight sm:text-5xl">
            Where to today?
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Select your journey type to find drivers near you
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Intracity Card */}
          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect('INTRACITY')}
            className="p-8 rounded-3xl bg-[#0d1525] border border-gray-800 hover:border-blue-500/80 text-left transition-all shadow-[0_8px_30px_rgba(0,0,0,0.5)] group relative overflow-hidden flex flex-col justify-between h-60"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl group-hover:scale-110 transition-transform">
              <FaMapPin />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 block">Local Rides</span>
              <h3 className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">IntraCity</h3>
              <p className="text-xs text-gray-400 mt-1">Daily commutes, cabs, autos & bike taxis inside the city.</p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-blue-400 pt-2">
              <span>Book Local Cab</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </motion.button>

          {/* Intercity Card */}
          <motion.button
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect('INTERCITY')}
            className="p-8 rounded-3xl bg-[#0d1525] border border-gray-800 hover:border-emerald-500/80 text-left transition-all shadow-[0_8px_30px_rgba(0,0,0,0.5)] group relative overflow-hidden flex flex-col justify-between h-60"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl group-hover:scale-110 transition-transform">
              <FaCar />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 block">Outstation Travels</span>
              <h3 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">InterCity</h3>
              <p className="text-xs text-gray-400 mt-1">Comfortable long-distance rides & city-to-city cabs.</p>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 pt-2">
              <span>Book Outstation Cab</span>
              <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </motion.button>
        </div>

        {hasLocationPermission === false && (
          <p className="mt-8 text-xs text-gray-500 text-center">
            📍 Location permission off – you can manually enter your pickup location.
          </p>
        )}
      </main>
    </div>
  );
}
