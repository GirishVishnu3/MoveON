import React, { useState, useEffect, useCallback } from 'react';
import { PhoneInput } from './PhoneInput';
import { OtpInput } from './OtpInput';
import { apiClient, setTokens } from '../../';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface AuthFormProps {
  onSuccess: (isNewUser: boolean, role: string) => void;
}

const IS_DEV = process.env.NODE_ENV === 'development';
const RESEND_COOLDOWN_SECONDS = 30;

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  const dispatch = useDispatch();

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const sendOtp = useCallback(async (phone: string) => {
    const res = await apiClient.post('/auth/request-otp', {
      phone_number: phone,
      role: 'GUEST',
    });
    if (IS_DEV && res.data?.dev_otp) {
      setDevOtp(res.data.dev_otp);
    }
    return res;
  }, []);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    setDevOtp(null);
    setLoading(true);
    try {
      await sendOtp(`${countryCode}${phoneNumber}`);
      setStep(2);
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0].msg || 'Validation error');
      } else {
        setError(detail || 'Failed to request OTP. Please check your number and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || resendLoading) return;
    setError('');
    setDevOtp(null);
    setResendLoading(true);
    try {
      await sendOtp(`${countryCode}${phoneNumber}`);
      setResendCountdown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(Array.isArray(detail) ? detail[0].msg : (detail || 'Failed to resend OTP.'));
    } finally {
      setResendLoading(false);
    }
  };

  const handleContinueToRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/verify-otp', {
        phone_number: `${countryCode}${phoneNumber}`,
        otp_code: otp,
        role: 'RIDER',
        device_info: typeof window !== 'undefined' ? navigator.userAgent : 'Web Browser',
      });

      dispatch(setTokens({
        accessToken: res.data.access_token,
        refreshToken: res.data.refresh_token,
      }));

      onSuccess(res.data.is_new_user, 'RIDER');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0].msg || 'Validation error');
      } else {
        setError(detail || 'Invalid OTP code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Phone', 'Verify', 'Role'];

  const stepVariants: Variants = {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, x: -24, transition: { duration: 0.25, ease: 'easeIn' } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md bg-[#0d1525] backdrop-blur-2xl rounded-3xl shadow-[0_12px_50px_rgba(0,0,0,0.7)] border border-gray-800/90 p-8 overflow-hidden relative z-10"
    >
      {/* Step Progress Indicator */}
      <div className="flex items-center justify-center gap-2 mb-7">
        {stepLabels.map((label, i) => {
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
              {i < stepLabels.length - 1 && (
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
            {step === 1 ? 'Enter your mobile number' : step === 2 ? 'Verify your number' : 'How would you like to continue?'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1
              ? `We'll send a code to verify your account.`
              : step === 2
              ? `Enter the 6-digit code sent to ${countryCode} ${phoneNumber}`
              : `Please select your role to log in.`
            }
          </p>

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

          {/* DEV MODE OTP Display */}
          {IS_DEV && devOtp && step === 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-4 bg-amber-950/40 border border-amber-700/50 rounded-2xl"
            >
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">
                🛠 Dev Mode — OTP Bypass
              </p>
              <p className="text-3xl font-mono font-black text-amber-300 tracking-[0.3em]">
                {devOtp}
              </p>
              <p className="text-xs text-amber-600/70 mt-1">
                This code is only visible in development. Remove in production.
              </p>
            </motion.div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
              <PhoneInput
                countryCode={countryCode}
                phoneNumber={phoneNumber}
                onCountryCodeChange={setCountryCode}
                onPhoneNumberChange={setPhoneNumber}
              />
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 24px rgba(59,130,246,0.4)' }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : 'Continue →'}
              </motion.button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleContinueToRole} className="flex flex-col gap-6">
              <OtpInput value={otp} onChange={setOtp} />
              <motion.button
                whileHover={otp.length >= 6 ? { scale: 1.02, boxShadow: '0 0 24px rgba(59,130,246,0.4)' } : {}}
                whileTap={otp.length >= 6 ? { scale: 0.97 } : {}}
                type="submit"
                disabled={otp.length < 6}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : 'Verify & Continue →'}
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
                    ? 'Resending...'
                    : resendCountdown > 0
                      ? `Resend code in ${resendCountdown}s`
                      : 'Resend Code'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); setError(''); setDevOtp(null); }}
                  className="text-sm text-gray-500 hover:text-gray-300 font-medium transition-colors"
                >
                  Change Phone Number
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
