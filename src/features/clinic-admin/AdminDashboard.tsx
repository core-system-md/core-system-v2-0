import { useAuth } from '@/core/auth/AuthProvider';
import { useRole } from '@/core/auth/useRole';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, TrendingUp, Users, Settings } from 'lucide-react';
import AnalyticsOverview from './AnalyticsOverview';
import RevenueCards from './RevenueCards';
import StaffPerformance from './StaffPerformance';

export default function AdminDashboard() {
  const { isAuthenticated } = useAuth();
  const { isClinicAdmin, isSuperAdmin } = useRole();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1B2A4A]">لوحة تحكم العيادة</h1>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              الإيرادات
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              الطاقم
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <AnalyticsOverview />
          </TabsContent>

          <TabsContent value="revenue" className="mt-4">
            <RevenueCards />
          </TabsContent>

          <TabsContent value="staff" className="mt-4">
            <StaffPerformance />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}