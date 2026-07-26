'use client';
import { useEffect, useState } from 'react';
import { apiClient } from 'shared/src/api/axios';
import { FaSearch } from 'react-icons/fa';

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_entity: string;
  target_id: string;
  outcome: string;
  timestamp: string;
}

const OUTCOME_COLORS: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const res = await apiClient.get('/admin/audit?limit=100');
      setLogs(res.data);
    } catch {
      console.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(l =>
    l.action_type.toLowerCase().includes(search.toLowerCase()) ||
    l.target_entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search actions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Target ID</th>
                <th className="px-6 py-4">Outcome</th>
                <th className="px-6 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-mono text-xs">
              {loading && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">No audit logs found.</td></tr>}
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-blue-700">{log.action_type}</td>
                  <td className="px-6 py-3 text-gray-600">{log.target_entity}</td>
                  <td className="px-6 py-3 text-gray-400 truncate max-w-[120px]">{log.target_id}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${OUTCOME_COLORS[log.outcome] || 'bg-gray-100 text-gray-600'}`}>
                      {log.outcome}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
