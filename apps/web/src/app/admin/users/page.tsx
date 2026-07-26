'use client';
import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store';
import { setUsers, updateUserStatus } from 'shared/src/store/adminSlice';
import { apiClient } from 'shared/src/api/axios';
import { FaSearch, FaUserSlash, FaUserCheck, FaEye } from 'react-icons/fa';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-red-100 text-red-700',
};

export default function AdminUsersPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { users } = useSelector((s: RootState) => s.admin);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users?role=RIDER&limit=100');
      dispatch(setUsers(res.data));
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await apiClient.put(`/admin/users/${userId}/status`, { status: newStatus });
      dispatch(updateUserStatus({ id: userId, status: newStatus, isDriver: false }));
    } catch {
      alert('Failed to update status.');
    }
  };

  const filtered = users.filter(u =>
    u.phone_number.includes(search) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Rider Management</h2>
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
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
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              )}
              {error && (
                <tr><td colSpan={6} className="text-center py-12 text-red-400">{error}</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found.</td></tr>
              )}
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{user.full_name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono">{user.phone_number}</td>
                  <td className="px-6 py-4 text-gray-500">{user.email || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[user.status] || 'bg-gray-100 text-gray-600'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {user.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          <FaUserSlash size={11} /> Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                        >
                          <FaUserCheck size={11} /> Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
