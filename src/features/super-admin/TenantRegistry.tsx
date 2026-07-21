// ============================================================
// CORE SYSTEM v2.1 — TenantRegistry
// FIXED: 2026-07-21 — Replaced Placeholder with REAL component (P22 Phase 2B)
// Constitution §3: Features fetch their own data. NO props drilling.
// ============================================================

import { useState, useEffect } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { Building2, Calendar, Users, Smartphone, Shield } from 'lucide-react';

interface Tenant {
  id: string;
  clinic_name: string | null;
  clinic_name_ar: string | null;
  license_key: string | null;
  subscription_tier: string;
  is_active: boolean;
  subscription_end: string | null;
  max_devices: number | null;
  max_users: number;
  max_patients: number;
  created_at: string;
}

const TIER_COLORS: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-800 border-gray-300',
  essential: 'bg-blue-100 text-blue-800 border-blue-300',
  professional: 'bg-purple-100 text-purple-800 border-purple-300',
  enterprise: 'bg-amber-100 text-amber-800 border-amber-300',
  suspended: 'bg-red-100 text-red-800 border-red-300',
};

const TIER_LABELS: Record<string, string> = {
  trial: 'تجريبي',
  essential: 'أساسي',
  professional: 'احترافي',
  enterprise: 'مؤسسي',
  suspended: 'موقوف',
};

export default function TenantRegistry() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('master_tenants')
        .select(
          'id, clinic_name, clinic_name_ar, license_key, subscription_tier, is_active, subscription_end, max_devices, max_users, max_patients, created_at'
        )
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (dbError) {
        setError(dbError.message);
        setLoading(false);
        return;
      }

      setTenants((data || []) as Tenant[]);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'فشل في تحميل البيانات');
      setLoading(false);
    }
  }

  // ── Loading State ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4" dir="rtl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ───────────────────────────────────────────
  if (error) {
    return (
      <div className="p-4" dir="rtl">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-bold text-red-900">خطأ في تحميل البيانات</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchTenants}
            className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  // ── Empty State ───────────────────────────────────────────
  if (tenants.length === 0) {
    return (
      <div className="p-4" dir="rtl">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">لا توجد عيادات مسجلة</h3>
          <p className="text-gray-500 text-sm mt-2">لم يتم العثور على أي عيادات في النظام</p>
        </div>
      </div>
    );
  }

  // ── Success State — Table ─────────────────────────────────
  return (
    <div className="p-4" dir="rtl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1B2A4A]" />
            <h2 className="text-lg font-semibold text-[#1B2A4A]">سجل العيادات</h2>
          </div>
          <span className="text-sm text-gray-500">{tenants.length} عيادة</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-3 px-4 font-medium text-gray-600">العيادة</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">الخطة</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">الحالة</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">الترخيص</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">الأجهزة</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">المستخدمون</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">المرضى</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  {/* Clinic Name */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">
                          {tenant.clinic_name_ar || tenant.clinic_name || '—'}
                        </span>
                        {tenant.clinic_name_ar && tenant.clinic_name && (
                          <p className="text-xs text-gray-400">{tenant.clinic_name}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Subscription Tier */}
                  <td className="text-center py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        TIER_COLORS[tenant.subscription_tier] || TIER_COLORS.trial
                      }`}
                    >
                      {TIER_LABELS[tenant.subscription_tier] || tenant.subscription_tier}
                    </span>
                  </td>

                  {/* Active Status */}
                  <td className="text-center py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        tenant.is_active
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      {tenant.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>

                  {/* License Key */}
                  <td className="text-center py-3 px-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {tenant.license_key
                        ? tenant.license_key.length > 12
                          ? tenant.license_key.slice(0, 12) + '...'
                          : tenant.license_key
                        : '—'}
                    </code>
                  </td>

                  {/* Max Devices */}
                  <td className="text-center py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <Smartphone className="w-3 h-3 text-gray-400" />
                      <span>{tenant.max_devices ?? '—'}</span>
                    </div>
                  </td>

                  {/* Max Users */}
                  <td className="text-center py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span>{tenant.max_users}</span>
                    </div>
                  </td>

                  {/* Max Patients */}
                  <td className="text-center py-3 px-4">
                    <span>{tenant.max_patients}</span>
                  </td>

                  {/* Created At */}
                  <td className="text-center py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date(tenant.created_at).toLocaleDateString('ar-JO')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
