"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function RiderOnboardingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    emergencyContact: '',
    language: 'en'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/rider/home');
  };

  return (
    <div className="flex min-h-screen bg-[#060b14] text-white items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0d1525] rounded-3xl shadow-[0_12px_50px_rgba(0,0,0,0.7)] border border-gray-800/90 p-8 relative z-10"
      >
        <h2 className="text-2xl font-black text-white mb-1">Complete Profile</h2>
        <p className="text-gray-400 text-sm mb-6">Tell us a bit about yourself to get started.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
            <input 
              type="text" 
              required
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3.5 bg-gray-950/80 border border-gray-800 rounded-2xl text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address (Optional)</label>
            <input 
              type="email" 
              placeholder="john@example.com"
              className="w-full px-4 py-3.5 bg-gray-950/80 border border-gray-800 rounded-2xl text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Emergency Contact</label>
            <input 
              type="tel" 
              placeholder="+91 9876543210"
              className="w-full px-4 py-3.5 bg-gray-950/80 border border-gray-800 rounded-2xl text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Preferred Language</label>
            <select 
              className="w-full px-4 py-3.5 bg-gray-950/80 border border-gray-800 rounded-2xl text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
              value={formData.language}
              onChange={(e) => setFormData({...formData, language: e.target.value})}
            >
              <option value="en" className="bg-gray-900 text-white">English</option>
              <option value="hi" className="bg-gray-900 text-white">Hindi (हिंदी)</option>
              <option value="kn" className="bg-gray-900 text-white">Kannada (ಕನ್ನಡ)</option>
              <option value="ta" className="bg-gray-900 text-white">Tamil (தமிழ்)</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2"
          >
            Save & Continue →
          </button>
        </form>
      </motion.div>
    </div>
  );
}
