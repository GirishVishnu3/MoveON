"use client";
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { RootState } from '../../store';
import { logout } from '../../store/authSlice';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRole?: string;
  loginPath?: string;
}

export default function AuthGuard({ children, allowedRole, loginPath = '/auth' }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!isAuthenticated) {
      // Not logged in — redirect to login, preserving the page they wanted
      const returnUrl = encodeURIComponent(pathname);
      router.push(`${loginPath}?returnUrl=${returnUrl}`);
    } else if (allowedRole && user?.role !== allowedRole) {
      // Logged in but wrong role — clear stale tokens and send to login
      dispatch(logout());
      router.push(loginPath);
    }
  }, [isAuthenticated, isLoading, user, router, pathname, allowedRole, loginPath, mounted, dispatch]);

  // While loading or redirecting, show a spinner
  if (!mounted || isLoading || !isAuthenticated || (allowedRole && user?.role !== allowedRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return <>{children}</>;
}
