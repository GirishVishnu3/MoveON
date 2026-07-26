"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from 'shared/src/store/index';
import { AuthForm } from 'shared/src';
import { motion } from 'framer-motion';

function UnifiedAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      const returnUrl = searchParams.get('returnUrl');
      if (returnUrl) {
        router.replace(returnUrl);
      } else {
        router.replace('/auth/select-role');
      }
    }
  }, [isAuthenticated, isLoading, router, searchParams, mounted]);

  const handleSuccess = (_isNewUser: boolean, _role: string) => {
    router.replace('/auth/select-role');
  };

  if (!mounted || isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060b14] text-gray-400 font-medium">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 rounded-2xl border-2 border-t-blue-500 border-r-blue-500/30 border-b-transparent border-l-transparent"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060b14] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient Lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[130px] pointer-events-none" />
      
      <AuthForm onSuccess={handleSuccess} />
    </div>
  );
}

export default function UnifiedAuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#060b14] text-gray-500">Loading...</div>}>
      <UnifiedAuthContent />
    </Suspense>
  );
}
