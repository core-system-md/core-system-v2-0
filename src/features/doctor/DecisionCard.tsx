// ============================================================
// CORE SYSTEM v2.1 — DecisionCard
// Constitution §4.2 (Core Score), §5 (SLA), §7 (Roles), §9 (RLS)
// Doctor role: sessions + patients + clinical notes — NO invoices
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import { CoreScoreMeter } from '@/shared/components/ui/CoreScoreMeter';
import { SlaTimer } from '@/shared/components/ui/SlaTimer';

interface Patient {
  id: string;
  full_name: string;
  phone: string | null;
  disc_profile: string | null;
  tenant_id: string;
}

interface Procedure {
  id: string;
  name: string;
  price_subunits: number;
  duration_minutes: number;
}

interface SessionData {
  id: string;
  status: string;
  patient_id: string;
  created_at: string;
  clinic_patients: Patient;
}

interface InvoiceItem {
  procedure_id: string;
  quantity: number;
  price_subunits: number;
}

export default function DecisionCard() {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getTenantId = (): string | null => {
    return localStorage.getItem('tenant_id');
  };

  const formatJOD = (subunits: number): string => {
    return `${(subunits / 1000).toFixed(3)} JOD`;
  };

  useEffect(() => {
    if (!sessionId) {
      toast.error('معرف الجلسة مفقود');
      navigate('/doctor');
      return;
    }

    const tenant_id = getTenantId();
    if (!tenant_id) {
      toast.error('معرف المستأجر مفقود — أعد تسجيل الدخول');
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('clinic_visit_sessions')
          .select(`
            id,
            status,
            patient_id,
            created_at,
            clinic_patients (
              id,
              full_name,
              phone,
              disc_profile,
              tenant_id
            )
          `)
          .eq('id', sessionId)
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error('الجلسة غير موجودة');

        const patient = sessionData.clinic_patients as unknown as Patient;
        if (patient.tenant_id !== tenant_id) {
          throw new Error('بيانات المريض لا تنتمي لهذا المستأجر');
        }

        setSession(sessionData as unknown as SessionData);

        const { data: procData, error: procError } = await supabase
          .from('clinic_procedures')
          .select('id, name, price_subunits, duration_minutes')
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null)
          .order('name', { ascending: true });

        if (procError) throw procError;
        setProcedures(procData || []);

      } catch (err: any) {
        console.error('DecisionCard fetch error:', err);
        toast.error(err.message || 'فشل في تحميل بيانات الجلسة');
        navigate('/doctor');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, navigate]);

  const addProcedure = (procedure: Procedure) => {
    setSelectedProcedures(prev => {
      const existing = prev.find(p => p.procedure_id === procedure.id);
      if (existing) {
        return prev.map(p =>
          p.procedure_id === procedure.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }
      return [...prev, {
        procedure_id: procedure.id,
        quantity: 1,
        price_subunits: procedure.price_subunits
      }];
    });
    toast.success(`تمت إضافة: ${procedure.name}`);
  };

  const totalSubunits = selectedProcedures.reduce(
    (sum, item) => sum + (item.price_subunits * item.quantity),
    0
  );

  const saveDraft = async () => {
    if (!session || selectedProcedures.length === 0) {
      toast.error('أضف إجراءً على الأقل');
      return;
    }

    const tenant_id = getTenantId();
    if (!tenant_id) {
      toast.error('معرف المستأجر مفقود');
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: invoiceError } = await supabase
        .from('clinic_invoices')
        .insert({
          session_id: session.id,
          patient_id: session.patient_id,
          tenant_id: tenant_id,
          total_subunits: totalSubunits,
          status: 'draft',
          items: selectedProcedures,
          created_by: userData.user?.id
        });

      if (invoiceError) throw invoiceError;
      toast.success('تم حفظ المسودة');

    } catch (err: any) {
      console.error('Save draft error:', err);
      toast.error(err.message || 'فشل في حفظ المسودة');
    } finally {
      setSaving(false);
    }
  };

  const closeSession = async () => {
    if (!session) return;

    const tenant_id = getTenantId();
    if (!tenant_id) {
      toast.error('معرف المستأجر مفقود');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinic_visit_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)
        .eq('tenant_id', tenant_id);

      if (error) throw error;

      toast.success('تم إغلاق الجلسة');
      navigate('/doctor');

    } catch (err: any) {
      console.error('Close session error:', err);
      toast.error(err.message || 'فشل في إغلاق الجلسة');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4" dir="rtl">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-48 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!session) return null;

  const patient = session.clinic_patients;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">
            {patient.full_name}
          </h1>
          <p className="text-gray-500 mt-1">
            {patient.phone || 'لا يوجد هاتف'}
          </p>
          {patient.disc_profile && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              DISC: {patient.disc_profile}
            </span>
          )}
        </div>
        <div className="text-left">
          <CoreScoreMeter score={85.5} />
          <SlaTimer created_at={session.created_at} />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4 text-[#1B2A4A]">
          الإجراءات المتاحة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {procedures.map(proc => (
            <button
              key={proc.id}
              onClick={() => addProcedure(proc)}
              className="p-3 border rounded-lg hover:bg-gray-50 transition text-right"
            >
              <div className="font-medium">{proc.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                {formatJOD(proc.price_subunits)} · {proc.duration_minutes} دقيقة
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedProcedures.length > 0 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-3">الإجراءات المختارة</h2>
          <div className="space-y-2">
            {selectedProcedures.map(item => {
              const proc = procedures.find(p => p.id === item.procedure_id);
              return (
                <div key={item.procedure_id} className="flex justify-between">
                  <span>
                    {proc?.name} × {item.quantity}
                  </span>
                  <span className="font-mono">
                    {formatJOD(item.price_subunits * item.quantity)}
                  </span>
                </div>
              );
            })}
            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
              <span>الإجمالي</span>
              <span className="text-[#1B2A4A]">{formatJOD(totalSubunits)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={saveDraft}
          disabled={saving || selectedProcedures.length === 0}
          className="flex-1 py-3 bg-[#1B2A4A] text-white rounded-lg font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'جاري الحفظ...' : '💾 حفظ المسودة'}
        </button>
        <button
          onClick={closeSession}
          disabled={saving}
          className="flex-1 py-3 border-2 border-red-500 text-red-500 rounded-lg font-medium
                     hover:bg-red-50 disabled:opacity-50"
        >
          {saving ? 'جاري الإغلاق...' : '🔒 إغلاق الجلسة'}
        </button>
      </div>
    </div>
  );
}
