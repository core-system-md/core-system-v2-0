import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/AuthProvider';
import { useTenant } from '@/shared/hooks/useTenant';
import { Shield, Clock, Users } from 'lucide-react';

export default function AmbientKioskView() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { tenantName, clinicName, primaryColor, refreshTenant } = useTenant();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    refreshTenant();
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, [refreshTenant]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/doctor');
    }
  }, [isAuthenticated, navigate]);

  const displayName = clinicName || tenantName || 'CORE SYSTEM';

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center text-white"
      style={{ backgroundColor: primaryColor || '#1B2A4A' }}
    >
      <div className="text-center space-y-8">
        <Shield className="w-24 h-24 mx-auto opacity-80" />
        <h1 className="text-6xl font-bold">{displayName}</h1>
        <p className="text-2xl opacity-70">Clinic Management System</p>
        
        <div className="flex items-center gap-4 justify-center text-lg opacity-60">
          <Clock className="w-5 h-5" />
          <span>{currentTime.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}</span>
          <span>|</span>
          <Users className="w-5 h-5" />
          <span>Tap staff avatar to login</span>
        </div>
      </div>
    </div>
  );
}
