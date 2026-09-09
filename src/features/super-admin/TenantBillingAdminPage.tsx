import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, RefreshCw } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import type { SubscriptionTier } from '@/shared/types/billing';

const TIERS: SubscriptionTier[] = ['trial', 'essential', 'professional', 'enterprise', 'suspended'];

const TIER_LABELS: Record<SubscriptionTier, string> = {
  trial: 'تجريبي',
  essential: 'أساسي',
  professional: 'احترافي',
  enterprise: 'مؤسسي',
  suspended: 'موقوف',
};

type TenantRow = {
  id: string;
  clinic_name: string | null;
  clinic_name_ar: string | null;
  name: string | null;
  subscription_tier: SubscriptionTier;
  is_active: boolean;
  trial_started_at: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('ar-JO') : '—';
}

export default function TenantBillingAdminPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('master_tenants')
      .select('id, clinic_name, clinic_name_ar, name, subscription_tier, is_active, trial_started_at, subscription_start, subscription_end')
      .is('deleted_at', null)
      .order('clinic_name');

    if (queryError) {
      setTenants([]);
      setError(queryError.message);
    } else {
      setTenants((data ?? []) as TenantRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const updateTier = async (tenantId: string, newTier: SubscriptionTier) => {
    setSavingId(tenantId);
    setError(null);
    const { error: updateError } = await supabase
      .from('master_tenants')
      .update({ subscription_tier: newTier })
      .eq('id', tenantId)
      .is('deleted_at', null);

    if (updateError) {
      setError(updateError.message);
    } else {
      setTenants((current) => current.map((tenant) => tenant.id === tenantId ? { ...tenant, subscription_tier: newTier } : tenant));
    }
    setSavingId(null);
  };

  const activateTenant = async (tenantId: string) => {
    setSavingId(tenantId);
    setError(null);
    const { error: updateError } = await supabase
      .from('master_tenants')
      .update({ is_active: true })
      .eq('id', tenantId)
      .is('deleted_at', null);

    if (updateError) {
      setError(updateError.message);
    } else {
      setTenants((current) => current.map((tenant) => tenant.id === tenantId ? { ...tenant, is_active: true } : tenant));
    }
    setSavingId(null);
  };

  return (
    <PermissionGuard required="super_admin_access">
      <section className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-slate-900">إدارة اشتراكات العيادات</h2>
              <p className="text-sm text-slate-500">تحديث الخطة وتفعيل العيادة وفق عقد الإدارة الحالي.</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">جاري تحميل العيادات...</div>
          ) : tenants.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">لا توجد عيادات فعالة.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-right text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">العيادة</th>
                  <th className="px-4 py-3 font-semibold">الخطة</th>
                  <th className="px-4 py-3 font-semibold">الحالة</th>
                  <th className="px-4 py-3 font-semibold">بداية التجربة</th>
                  <th className="px-4 py-3 font-semibold">بداية الاشتراك</th>
                  <th className="px-4 py-3 font-semibold">نهاية الاشتراك</th>
                  <th className="px-4 py-3 font-semibold">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((tenant) => {
                  const saving = savingId === tenant.id;
                  return (
                    <tr key={tenant.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{tenant.clinic_name_ar || tenant.clinic_name || tenant.name || tenant.id}</td>
                      <td className="px-4 py-3">
                        <select
                          value={tenant.subscription_tier}
                          onChange={(event) => void updateTier(tenant.id, event.target.value as SubscriptionTier)}
                          disabled={saving}
                          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                        >
                          {TIERS.map((tier) => <option key={tier} value={tier}>{TIER_LABELS[tier]}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {tenant.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 className="h-4 w-4" /> مفعّلة</span>
                        ) : (
                          <span className="text-amber-700">غير مفعّلة</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(tenant.trial_started_at)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(tenant.subscription_start)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(tenant.subscription_end)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void activateTenant(tenant.id)}
                          disabled={tenant.is_active || saving}
                          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {saving ? 'جاري الحفظ...' : 'تفعيل العيادة'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-500">التعديلات تقتصر على الحقول المعرفة بعقد إدارة العيادات الحالي: `subscription_tier` و`is_active`.</p>
      </section>
    </PermissionGuard>
  );
}
