import { useEffect, useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';

export function AnalyticsOverview() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('analytics_daily_snapshots').select('*').eq('snapshot_date', today).single();
      setData(data);
    };
    fetch();
  }, []);

  if (!data) return <div className="p-4 text-white">Loading...</div>;

  return (
    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card title="Visits" value={data.total_visits} color="bg-blue-500" />
      <Card title="Revenue" value={`${(data.total_revenue_subunits/1000).toFixed(2)} JOD`} color="bg-emerald-500" />
      <Card title="Core Score" value={data.avg_core_score?.toFixed(1)} color="bg-purple-500" />
      <Card title="Wait (min)" value={data.avg_wait_time_minutes?.toFixed(1)} color="bg-amber-500" />
      <Card title="Breaches" value={data.sla_breaches_count} color="bg-red-500" />
      <Card title="Hot Leads" value={data.hot_leads_count} color="bg-rose-500" />
      <Card title="Conversion" value={`${data.conversion_rate?.toFixed(1)}%`} color="bg-teal-500" />
    </div>
  );
}

function Card({ title, value, color }: any) {
  return (
    <div className={`${color} rounded-lg p-4 text-white`}>
      <p className="text-sm opacity-80">{title}</p>
      <p className="text-2xl font-bold mt-1">{value || '0'}</p>
    </div>
  );
}
