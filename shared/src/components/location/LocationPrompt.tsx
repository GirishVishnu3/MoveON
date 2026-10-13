"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function LocationPrompt() {
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    // Only prompt ONCE after user is logged into the application
    if (!isAuthenticated) return;
    if (typeof window === 'undefined') return;

    const alreadyCompleted = localStorage.getItem('moveon_location_prompt_completed');
    if (alreadyCompleted === 'true') {
      return;
    }

    if (!navigator.geolocation) return;

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'prompt') {
          setShow(true);
        } else {
          // If browser already granted or denied permission, remember so it never shows again
          localStorage.setItem('moveon_location_prompt_completed', 'true');
        }
      }).catch(() => {
        setShow(true);
      });
    } else {
      setShow(true);
    }
  }, [isAuthenticated]);

  const handleAllow = () => {
    setStatus('requesting');
    if (typeof window !== 'undefined') {
      localStorage.setItem('moveon_location_prompt_completed', 'true');
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('granted');
        if (typeof window !== 'undefined') {
          localStorage.setItem('moveon_driver_coords', JSON.stringify({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          }));
        }
        setTimeout(() => setShow(false), 900);
      },
      () => {
        setStatus('denied');
        setTimeout(() => setShow(false), 1200);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('moveon_location_prompt_completed', 'true');
    }
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-white rounded-3xl shadow-2xl mx-4 max-w-sm w-full p-6 text-center"
          >
            {status === 'granted' ? (
              <>
                <div className="text-5xl mb-3">✅</div>
                <h2 className="text-lg font-bold text-gray-900">Location Enabled!</h2>
                <p className="text-sm text-gray-500 mt-1">We can now show rides near you.</p>
              </>
            ) : status === 'denied' ? (
              <>
                <div className="text-5xl mb-3">🚫</div>
                <h2 className="text-lg font-bold text-gray-900">Location Denied</h2>
                <p className="text-sm text-gray-500 mt-1">
                  You can enable it anytime in your browser settings.
                </p>
              </>
            ) : (
              <>
                {/* Animated location pin */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  className="text-5xl mb-3"
                >
                  📍
                </motion.div>
                <h2 className="text-xl font-bold text-gray-900">Enable Location</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  MoveON needs your location to find nearby rides, calculate fares,
                  and show live driver tracking.
                </p>
                <div className="flex flex-col gap-2 mt-5">
                  <button
                    onClick={handleAllow}
                    disabled={status === 'requesting'}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-colors shadow-lg shadow-blue-200 disabled:opacity-60"
                  >
                    {status === 'requesting' ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Requesting…
                      </span>
                    ) : (
                      'Allow Location Access'
                    )}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="w-full py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
