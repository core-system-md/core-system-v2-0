// CORE SYSTEM v2.1 — LoginForm.tsx
// ...

import React, { useState } from 'react';
import { useAuthContext } from '@/core/auth/AuthProvider';

export function LoginForm() {
  const { loginWithPin, loginWithEmail } = useAuthContext();
  const [mode, setMode] = useState('pin'); // أو 'email'
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handlePinLogin = () => {
    loginWithPin(pin).then(response => {
      if (response.success) {
        console.log('Login successful with PIN', response.user);
      } else {
        console.error('Login failed with PIN', response.error);
        alert(response.error);
      }
    });
  };

  const handleEmailLogin = () => {
    loginWithEmail(email, password).then(response => {
      if (response.success) {
        console.log('Login successful with Email', response);
      } else {
        console.error('Login failed with Email', response.error);
        alert(response.error);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#1B2A4A]">تسجيل الدخول</h1>
        <div className="mt-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              checked={mode === 'pin'}
              onChange={() => setMode('pin')}
            />
            <span className="text-sm">PIN</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              checked={mode === 'email'}
              onChange={() => setMode('email')}
            />
            <span className="text-sm">البريد الإلكتروني وكلمة المرور</span>
          </label>
        </div>
        {mode === 'pin' && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <button
              className="mt-4 rounded bg-[#1B2A4A] px-4 py-2 text-sm text-white"
              onClick={handlePinLogin}
            >
              تسجيل الدخول باستخدام PIN
            </button>
          </div>
        )}
        {mode === 'email' && (
          <div className="mt-4">
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-2"
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-2"
            />
            <button
              className="mt-4 rounded bg-[#1B2A4A] px-4 py-2 text-sm text-white"
              onClick={handleEmailLogin}
            >
              تسجيل الدخول بالبريد الإلكتروني وكلمة المرور
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
