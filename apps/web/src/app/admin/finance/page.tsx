'use client';
import { useEffect, useState } from 'react';
import { apiClient } from 'shared/src/api/axios';
import { FaMoneyBillWave, FaWallet, FaFileInvoice } from 'react-icons/fa';

interface Payment {
  id: string;
  booking_ref: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
};

export default function AdminFinancePage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalRefunded, setTotalRefunded] = useState(0);

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try {
      const res = await apiClient.get('/admin/finance?limit=100');
      setPayments(res.data);
      setTotalRevenue(res.data.filter((p: Payment) => p.status === 'SUCCESS').reduce((sum: number, p: Payment) => sum + p.amount, 0));
      setTotalRefunded(res.data.filter((p: Payment) => p.status === 'REFUNDED').reduce((sum: number, p: Payment) => sum + p.amount, 0));
    } catch {
      console.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Finance & Payments</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <FaMoneyBillWave className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-black text-gray-900">₹{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <FaWallet className="text-purple-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Refunded</p>
              <p className="text-2xl font-black text-gray-900">₹{totalRefunded.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <FaFileInvoice className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-black text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Booking Ref</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Method</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Loading...</td></tr>}
              {!loading && payments.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">No payments found.</td></tr>}
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">{p.booking_ref}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">₹{p.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-600">{p.payment_method}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
