import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { SEVERITY_LABELS } from '@/shared/constants/labels';
import { formatDateTimeLocale } from '@/shared/utils/locale';

type Breach = { id: string; tenant_id: string; breach_type: string; severity: 'critical'|'warning'|'info'; breach_details: Record<string, unknown>; resolved: boolean | null; created_at: string; };

export default function SystemAlertConsole() {
  const { t } = useTranslation('super-admin');
  const [rows, setRows] = useState<Breach[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string|null>(null);
  const load = async () => { setLoading(true); setError(null); const { data, error: e } = await supabase.from('system_delivery_breaches').select('id, tenant_id, breach_type, severity, breach_details, resolved, created_at').is('deleted_at', null).order('created_at',{ascending:false}).limit(200); if(e){setError(e.message);setRows([]);} else setRows((data??[]) as Breach[]); setLoading(false); };
  useEffect(()=>{void load();},[]);
  return <PermissionGuard required="super_admin_access"><section className="space-y-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><AlertTriangle className="h-6 w-6 text-primary"/><div><h2 className="text-xl font-bold text-slate-900">{t('systemAlerts.title')}</h2><p className="text-sm text-slate-500">{t('systemAlerts.description')}</p></div></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" aria-label={t('systemAlerts.refresh')}><RefreshCw className="h-4 w-4"/>{t('systemAlerts.refresh')}</button></div>{error&&<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}<div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">{loading?<div className="p-6 text-sm text-slate-500">{t('systemAlerts.loading')}</div>:<table className="min-w-full text-sm"><thead className="bg-muted"><tr><th className="px-4 py-3 text-right">{t('systemAlerts.clinic')}</th><th className="px-4 py-3 text-right">{t('systemAlerts.type')}</th><th className="px-4 py-3 text-right">{t('systemAlerts.severity')}</th><th className="px-4 py-3 text-right">{t('systemAlerts.status')}</th><th className="px-4 py-3 text-right">{t('systemAlerts.details')}</th><th className="px-4 py-3 text-right">{t('systemAlerts.date')}</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(r=><tr key={r.id}><td className="px-4 py-3 font-mono text-xs">{r.tenant_id}</td><td className="px-4 py-3">{r.breach_type}</td><td className="px-4 py-3">{SEVERITY_LABELS[r.severity] ?? r.severity}</td><td className="px-4 py-3">{r.resolved ? t('systemAlerts.resolved') : t('systemAlerts.open')}</td><td className="px-4 py-3 max-w-md break-all text-slate-600">{JSON.stringify(r.breach_details)}</td><td className="px-4 py-3 text-slate-600">{formatDateTimeLocale(r.created_at)}</td></tr>)}</tbody></table>}</div></section></PermissionGuard>;
}
