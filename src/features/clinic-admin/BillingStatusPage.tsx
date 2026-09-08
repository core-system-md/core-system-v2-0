import { useEffect, useState } from 'react';
import { CalendarClock, CreditCard, Smartphone } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

const TRIAL_DAYS = 14;

function formatDate(value: string | null) {
  if (!value) return 'غير محدد';
  return new Date(value).toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

type TenantBillingRow = {
  subscription_tier: string;
  subscription_start: string | null;
  subscription_end: string | null;
  trial_started_at: string | null;
  max_devices: number | null;
};

export default function BillingStatusPage() {
  const tenantId = useAuthStore((state) => state.tenant_id);
  const [tenant, setTenant] = useState<TenantBillingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!tenantId) {
        setTenant(null);
        setError('TENANT_NOT_INITIALIZED');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('master_tenants')
        .select('subscription_tier, subscription_start, subscription_end, trial_started_at, max_devices')
        .eq('id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (cancelled) return;

      if (queryError) {
        setTenant(null);
        setError(queryError.message);
      } else {
        setTenant((data ?? null) as TenantBillingRow | null);
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <PermissionGuard required="view_invoices">
      <section className="space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">حالة الاشتراك</h2>
            <p className="text-sm text-slate-500">بيانات الاشتراك والتجربة الحالية للعيادة فقط.</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">جاري تحميل حالة الاشتراك...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل بيانات الاشتراك: {error}</div>
        ) : !tenant ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">بيانات الاشتراك غير متاحة.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500"><CreditCard className="h-4 w-4" /> الخطة الحالية</div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{tenant.subscription_tier}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500"><Smartphone className="h-4 w-4" /> الحد الأقصى للأجهزة</div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{tenant.max_devices ?? 'غير محدد'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500"><CalendarClock className="h-4 w-4" /> بداية الاشتراك</div>
              <p className="mt-2 font-semibold text-slate-900">{formatDate(tenant.subscription_start)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 text-sm text-slate-500"><CalendarClock className="h-4 w-4" /> نهاية الاشتراك</div>
              <p className="mt-2 font-semibold text-slate-900">{formatDate(tenant.subscription_end)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-slate-500"><CalendarClock className="h-4 w-4" /> التجربة</div>
              <div className="mt-2 flex flex-wrap gap-6">
                <div>
                  <span className="text-xs text-slate-400">بدأت</span>
                  <p className="font-semibold text-slate-900">{formatDate(tenant.trial_started_at)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">المدة المعيارية</span>
                  <p className="font-semibold text-slate-900">{TRIAL_DAYS} يومًا</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">النهاية المحسوبة</span>
                  <p className="font-semibold text-slate-900">
                    {tenant.trial_started_at ? formatDate(addDays(tenant.trial_started_at, TRIAL_DAYS)) : 'غير محددة'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">هذه الشاشة للعرض فقط ولا تنفذ تفعيلًا يدويًا أو أي عملية دفع.</p>
            </div>
          </div>
        )}
      </section>
    </PermissionGuard>
  );
}
