import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

type Breach = { id: string; tenant_id: string; breach_type: string; severity: 'critical'|'warning'|'info'; breach_details: Record<string, unknown>; resolved: boolean | null; created_at: string; };

const severityLabel: Record<Breach['severity'], string> = { critical: 'حرج', warning: 'تحذير', info: 'معلومة' };

export default function SystemAlertConsole() {
  const [rows, setRows] = useState<Breach[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string|null>(null);
  const load = async () => { setLoading(true); setError(null); const { data, error: e } = await supabase.from('system_delivery_breaches').select('id, tenant_id, breach_type, severity, breach_details, resolved, created_at').is('deleted_at', null).order('created_at',{ascending:false}).limit(200); if(e){setError(e.message);setRows([]);} else setRows((data??[]) as Breach[]); setLoading(false); };
  useEffect(()=>{void load();},[]);
  return <PermissionGuard required="super_admin_access"><section className="space-y-4" dir="rtl"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-primary"/><div><h2 className="text-xl font-bold text-slate-900">مركز تنبيهات النظام</h2><p className="text-sm text-slate-500">عرض التجاوزات عبر جميع العيادات.</p></div></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><RefreshCw className="h-4 w-4"/>تحديث</button></div>{error&&<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">{loading?<div className="p-6 text-sm text-slate-500">جاري التحميل...</div>:<table className="min-w-full text-sm"><thead className="bg-muted"><tr><th className="px-4 py-3 text-right">العيادة</th><th className="px-4 py-3 text-right">النوع</th><th className="px-4 py-3 text-right">الخطورة</th><th className="px-4 py-3 text-right">الحالة</th><th className="px-4 py-3 text-right">التفاصيل</th><th className="px-4 py-3 text-right">التاريخ</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(r=><tr key={r.id}><td className="px-4 py-3 font-mono text-xs">{r.tenant_id}</td><td className="px-4 py-3">{r.breach_type}</td><td className="px-4 py-3">{severityLabel[r.severity] ?? r.severity}</td><td className="px-4 py-3">{r.resolved ? 'تم الحل' : 'مفتوح'}</td><td className="px-4 py-3 max-w-md break-all text-slate-600">{JSON.stringify(r.breach_details)}</td><td className="px-4 py-3 text-slate-600">{new Date(r.created_at).toLocaleString('ar-JO')}</td></tr>)}</tbody></table>}</div></section></PermissionGuard>;
}
