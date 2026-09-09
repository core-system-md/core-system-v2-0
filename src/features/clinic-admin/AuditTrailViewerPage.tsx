import { useEffect, useState } from 'react';
import { History, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

const PAGE_SIZE = 25;

const ROLE_LABELS_AR: Record<string, string> = {
  doctor: 'طبيب',
  receptionist: 'موظف الاستقبال',
  clinic_admin: 'مدير العيادة',
  super_admin: 'مشرف عام',
};

type AuditEvent = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  reason: string | null;
  created_at: string;
};

export default function AuditTrailViewerPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error: queryError, count } = await supabase
        .from('audit_trail')
        .select(
          'id, actor_id, actor_role, action, table_name, record_id, reason, created_at',
          { count: 'exact' },
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setEvents([]);
        setTotal(0);
      } else {
        setEvents((data ?? []) as AuditEvent[]);
        setTotal(count ?? 0);
      }

      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard required="view_audit">
      <section className="space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">سجل التدقيق</h2>
            <p className="text-sm text-slate-500">سجل تغييرات العيادة حسب الصلاحيات الحالية.</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">جاري تحميل السجل...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">تعذر تحميل سجل التدقيق: {error}</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">لا توجد أحداث تدقيق.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-right text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">التاريخ</th>
                    <th className="px-4 py-3 font-semibold">الإجراء</th>
                    <th className="px-4 py-3 font-semibold">الجدول</th>
                    <th className="px-4 py-3 font-semibold">الدور</th>
                    <th className="px-4 py-3 font-semibold">المعرّف</th>
                    <th className="px-4 py-3 font-semibold">السبب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <tr key={event.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {new Date(event.created_at).toLocaleString('ar-JO')}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{event.action}</td>
                      <td className="px-4 py-3 text-slate-700">{event.table_name}</td>
                      <td className="px-4 py-3 text-slate-700">{event.actor_role ? ROLE_LABELS_AR[event.actor_role] ?? event.actor_role : '—'}</td>
                      <td className="max-w-[180px] break-all px-4 py-3 text-xs text-slate-500">{event.record_id ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{event.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-500">الصفحة {page + 1} من {pageCount}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={page === 0 || loading}
                className="rounded-md border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="السابق"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                disabled={page >= pageCount - 1 || loading}
                className="rounded-md border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="التالي"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </PermissionGuard>
  );
}
