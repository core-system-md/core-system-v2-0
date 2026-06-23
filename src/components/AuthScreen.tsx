import { useState } from 'react';
import { supabase } from '../infrastructure/supabase/client';

const PIN_AUTH_KEY = "core_pin_auth";

export default function AuthScreen() {
  const [licenseKey, setLicenseKey] = useState('DEMO-LICENSE-2024');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.rpc('login_by_pin', {
        clinic_license: licenseKey,
        staff_secret: pin
      });

      if (error || !data || data.length === 0) {
        throw new Error('INVALID_PIN: Incorrect PIN or License');
      }

      const user = data[0];

      localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
        user_id: user.user_id,
        full_name: user.user_full_name,
        role: user.user_role,
        tenant_id: user.clinic_tenant_id,
        expiry: Date.now() + 24 * 60 * 60 * 1000
      }));

      if (user.user_role === 'doctor') {
        window.location.href = '/doctor';
      } else if (user.user_role === 'receptionist') {
        window.location.href = '/reception';
      } else if (user.user_role === 'clinic_admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/';
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestMode = () => {
    localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
      user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      full_name: 'Dr. Sara',
      role: 'doctor',
      tenant_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      expiry: Date.now() + 24 * 60 * 60 * 1000
    }));
    window.location.href = '/doctor';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">CORE SYSTEM</h1>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-2">Clinic License Key</label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="w-full p-3 rounded bg-slate-700 text-white border border-slate-600"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2">PIN Code</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3 rounded bg-slate-700 text-white border border-slate-600"
              placeholder="Enter PIN"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-semibold disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>

          <button
            onClick={handleTestMode}
            className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 p-3 rounded font-semibold border border-emerald-600/30"
          >
            Test Mode (Demo)
          </button>
        </div>
      </div>
    </div>
  );
}
