import { useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';

interface BookingForm {
  patient_name: string;
  phone_number: string;
  age: string;
  reason_for_visit: string;
}

export function ReceptionQuickBooking() {
  // ═══ ALL HOOKS FIRST (React Rules of Hooks) ═══
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<BookingForm>({
    patient_name: '',
    phone_number: '',
    age: '',
    reason_for_visit: '',
  });

  // ═══ TENANT GUARD (AFTER all hooks) ═══
  const tenantId = useAuthStore((state) => state.tenant_id);

  if (!tenantId) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-red-500 font-semibold">Tenant not initialized</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.patient_name.trim() || !form.phone_number.trim()) {
      toast.error('الاسم ورقم الهاتف مطلوبان');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: patient, error: patientError } = await supabase
        .from('clinic_patients')
        .insert({
          tenant_id: tenantId,
          first_name: form.patient_name.trim(),
          last_name: '',
          full_name: form.patient_name.trim(),
          phone_primary: form.phone_number.trim(),
          notes: form.reason_for_visit.trim() || null,
          mrn: `MRN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`
        })
        .select()
        .single();

      if (patientError) {
        toast.error(`خطأ في الحفظ: ${patientError.message}`);
        return;
      }

      await supabase
        .from('clinic_inquiries')
        .insert({
          tenant_id: tenantId,
          inquiry_type: 'walk_in',
          patient_id: patient.id,
          temp_patient_name: form.patient_name.trim(),
          temp_phone: form.phone_number.trim(),
          inquiry_reason: form.reason_for_visit.trim() || null,
          status: 'pending',
        });

      toast.success('تم حجز المريض بنجاح');
      setForm({ patient_name: '', phone_number: '', age: '', reason_for_visit: '' });
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md" dir="rtl">
      <h2 className="text-xl font-bold text-[#1B2A4A] mb-6">حجز سريع — الاستقبال</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            اسم المريض <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.patient_name}
            onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            placeholder="أدخل اسم المريض"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            رقم الهاتف <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            placeholder="07XXXXXXXX"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            العمر
          </label>
          <input
            type="number"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            placeholder="اختياري"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            سبب الزيارة
          </label>
          <textarea
            value={form.reason_for_visit}
            onChange={(e) => setForm({ ...form, reason_for_visit: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            placeholder="اختياري"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-4 bg-[#1B2A4A] text-white rounded-md hover:bg-[#2a3d6b] transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'جاري الحفظ...' : 'حجز المريض'}
        </button>
      </form>
    </div>
  );
}