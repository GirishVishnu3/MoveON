'use client';
import { useEffect, useState } from 'react';
import { apiClient } from 'shared/src/api/axios';
import { FaSearch, FaExclamationTriangle } from 'react-icons/fa';

interface Booking {
  id: string;
  booking_ref: string;
  rider_id: string;
  status: string;
  ride_type: string;
  pickup_address: string;
  destination_address: string;
  final_fare: number | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  SEARCHING: 'bg-blue-100 text-blue-700',
  DRIVER_ASSIGNED: 'bg-indigo-100 text-indigo-700',
  DRIVER_EN_ROUTE: 'bg-indigo-100 text-indigo-700',
  TRIP_STARTED: 'bg-green-100 text-green-700',
  TRIP_IN_PROGRESS: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-teal-100 text-teal-700',
  CANCELLED: 'bg-red-100 text-red-700',
  SOS_ACTIVE: 'bg-red-200 text-red-800',
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    try {
      const res = await apiClient.get('/admin/bookings?limit=100');
      setBookings(res.data);
    } catch {
      console.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filtered = bookings.filter(b =>
    b.booking_ref.toLowerCase().includes(search.toLowerCase()) ||
    b.pickup_address.toLowerCase().includes(search.toLowerCase()) ||
    b.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Booking & Trip Management</h2>
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search bookings..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Ref</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Pickup</th>
                <th className="px-6 py-4">Destination</th>
                <th className="px-6 py-4">Fare</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No bookings found.</td></tr>}
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">{b.booking_ref}</td>
                  <td className="px-6 py-4 text-gray-600 uppercase text-xs">{b.ride_type}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {b.status === 'SOS_ACTIVE' && <FaExclamationTriangle className="text-red-600" size={12} />}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                        {b.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-[160px] truncate">{b.pickup_address}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-[160px] truncate">{b.destination_address}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{b.final_fare != null ? `$${b.final_fare.toFixed(2)}` : '—'}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{new Date(b.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
