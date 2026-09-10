import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, Clock3, AlertCircle, ArrowLeft, Users, RefreshCw } from 'lucide-react';
import { addMinutes, formatDate, formatTime, parseDate } from '@/shared/utils/dateTime';
import { useSessionChannel } from '@/core/realtime/useSessionChannel';

interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  phone_primary: string;
  created_at: string;
  session_status?: string;
  waiting_time_minutes?: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  waiting: 'في الانتظار',
  in_consultation: 'جارية',
  pending_close: 'بانتظار الإغلاق',
  completed: 'مكتملة',
};

export default function DoctorTodayPatients() {
  const navigate = useNavigate();
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSessionRealtime = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useSessionChannel(tenantId ?? '', handleSessionRealtime);

  useEffect(() => {
    let cancelled = false;

    async function fetchPatients() {
      if (!tenantId || !user?.id || !user.role) {
        if (!cancelled) setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const today = formatDate(new Date());
      const dayStart = parseDate(today);
      const nextDayStart = addMinutes(dayStart, 24 * 60);

      let query = supabase
        .from('clinic_visit_sessions')
        .select(`
          id,
          session_status,
          waiting_time_minutes,
          created_at,
          clinic_patients!inner(
            id,
            first_name,
            last_name,
            phone_primary
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('session_status', 'waiting')
        .is('deleted_at', null)
        .is('clinic_patients.deleted_at', null)
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', nextDayStart.toISOString())
        .order('created_at', { ascending: true });

      if (user.role === 'doctor') {
        query = query.eq('doctor_id', user.id);
      }

      const { data, error: dbError } = await query;

      if (cancelled) return;

      if (dbError) {
        setError(dbError.message);
        setLoading(false);
        return;
      }

      const formatted = (data || []).map((row: any) => ({
        id: row.id,
        patient_id: row.clinic_patients.id,
        first_name: row.clinic_patients.first_name,
        last_name: row.clinic_patients.last_name,
        phone_primary: row.clinic_patients.phone_primary,
        created_at: row.created_at,
        session_status: row.session_status,
        waiting_time_minutes: row.waiting_time_minutes,
      }));

      setPatients(formatted);
      setLoading(false);
      setRefreshing(false);
    }

    void fetchPatients();
    return () => {
      cancelled = true;
    };
  }, [tenantId, user?.id, user?.role, refreshKey]);

  const refreshPatients = () => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6" dir="rtl">
        <div className="h-28 w-full animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-6" dir="rtl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-wrap items-center gap-3 p-5">
            <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">تعذر تحميل قائمة مرضى اليوم</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
            <Button type="button" variant="outline" onClick={refreshPatients} disabled={refreshing}>
              <RefreshCw className={`ml-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PermissionGuard required="view_sessions">
      <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6" dir="rtl">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-400">
                <span>CORE SYSTEM</span>
                <span className="h-1 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
                <span>قائمة العمل الحالية</span>
              </div>
              <h2 className="text-2xl font-bold text-[#1B2A4A]">مرضى اليوم</h2>
              <p className="mt-1 text-sm text-slate-500">
                قائمة المرضى الموجودين حاليًا في الانتظار والمخصصين لهذه العيادة.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
              <Users className="h-5 w-5 text-[#1B2A4A]" aria-hidden="true" />
              <div>
                <p className="text-xs text-slate-400">عدد المنتظرين</p>
                <p className="text-xl font-bold text-slate-800">{patients.length}</p>
              </div>
            </div>
          </div>
        </section>

        {patients.length === 0 ? (
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <User className="h-8 w-8 text-slate-400" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">لا يوجد مرضى في الانتظار</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                لا توجد جلسات بحالة انتظار ضمن قائمة اليوم حاليًا.
              </p>
              <Button type="button" variant="outline" onClick={refreshPatients} disabled={refreshing} className="mt-5">
                <RefreshCw className={`ml-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث القائمة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {patients.map((patient, index) => (
              <Card
                key={patient.id}
                className="border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1B2A4A] text-lg font-bold text-white shadow-sm">
                        {patient.first_name.charAt(0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">#{index + 1}</span>
                          <h3 className="truncate text-lg font-bold text-slate-900">
                            {patient.first_name} {patient.last_name}
                          </h3>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            {STATUS_LABELS[patient.session_status ?? 'waiting'] ?? patient.session_status ?? 'في الانتظار'}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDate(patient.created_at)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatTime(patient.created_at)}
                          </span>
                          {patient.waiting_time_minutes !== null && patient.waiting_time_minutes !== undefined && (
                            <span className="font-semibold text-amber-700">انتظار: {patient.waiting_time_minutes} د</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button type="button" onClick={() => navigate(`/doctor/session/${patient.id}`)} className="shrink-0 bg-[#1B2A4A] hover:bg-[#223A63]">
                      فتح الجلسة
                      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
