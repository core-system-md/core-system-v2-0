// src/components/AuthScreen.tsx
// UPDATED: 2026-06-24 — Added role selection for PIN login

import { useState } from 'react';
import { useAuth } from '../core/auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const VALID_ROLES = ['doctor', 'receptionist', 'clinic_admin', 'super_admin'] as const;
type ValidRole = typeof VALID_ROLES[number];

export function AuthScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [licenseKey, setLicenseKey] = useState('DEMO-LICENSE-2024');
  const [loginMode, setLoginMode] = useState<'email' | 'pin'>('pin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [selectedRole, setSelectedRole] = useState<ValidRole | ''>('');

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required');
      return;
    }

    try {
      const result = await login.mutateAsync({ 
        email: email.trim(), 
        password, 
        licenseKey: licenseKey.trim() 
      });
      
      navigate(`/${result.role}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handlePinLogin = async () => {
    // Validate role selection
    if (!selectedRole) {
      toast.error('Please select your role');
      return;
    }

    // Validate PIN
    if (!enteredPin || enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
      toast.error('Please enter a valid 4-digit PIN');
      return;
    }

    try {
      const result = await login.mutateAsync({ 
        pinCode: enteredPin, 
        licenseKey: licenseKey.trim(),
        role: selectedRole, // ← REQUIRED: pass selected role
      });
      
      // Navigate based on returned role
      navigate(`/${result.role}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1B2A4A]">
      <div className="w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CORE SYSTEM</h1>
          <p className="text-gray-400">Clinic Management Portal</p>
        </div>

        {/* Online Mode Badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            Online Mode
          </span>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white text-center mb-6">Staff Login</h2>

          {/* License Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Clinic License Key
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter license key"
            />
          </div>

          {/* Login Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLoginMode('email')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                loginMode === 'email' 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
            <button
              onClick={() => setLoginMode('pin')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                loginMode === 'pin' 
                  ? 'bg-white text-[#1B2A4A]' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              PIN
            </button>
          </div>

          {/* Email Login Form */}
          {loginMode === 'email' && (
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Password"
                />
              </div>
              <button
                onClick={handleEmailLogin}
                disabled={login.isPending}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {login.isPending ? 'Logging in...' : 'Login'}
              </button>
            </div>
          )}

          {/* PIN Login Form */}
          {loginMode === 'pin' && (
            <div className="space-y-4">
              {/* Role Selection - NEW */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ValidRole)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" className="bg-[#1B2A4A]">Select your role</option>
                  <option value="doctor" className="bg-[#1B2A4A]">Doctor</option>
                  <option value="receptionist" className="bg-[#1B2A4A]">Receptionist</option>
                  <option value="clinic_admin" className="bg-[#1B2A4A]">Clinic Admin</option>
                  <option value="super_admin" className="bg-[#1B2A4A]">Super Admin</option>
                </select>
              </div>

              {/* PIN Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
                  Enter your 4-digit staff PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="____"
                />
              </div>

              <button
                onClick={handlePinLogin}
                disabled={login.isPending || !selectedRole || enteredPin.length !== 4}
                className="w-full py-3 bg-white text-[#1B2A4A] hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {login.isPending ? 'Verifying...' : 'Login with PIN'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// Default export for backward compatibility
export default AuthScreen;
