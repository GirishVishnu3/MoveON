'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store/index';
import { apiClient } from 'shared/src/api/axios';
import { setWalletData, setLoading } from 'shared/src/store/walletSlice';
import Link from 'next/link';

export default function DriverWalletPage() {
  const dispatch = useDispatch<AppDispatch>();
  const wallet = useSelector((s: RootState) => s.wallet);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    dispatch(setLoading(true));
    try {
      const res = await apiClient.get('/wallet/balance');
      dispatch(setWalletData(res.data));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load wallet');
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 pb-16">
        <div className="flex justify-between items-center mb-6">
          <Link href="/driver/incoming" className="text-white/80 text-sm font-bold">&larr; Back</Link>
          <h1 className="text-lg font-bold">Earnings</h1>
          <div className="w-12" />
        </div>
        <div className="text-center">
          <p className="text-emerald-200 text-sm font-medium uppercase tracking-wider">Total Earnings</p>
          <p className="text-5xl font-black mt-2">
            ₹{wallet.balance.toFixed(2)}
          </p>
          <p className="text-emerald-200 text-xs mt-1">{wallet.currency}</p>
        </div>
      </div>

      {/* Earnings Summary Card */}
      <div className="px-4 -mt-8">
        <div className="bg-white rounded-2xl p-5 shadow-xl text-slate-900">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Earnings Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-emerald-700 text-2xl font-black">
                {wallet.transactions.filter(t => t.reference_type === 'RIDE_EARNING').length}
              </p>
              <p className="text-gray-500 text-xs font-bold mt-1">Rides Completed</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-blue-700 text-2xl font-black">
                ₹{wallet.transactions
                  .filter(t => t.reference_type === 'RIDE_EARNING')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(0)}
              </p>
              <p className="text-gray-500 text-xs font-bold mt-1">Net Earned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4 mt-6 pb-8">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Transaction History</h3>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        {wallet.isLoading && <p className="text-gray-500 text-sm">Loading...</p>}

        {!wallet.isLoading && wallet.transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-3xl mb-2">🚗</p>
            <p className="text-sm">Complete rides to see your earnings</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {wallet.transactions.map(tx => (
            <div key={tx.id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5">
              <div>
                <p className="font-bold text-sm">{tx.reference_type.replace(/_/g, ' ')}</p>
                <p className="text-gray-500 text-xs mt-0.5">{new Date(tx.created_at).toLocaleString()}</p>
              </div>
              <p className={`font-black text-lg ${tx.transaction_type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                {tx.transaction_type === 'CREDIT' ? '+' : '-'}₹{tx.amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
