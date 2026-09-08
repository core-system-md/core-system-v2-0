import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

type Breach = {
  id: string;
  breach_type: string;
  severity: string;
  related_session_id: string | null;
  related_user_id: string | null;
  related_patient_id: string | null;
  breach_details: Record<string, unknown>;
  resolved: boolean | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
};

function severityClass(severity: string) {
  switch (severity) {
    case 'critical': return 'bg-red-50 text-red-700 border-red-200';
    case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export default function BreachLogPage() {
  const [breaches, setBreaches] = useState<Breach[]>([]);
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('system_delivery_breaches')
        .select('id, breach_type, severity, related_session_id, related_user_id, related_patient_id, breach_details, resolved, resolved_at, resolution_notes, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (severity !== 'all') query = query.eq('severity', severity);
      if (status === 'open') query = query.or('resolved.is.null,resolved.eq.false');
      if (status === 'resolved') query = query.eq('resolved', true);

      const { data, error: queryError } = await query;
      if (cancelled) return;

      if (queryError) {
        setBreaches([]);
        setError(queryError.message);
      } else {
        setBreaches((data ?? []) as Breach[]);
      }
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [severity, status]);

  return (
    <PermissionGuard required="view_audit">
      <section className="space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">سجل التجاوزات</h2>
            <p className="text-sm text-slate-500">تتبّع خروقات SLA وحالات التقييم المسجلة.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm text-slate-600">
            الشدة
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="mr-2 rounded-md border border-slate-200 px-3 py-2">
              <option value="all">الكل</option>
              <option value="critical">حرج</option>
              <option value="high">عالٍ</option>
              <option value="medium">متوسط</option>
              <option value="low">منخفض</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            الحالة
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mr-2 rounded-md border border-slate-200 px-3 py-2">
              <option value="all">الكل</option>
              <option value="open">مفتوحة</option>
              <option value="resolved">محلولة</option>
            </select>
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">جاري تحميل سجل التجاوزات...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">تعذر تحميل السجل: {error}</div>
          ) : breaches.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">لا توجد تجاوزات مطابقة للفلاتر.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {breaches.map((breach) => (
                <article key={breach.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClass(breach.severity)}`}>{breach.severity}</span>
                    <span className="font-semibold text-slate-900">{breach.breach_type}</span>
                    <span className="text-xs text-slate-500">{new Date(breach.created_at).toLocaleString('ar-JO')}</span>
                    <span className="mr-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{breach.resolved ? 'محلولة' : 'مفتوحة'}</span>
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">{JSON.stringify(breach.breach_details, null, 2)}</pre>
                  {breach.related_session_id && <p className="mt-2 text-xs text-slate-500">الجلسة: {breach.related_session_id}</p>}
                  {breach.resolution_notes && <p className="mt-2 text-sm text-slate-600">ملاحظات المعالجة: {breach.resolution_notes}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </PermissionGuard>
  );
}
