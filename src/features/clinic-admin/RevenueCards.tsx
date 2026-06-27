import { useEffect, useState } from 'react';
import { useTenantStore } from '@/shared/store/tenantStore';
import { supabase } from '@/infrastructure/supabase/client';
import { subunitsToDisplay } from '@/shared/utils/currency';
import { Calendar, TrendingUp, CreditCard, PiggyBank } from 'lucide-react';

interface RevenueData {
  date: string;
  revenue: number;
  visits: number;
  discounts: number;
}

interface SnapshotRecord {
  snapshot_date: string;
  total_revenue_subunits: number | null;
  total_visits: number | null;
  total_discounts_subunits: number | null;
}

interface InvoiceRecord {
  total_subunits: number | null;
  discount_subunits: number | null;
}

export default function RevenueCards() {
  const { tenantId } = useTenantStore();
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalDiscounts: 0,
    netRevenue: 0,
    avgPerVisit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    fetchRevenueData();
  }, [tenantId]);

  async function fetchRevenueData() {
    setLoading(true);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: snapshots } = await supabase
      .from('analytics_daily_snapshots')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('snapshot_date', sevenDaysAgo.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    const { data: invoices } = await supabase
      .from('clinic_invoices')
      .select('total_subunits, discount_subunits, invoice_date')
      .eq('tenant_id', tenantId)
      .gte('invoice_date', sevenDaysAgo.toISOString().split('T')[0])
      .in('invoice_status', ['paid', 'partial']);

    const chartData: RevenueData[] = (snapshots || []).map((s: SnapshotRecord) => ({
      date: s.snapshot_date.slice(5),
      revenue: s.total_revenue_subunits || 0,
      visits: s.total_visits || 0,
      discounts: s.total_discounts_subunits || 0,
    }));

    const totalRev = (invoices || []).reduce((sum: number, inv: InvoiceRecord) => sum + (inv.total_subunits || 0), 0);
    const totalDisc = (invoices || []).reduce((sum: number, inv: InvoiceRecord) => sum + (inv.discount_subunits || 0), 0);
    const totalVisits = chartData.reduce((sum, d) => sum + d.visits, 0);

    setRevenueData(chartData);
    setSummary({
      totalRevenue: totalRev,
      totalDiscounts: totalDisc,
      netRevenue: totalRev - totalDisc,
      avgPerVisit: totalVisits > 0 ? Math.round(totalRev / totalVisits) : 0,
    });
    setLoading(false);
  }

  function renderBarChart() {
    if (revenueData.length === 0) return null;

    const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 1);
    const chartHeight = 200;
    const barWidth = Math.max(30, Math.min(60, 400 / revenueData.length));
    const gap = 8;
    const totalWidth = revenueData.length * (barWidth + gap);

    return (
      <div className="w-full overflow-x-auto">
        <svg width={totalWidth + 40} height={chartHeight + 60} className="mx-auto">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line
                x1="30"
                y1={chartHeight - ratio * chartHeight + 20}
                x2={totalWidth + 30}
                y2={chartHeight - ratio * chartHeight + 20}
                stroke="#e5e7eb"
                strokeDasharray="3,3"
              />
              <text
                x="25"
                y={chartHeight - ratio * chartHeight + 25}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {subunitsToDisplay(Math.round(maxRevenue * ratio))}
              </text>
            </g>
          ))}

          {revenueData.map((d, i) => {
            const barHeight = (d.revenue / maxRevenue) * chartHeight;
            const x = 30 + i * (barWidth + gap);
            const y = chartHeight - barHeight + 20;

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#1B2A4A"
                  rx="4"
                >
                  <title>{d.date}: {subunitsToDisplay(d.revenue)}</title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 40}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6b7280"
                >
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse h-24" />
          ))}
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  const summaryCards = [
    {
      title: 'إجمالي الإيرادات',
      value: subunitsToDisplay(summary.totalRevenue),
      icon: CreditCard,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'إجمالي الخصومات',
      value: subunitsToDisplay(summary.totalDiscounts),
      icon: PiggyBank,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'الصافي',
      value: subunitsToDisplay(summary.netRevenue),
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'متوسط/زيارة',
      value: subunitsToDisplay(summary.avgPerVisit),
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">الإيرادات — آخر 7 أيام</h3>
        {renderBarChart()}
      </div>
    </div>
  );
}