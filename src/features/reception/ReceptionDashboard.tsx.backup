import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuth } from '@/core/auth/AuthProvider';
import { 
  Users, Plus, Calendar, Clock, Stethoscope, 
  Search, UserPlus, ClipboardList, ArrowRight 
} from 'lucide-react';
import SlaTimer from '@/shared/components/ui/SlaTimer';
import CoreScoreMeter from '@/shared/components/ui/CoreScoreMeter';

interface Patient {
  id: string;
  full_name: string;
  phone_primary: string | null;
  patient_status: string | null;
}

interface SessionInfo {
  id: string;
  patient_id: string;
  session_status: string;
  created_at: string;
  core_score_backend: number | null;
  patient_class: string | null;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string | null;
}

interface AgendaEvent {
  id: string;
  patient_id: string | null;
  doctor_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: string | null;
}

export default function ReceptionDashboard() {
  const navigate = useNavigate();
  const { fullName } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'booking' | 'patients'>('queue');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);

  // Quick Booking form state
  const [bookingForm, setBookingForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
    doctorId: '',
    scheduledDate: '',
    scheduledTime: '',
    inquiryReason: '',
    isNewPatient: true
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  const tenant_id = localStorage.getItem('tenant_id');

  useEffect(() => {
    if (tenant_id) {
      fetchData();
    }
  }, [tenant_id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch active sessions (waiting + in_consultation)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('clinic_visit_sessions')
        .select('id, patient_id, session_status, created_at, core_score_backend, patient_class')
        .eq('tenant_id', tenant_id!)
        .not('session_status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: true });

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);

      // Fetch patients for these sessions
      if (sessionsData && sessionsData.length > 0) {
        const patientIds = sessionsData.map((s: SessionInfo) => s.patient_id);
        const { data: patientsData, error: patientsError } = await supabase
          .from('clinic_patients')
          .select('id, full_name, phone_primary, patient_status')
          .eq('tenant_id', tenant_id!)
          .in('id', patientIds);

        if (patientsError) throw patientsError;
        setPatients(patientsData || []);
      } else {
        setPatients([]);
      }

      // Fetch doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('clinic_users')
        .select('id, full_name, specialization')
        .eq('tenant_id', tenant_id!)
        .eq('role', 'doctor')
        .eq('is_active', true);

      if (doctorsError) throw doctorsError;
      setDoctors(doctorsData || []);

      // Fetch today's agenda
      const today = new Date().toISOString().split('T')[0];
      const { data: agendaData, error: agendaError } = await supabase
        .from('master_agenda_events')
        .select('id, patient_id, doctor_id, scheduled_start, scheduled_end, status')
        .eq('tenant_id', tenant_id!)
        .gte('scheduled_start', `${today}T00:00:00`)
        .lt('scheduled_start', `${today}T23:59:59`)
        .not('status', 'in', '("cancelled","no_show")')
        .order('scheduled_start', { ascending: true });

      if (agendaError) throw agendaError;
      setAgendaEvents(agendaData || []);

    } catch (err: unknown) {
      console.error('Reception dashboard error:', err);
      toast.error(err instanceof Error ? err.message : 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const searchPatient = async () => {
    if (!searchPhone || searchPhone.length < 7) {
      toast.error('أدخل رقم هاتف صحيح');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('clinic_patients')
        .select('id, full_name, phone_primary, patient_status')
        .eq('tenant_id', tenant_id!)
        .ilike('phone_primary', `%${searchPhone}%`)
        .is('deleted_at', null)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFoundPatient(data);
        setBookingForm(prev => ({
          ...prev,
          firstName: data.full_name.split(' ')[0] || '',
          lastName: data.full_name.split(' ').slice(1).join(' ') || '',
          phone: data.phone_primary || '',
          isNewPatient: false
        }));
        toast.success('المريض موجود — سيتم إضافة زيارة جديدة');
      } else {
        setFoundPatient(null);
        setBookingForm(prev => ({ ...prev, phone: searchPhone, isNewPatient: true }));
        toast.info('مريض جديد — املأ البيانات');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'فشل في البحث');
    }
  };

  const handleQuickBooking = async () => {
    if (!bookingForm.firstName || !bookingForm.phone || !bookingForm.doctorId || !bookingForm.scheduledDate || !bookingForm.scheduledTime) {
      toast.error('املأ جميع الحقول المطلوبة');
      return;
    }

    setBookingLoading(true);
    try {
      let patientId = foundPatient?.id;

      // Step 1: Create patient if new
      if (!patientId) {
        const { data: newPatient, error: patientError } = await supabase
          .from('clinic_patients')
          .insert({
            tenant_id: tenant_id!,
            mrn: `MRN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,
            first_name: bookingForm.firstName,
            last_name: bookingForm.lastName,
            full_name: `${bookingForm.firstName} ${bookingForm.lastName}`.trim(),
            phone_primary: bookingForm.phone,
            gender: bookingForm.gender,
            patient_status: 'active',
            preferred_channel: 'whatsapp'
          })
          .select('id')
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;

        // Create longitudinal profile
        await supabase.from('patient_longitudinal_profiles').insert({
          tenant_id: tenant_id!,
          patient_id: patientId,
          loyalty_tier: 'standard'
        });
      }

      // Step 2: Create agenda event
      const scheduledStart = `${bookingForm.scheduledDate}T${bookingForm.scheduledTime}:00`;
      const scheduledEnd = new Date(new Date(scheduledStart).getTime() + 30 * 60000).toISOString();

      const { data: agendaEvent, error: agendaError } = await supabase
        .from('master_agenda_events')
        .insert({
          tenant_id: tenant_id!,
          patient_id: patientId,
          doctor_id: bookingForm.doctorId,
          scheduled_start: scheduledStart,
          scheduled_end: scheduledEnd,
          buffer_end: scheduledEnd,
          event_type: 'appointment',
          visit_type: foundPatient ? 'follow_up' : 'first_time',
          status: 'scheduled',
          booking_notes: bookingForm.inquiryReason
        })
        .select('id')
        .single();

      if (agendaError) throw agendaError;

      // Step 3: Create visit session (opens the "gate" for doctor)
      const { data: userData } = await supabase.auth.getUser();
      const { error: sessionError } = await supabase
        .from('clinic_visit_sessions')
        .insert({
          tenant_id: tenant_id!,
          patient_id: patientId,
          doctor_id: bookingForm.doctorId,
          agenda_event_id: agendaEvent.id,
          session_status: 'waiting',
          initialized_by_receptionist: userData.user?.id ?? null,
          is_insured: false
        });

      if (sessionError) throw sessionError;

      toast.success('تم حجز الموعد بنجاح! سيظهر في قائمة الطبيب');

      // Reset form
      setBookingForm({
        firstName: '',
        lastName: '',
        phone: '',
        gender: 'male',
        doctorId: '',
        scheduledDate: '',
        scheduledTime: '',
        inquiryReason: '',
        isNewPatient: true
      });
      setFoundPatient(null);
      setSearchPhone('');

      // Refresh data
      fetchData();
      setActiveTab('queue');

    } catch (err: unknown) {
      console.error('Booking error:', err);
      toast.error(err instanceof Error ? err.message : 'فشل في الحجز');
    } finally {
      setBookingLoading(false);
    }
  };

  const getPatientName = (patientId: string | null) => {
    if (!patientId) return 'مريض غير معروف';
    const p = patients.find(p => p.id === patientId);
    return p?.full_name || 'مريض غير معروف';
  };

  const getDoctorName = (doctorId: string | null) => {
    const d = doctors.find(d => d.id === doctorId);
    return d?.full_name || 'طبيب غير معروف';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="h-8 bg-white/10 rounded w-1/3 animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/10 rounded animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة الاستقبال</h1>
          <p className="text-white/50 text-sm mt-1">مرحباً، {fullName || 'موظف الاستقبال'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'queue' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            <ClipboardList className="w-4 h-4 inline-block ml-2" /> قائمة الانتظار
          </button>
          <button onClick={() => setActiveTab('booking')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'booking' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            <UserPlus className="w-4 h-4 inline-block ml-2" /> حجز سريع
          </button>
          <button onClick={() => setActiveTab('patients')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'patients' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            <Users className="w-4 h-4 inline-block ml-2" /> المواعيد
          </button>
        </div>
      </div>

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">المرضى في الانتظار</h2>
            <span className="text-white/50 text-sm">{sessions.length} مريض</span>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 text-white/50 bg-white/5 rounded-xl border border-white/10">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">لا يوجد مرضى في الانتظار</p>
              <button onClick={() => setActiveTab('booking')} className="mt-4 text-blue-400 hover:underline text-sm">
                إضافة مريض جديد →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => (
                <div key={session.id} 
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white/60" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{getPatientName(session.patient_id)}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            session.session_status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                            session.session_status === 'in_consultation' ? 'bg-green-500/20 text-green-400' :
                            'bg-white/10 text-white/50'
                          }`}>
                            {session.session_status === 'waiting' ? 'في الانتظار' :
                             session.session_status === 'in_consultation' ? 'جارية' : session.session_status}
                          </span>
                          <SlaTimer createdAt={session.created_at} size="sm" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CoreScoreMeter backendScore={session.core_score_backend} size="sm" />
                      <button onClick={() => navigate(`/doctor/session/${session.id}`)}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <ArrowRight className="w-4 h-4 text-white/60" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Booking Tab */}
      {activeTab === 'booking' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" /> حجز موعد سريع
          </h2>

          {/* Search existing patient */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <label className="block text-white/70 text-sm mb-2">البحث عن مريض موجود (رقم الهاتف)</label>
            <div className="flex gap-2">
              <input type="tel" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                placeholder="07xxxxxxxx" />
              <button onClick={searchPatient}
                className="px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
            {foundPatient && (
              <p className="mt-2 text-green-400 text-sm">✓ مريض موجود: {foundPatient.full_name}</p>
            )}
          </div>

          {/* Patient Info */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">الاسم الأول *</label>
              <input type="text" value={bookingForm.firstName}
                onChange={(e) => setBookingForm(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">اسم العائلة</label>
              <input type="text" value={bookingForm.lastName}
                onChange={(e) => setBookingForm(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">رقم الهاتف *</label>
              <input type="tel" value={bookingForm.phone}
                onChange={(e) => setBookingForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                placeholder="07xxxxxxxx" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">الجنس</label>
              <select value={bookingForm.gender}
                onChange={(e) => setBookingForm(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30">
                <option value="male" className="bg-[#1B2A4A]">ذكر</option>
                <option value="female" className="bg-[#1B2A4A]">أنثى</option>
              </select>
            </div>
          </div>

          {/* Doctor + Schedule */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">الطبيب *</label>
              <select value={bookingForm.doctorId}
                onChange={(e) => setBookingForm(prev => ({ ...prev, doctorId: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30">
                <option value="" className="bg-[#1B2A4A]">اختر طبيباً</option>
                {doctors.map(doc => (
                  <option key={doc.id} value={doc.id} className="bg-[#1B2A4A]">
                    {doc.full_name} {doc.specialization ? `(${doc.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">تاريخ الموعد *</label>
              <input type="date" value={bookingForm.scheduledDate}
                onChange={(e) => setBookingForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">وقت الموعد *</label>
              <input type="time" value={bookingForm.scheduledTime}
                onChange={(e) => setBookingForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">سبب الزيارة</label>
              <input type="text" value={bookingForm.inquiryReason}
                onChange={(e) => setBookingForm(prev => ({ ...prev, inquiryReason: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                placeholder="مثال: استشارة أسنان" />
            </div>
          </div>

          <button onClick={handleQuickBooking} disabled={bookingLoading}
            className="w-full bg-green-500/20 hover:bg-green-500/30 disabled:bg-white/5 text-green-400 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4">
            <Calendar className="w-4 h-4" />
            {bookingLoading ? 'جاري الحجز...' : 'تأكيد الحجز'}
          </button>
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'patients' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">مواعيد اليوم</h2>
          {agendaEvents.length === 0 ? (
            <div className="text-center py-12 text-white/50 bg-white/5 rounded-xl border border-white/10">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>لا توجد مواعيد لهذا اليوم</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agendaEvents.map(event => (
                <div key={event.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">
                          {new Date(event.scheduled_start).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-white/50 text-sm">{getPatientName(event.patient_id)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-white/30" />
                      <span className="text-white/50 text-sm">{getDoctorName(event.doctor_id)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        event.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                        event.status === 'arrived' ? 'bg-yellow-500/20 text-yellow-400' :
                        event.status === 'in_session' ? 'bg-green-500/20 text-green-400' :
                        'bg-white/10 text-white/50'
                      }`}>
                        {event.status === 'scheduled' ? 'مجدول' :
                         event.status === 'arrived' ? 'وصل' :
                         event.status === 'in_session' ? 'جارية' : event.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}