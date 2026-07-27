"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface TopNavBarProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export default function TopNavBar({ title, showBack = true, rightAction }: TopNavBarProps) {
  const router = useRouter();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-100"
    >
      {showBack && (
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {title && (
        <h1 className="text-base font-semibold text-gray-900 truncate flex-1">{title}</h1>
      )}

      {rightAction && (
        <div className="flex-shrink-0">{rightAction}</div>
      )}
    </motion.nav>
  );
}
