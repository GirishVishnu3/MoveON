'use client';
import { useEffect, useState } from 'react';
import { apiClient } from 'shared/src/api/axios';
import { FaHeadset, FaTicketAlt, FaSearch } from 'react-icons/fa';

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  ESCALATED: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-700',
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => { fetchTickets(); }, []);

  const fetchTickets = async () => {
    try {
      const res = await apiClient.get('/admin/support?limit=100');
      setTickets(res.data);
    } catch {
      console.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const filtered = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    open: tickets.filter(t => t.status === 'OPEN').length,
    in_progress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    escalated: tickets.filter(t => t.status === 'ESCALATED').length,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Customer Support</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Open', count: stats.open, color: 'blue' },
          { label: 'In Progress', count: stats.in_progress, color: 'yellow' },
          { label: 'Escalated', count: stats.escalated, color: 'orange' },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 bg-${stat.color}-50 rounded-xl flex items-center justify-center`}>
              <FaTicketAlt className={`text-${stat.color}-500`} size={18} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-xl font-black text-gray-900">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative">
          <FaSearch className="absolute left-3 top-3 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ESCALATED">Escalated</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={4} className="text-center py-12 text-gray-400">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={4} className="text-center py-12 text-gray-400">No tickets found.</td></tr>}
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4 font-medium text-gray-800">{t.subject}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${PRIORITY_COLORS[t.priority]}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
