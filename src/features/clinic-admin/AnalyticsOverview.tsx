import { useEffect, useState } from 'react';
import { useTenantStore } from '@/shared/store/tenantStore';
import { supabase } from '@/infrastructure/supabase/client';
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void fetchDashboardKPI();
  }, [tenantId]);

  async function fetchDashboardKPI() {
    setLoading(true);
    setError(null);
    const today = new Date().toISOString().split('T')[0]!;

    const { data: snapshot, error: snapshotError } = await supabase
      .from('analytics_daily_snapshots')
      .select('*')
      .eq('tenant_id', tenantId!)
      .eq('snapshot_date', today)
      .is('deleted_at', null)
      .maybeSingle();

    if (snapshotError) {
      setError(snapshotError.message);
      setKpi(null);
      setLoading(false);
      return;
    }

    const { count: totalPatients, error: patientError } = await supabase
      .from('clinic_patients')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId!)
      .is('deleted_at', null);

    if (patientError) {
      setError(patientError.message);
      setKpi(null);
      setLoading(false);
      return;
    }

    setKpi({
      totalPatients: totalPatients || 0,
      totalVisitsToday: snapshot?.total_visits || 0,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4" dir="rtl">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-border p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mb-4" />
            <div className="h-8 bg-muted rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4" dir="rtl">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 text-sm text-red-700">
          تعذر تحميل مؤشرات التحليلات: {error}
        </div>
      </div>
    );
  }

  if (!kpi) return null;

  const cards = [
    {
      title: 'إجمالي المرضى',
      value: kpi.totalPatients.toLocaleString('ar-JO'),
      icon: Users,
      color: 'text-primary',
      bg: 'bg-accent',
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
      color: kpi.slaBreaches > 0 ? 'text-red-600' : 'text-muted-foreground',
      bg: kpi.slaBreaches > 0 ? 'bg-red-50' : 'bg-muted',
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
        <div key={card.title} className="bg-white rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
            <div className={`p-2 rounded-lg ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
          </div>
          <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}