'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from 'shared/src/store/index';
import { apiClient } from 'shared/src/api/axios';
import {
  startPayment,
  paymentSuccess,
  paymentFailed,
  resetPayment,
} from 'shared/src/store/paymentSlice';
import { PaymentMethodType } from 'shared/src/store/paymentSlice';

const PAYMENT_METHODS: { label: string; value: PaymentMethodType; icon: string }[] = [
  { label: 'Wallet', value: 'WALLET', icon: '💰' },
  { label: 'Cash', value: 'CASH', icon: '💵' },
  { label: 'UPI', value: 'UPI', icon: '📱' },
  { label: 'Card', value: 'CARD', icon: '💳' },
  { label: 'Google Pay', value: 'GOOGLE_PAY', icon: '🔵' },
  { label: 'Apple Pay', value: 'APPLE_PAY', icon: '🍎' },
];

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const bookingRef = params.bookingRef as string;
  const dispatch = useDispatch<AppDispatch>();
  const payment = useSelector((s: RootState) => s.payment);
  const wallet = useSelector((s: RootState) => s.wallet);

  const [booking, setBooking] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('WALLET');
  const [loading, setLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    fetchBooking();
    dispatch(resetPayment());
  }, [bookingRef]);

  const fetchBooking = async () => {
    try {
      const res = await apiClient.get(`/booking/${bookingRef}`);
      setBooking(res.data);
      // Also fetch wallet balance
      try {
        const walletRes = await apiClient.get('/wallet/balance');
        // We just need the balance for display
      } catch {}
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!booking?.final_fare) return;

    dispatch(startPayment({ bookingRef, amount: booking.final_fare, method: selectedMethod }));

    try {
      const res = await apiClient.post('/payment/initiate', {
        booking_ref: bookingRef,
        amount: booking.final_fare,
        method: selectedMethod,
      });
      dispatch(paymentSuccess({ transactionRef: res.data.transaction_ref, message: res.data.message }));
      // Show rating dialog after successful payment
      setShowRating(true);
    } catch (err: any) {
      dispatch(paymentFailed(err.response?.data?.detail || 'Payment failed'));
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) return;
    try {
      await apiClient.post(`/history/trips/${bookingRef}/rate`, {
        rating,
        feedback_text: feedbackText || null,
        categories: null,
        is_anonymous: false,
      });
      setRatingSubmitted(true);
      setTimeout(() => {
        router.push('/rider/history');
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Rating failed');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading...</div>;

  const isPaid = payment.activePayment?.status === 'SUCCESS';

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-white/5 p-4 border-b border-white/10">
        <h1 className="text-lg font-bold text-center">Payment</h1>
        <p className="text-gray-400 text-xs text-center">Ref: {bookingRef}</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col gap-6">
        {/* Fare Summary */}
        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-2xl p-5 border border-blue-500/20">
          <p className="text-blue-300 text-xs font-bold uppercase tracking-wider">Total Fare</p>
          <p className="text-4xl font-black mt-1">₹{booking?.final_fare?.toFixed(2) || '0.00'}</p>
          <div className="flex gap-4 mt-3 text-xs text-gray-400">
            <span>{booking?.actual_distance_km?.toFixed(1) || '—'} km</span>
            <span>{booking?.pickup_address?.substring(0, 30)}...</span>
          </div>
        </div>

        {!isPaid && !showRating && (
          <>
            {/* Payment Methods */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Select Payment Method</h3>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(pm => (
                  <button
                    key={pm.value}
                    onClick={() => setSelectedMethod(pm.value)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedMethod === pm.value
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <p className="text-2xl">{pm.icon}</p>
                    <p className="text-xs font-bold mt-1">{pm.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {payment.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm font-bold text-center">
                {payment.error}
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={payment.isProcessing}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/30 disabled:opacity-50 transition-all"
            >
              {payment.isProcessing ? 'Processing...' : `Pay ₹${booking?.final_fare?.toFixed(0) || 0}`}
            </button>
          </>
        )}

        {/* Payment Success + Rating */}
        {showRating && !ratingSubmitted && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-5xl mb-3">✅</p>
              <p className="text-xl font-black text-green-400">Payment Successful!</p>
              <p className="text-gray-400 text-sm mt-1">Ref: {payment.activePayment?.transactionRef}</p>
            </div>

            <div className="w-full bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-center font-bold mb-4">Rate your ride</h3>
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-transform ${
                      star <= rating ? 'scale-125' : 'opacity-30'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Tell us about your experience (optional)"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => router.push('/rider/history')}
                  className="flex-1 py-3 bg-white/5 rounded-xl font-bold text-sm text-gray-400 hover:bg-white/10 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={rating === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-bold text-sm text-white disabled:opacity-30 shadow-lg transition-all"
                >
                  Submit Rating
                </button>
              </div>
            </div>
          </div>
        )}

        {ratingSubmitted && (
          <div className="text-center py-12">
            <p className="text-5xl mb-3">🎉</p>
            <p className="text-xl font-black text-white">Thank you!</p>
            <p className="text-gray-400 text-sm mt-1">Redirecting to your trip history...</p>
          </div>
        )}
      </div>
    </div>
  );
}
