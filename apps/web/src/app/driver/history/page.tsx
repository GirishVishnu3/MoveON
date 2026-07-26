'use client';

import { useEffect, useState } from 'react';
import { apiClient } from 'shared/src/api/axios';
import Link from 'next/link';

interface TripHistoryItem {
  booking_ref: string;
  status: string;
  pickup_address: string;
  destination_address: string;
  actual_distance_km: number | null;
  final_fare: number | null;
  created_at: string;
  payment_method: string | null;
  payment_status: string | null;
  has_rated: boolean;
}

export default function DriverHistoryPage() {
  const [trips, setTrips] = useState<TripHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await apiClient.get('/history/trips');
      setTrips(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="bg-white/5 p-4 border-b border-white/10 flex justify-between items-center">
        <Link href="/driver/incoming" className="text-white/80 text-sm font-bold">&larr; Back</Link>
        <h1 className="text-lg font-bold">Ride History</h1>
        <div className="w-12" />
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading && <p className="text-gray-500 text-center py-12">Loading trips...</p>}
        {error && <p className="text-red-400 text-center py-12">{error}</p>}

        {!loading && trips.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">🚗</p>
            <p className="font-bold">No completed rides yet</p>
          </div>
        )}

        {trips.map(trip => (
          <div key={trip.booking_ref} className="bg-white/5 rounded-2xl p-4 border border-white/5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-gray-400 font-bold">{new Date(trip.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-xs text-gray-500 mt-0.5">{trip.booking_ref}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                trip.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}>{trip.status}</span>
            </div>

            <div className="flex flex-col gap-2 text-sm mb-3">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <p className="text-gray-300 line-clamp-1">{trip.pickup_address}</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 shrink-0" />
                <p className="text-gray-300 line-clamp-1">{trip.destination_address}</p>
              </div>
            </div>

            <div className="h-px bg-white/5 mb-3" />

            <div className="flex justify-between items-center">
              <div className="flex gap-4 text-xs text-gray-400">
                {trip.actual_distance_km && <span>{trip.actual_distance_km.toFixed(1)} km</span>}
                {trip.payment_status && (
                  <span className={trip.payment_status === 'SUCCESS' ? 'text-green-400' : 'text-yellow-400'}>
                    {trip.payment_status}
                  </span>
                )}
              </div>
              {trip.final_fare && (
                <p className="text-lg font-black text-emerald-400">₹{trip.final_fare.toFixed(0)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
