'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store/index';
import { apiClient } from 'shared/src/api/axios';
import { setWalletData, setLoading, updateBalance } from 'shared/src/store/walletSlice';
import TopNavBar from 'shared/src/components/navigation/TopNavBar';

export default function RiderWalletPage() {
  const dispatch = useDispatch<AppDispatch>();
  const wallet = useSelector((s: RootState) => s.wallet);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
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

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    setDepositing(true);
    setError('');
    try {
      const res = await apiClient.post('/wallet/deposit', { amount: amt });
      dispatch(updateBalance(res.data.balance));
      setDepositAmount('');
      await fetchWallet();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 2000];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <TopNavBar title="Wallet" />
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 pb-16">
        <div className="text-center">
          <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Available Balance</p>
          <p className="text-5xl font-black mt-2">
            ₹{wallet.balance.toFixed(2)}
          </p>
          <p className="text-blue-200 text-xs mt-1">{wallet.currency}</p>
        </div>
      </div>

      {/* Deposit Card */}
      <div className="px-4 -mt-8">
        <div className="bg-white rounded-2xl p-5 shadow-xl text-slate-900">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Add Money</h3>

          <div className="flex gap-2 mb-3 flex-wrap">
            {quickAmounts.map(amt => (
              <button
                key={amt}
                onClick={() => setDepositAmount(String(amt))}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors"
              >
                +₹{amt}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={e => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleDeposit}
              disabled={depositing}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all"
            >
              {depositing ? '...' : 'Add'}
            </button>
          </div>

          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      </div>

      {/* Transactions */}
      <div className="px-4 mt-6 pb-8">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Transactions</h3>

        {wallet.isLoading && <p className="text-gray-500 text-sm">Loading...</p>}

        {!wallet.isLoading && wallet.transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-3xl mb-2">💳</p>
            <p className="text-sm">No transactions yet</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {wallet.transactions.map(tx => (
            <div key={tx.id} className="bg-white/5 rounded-xl p-4 flex justify-between items-center border border-white/5">
              <div>
                <p className="font-bold text-sm">
                  {tx.reference_type.replace(/_/g, ' ')}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(tx.created_at).toLocaleString()}
                </p>
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
