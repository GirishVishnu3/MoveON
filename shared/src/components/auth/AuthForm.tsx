'use client';
import React, { useState, useEffect } from 'react';
import { OtpInput } from './OtpInput';
import { apiClient } from '../../api/axios';
import { setTokens } from '../../store/authSlice';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface AuthFormProps {
  onSuccess: (isNewUser: boolean, role: string) => void;
}

const RESEND_COOLDOWN_SECONDS = 30;

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const dispatch = useDispatch();

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/request-email-otp', {
        email: email,
        role: 'RIDER',
      });
      setStep(2);
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to send OTP. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || resendLoading) return;
    setError('');
    setResendLoading(true);
    try {
      await apiClient.post('/auth/request-email-otp', {
        email: email,
        role: 'RIDER',
      });
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to resend OTP. Please try again.';
      setError(errorMsg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the 6-digit code sent to your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-email-otp', {
        email: email,
        otp: otp,
        role: 'RIDER',
        device_info: typeof window !== 'undefined' ? navigator.userAgent : 'Web Browser',
      });
      
      dispatch(setTokens({
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      }));
      onSuccess(res.data.is_new_user, 'RIDER');
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      setError(
        Array.isArray(detail)
          ? detail[0]?.msg ?? 'Verification failed.'
          : (detail as string) ?? err.message ?? 'Verification failed. Please try again.'
      );
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const stepVariants: Variants = {
    hidden:  { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit:    { opacity: 0, x: -24, transition: { duration: 0.25, ease: 'easeIn' } },
  };

  const Spinner = () => (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
    />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md bg-[#0d1525] backdrop-blur-2xl rounded-3xl shadow-[0_12px_50px_rgba(0,0,0,0.7)] border border-gray-800/90 p-8 overflow-hidden relative z-10"
    >
      
      {/* Step Progress */}
      <div className="flex items-center justify-center gap-2 mb-7">
        {['Email', 'Verify'].map((label, i) => {
          const s = i + 1;
          const isActive = step === s;
          const isDone = step > s;
          return (
            <React.Fragment key={s}>
              <motion.div
                animate={{
                  backgroundColor: isActive ? '#3b82f6' : isDone ? '#10b981' : '#1f2937',
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-black text-white"
              >
                {isDone ? '✓' : s}
              </motion.div>
              {i < 1 && (
                <motion.div
                  animate={{ backgroundColor: step > s ? '#10b981' : '#1f2937' }}
                  transition={{ duration: 0.4 }}
                  className="h-0.5 w-8 rounded-full"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={stepVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <h2 className="text-2xl font-black text-white mb-1">
            {step === 1 ? 'Enter your email address' : 'Verify your email'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1
              ? "We'll send a 6-digit OTP to your email."
              : `Enter the 6-digit code sent to ${email}`}
          </p>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-red-950/50 border border-red-800/60 text-red-400 rounded-xl text-sm font-medium overflow-hidden"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 1 — Email input */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900/50 text-white placeholder-gray-500 border border-gray-700/50 rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                required
              />
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(59,130,246,0.4)' }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40"
              >
                {loading ? <Spinner /> : 'Send OTP →'}
              </motion.button>
            </form>
          )}

          {/* Step 2 — OTP entry */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-6">
              <OtpInput value={otp} onChange={setOtp} />

              <motion.button
                whileHover={otp.length >= 6 ? { scale: 1.02, boxShadow: '0 0 24px rgba(59,130,246,0.4)' } : {}}
                whileTap={otp.length >= 6 ? { scale: 0.97 } : {}}
                type="submit"
                disabled={otp.length < 6 || loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40"
              >
                {loading ? <Spinner /> : 'Verify & Continue →'}
              </motion.button>

              <div className="flex flex-col items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCountdown > 0 || resendLoading}
                  className="text-sm text-blue-500 font-semibold disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {resendLoading
                    ? 'Resending…'
                    : resendCountdown > 0
                    ? `Resend OTP in ${resendCountdown}s`
                    : 'Resend OTP'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); setError(''); }}
                  className="text-sm text-gray-500 hover:text-gray-300 font-medium transition-colors"
                >
                  Change Email Address
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
