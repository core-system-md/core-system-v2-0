import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, User, Phone, AlertCircle } from 'lucide-react';

interface ReceptionQuickBookingProps {
  onBookingComplete?: () => void;
}

interface PatientInfo {
  name: string;
  phone: string;
  id_number: string;
}

export function ReceptionQuickBooking({ onBookingComplete }: ReceptionQuickBookingProps) {
  // ALL HOOKS FIRST — before any conditional logic
  const [patient, setPatient] = useState<PatientInfo>({
    name: '',
    phone: '',
    id_number: ''
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [doctors, setDoctors] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auth store hooks
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  // GUARD AFTER ALL HOOKS
  if (!tenantId) {
    return (
      <div className="p-6 text-center text-red-500" dir="rtl">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Tenant not initialized</p>
      </div>
    );
  }

  // Load doctors list
  useEffect(() => {
    const loadDoctors = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name')
          .eq('tenant_id', tenantId)
          .eq('role', 'doctor')
          .eq('is_active', true);

        if (error) {
          toast.error(`خطأ في تحميل الأطباء: ${error.message}`);
          return;
        }

        if (data) {
          setDoctors(data.map(d => ({ id: d.id, name: d.full_name })));
        }
      } catch (err: any) {
        toast.error(err?.message || 'حدث خطأ');
      } finally {
        setIsLoading(false);
      }
    };

    if (tenantId) {
      loadDoctors();
    }
  }, [tenantId]);

  // Set default date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  const handleSubmit = async () => {
    if (!patient.name.trim() || !patient.phone.trim()) {
      toast.error('يرجى إدخال اسم المريض ورقم الهاتف');
      return;
    }

    if (!selectedDoctor) {
      toast.error('يرجى اختيار الطبيب');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create patient if not exists
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .upsert({
          full_name: patient.name,
          phone: patient.phone,
          id_number: patient.id_number,
          tenant_id: tenantId,
          created_by: user?.id
        }, { onConflict: 'phone' })
        .select('id')
        .single();

      if (patientError) {
        toast.error(`خطأ في إنشاء المريض: ${patientError.message}`);
        return;
      }

      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientData.id,
          doctor_id: selectedDoctor,
          tenant_id: tenantId,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          status: 'scheduled',
          created_by: user?.id
        });

      if (appointmentError) {
        toast.error(`خطأ في الحجز: ${appointmentError.message}`);
        return;
      }

      toast.success('تم الحجز بنجاح');

      // Reset form
      setPatient({ name: '', phone: '', id_number: '' });
      setSelectedDoctor('');
      setSelectedTime('');

      onBookingComplete?.();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-[#1B2A4A]">حجز سريع</h2>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المريض</label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={patient.name}
              onChange={(e) => setPatient(prev => ({ ...prev, name: e.target.value }))}
              placeholder="أدخل اسم المريض"
              className="w-full pr-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              value={patient.phone}
              onChange={(e) => setPatient(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="05xxxxxxxx"
              className="w-full pr-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهوية (اختياري)</label>
          <input
            type="text"
            value={patient.id_number}
            onChange={(e) => setPatient(prev => ({ ...prev, id_number: e.target.value }))}
            placeholder="رقم الهوية / الإقامة"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pr-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
            <div className="relative">
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full pr-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الطبيب</label>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">اختر الطبيب</option>
            {doctors.map(doctor => (
              <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold"
      >
        {isSubmitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
      </button>
    </div>
  );
}