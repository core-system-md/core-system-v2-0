import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

type AgendaRow = {
  id: string;
  doctor_id: string | null;
  room_id: string | null;
  patient_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  event_type: string;
  visit_type: string | null;
  status: string | null;
  booking_notes: string | null;
};

type NamedRow = { id: string; label: string };

export default function AdminSchedulePage() {
  const tenantId = useAuthStore((state) => state.tenant_id);
  const [events, setEvents] = useState<AgendaRow[]>([]);
  const [doctors, setDoctors] = useState<NamedRow[]>([]);
  const [rooms, setRooms] = useState<NamedRow[]>([]);
  const [patients, setPatients] = useState<NamedRow[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      setLoading(true);
      setError(null);

      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;
      const [eventResult, doctorResult, roomResult, patientResult] = await Promise.all([
        supabase
          .from('master_agenda_events')
          .select('id, doctor_id, room_id, patient_id, scheduled_start, scheduled_end, event_type, visit_type, status, booking_notes')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .gte('scheduled_start', dayStart)
          .lte('scheduled_start', dayEnd)
          .order('scheduled_start', { ascending: true }),
        supabase.from('clinic_users').select('id, full_name, full_name_ar').eq('tenant_id', tenantId).eq('role', 'doctor').eq('is_active', true).is('deleted_at', null),
        supabase.from('clinic_rooms').select('id, room_name').eq('tenant_id', tenantId).eq('is_active', true).is('deleted_at', null),
        supabase.from('clinic_patients').select('id, full_name').eq('tenant_id', tenantId).is('deleted_at', null),
      ]);

      const firstError = eventResult.error || doctorResult.error || roomResult.error || patientResult.error;
      if (firstError) {
        setError(firstError.message);
        setEvents([]);
      } else {
        setEvents((eventResult.data ?? []) as AgendaRow[]);
        setDoctors((doctorResult.data ?? []).map((row) => ({ id: row.id, label: row.full_name_ar || row.full_name })));
        setRooms((roomResult.data ?? []).map((row) => ({ id: row.id, label: row.room_name })));
        setPatients((patientResult.data ?? []).map((row) => ({ id: row.id, label: row.full_name })));
      }
      setLoading(false);
    }

    void load();
  }, [tenantId, date]);

  const doctorMap = useMemo(() => new Map(doctors.map((row) => [row.id, row.label])), [doctors]);
  const roomMap = useMemo(() => new Map(rooms.map((row) => [row.id, row.label])), [rooms]);
  const patientMap = useMemo(() => new Map(patients.map((row) => [row.id, row.label])), [patients]);

  const content = loading ? (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500" dir="rtl">جاري تحميل الجدول...</div>
  ) : error ? (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700" dir="rtl">تعذر تحميل الجدول: {error}</div>
  ) : (
    <section className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">جدول العيادة</h2>
            <p className="text-sm text-slate-500">عرض أحداث اليوم للطبيب والغرف والمرضى.</p>
          </div>
        </div>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-right text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">الوقت</th>
              <th className="px-4 py-3 font-semibold">الطبيب</th>
              <th className="px-4 py-3 font-semibold">الغرفة</th>
              <th className="px-4 py-3 font-semibold">المريض</th>
              <th className="px-4 py-3 font-semibold">النوع</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold">ملاحظات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">لا توجد أحداث مجدولة لهذا اليوم.</td></tr>
            ) : events.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                  {new Date(event.scheduled_start).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(event.scheduled_end).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3 text-slate-700">{event.doctor_id ? doctorMap.get(event.doctor_id) || '—' : '—'}</td>
                <td className="px-4 py-3 text-slate-700">{event.room_id ? roomMap.get(event.room_id) || '—' : '—'}</td>
                <td className="px-4 py-3 text-slate-900 font-medium">{event.patient_id ? patientMap.get(event.patient_id) || '—' : '—'}</td>
                <td className="px-4 py-3 text-slate-600">{event.visit_type || event.event_type || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{event.status || '—'}</td>
                <td className="px-4 py-3 text-slate-500">{event.booking_notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  return <PermissionGuard required="view_staff">{content}</PermissionGuard>;
}
