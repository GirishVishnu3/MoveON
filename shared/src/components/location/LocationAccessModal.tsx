"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { setPickup } from '../../store/locationSlice';

interface LocationAccessModalProps {
  onLocationFetched?: (lat: number, lon: number, address: string) => void;
  forceShow?: boolean;
}

export function LocationAccessModal({ onLocationFetched, forceShow = false }: LocationAccessModalProps) {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Check if location prompt has already been asked in this session
    if (typeof window !== 'undefined') {
      const askedInSession = sessionStorage.getItem('moveon_location_asked');
      if (!askedInSession || forceShow) {
        // Show prompt after a short delay for smooth entrance
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [forceShow]);

  const handleAllowLocation = () => {
    setLoading(true);
    setStatusMessage('Accessing live GPS coordinates...');

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setStatusMessage('Fetching current address...');

          try {
            // Reverse geocode with Nominatim
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              { headers: { 'User-Agent': 'MoveON/1.0' } }
            );
            const data = await res.json();
            const addr = data.address || {};
            const primary = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || 'Current Location';
            const city = addr.city || addr.town || addr.village || addr.state || '';
            const addressString = city ? `${primary}, ${city}` : primary;

            // Dispatch to Redux location store
            dispatch(setPickup({ lat: latitude, lon: longitude, address: addressString }));

            if (onLocationFetched) {
              onLocationFetched(latitude, longitude, addressString);
            }

            if (typeof window !== 'undefined') {
              sessionStorage.setItem('moveon_location_asked', 'true');
            }

            setStatusMessage('Live location enabled!');
            setTimeout(() => {
              setIsOpen(false);
              setLoading(false);
            }, 600);
          } catch {
            // Fallback if reverse geocoding fails
            const addressString = `Live Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
            dispatch(setPickup({ lat: latitude, lon: longitude, address: addressString }));

            if (onLocationFetched) {
              onLocationFetched(latitude, longitude, addressString);
            }
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('moveon_location_asked', 'true');
            }
            setIsOpen(false);
            setLoading(false);
          }
        },
        (error) => {
          console.warn('Geolocation permission denied:', error);
          setStatusMessage('Location permission denied. You can search manually.');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('moveon_location_asked', 'true');
          }
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setStatusMessage('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('moveon_location_asked', 'true');
    }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="location-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md w-full bg-[#0d1525] border border-gray-800 rounded-3xl p-7 shadow-[0_15px_60px_rgba(0,0,0,0.8)] text-center relative overflow-hidden text-white"
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-[-20%] left-[-20%] w-60 h-60 bg-blue-600/20 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-60 h-60 bg-emerald-600/20 rounded-full blur-[80px] pointer-events-none" />

            {/* Icon */}
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-4xl mx-auto mb-5 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            >
              📍
            </motion.div>

            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
              Live Geolocation
            </span>

            <h2 className="text-2xl font-black text-white tracking-tight mb-2">
              Enable Live Location
            </h2>

            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              MoveON needs your live location to automatically detect nearby drivers, calculate accurate trip fares, and display your pickup point on the map.
            </p>

            {statusMessage && (
              <p className="text-xs font-semibold text-emerald-400 mb-4 animate-pulse">
                {statusMessage}
              </p>
            )}

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)' }}
                whileTap={{ scale: 0.97 }}
                onClick={handleAllowLocation}
                disabled={loading}
                className="w-full py-4 rounded-2xl font-bold text-white text-base tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    <span>Allow Live Location Access</span>
                    <span>→</span>
                  </>
                )}
              </motion.button>

              <button
                onClick={handleDismiss}
                className="text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors py-2"
              >
                Enter Location Manually Instead
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
