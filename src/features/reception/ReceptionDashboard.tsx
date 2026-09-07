import { useAuthStore } from "@/shared/store/authStore";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuth } from '@/core/auth/AuthProvider';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { PIN_SESSION_STORAGE_KEY } from '@/core/auth/PinAuthProvider';
import {
  Users, Plus, Calendar, Clock, Stethoscope,
  Search, UserPlus, ClipboardList
} from 'lucide-react';
import { LiveQueueBoard } from '@/components/LiveQueueBoard';

interface Patient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_primary: string | null;
  patient_status: string | null;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string | null;
}

interface AgendaEvent {
  id: string;
  patient_id: string | null;
  patient_name: string;
  doctor_id: string | null;
  doctor_name: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string | null;
}

type ReceptionRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export default function ReceptionDashboard() {
  const navigate = useNavigate();
  const { fullName } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'booking' | 'patients'>('queue');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);

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

  const tenant_id = useAuthStore((s) => s.tenant_id);

  const getReceptionRpcClient = () => supabase as unknown as ReceptionRpcClient;

  const getSessionToken = () => {
    const token = sessionStorage.getItem(PIN_SESSION_STORAGE_KEY);
    if (!token) throw new Error('MISSING_PIN_SESSION');
    return token;
  };

  const fetchData = async (showLoader = true) => {
    if (!tenant_id) return;
    if (showLoader) setLoading(true);

    try {
      const sessionToken = getSessionToken();
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await getReceptionRpcClient().rpc('get_reception_dashboard_for_pin_session', {
        p_tenant_id: tenant_id,
        p_session_token: sessionToken,
        p_date: today,
      });

      if (error) throw new Error(error.message);

      const result = (data ?? {}) as {
        doctors?: Doctor[];
        agenda?: AgendaEvent[];
      };

      setDoctors(Array.isArray(result.doctors) ? result.doctors : []);
      setAgendaEvents(Array.isArray(result.agenda) ? result.agenda : []);
    } catch (err: unknown) {
      console.error('Reception dashboard error:', err);
      toast.error(err instanceof Error ? err.message : 'فشل في تحميل بيانات الاستقبال');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (!tenant_id) return;

    void fetchData();
    const refreshTimer = window.setInterval(() => {
      void fetchData(false);
    }, 30000);

    return () => window.clearInterval(refreshTimer);
  }, [tenant_id]);

  const searchPatient = async () => {
    if (!searchPhone || searchPhone.length < 7) {
      toast.error('أدخل رقم هاتف صحيح');
      return;
    }

    try {
      const sessionToken = getSessionToken();
      const { data, error } = await getReceptionRpcClient().rpc('search_reception_patient_for_pin_session', {
        p_tenant_id: tenant_id,
        p_session_token: sessionToken,
        p_phone: searchPhone,
      });

      if (error) throw new Error(error.message);

      const patient = (data ?? null) as Patient | null;
      if (patient) {
        setFoundPatient(patient);
        setBookingForm(prev => ({
          ...prev,
          firstName: patient.first_name || '',
          lastName: patient.last_name || '',
          phone: patient.phone_primary || '',
          isNewPatient: false
        }));
        toast.success('المريض موجود — سيتم إضافة زيارة جديدة');
      } else {
        setFoundPatient(null);
        setBookingForm(prev => ({ ...prev, phone: searchPhone, isNewPatient: true }));
        toast.info('مريض جديد — املأ البيانات');
      }
    } catch (err: unknown) {
      console.error('Patient search error:', err);
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
      const sessionToken = getSessionToken();
      const scheduledStart = new Date(`${bookingForm.scheduledDate}T${bookingForm.scheduledTime}:00`).toISOString();

      const { data, error } = await getReceptionRpcClient().rpc('create_reception_quick_booking_for_pin_session', {
        p_tenant_id: tenant_id,
        p_session_token: sessionToken,
        p_first_name: bookingForm.firstName,
        p_last_name: bookingForm.lastName,
        p_phone: bookingForm.phone,
        p_gender: bookingForm.gender,
        p_doctor_id: bookingForm.doctorId,
        p_scheduled_start: scheduledStart,
        p_inquiry_reason: bookingForm.inquiryReason || null,
        p_existing_patient_id: foundPatient?.id ?? null,
      });

      if (error) throw new Error(error.message);

      const result = (data ?? {}) as { success?: boolean };
      if (!result.success) throw new Error('BOOKING_FAILED');

      toast.success('تم حجز الموعد بنجاح! سيظهر في قائمة الطبيب');

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

      await fetchData(false);
      setActiveTab('queue');
    } catch (err: unknown) {
      console.error('Booking error:', err);
      toast.error(err instanceof Error ? err.message : 'فشل في الحجز');
    } finally {
      setBookingLoading(false);
    }
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

      {activeTab === 'queue' && (
        <LiveQueueBoard
          onSelectSession={(id) => navigate(`/doctor/session/${id}`)}
        />
      )}

      {activeTab === 'booking' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" /> حجز موعد سريع
          </h2>

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
              <p className="mt-2 text-green-400 text-sm">✓ مريض موجود: {foundPatient.first_name || ''} {foundPatient.last_name || ''}</p>
            )}
          </div>

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

          <PermissionGuard required="edit_queue">
            <button onClick={handleQuickBooking} disabled={bookingLoading}
              className="w-full bg-green-500/20 hover:bg-green-500/30 disabled:bg-white/5 text-green-400 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4">
              <Calendar className="w-4 h-4" />
              {bookingLoading ? 'جاري الحجز...' : 'تأكيد الحجز'}
            </button>
          </PermissionGuard>
        </div>
      )}

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
                        <p className="text-white/50 text-sm">{event.patient_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-white/30" />
                      <span className="text-white/50 text-sm">{event.doctor_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${event.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
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
