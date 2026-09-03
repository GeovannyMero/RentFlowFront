'use client';

import { AuthForm } from '@/components/auth/auth-form';
import { Suspense } from 'react';

// export const dynamic = 'force-dynamic'; 

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
          <div className="h-12 w-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <AuthForm mode="signup" />
    </Suspense>
  );
}
