import { useAuth } from '@/core/auth/AuthProvider';
import { useRole } from '@/core/auth/useRole';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LayoutDashboard, TrendingUp, Users } from 'lucide-react';
import AnalyticsOverview from './AnalyticsOverview';
import RevenueCards from './RevenueCards';
import StaffPerformance from './StaffPerformance';

type TabId = 'overview' | 'revenue' | 'staff';

export default function AdminDashboard() {
  const { isAuthenticated } = useAuth();
  const { isClinicAdmin, isSuperAdmin } = useRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!isClinicAdmin && !isSuperAdmin) {
      navigate('/doctor');
      return;
    }
  }, [isAuthenticated, isClinicAdmin, isSuperAdmin, navigate]);

  if (!isAuthenticated || (!isClinicAdmin && !isSuperAdmin)) {
    return null;
  }

  const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { id: 'revenue', label: 'الإيرادات', icon: TrendingUp },
    { id: 'staff', label: 'الطاقم', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1B2A4A]">لوحة تحكم العيادة</h1>
        </div>

        {/* Custom Tabs — Pure Tailwind */}
        <div className="w-full max-w-md">
          <div className="grid grid-cols-3 bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-[#1B2A4A] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'overview' && <AnalyticsOverview />}
          {activeTab === 'revenue' && <RevenueCards />}
          {activeTab === 'staff' && <StaffPerformance />}
        </div>
      </div>
    </div>
  );
}