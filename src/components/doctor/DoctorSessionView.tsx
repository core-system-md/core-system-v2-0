import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/supabase/client';
import { DecisionCard } from './DecisionCard';
import { Stethoscope, Receipt, Trash2, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface Procedure {
  id: string;
  procedure_name: string;
  base_price_subunits: number;
}

interface InvoiceItem {
  id: string;
  procedure_id: string;
  procedure_name: string;
  price_subunits: number;
  quantity: number;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>{children}</div>;
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded ${className}`} />;
}

function formatJOD(subunits: number): string {
  return (subunits / 1000).toFixed(3) + ' JOD';
}

export function DoctorSessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionId = id || '';

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const getTenantId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const tid = session?.user?.user_metadata?.tenant_id || session?.user?.app_metadata?.tenant_id;
      setTenantId(tid || null);
    };
    getTenantId();
  }, []);

  useEffect(() => {
    if (!tenantId || !sessionId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: sessionData, error: sessionError } = await supabase
        .from('clinic_visit_sessions')
        .select('doctor_notes')
        .eq('id', sessionId)
        .eq('tenant_id', tenantId)
        .eq('is_abandoned', false)
        .single();

      if (sessionError) setError(sessionError.message);
      else if (sessionData) setDoctorNotes(sessionData.doctor_notes || '');

      const { data: procData, error: procError } = await supabase
        .from('clinic_procedures')
        .select('id, procedure_name, base_price_subunits')
        .eq('tenant_id', tenantId)
        .order('procedure_name', { ascending: true });

      if (procError) setError(procError.message);
      else setProcedures(procData || []);

      setLoading(false);
    };
    fetch();
  }, [tenantId, sessionId]);

  const addInvoiceItem = (procedureId: string) => {
    const proc = procedures.find(p => p.id === procedureId);
    if (!proc) return;
    const exists = invoiceItems.find(i => i.procedure_id === proc.id);
    if (exists) { updateQuantity(exists.id, exists.quantity + 1); return; }
    setInvoiceItems(prev => [...prev, {
      id: crypto.randomUUID(), procedure_id: proc.id, procedure_name: proc.procedure_name,
      price_subunits: proc.base_price_subunits, quantity: 1,
    }]);
  };

  const removeInvoiceItem = (itemId: string) => {
    setInvoiceItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty < 1) return;
    setInvoiceItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: qty } : item));
  };

  const totalSubunits = invoiceItems.reduce((sum, item) => sum + (item.price_subunits * item.quantity), 0);

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(null);
    const { error: notesError } = await supabase
      .from('clinic_visit_sessions')
      .update({ doctor_notes: doctorNotes })
      .eq('id', sessionId)
      .eq('tenant_id', tenantId || '');
    if (notesError) { setError(notesError.message); setSaving(false); return; }

    if (invoiceItems.length > 0) {
      const { error: invError } = await supabase
        .from('clinic_invoices')
        .upsert({
          session_id: sessionId,
          tenant_id: tenantId,
          total_amount_subunits: totalSubunits,
          status: 'pending',
          items: invoiceItems.map(i => ({ name: i.procedure_name, qty: i.quantity, price: i.price_subunits })),
        }, { onConflict: 'session_id' });
      if (invError) { setError(invError.message); setSaving(false); return; }
    }

    setSuccess('تم الحفظ بنجاح');
    setSaving(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCloseSession = async () => {
    setClosing(true); setError(null); setSuccess(null);

    const { error: notesError } = await supabase
      .from('clinic_visit_sessions')
      .update({ doctor_notes: doctorNotes })
      .eq('id', sessionId)
      .eq('tenant_id', tenantId || '');
    if (notesError) { setError(notesError.message); setClosing(false); return; }

    if (invoiceItems.length > 0) {
      const { error: invError } = await supabase
        .from('clinic_invoices')
        .upsert({
          session_id: sessionId,
          tenant_id: tenantId,
          total_amount_subunits: totalSubunits,
          status: 'pending',
          items: invoiceItems.map(i => ({ name: i.procedure_name, qty: i.quantity, price: i.price_subunits })),
        }, { onConflict: 'session_id' });
      if (invError) { setError(invError.message); setClosing(false); return; }
    }

    const { error: closeError } = await supabase
      .from('clinic_visit_sessions')
      .update({ session_status: 'completed' })
      .eq('id', sessionId)
      .eq('tenant_id', tenantId || '');
    if (closeError) { setError(closeError.message); setClosing(false); return; }

    setSuccess('تم إغلاق الجلسة بنجاح');
    setClosing(false);
    setTimeout(() => navigate('/doctor/today'), 1500);
  };

  if (!tenantId || !sessionId) return <div className="p-6 text-center text-gray-500">جاري التحقق...</div>;
  if (loading) return <div className="space-y-4 p-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (error) return <div className="p-6 text-red-600">خطأ: {error}</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-600">
          <CheckCircle size={18} /><span>{success}</span>
        </div>
      )}

      <DecisionCard sessionId={sessionId} />

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">ملاحظات الطبيب</h2>
          </div>
          <textarea
            className="w-full min-h-[140px] p-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
            placeholder="اكتب ملاحظاتك الطبية هنا..."
            value={doctorNotes}
            onChange={(e) => setDoctorNotes(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <span className="text-xs text-gray-400">{doctorNotes.length} حرف</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">الفاتورة</h2>
          </div>
          <div className="mb-4">
            <select
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary bg-white"
              onChange={(e) => { if (e.target.value) { addInvoiceItem(e.target.value); e.target.value = ''; } }}
              defaultValue=""
            >
              <option value="" disabled>+ اختر إجراء...</option>
              {procedures.map(proc => (
                <option key={proc.id} value={proc.id}>{proc.procedure_name} — {formatJOD(proc.base_price_subunits)}</option>
              ))}
            </select>
          </div>
          {invoiceItems.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm border border-dashed border-gray-200 rounded-lg">لا توجد إجراءات مضافة</div>
          ) : (
            <div className="space-y-2">
              {invoiceItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-800 truncate">{item.procedure_name}</div>
                    <div className="text-xs text-gray-500">{formatJOD(item.price_subunits)} للوحدة</div>
                  </div>
                  <div className="flex items-center gap-3 mr-4">
                    <div className="flex items-center gap-1">
                      <button className="w-7 h-7 rounded bg-gray-200 text-gray-600 text-sm hover:bg-gray-300 flex items-center justify-center" onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button className="w-7 h-7 rounded bg-gray-200 text-gray-600 text-sm hover:bg-gray-300 flex items-center justify-center" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <div className="text-sm font-semibold text-gray-800 w-28 text-left">{formatJOD(item.price_subunits * item.quantity)}</div>
                    <button className="text-red-400 hover:text-red-600 p-1" onClick={() => removeInvoiceItem(item.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-3">
                <span className="font-bold text-gray-800 text-base">الإجمالي</span>
                <span className="text-xl font-bold text-primary">{formatJOD(totalSubunits)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 p-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ المسودة'}
        </button>
        <button
          onClick={handleCloseSession}
          disabled={closing}
          className="flex-1 p-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Lock size={16} />
          {closing ? 'جاري الإغلاق...' : 'إغلاق الجلسة'}
        </button>
      </div>
    </div>
  );
}