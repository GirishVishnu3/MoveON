"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';

export default function DriverSetupPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<'SUV' | 'Sedan' | 'Hatchback' | 'Auto'>('SUV');
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    { id: 'SUV', label: 'SUV', desc: 'Higher fares, 6 seats', icon: '🚙' },
    { id: 'Sedan', label: 'Sedan', desc: 'Comfort rides, 4 seats', icon: '🚗' },
    { id: 'Hatchback', label: 'Hatchback', desc: 'Daily compact, 4 seats', icon: '🚘' },
    { id: 'Auto', label: 'Auto / Bike', desc: 'Quick local trips', icon: '🛺' },
  ];

  const handleCompleteSetup = () => {
    setIsSaving(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('moveon_driver_category', selectedCategory);
    }
    setTimeout(() => {
      router.push('/driver/dashboard');
    }, 400);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.1 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen bg-[#060b14] text-white flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Ambient Radial Lighting */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[140px] bg-emerald-500/15" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/12 rounded-full blur-[120px]" />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-xl w-full mx-auto bg-gray-900/60 backdrop-blur-2xl border border-gray-800/70 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_12px_50px_rgba(0,0,0,0.6)] relative z-10"
      >
        <motion.div variants={itemVariants} className="flex justify-center mb-6">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }} 
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl bg-emerald-500/15 border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)]"
          >
            🎉
          </motion.div>
        </motion.div>

        <motion.div variants={itemVariants} className="text-center mb-8">
          <span className="inline-block px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            Account Approved
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Take the Road!
          </h1>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed max-w-md mx-auto">
            Your documents are verified. Select your preferred vehicle mode to complete setup and start accepting rides.
          </p>
        </motion.div>

        {/* Vehicle Category Selector */}
        <motion.div variants={itemVariants} className="mb-8">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-left">
            Select Your Active Vehicle Category
          </label>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : 'bg-gray-950/40 border-gray-800/80 text-gray-400 hover:border-gray-700 hover:bg-gray-900/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-bold text-sm text-white">{cat.label}</span>
                  </div>
                  <span className="text-[11px] text-gray-500">{cat.desc}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Checklist */}
        <motion.div variants={itemVariants} className="bg-gray-950/60 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 text-left mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Verification Summary</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black">✓</span>
              <span className="text-gray-200">DL & RC Verified</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black">✓</span>
              <span className="text-gray-200">Background Checked</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-black">✓</span>
              <span className="text-gray-200">Wallet Activated</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-[10px]">○</span>
              <span>Pass Optional</span>
            </div>
          </div>
        </motion.div>

        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)' }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCompleteSetup}
          disabled={isSaving}
          className="w-full py-4 rounded-2xl font-bold text-white text-base tracking-wide transition-all bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <span>Saving Setup...</span>
          ) : (
            <>
              <span>Launch Driver Dashboard</span>
              <span className="text-lg">→</span>
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
