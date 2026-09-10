import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Clock3, Play, RefreshCw, User, Users, Activity, CheckCircle2 } from 'lucide-react';
import { addMinutes, formatDate, formatTime, parseDate } from '@/shared/utils/dateTime';
import { useSessionChannel } from '@/core/realtime/useSessionChannel';

interface PatientRow {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  phone_primary: string;
  created_at: string;
  session_status: string;
  waiting_time_minutes: number | null;
  queue_position: number | null;
}

type QueueFilter = 'waiting' | 'in_consultation' | 'all_active';

const STATUS_LABELS: Record<string, string> = {
  waiting: 'في الانتظار',
  in_consultation: 'الجلسة جارية',
  pending_close: 'بانتظار الإغلاق',
};

const STATUS_CLASS: Record<string, string> = {
  waiting: 'border-amber-200 bg-amber-50 text-amber-700',
  in_consultation: 'border-sky-200 bg-sky-50 text-sky-700',
  pending_close: 'border-orange-200 bg-orange-50 text-orange-700',
};

export default function DoctorTodayPatients() {
  const navigate = useNavigate();
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);
  const [sessions, setSessions] = useState<PatientRow[]>([]);
  const [filter, setFilter] = useState<QueueFilter>('waiting');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSessionRealtime = useCallback(() => setRefreshKey((key) => key + 1), []);
  useSessionChannel(tenantId ?? '', handleSessionRealtime);

  const loadSessions = useCallback(async () => {
    if (!tenantId || !user?.id || !user.role) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const today = formatDate(new Date());
    const dayStart = parseDate(today);
    const nextDayStart = addMinutes(dayStart, 24 * 60);
    let query = supabase
      .from('clinic_visit_sessions')
      .select(`id, patient_id, session_status, waiting_time_minutes, queue_position, created_at, clinic_patients!inner(id, first_name, last_name, phone_primary)`)
      .eq('tenant_id', tenantId)
      .in('session_status', ['waiting', 'in_consultation', 'pending_close'])
      .is('deleted_at', null)
      .is('clinic_patients.deleted_at', null)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', nextDayStart.toISOString())
      .order('queue_position', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (user.role === 'doctor') query = query.or(`doctor_id.eq.${user.id},primary_doctor_id.eq.${user.id}`);
    const { data, error: dbError } = await query;
    if (dbError) {
      setError(dbError.message);
      setSessions([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setSessions((data || []).map((row: any) => ({
      id: row.id,
      patient_id: row.patient_id,
      first_name: row.clinic_patients.first_name,
      last_name: row.clinic_patients.last_name,
      phone_primary: row.clinic_patients.phone_primary,
      created_at: row.created_at,
      session_status: row.session_status,
      waiting_time_minutes: row.waiting_time_minutes,
      queue_position: row.queue_position,
    })) as PatientRow[]);
    setLoading(false);
    setRefreshing(false);
  }, [tenantId, user?.id, user?.role]);

  useEffect(() => { void loadSessions(); }, [loadSessions, refreshKey]);

  const counts = useMemo(() => ({
    waiting: sessions.filter((item) => item.session_status === 'waiting').length,
    inConsultation: sessions.filter((item) => item.session_status === 'in_consultation').length,
    pendingClose: sessions.filter((item) => item.session_status === 'pending_close').length,
  }), [sessions]);

  const filteredSessions = useMemo(() => {
    if (filter === 'waiting') return sessions.filter((item) => item.session_status === 'waiting');
    if (filter === 'in_consultation') return sessions.filter((item) => item.session_status === 'in_consultation');
    return sessions;
  }, [filter, sessions]);

  const refreshSessions = () => { setRefreshing(true); setRefreshKey((key) => key + 1); };

  const startSession = async (sessionId: string) => {
    if (!user?.id || !user.role || !tenantId) return;
    setStartingId(sessionId);
    setError(null);
    const { error: rpcError } = await supabase.rpc('update_session_status', {
      p_session_id: sessionId,
      p_new_status: 'in_consultation',
      p_user_id: user.id,
      p_user_role: user.role,
    });
    if (rpcError) {
      setError(`تعذر بدء الجلسة: ${rpcError.message}`);
      setStartingId(null);
      return;
    }
    setStartingId(null);
    navigate(`/doctor/session/${sessionId}`);
  };

  const filterButton = (value: QueueFilter, label: string, count: number) => (
    <button type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${filter === value ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
      {label}<span className={`rounded-full px-2 py-0.5 text-xs ${filter === value ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </button>
  );

  if (loading) return <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" dir="rtl"><div className="h-32 animate-pulse rounded-2xl bg-slate-200" /><div className="h-24 animate-pulse rounded-2xl bg-slate-200" /><div className="h-24 animate-pulse rounded-xl bg-slate-200" /></div>;

  return (
    <PermissionGuard required="view_sessions">
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6" dir="rtl">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-l from-slate-50 to-white p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>CORE SYSTEM</span><span className="h-1 w-1 rounded-full bg-emerald-500" /><span>محطة الطبيب</span></div><h2 className="text-2xl font-bold text-[#1B2A4A]">قائمة عمل الطبيب</h2><p className="mt-1 text-sm text-slate-500">إدارة المرضى المخصصين للطبيب وفتح الجلسة السريرية من نفس شاشة العمل.</p></div>
              <Button type="button" variant="outline" onClick={refreshSessions} disabled={refreshing}><RefreshCw className={`ml-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />تحديث القائمة</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="flex items-center gap-3 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Users className="h-5 w-5" /></div><div><p className="text-xs text-slate-400">في الانتظار</p><p className="text-xl font-bold text-slate-800">{counts.waiting}</p></div></div>
            <div className="flex items-center gap-3 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Activity className="h-5 w-5" /></div><div><p className="text-xs text-slate-400">جلسات جارية</p><p className="text-xl font-bold text-slate-800">{counts.inConsultation}</p></div></div>
            <div className="flex items-center gap-3 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-xs text-slate-400">بانتظار الإغلاق</p><p className="text-xl font-bold text-slate-800">{counts.pendingClose}</p></div></div>
          </div>
        </section>

        {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center gap-3 p-4 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" /><span>{error}</span></CardContent></Card>}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h3 className="font-bold text-slate-900">المتابعة السريرية</h3><p className="mt-1 text-xs text-slate-500">عرض المرضى والجلسات والـQueue، مع بدء الجلسة وتحرير محتواها عبر الصلاحيات المخصصة.</p></div><div className="flex flex-wrap gap-2">{filterButton('waiting', 'الانتظار', counts.waiting)}{filterButton('in_consultation', 'الجارية', counts.inConsultation)}{filterButton('all_active', 'كل الحالات النشطة', sessions.length)}</div></div></section>

        {filteredSessions.length === 0 ? <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="p-10 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"><User className="h-8 w-8 text-slate-400" /></div><h3 className="text-xl font-bold text-slate-800">لا توجد حالات في هذا القسم</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">عند تخصيص مريض للطبيب أو بدء جلسة، ستظهر الحالة هنا تلقائيًا عبر قائمة العمل.</p></CardContent></Card> : <div className="space-y-3">{filteredSessions.map((session) => <Card key={session.id} className="border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"><CardContent className="p-4 md:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1B2A4A] text-lg font-bold text-white">{session.first_name.charAt(0)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{session.queue_position !== null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">دور #{session.queue_position}</span>}<h3 className="truncate text-lg font-bold text-slate-900">{session.first_name} {session.last_name}</h3><span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[session.session_status] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>{STATUS_LABELS[session.session_status] ?? session.session_status}</span></div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-500"><span>{session.phone_primary}</span><span>{formatDate(session.created_at)}</span><span>{formatTime(session.created_at)}</span>{session.waiting_time_minutes !== null && <span className="flex items-center gap-1 font-semibold text-amber-700"><Clock3 className="h-3.5 w-3.5" />{session.waiting_time_minutes} دقيقة انتظار</span>}</div></div></div><div className="flex flex-col gap-2 sm:flex-row lg:justify-end">{session.session_status === 'waiting' ? <PermissionGuard required="edit_sessions"><Button type="button" onClick={() => void startSession(session.id)} disabled={startingId === session.id} className="bg-[#1B2A4A] hover:bg-[#223A63]"><Play className="ml-2 h-4 w-4" />{startingId === session.id ? 'جاري بدء الجلسة...' : 'بدء الجلسة'}</Button></PermissionGuard> : <Button type="button" onClick={() => navigate(`/doctor/session/${session.id}`)} className="bg-[#1B2A4A] hover:bg-[#223A63]">فتح الجلسة<ArrowLeft className="mr-2 h-4 w-4" /></Button>}</div></div></CardContent></Card>)}</div>}
      </div>
    </PermissionGuard>
  );
}
