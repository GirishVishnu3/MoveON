'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaTachometerAlt, FaUsers, FaCar, FaMapMarkedAlt, FaMoneyBillWave, FaHeadset, FaFileAlt, FaLock, FaSignOutAlt } from 'react-icons/fa';

const ADMIN_PIN = '1234'; // Demo PIN — change in production
const ADMIN_SESSION_KEY = 'moveon_admin_access';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminGranted, setAdminGranted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if admin session is already granted
    const sessionVal = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (sessionVal === 'granted') {
      setAdminGranted(true);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinLoading(true);
    setTimeout(() => {
      if (pin === ADMIN_PIN) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, 'granted');
        setAdminGranted(true);
      } else {
        setPinError('Incorrect admin PIN. Please try again.');
        setPin('');
      }
      setPinLoading(false);
    }, 400);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminGranted(false);
    setPin('');
  };

  const links = [
    { href: '/admin', label: 'Dashboard', icon: <FaTachometerAlt /> },
    { href: '/admin/users', label: 'Riders', icon: <FaUsers /> },
    { href: '/admin/drivers', label: 'Drivers', icon: <FaCar /> },
    { href: '/admin/bookings', label: 'Live Operations', icon: <FaMapMarkedAlt /> },
    { href: '/admin/finance', label: 'Finance', icon: <FaMoneyBillWave /> },
    { href: '/admin/support', label: 'Support', icon: <FaHeadset /> },
    { href: '/admin/audit', label: 'Audit Logs', icon: <FaFileAlt /> },
  ];

  if (!mounted) return null;

  // PIN Gate Screen
  if (!adminGranted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6">
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-blue-600/20 border border-blue-600/30 rounded-2xl flex items-center justify-center mx-auto text-2xl">
              🛡️
            </div>
            <h1 className="text-xl font-black text-white">
              Move<span className="text-blue-500">ON</span> Admin Portal
            </h1>
            <p className="text-slate-400 text-xs">Enter your admin PIN to access the portal</p>
          </div>

          {pinError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-semibold text-center">
              {pinError}
            </div>
          )}

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Admin PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter admin PIN"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-center text-xl tracking-[0.5em] font-mono focus:border-blue-500 outline-none transition-colors"
                autoFocus
              />
              <p className="text-[10px] text-slate-500 mt-1.5 text-center">Demo PIN: <span className="text-slate-300 font-mono font-bold">1234</span></p>
            </div>
            <button
              type="submit"
              disabled={pinLoading || pin.length < 1}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-sm shadow-lg shadow-blue-950/40"
            >
              {pinLoading ? 'Verifying...' : 'Access Admin Panel →'}
            </button>
          </form>

          <div className="text-center">
            <Link href="/auth/select-role" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Back to Role Selection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin Panel Layout
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black italic tracking-tighter">Move<span className="text-blue-500">ON</span></h1>
          <span className="text-xs text-slate-400 block mt-0.5 not-italic font-normal">Admin Panel 🛡️</span>
        </div>
        <nav className="flex-1 px-4 pt-4 space-y-1 overflow-y-auto">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-colors text-sm ${
                pathname === link.href ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {link.icon}
              <span className="font-medium">{link.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800 space-y-2">
          <Link href="/auth/select-role" className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-xs font-medium">
            <span>←</span> Role Selection
          </Link>
          <button
            onClick={handleAdminLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-red-400 hover:bg-red-950/40 transition-colors text-xs font-bold"
          >
            <FaSignOutAlt size={12} /> Sign Out Admin
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
          </h2>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
              🛡️ Admin Mode
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
