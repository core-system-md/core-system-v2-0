import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { subunitsToDisplay } from '@/shared/utils/currency';

type PatientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  phone_primary: string | null;
  patient_status: string | null;
  core_score_display: number | null;
  created_at: string;
};

type ProfileRow = {
  patient_id: string;
  total_visits: number | null;
  total_completed_visits: number | null;
  total_revenue_subunits: number | null;
  loyalty_tier: string | null;
  last_visit_date: string | null;
};

export default function AdminPatientsPage() {
  const tenantId = useAuthStore((state) => state.tenant_id);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      setLoading(true);
      setError(null);

      const [{ data: patientData, error: patientError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase
          .from('clinic_patients')
          .select('id, first_name, last_name, first_name_ar, last_name_ar, phone_primary, patient_status, core_score_display, created_at')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('patient_longitudinal_profiles')
          .select('patient_id, total_visits, total_completed_visits, total_revenue_subunits, loyalty_tier, last_visit_date')
          .eq('tenant_id', tenantId),
      ]);

      if (patientError || profileError) {
        setError(patientError?.message || profileError?.message || 'تعذر تحميل دليل المرضى');
        setPatients([]);
        setProfiles([]);
        setLoading(false);
        return;
      }

      setPatients((patientData ?? []) as PatientRow[]);
      setProfiles((profileData ?? []) as ProfileRow[]);
      setLoading(false);
    }

    void load();
  }, [tenantId]);

  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.patient_id, profile])), [profiles]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return patients;

    return patients.filter((patient) => {
      const name = [patient.first_name_ar, patient.last_name_ar, patient.first_name, patient.last_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return name.includes(needle) || (patient.phone_primary ?? '').includes(needle);
    });
  }, [patients, search]);

  const content = loading ? (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500" dir="rtl">جاري تحميل دليل المرضى...</div>
  ) : error ? (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" dir="rtl">تعذر تحميل دليل المرضى: {error}</div>
  ) : (
    <section className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">دليل المرضى</h2>
            <p className="text-sm text-slate-500">عرض المرضى ومؤشرات الزيارات والقيمة التراكمية داخل العيادة.</p>
          </div>
        </div>
        <span className="text-sm text-slate-500">{filtered.length} من {patients.length}</span>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالاسم أو رقم الهاتف"
          className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm outline-none focus:border-primary"
          aria-label="البحث في دليل المرضى"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-right text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">المريض</th>
              <th className="px-4 py-3 font-semibold">الهاتف</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold">الزيارات</th>
              <th className="px-4 py-3 font-semibold">المكتملة</th>
              <th className="px-4 py-3 font-semibold">LTV</th>
              <th className="px-4 py-3 font-semibold">CORE</th>
              <th className="px-4 py-3 font-semibold">آخر زيارة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">لا توجد نتائج مطابقة.</td></tr>
            ) : filtered.map((patient) => {
              const profile = profileMap.get(patient.id);
              const displayName = [patient.first_name_ar, patient.last_name_ar].filter(Boolean).join(' ') || [patient.first_name, patient.last_name].filter(Boolean).join(' ') || '—';
              return (
                <tr key={patient.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{displayName}</td>
                  <td className="px-4 py-3 text-slate-600">{patient.phone_primary || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{patient.patient_status || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{profile?.total_visits ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">{profile?.total_completed_visits ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">{subunitsToDisplay(profile?.total_revenue_subunits ?? 0)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{patient.core_score_display ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{profile?.last_visit_date || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  return <PermissionGuard required="view_patients">{content}</PermissionGuard>;
}