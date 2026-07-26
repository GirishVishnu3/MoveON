"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from 'shared/src/store/index';
import { apiClient } from 'shared/src/api/axios';

export default function DriverSubscriptionPage() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedPlan, setSelectedPlan] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'QR' | 'CARD'>('UPI');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plans = [
    {
      id: 'DAILY' as const,
      name: 'Daily Pass',
      price: 9,
      duration: '24 Hours',
      badge: 'Starter',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      description: 'Unlimited rides & 0% commission for 1 day.',
      features: ['Unlimited Ride Requests', '0% Platform Commission', '24/7 Driver Support', 'Instant Payouts']
    },
    {
      id: 'WEEKLY' as const,
      name: 'Weekly Pack',
      price: 54,
      duration: '7 Days',
      badge: 'POPULAR (Save ₹9)',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      description: 'Drive all week with zero commission fee.',
      features: ['7 Days Unlimited Rides', 'Priority Ride Allocations', '0% Platform Commission', 'Free Accidental Insurance']
    },
    {
      id: 'MONTHLY' as const,
      name: 'Monthly Pack',
      price: 199,
      duration: '30 Days',
      badge: 'BEST VALUE (Save ₹71)',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      description: 'Maximum earnings pass for professional full-time drivers.',
      features: ['30 Days Unlimited Rides', 'Top-tier Ride Priority', '0% Platform Commission', 'Free Maintenance Discounts']
    }
  ];

  const currentPlan = plans.find(p => p.id === selectedPlan)!;

  const handleProcessPayment = async () => {
    if (!user?.phone_number) {
      setError('Driver identity missing. Please re-login.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post(`/driver/onboarding/subscription?phone_number=${user.phone_number}`, {
        plan_name: selectedPlan
      });
      setSuccess(`${selectedPlan} Pass Activated! Loading your Driver Dashboard...`);
      setTimeout(() => {
        router.push('/driver/dashboard');
      }, 1500);
    } catch (err: any) {
      setError('Payment confirmation failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            0% Commission Model
          </span>
          <h1 className="text-3xl font-black tracking-tight">Select Driver Earnings Subscription Pass</h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Choose a pass to get instant access to live rider bookings and keep 100% of every ride fare.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-2xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-2xl text-sm font-bold text-center animate-pulse">
            ✓ {success}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-2xl shadow-emerald-950/40 scale-105'
                    : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                    {isSelected && (
                      <span className="w-6 h-6 bg-emerald-500 text-gray-950 font-bold rounded-full flex items-center justify-center text-xs">✓</span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <p className="text-gray-400 text-xs mt-1 mb-4">{plan.description}</p>

                  <div className="flex items-baseline gap-1 my-3">
                    <span className="text-3xl font-black text-white">₹{plan.price}</span>
                    <span className="text-gray-400 text-xs font-medium">/ {plan.duration}</span>
                  </div>

                  <div className="border-t border-gray-800/80 pt-4 mt-4 space-y-2">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan.id);
                    setShowPaymentModal(true);
                  }}
                  className={`w-full mt-6 py-3 rounded-xl font-bold text-xs transition-all ${
                    isSelected
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-gray-950 shadow-lg'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                  }`}
                >
                  Pay ₹{plan.price} & Activate →
                </button>
              </div>
            );
          })}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold"
              >
                ✕
              </button>

              <div>
                <h3 className="text-xl font-black text-white">Complete ₹{currentPlan.price} Payment</h3>
                <p className="text-gray-400 text-xs">Pass: <span className="text-emerald-400 font-bold">{currentPlan.name} ({currentPlan.duration})</span></p>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === 'UPI' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400' : 'border-gray-800 text-gray-400'
                  }`}
                >
                  📱 UPI / GPay
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QR')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === 'QR' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400' : 'border-gray-800 text-gray-400'
                  }`}
                >
                  📷 Scan QR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === 'CARD' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400' : 'border-gray-800 text-gray-400'
                  }`}
                >
                  💳 NetBanking
                </button>
              </div>

              {/* Method Details */}
              {paymentMethod === 'UPI' && (
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-gray-400">Enter VPA / UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. driver@upi or phonepe"
                    defaultValue={`${user?.phone_number || '9876543210'}@upi`}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-gray-500 block">Instant payment request will be sent to your UPI app.</span>
                </div>
              )}

              {paymentMethod === 'QR' && (
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl text-center space-y-2">
                  <div className="w-32 h-32 bg-white rounded-xl mx-auto flex items-center justify-center p-2">
                    <div className="w-full h-full bg-gray-950 rounded border-2 border-dashed border-emerald-500 flex items-center justify-center text-[10px] text-emerald-400 font-mono font-bold text-center">
                      [ MoveON QR ₹{currentPlan.price} ]
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 block">Scan with GPay, PhonePe, Paytm, or BHIM</span>
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-gray-400">Select Bank</label>
                  <select className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white outline-none">
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                  </select>
                </div>
              )}

              {/* Confirm Pay Button */}
              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 text-sm"
              >
                {loading ? 'Processing Payment...' : `Confirm & Pay ₹${currentPlan.price} →`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
