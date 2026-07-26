'use client';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store';
import { setMetrics } from 'shared/src/store/adminSlice';
import { apiClient } from 'shared/src/api/axios';
import { FaUsers, FaCar, FaMapMarkedAlt, FaCheckCircle, FaMoneyBillWave } from 'react-icons/fa';

export default function AdminDashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { metrics } = useSelector((s: RootState) => s.admin);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await apiClient.get('/admin/metrics');
      dispatch(setMetrics(res.data));
    } catch (err) {
      console.error(err);
    }
  };

  if (!metrics) {
    return <div className="flex items-center justify-center h-full"><p className="text-gray-500">Loading metrics...</p></div>;
  }

  const stats = [
    { label: 'Total Riders', value: metrics.total_riders, icon: <FaUsers size={24} className="text-blue-500" /> },
    { label: 'Total Drivers', value: metrics.total_drivers, icon: <FaCar size={24} className="text-green-500" /> },
    { label: 'Active Rides', value: metrics.active_rides, icon: <FaMapMarkedAlt size={24} className="text-orange-500" /> },
    { label: 'Completed Rides', value: metrics.completed_rides, icon: <FaCheckCircle size={24} className="text-teal-500" /> },
    { label: 'Total Revenue', value: `$${metrics.total_revenue.toFixed(2)}`, icon: <FaMoneyBillWave size={24} className="text-purple-500" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Placeholder for charts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="font-bold text-gray-800 mb-4">Revenue Overview</h3>
          <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <p className="text-gray-400 font-medium">Chart visualization pending</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="font-bold text-gray-800 mb-4">Live Activity Log</h3>
          <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
            <p className="text-gray-400 font-medium">Activity feed pending</p>
          </div>
        </div>
      </div>
    </div>
  );
}
