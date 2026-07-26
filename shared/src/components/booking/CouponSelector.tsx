import React, { useState } from 'react';
import { apiClient } from '../../api/axios';
import type { CouponResult } from '../../types/booking';

interface CouponSelectorProps {
  rideType: string;
  fare: number;
  onCouponApplied: (result: CouponResult) => void;
  onCouponCleared: () => void;
  appliedCoupon: CouponResult | null;
}

export default function CouponSelector({
  rideType, fare, onCouponApplied, onCouponCleared, appliedCoupon,
}: CouponSelectorProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/booking/coupon/validate', {
        code: code.trim(),
        ride_type: rideType,
        fare,
      });
      onCouponApplied(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid coupon code');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCode('');
    setError('');
    onCouponCleared();
  };

  if (appliedCoupon?.valid) {
    return (
      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-green-700">🎉 {appliedCoupon.code} applied</div>
          <div className="text-xs text-green-600">{appliedCoupon.description}</div>
          <div className="text-xs font-medium text-green-700 mt-0.5">You save ₹{appliedCoupon.discount_amount?.toFixed(2)}</div>
        </div>
        <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-600 font-medium">Remove</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleApply()}
          placeholder="Enter coupon code"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
        />
        <button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Apply'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 px-1">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        {['FIRST10', 'FLAT50', 'CITY20'].map(c => (
          <button
            key={c}
            onClick={() => { setCode(c); setError(''); }}
            className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full border border-gray-200 transition-colors"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
