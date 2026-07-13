// CORE SYSTEM v2.1 — RoleSelector.tsx
// ...

import React, { useState } from 'react';
import { useAuthContext } from '@/core/auth/AuthProvider';
import { Navigate } from 'react-router-dom';

export function RoleSelector() {
  const { user, loginWithPin } = useAuthContext();
  const [role, setRole] = useState('');

  const handleRoleSelection = () => {
    if (role) {
      loginWithPin(user?.pin_code ?? '', role).then(response => {
        if (response.success) {
          console.log('Login successful', response.user);
        } else {
          console.error('Login failed', response.error);
        }
      });
    } else {
      alert('Please select a role.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#1B2A4A]">اختر دورك</h1>
        <div className="mt-4 flex flex-col space-y-2">
          <button
            className="rounded bg-[#1B2A4A] px-4 py-2 text-sm text-white"
            onClick={() => setRole('doctor')}
          >
            الطبيب
          </button>
          <button
            className="rounded bg-[#1B2A4A] px-4 py-2 text-sm text-white"
            onClick={() => setRole('receptionist')}
          >
            الاستقبال
          </button>
          <button
            className="rounded bg-[#1B2A4A] px-4 py-2 text-sm text-white"
            onClick={() => setRole('clinic_admin')}
          >
            الإدارة
          </button>
          <button
            className="rounded bg-[#1B2A4A] px-4 py-2 text-sm text-white"
            onClick={() => setRole('super_admin')}
          >
            Super Admin
          </button>
        </div>
        <button
          className="mt-4 rounded bg-blue-500 px-4 py-2 text-sm text-white"
          onClick={handleRoleSelection}
        >
          استمرار
        </button>
      </div>
    </div>
  );
}
