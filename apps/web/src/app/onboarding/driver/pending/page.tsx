"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from 'shared/src/store/index';
import { logout } from 'shared/src/store/authSlice';
import { apiClient } from 'shared/src/api/axios';
import { motion, AnimatePresence, Variants } from 'framer-motion';

export default function AdminPendingScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [loading, setLoading] = useState(false);
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reuploadDoc, setReuploadDoc] = useState<string | null>(null);
  const [newFileUrl, setNewFileUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState<string | null>(null);

  const fetchStatus = async () => {
    const phone = user?.phone_number || (user as any)?.phone || (typeof window !== 'undefined' ? localStorage.getItem('moveon_user_phone') : null) || '9876543210';
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/driver/onboarding/status?phone_number=${encodeURIComponent(phone)}`);
      const data = res.data;
      setStatusInfo(data);
      if (data?.approval_status === 'APPROVED' || data?.documents_verified) {
        router.push('/driver/setup');
      }
    } catch (err: any) {
      setError('Could not refresh status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto poll status every 4 seconds so driver is redirected as soon as admin approves
    const timer = setInterval(() => {
      fetchStatus();
    }, 4000);
    return () => clearInterval(timer);
  }, [user]);

  const handleResubmit = async (docType: string) => {
    if (!newFileUrl) {
      setError('Please select or upload a document photo first.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await apiClient.post(`/driver/onboarding/documents?phone_number=${user?.phone_number}`, {
        document_type: docType,
        file_url: newFileUrl
      });
      setResubmitSuccess(`Updated ${docType} successfully! Admin has been notified for re-review.`);
      setReuploadDoc(null);
      setNewFileUrl('');
      fetchStatus();
    } catch (err: any) {
      setError('Failed to re-submit document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUploadMock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fakeUrl = URL.createObjectURL(file);
      setNewFileUrl(fakeUrl);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/auth');
  };

  const getDocBadge = (type: string) => {
    if (!statusInfo?.documents) {
      return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs uppercase border border-amber-500/20">Under Review</span>;
    }
    const doc = statusInfo.documents.find((d: any) => d.document_type === type);
    if (!doc) return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase border border-emerald-500/20">Verified</span>;
    if (doc.status === 'APPROVED') {
      return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase border border-emerald-500/20">✓ Approved</span>;
    }
    if (doc.status === 'REJECTED') {
      return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-bold text-xs uppercase border border-red-500/20">❌ Needs Fix</span>;
    }
    return <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold text-xs uppercase border border-amber-500/20">Under Review</span>;
  };

  const hasRejectedDocs = statusInfo?.documents?.some((d: any) => d.status === 'REJECTED');

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.12 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  const checklistItems = [
    { label: '📋 Personal & Contact Info', type: 'INFO', alwaysApproved: true },
    { label: '🪪 Aadhaar Card', type: 'AADHAAR' },
    { label: '💳 Driving Licence (DL)', type: 'DL' },
    { label: '🚗 Vehicle Registration (RC)', type: 'RC' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Top Header Navigation */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-20 flex items-center gap-3">
        <button
          onClick={() => router.push('/auth/select-role')}
          className="text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-900/60 border border-gray-800 backdrop-blur-md"
        >
          <span>←</span> Back to Role Selection
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className={`absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] ${hasRejectedDocs ? 'bg-red-600/10' : 'bg-amber-600/10'}`} />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/8 rounded-full blur-[100px]" />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg w-full mx-auto bg-gray-900/60 backdrop-blur-2xl border border-gray-800/60 rounded-[2rem] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.5)] text-center relative z-10"
      >
        
        {/* Animated Status Orb */}
        <motion.div
          variants={itemVariants}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            {/* Pulsing glow ring */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className={`absolute inset-0 rounded-full ${hasRejectedDocs ? 'bg-red-500/30' : 'bg-amber-500/30'}`}
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className={`absolute inset-0 rounded-full ${hasRejectedDocs ? 'bg-red-500/20' : 'bg-amber-500/20'}`}
            />
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className={`relative w-24 h-24 rounded-full flex items-center justify-center text-5xl border-2 ${
                hasRejectedDocs
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              {hasRejectedDocs ? '⚠️' : '⏳'}
            </motion.div>
          </div>
        </motion.div>

        <motion.h1 variants={itemVariants} className="text-2xl font-black text-white mb-2">
          {hasRejectedDocs ? 'Document Correction Required' : 'Verification Under Review'}
        </motion.h1>
        <motion.p variants={itemVariants} className="text-gray-400 text-sm mb-6 leading-relaxed">
          {hasRejectedDocs
            ? 'One or more of your submitted proofs requires correction. Please re-upload below.'
            : 'Our verification team is cross-checking your Aadhaar, Driving Licence, and RC details. This usually takes a few hours.'}
        </motion.p>

        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-red-950/60 border border-red-800/60 text-red-300 rounded-xl text-xs font-semibold overflow-hidden"
            >
              {error}
            </motion.div>
          )}
          {resubmitSuccess && (
            <motion.div
              key="success"
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs font-semibold overflow-hidden"
            >
              {resubmitSuccess}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Document Checklist */}
        <motion.div variants={itemVariants} className="bg-gray-950/50 backdrop-blur-sm border border-gray-800/80 rounded-2xl p-5 text-left mb-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Verification Progress Tracker</h3>
          <div className="space-y-2">
            {checklistItems.map((item, i) => (
              <motion.div
                key={item.type}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, duration: 0.4, ease: 'easeOut' }}
                className="flex justify-between items-center text-xs py-2 border-b border-gray-800/40 last:border-0"
              >
                <span className="text-gray-300 font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  {item.alwaysApproved
                    ? <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase border border-emerald-500/20">Completed</span>
                    : getDocBadge(item.type)
                  }
                  {!item.alwaysApproved && statusInfo?.documents?.find((d: any) => d.document_type === item.type)?.status === 'REJECTED' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setReuploadDoc(item.type)}
                      className="text-xs text-blue-400 underline font-bold hover:text-blue-300 transition-colors"
                    >
                      Fix Now
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Document Re-upload Panel */}
        <AnimatePresence>
          {reuploadDoc && (
            <motion.div
              key="reupload"
              initial={{ opacity: 0, height: 0, scale: 0.96 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="mb-5 p-4 bg-blue-950/30 border border-blue-600/40 rounded-2xl text-left space-y-3 overflow-hidden"
            >
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Re-upload Corrected {reuploadDoc}</h4>
              <input type="file" accept="image/*" onChange={handleFileUploadMock} className="text-xs text-gray-300 file:mr-2 file:text-xs file:font-bold file:bg-blue-600 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-1 file:cursor-pointer" />
              {newFileUrl && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-emerald-400 block font-bold">
                  ✓ File attached
                </motion.span>
              )}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleResubmit(reuploadDoc)}
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all disabled:opacity-60"
                >
                  {uploading ? 'Submitting...' : 'Upload & Re-submit'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setReuploadDoc(null)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs px-3 py-2 rounded-xl transition-all"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>



        <motion.div variants={itemVariants} className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={fetchStatus}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-950/30 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : '🔄 Refresh Status'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-gray-200 font-bold py-3.5 rounded-xl transition-all text-sm"
          >
            Sign Out
          </motion.button>
        </motion.div>

      </motion.div>
    </div>
  );
}
