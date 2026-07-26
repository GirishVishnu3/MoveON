import React from 'react';
import AuthGuard from 'shared/src/components/auth/AuthGuard';

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRole="RIDER" loginPath="/auth">
      {children}
    </AuthGuard>
  );
}
