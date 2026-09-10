import { useEffect, useState } from 'react';
import { ReceiptText, RefreshCw } from 'lucide-react';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PIN_SESSION_STORAGE_KEY } from '@/core/auth/PinAuthProvider';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { subunitsToDisplay } from '@/shared/utils/currency';
import { formatDateTime } from '@/shared/utils/dateTime';
import QuickInvoice from './QuickInvoice';

interface Invoice {
  id: string;
  patient_id: string;
  patient_name?: string | null;
  patient_name_ar?: string | null;
  session_id: string;
  invoice_date: string;
  invoice_status: string | null;
  subtotal_subunits: number;
  tax_subunits: number;
  discount_subunits: number;
  total_subunits: number;
  amount_paid_subunits: number;
  amount_due_subunits: number | null;
  payment_method: string | null;
  collected_reception: boolean | null;
}

const statusLabel: Record<string, string> = {
  draft: 'مسودة', unpaid: 'غير مدفوعة', partial: 'مدفوعة جزئيًا', paid: 'مدفوعة', cancelled: 'ملغاة',
};

type ReceptionRpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};
const rpcClient = () => supabase as unknown as ReceptionRpcClient;
const sessionToken = () => {
  const token = sessionStorage.getItem(PIN_SESSION_STORAGE_KEY);
  if (!token) throw new Error('MISSING_PIN_SESSION');
  return token;
};

export default function ReceptionInvoicesPage() {
  const tenantId = useAuthStore((s) => s.tenant_id);
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await rpcClient().rpc('get_reception_invoices_for_pin_session', {
        p_tenant_id: tenantId,
        p_session_token: sessionToken(),
      });
      if (rpcError) throw new Error(rpcError.message);
      setItems(Array.isArray(data) ? (data as Invoice[]) : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الفواتير');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadInvoices(); }, [tenantId]);

  return (
    <PermissionGuard required="view_invoices" fallback={<div className="p-6 text-center text-slate-500">لا تملك صلاحية عرض الفواتير.</div>}>
      <div className="min-h-[calc(100vh-96px)] bg-slate-50 px-3 py-5 sm:px-5 lg:px-8" dir="rtl">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-700"><ReceiptText className="h-5 w-5" /></div>
                <div><h1 className="text-2xl font-bold text-[#1B2A4A]">الفواتير</h1><p className="mt-1 text-sm text-slate-500">الفواتير النشطة والتحصيل السريع ضمن جلسة الاستقبال الموثقة.</p></div>
              </div>
              <button onClick={() => void loadInvoices()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> تحديث</button>
            </div>
          </section>

          <QuickInvoice invoices={items} onCollected={() => void loadInvoices()} />

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {loading ? <div className="space-y-3">{[1,2,3].map((n) => <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">تعذر تحميل الفواتير: {error}</div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center text-slate-500">لا توجد فواتير نشطة.</div> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200 text-right text-xs font-semibold text-slate-500"><th className="px-3 py-3">التاريخ</th><th className="px-3 py-3">المريض</th><th className="px-3 py-3">الإجمالي</th><th className="px-3 py-3">المدفوع</th><th className="px-3 py-3">المتبقي</th><th className="px-3 py-3">الحالة</th><th className="px-3 py-3">طريقة الدفع</th></tr></thead><tbody>{items.map((invoice) => { const status = invoice.invoice_status ?? 'unpaid'; const due = invoice.amount_due_subunits ?? Math.max(0, invoice.total_subunits - invoice.amount_paid_subunits); return <tr key={invoice.id} className="border-b border-slate-100 last:border-0"><td className="whitespace-nowrap px-3 py-4 text-slate-600">{formatDateTime(invoice.invoice_date)}</td><td className="px-3 py-4 font-semibold text-slate-700">{invoice.patient_name_ar || invoice.patient_name || `${invoice.patient_id.slice(0, 8)}…`}</td><td className="px-3 py-4 font-semibold text-[#1B2A4A]">{subunitsToDisplay(invoice.total_subunits)} JOD</td><td className="px-3 py-4 text-emerald-700">{subunitsToDisplay(invoice.amount_paid_subunits)} JOD</td><td className="px-3 py-4 text-amber-700">{subunitsToDisplay(due)} JOD</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === 'paid' ? 'bg-emerald-50 text-emerald-700' : status === 'partial' ? 'bg-amber-50 text-amber-700' : status === 'cancelled' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>{statusLabel[status] ?? status}</span></td><td className="px-3 py-4 text-slate-600">{invoice.payment_method ?? '—'}{invoice.collected_reception ? ' · الاستقبال' : ''}</td></tr>; })}</tbody></table></div>}
          </section>
        </div>
      </div>
    </PermissionGuard>
  );
}
