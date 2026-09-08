import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthProvider';
import { useTenantStore } from '@/shared/store/tenantStore';
import PinPad from './PinPad';
import { Shield, Clock, Users, LogIn } from 'lucide-react';

export default function AmbientKioskView() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { clinicName, primaryColor, fetchTenant } = useTenantStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPinPad, setShowPinPad] = useState(false);

  useEffect(() => {
    void fetchTenant();
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, [fetchTenant]);

  useEffect(() => {
    if (isAuthenticated) navigate('/doctor');
  }, [isAuthenticated, navigate]);

  if (showPinPad) {
    return (
      <PinPad
        onSuccess={() => navigate('/doctor')}
        onCancel={() => setShowPinPad(false)}
        title="دخول الموظف"
        subtitle="أدخل رمز PIN المكوّن من 4 أرقام"
      />
    );
  }

  const displayName = clinicName || 'CORE SYSTEM';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white p-6"
      style={{ backgroundColor: primaryColor || '#1B2A4A' }}
      dir="rtl"
    >
      <div className="text-center space-y-8 max-w-2xl">
        <Shield className="w-24 h-24 mx-auto opacity-80" />
        <div>
          <h1 className="text-5xl md:text-6xl font-bold">{displayName}</h1>
          <p className="text-xl md:text-2xl opacity-70 mt-3">نظام إدارة العيادة</p>
        </div>

        <div className="flex items-center gap-4 justify-center text-lg opacity-70">
          <Clock className="w-5 h-5" />
          <span>{currentTime.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <button
          type="button"
          onClick={() => setShowPinPad(true)}
          className="mx-auto inline-flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-6 py-4 text-lg font-semibold backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.99]"
        >
          <Users className="h-5 w-5" />
          دخول الموظفين
          <LogIn className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
