import { useEffect, useState } from 'react';
import { MessageSquarePlus, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PIN_SESSION_STORAGE_KEY } from '@/core/auth/PinAuthProvider';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { formatDateTime } from '@/shared/utils/dateTime';

type InquiryStatus = 'pending' | 'converted_to_session' | 'cancelled' | 'rescheduled' | 'no_show';
type InquiryType = 'walk_in' | 'appointment' | 'callback' | 'online';

interface Inquiry {
  id: string;
  inquiry_type: InquiryType;
  temp_patient_name: string | null;
  temp_phone: string | null;
  inquiry_reason: string | null;
  status: InquiryStatus | null;
  created_at: string;
  notes: string | null;
}

const typeLabel: Record<InquiryType, string> = {
  walk_in: 'حضور مباشر', appointment: 'طلب موعد', callback: 'اتصال لاحق', online: 'طلب إلكتروني',
};
const statusLabel: Record<InquiryStatus, string> = {
  pending: 'قيد المتابعة', converted_to_session: 'تم التحويل', cancelled: 'ملغى', rescheduled: 'أعيدت جدولته', no_show: 'لم يحضر',
};
const statusClass: Record<InquiryStatus, string> = {
  pending: 'bg-amber-50 text-amber-700', converted_to_session: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-600', rescheduled: 'bg-blue-50 text-blue-700', no_show: 'bg-red-50 text-red-700',
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

export default function ReceptionInquiriesPage() {
  const tenantId = useAuthStore((s) => s.tenant_id);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', reason: '', type: 'walk_in' as InquiryType });

  const loadInquiries = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await rpcClient().rpc('get_reception_inquiries_for_pin_session', {
        p_tenant_id: tenantId,
        p_session_token: sessionToken(),
      });
      if (error) throw new Error(error.message);
      setItems(Array.isArray(data) ? (data as Inquiry[]) : []);
    } catch (err: unknown) {
      setItems([]);
      toast.error(err instanceof Error ? err.message : 'تعذر تحميل الاستفسارات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadInquiries(); }, [tenantId]);

  const createInquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId || !form.name.trim() || !form.phone.trim()) {
      toast.error('أدخل اسم العميل ورقم الهاتف');
      return;
    }
    setSaving(true);
    try {
      const { error } = await rpcClient().rpc('create_reception_inquiry_for_pin_session', {
        p_tenant_id: tenantId,
        p_session_token: sessionToken(),
        p_inquiry_type: form.type,
        p_temp_patient_name: form.name,
        p_temp_phone: form.phone,
        p_inquiry_reason: form.reason || null,
        p_procedures_requested: null,
        p_expected_objection: null,
        p_notes: null,
      });
      if (error) throw new Error(error.message);
      toast.success('تم تسجيل الاستفسار');
      setForm({ name: '', phone: '', reason: '', type: 'walk_in' });
      await loadInquiries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'تعذر تسجيل الاستفسار');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: InquiryStatus) => {
    if (!tenantId) return;
    try {
      const { error } = await rpcClient().rpc('update_reception_inquiry_status_for_pin_session', {
        p_tenant_id: tenantId,
        p_session_token: sessionToken(),
        p_inquiry_id: id,
        p_status: status,
      });
      if (error) throw new Error(error.message);
      setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
      toast.success('تم تحديث حالة الاستفسار');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'تعذر تحديث الحالة');
    }
  };

  const filteredItems = items.filter((item) => `${item.temp_patient_name ?? ''} ${item.temp_phone ?? ''} ${item.inquiry_reason ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <PermissionGuard required="view_inquiries" fallback={<div className="p-6 text-center text-slate-500">لا تملك صلاحية عرض الاستفسارات.</div>}>
      <div className="min-h-[calc(100vh-96px)] bg-slate-50 px-3 py-5 sm:px-5 lg:px-8" dir="rtl">
        <div className="mx-auto max-w-7xl space-y-5">
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><MessageSquarePlus className="h-5 w-5" /></div>
                <div><h1 className="text-2xl font-bold text-[#1B2A4A]">استفسارات العملاء</h1><p className="mt-1 text-sm text-slate-500">تسجيل ومتابعة الحضور المباشر وطلبات المواعيد والاتصالات والطلبات الإلكترونية.</p></div>
              </div>
              <button onClick={() => void loadInquiries()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> تحديث</button>
            </div>
          </section>

          <PermissionGuard required="edit_inquiries">
            <form onSubmit={createInquiry} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><MessageSquarePlus className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-[#1B2A4A]">تسجيل استفسار جديد</h2><p className="text-sm text-slate-500">يُسجل كـpending ولا ينشئ جلسة سريرية تلقائيًا.</p></div></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <input required value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#1B2A4A]" placeholder="اسم العميل" />
                <input required value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#1B2A4A]" placeholder="رقم الهاتف" />
                <select value={form.type} onChange={(e) => setForm((v) => ({ ...v, type: e.target.value as InquiryType }))} className="rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#1B2A4A]">{Object.entries(typeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <input value={form.reason} onChange={(e) => setForm((v) => ({ ...v, reason: e.target.value }))} className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#1B2A4A]" placeholder="سبب الاستفسار" />
              </div>
              <button type="submit" disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1B2A4A] px-5 py-3 font-semibold text-white hover:bg-[#24395F] disabled:opacity-50"><MessageSquarePlus className="h-4 w-4" />{saving ? 'جاري الحفظ...' : 'تسجيل الاستفسار'}</button>
            </form>
          </PermissionGuard>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-[#1B2A4A]">قائمة الاستفسارات</h2><p className="text-sm text-slate-500">{filteredItems.length} من أصل {items.length}</p></div><div className="relative w-full sm:max-w-xs"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pr-9 pl-3 outline-none focus:border-[#1B2A4A]" placeholder="بحث بالاسم أو الهاتف" /></div></div>
            {loading ? <div className="space-y-3">{[1,2,3].map((n) => <div key={n} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div> : filteredItems.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center text-slate-500">لا توجد استفسارات مطابقة.</div> : <div className="space-y-3">{filteredItems.map((item) => { const status = item.status ?? 'pending'; return <div key={item.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-slate-800">{item.temp_patient_name || 'بدون اسم'}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{typeLabel[item.inquiry_type]}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[status]}`}>{statusLabel[status]}</span></div><div className="mt-2 text-sm text-slate-500">{item.temp_phone || '—'} · {item.inquiry_reason || 'بدون سبب مسجل'}</div><div className="mt-1 text-xs text-slate-400">{formatDateTime(item.created_at)}</div></div><PermissionGuard required="edit_inquiries"><div className="flex flex-wrap gap-2">{(['pending','converted_to_session','rescheduled','cancelled','no_show'] as InquiryStatus[]).map((nextStatus) => <button key={nextStatus} onClick={() => void updateStatus(item.id, nextStatus)} disabled={status === nextStatus} className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-default disabled:opacity-40 ${nextStatus === 'converted_to_session' ? 'bg-emerald-50 text-emerald-700' : nextStatus === 'cancelled' || nextStatus === 'no_show' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>{statusLabel[nextStatus]}</button>)}</div></PermissionGuard></div></div>; })}</div>}
          </section>
        </div>
      </div>
    </PermissionGuard>
  );
}
