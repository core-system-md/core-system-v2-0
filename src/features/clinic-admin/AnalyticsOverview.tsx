import { useEffect, useState } from 'react';
import { useTenantStore } from '@/shared/store/tenantStore';
import { supabase } from '@/infrastructure/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Clock, AlertTriangle, DollarSign, Activity } from 'lucide-react';
import { subunitsToDisplay } from '@/shared/utils/currency';

interface DashboardKPI {
  totalPatients: number;
  totalVisitsToday: number;
  totalRevenueSubunits: number;
  avgWaitTimeMinutes: number;
  slaBreaches: number;
  hotLeads: number;
  conversionRate: number;
}

export default function AnalyticsOverview() {
  const { tenantId } = useTenantStore();
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    fetchDashboardKPI();
  }, [tenantId]);

  async function fetchDashboardKPI() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // Fetch today's snapshot
    const { data: snapshot } = await supabase
      .from('analytics_daily_snapshots')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('snapshot_date', today)
      .single();

    // Fetch active sessions count
    const { count: activeSessions } = await supabase
      .from('clinic_visit_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('session_status', ['waiting', 'in_consultation']);

    // Fetch total patients
    const { count: totalPatients } = await supabase
      .from('clinic_patients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    setKpi({
      totalPatients: totalPatients || 0,
      totalVisitsToday: snapshot?.total_visits || activeSessions || 0,
      totalRevenueSubunits: snapshot?.total_revenue_subunits || 0,
      avgWaitTimeMinutes: snapshot?.avg_wait_time_minutes || 0,
      slaBreaches: snapshot?.sla_breaches_count || 0,
      hotLeads: snapshot?.hot_leads_count || 0,
      conversionRate: snapshot?.conversion_rate || 0,
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32 bg-gray-100 rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  if (!kpi) return null;

  const cards = [
    {
      title: 'إجمالي المرضى',
      value: kpi.totalPatients.toLocaleString('ar-JO'),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'الزيارات اليوم',
      value: kpi.totalVisitsToday.toLocaleString('ar-JO'),
      icon: Activity,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'الإيرادات اليوم',
      value: subunitsToDisplay(kpi.totalRevenueSubunits),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'متوسط وقت الانتظار',
      value: `${kpi.avgWaitTimeMinutes.toFixed(1)} دقيقة`,
      icon: Clock,
      color: kpi.avgWaitTimeMinutes >= 25 ? 'text-red-600' : kpi.avgWaitTimeMinutes >= 15 ? 'text-yellow-600' : 'text-green-600',
      bg: kpi.avgWaitTimeMinutes >= 25 ? 'bg-red-50' : kpi.avgWaitTimeMinutes >= 15 ? 'bg-yellow-50' : 'bg-green-50',
    },
    {
      title: 'تجاوزات SLA',
      value: kpi.slaBreaches.toLocaleString('ar-JO'),
      icon: AlertTriangle,
      color: kpi.slaBreaches > 0 ? 'text-red-600' : 'text-gray-600',
      bg: kpi.slaBreaches > 0 ? 'bg-red-50' : 'bg-gray-50',
    },
    {
      title: 'Hot Leads',
      value: kpi.hotLeads.toLocaleString('ar-JO'),
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4" dir="rtl">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
