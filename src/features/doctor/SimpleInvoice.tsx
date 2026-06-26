import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import { subunitsToDisplay, addSubunits, subtractSubunits, calculateTaxSubunits } from '@/shared/utils/currency';
import { ArrowRight, Save, Calculator } from 'lucide-react';

interface Procedure {
  id: string;
  procedure_name: string;
  base_price_subunits: number;
}

interface InvoiceLine {
  procedure_id: string;
  procedure_name: string;
  quantity: number;
  unit_price_subunits: number;
  line_total_subunits: number;
}

export default function SimpleInvoice() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(16);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProcedures(); }, []);

  const fetchProcedures = async () => {
    const tenant_id = localStorage.getItem('tenant_id');
    if (!tenant_id) { toast.error('معرف المستأجر مفقود'); return; }

    try {
      const { data, error } = await supabase
        .from('clinic_procedures')
        .select('id, procedure_name, base_price_subunits')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .order('procedure_name');

      if (error) throw error;
      setProcedures(data || []);
    } catch (err: any) {
      toast.error(err.message || 'فشل في تحميل الإجراءات');
    } finally {
      setLoading(false);
    }
  };

  const addLine = (procedure: Procedure) => {
    const existing = lines.find(l => l.procedure_id === procedure.id);
    if (existing) {
      setLines(lines.map(l => 
        l.procedure_id === procedure.id 
          ? { ...l, quantity: l.quantity + 1, line_total_subunits: (l.quantity + 1) * l.unit_price_subunits }
          : l
      ));
    } else {
      setLines([...lines, {
        procedure_id: procedure.id,
        procedure_name: procedure.procedure_name,
        quantity: 1,
        unit_price_subunits: procedure.base_price_subunits,
        line_total_subunits: procedure.base_price_subunits
      }]);
    }
  };

  const removeLine = (procedureId: string) => {
    setLines(lines.filter(l => l.procedure_id !== procedureId));
  };

  // Constitution §2.2: All calculations in INTEGER fils
  const subtotal = lines.reduce((sum, l) => addSubunits(sum, l.line_total_subunits), 0);
  const discount = calculateTaxSubunits(subtotal, discountPercent);
  const afterDiscount = subtractSubunits(subtotal, discount);
  const tax = calculateTaxSubunits(afterDiscount, taxPercent);
  const total = addSubunits(afterDiscount, tax);

  const handleSave = async () => {
    if (lines.length === 0) { toast.error('أضف إجراء واحد على الأقل'); return; }
    if (!sessionId) { toast.error('معرف الجلسة مفقود'); return; }

    setSaving(true);
    try {
      const tenant_id = localStorage.getItem('tenant_id');
      
      const { data: sessionData } = await supabase
        .from('clinic_visit_sessions')
        .select('patient_id')
        .eq('id', sessionId)
        .eq('tenant_id', tenant_id)
        .single();

      const { error } = await supabase.from('clinic_invoices').insert({
        tenant_id,
        session_id: sessionId,
        patient_id: sessionData?.patient_id,
        subtotal_subunits: subtotal,
        discount_subunits: discount,
        discount_reason: discountPercent > 0 ? `Discount ${discountPercent}%` : null,
        tax_subunits: tax,
        total_subunits: total,
        amount_paid_subunits: 0,
        amount_due_subunits: total,
        invoice_status: 'draft',
        invoice_date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;
      toast.success('تم إنشاء الفاتورة');
      navigate(`/doctor/session/${sessionId}`);
    } catch (err: any) {
      toast.error(err.message || 'فشل في إنشاء الفاتورة');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="h-8 bg-white/10 rounded w-1/3 animate-pulse" />
        <div className="h-32 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/50 hover:text-white">
          <ArrowRight className="w-5 h-5" /> <span>العودة</span>
        </button>
        <h1 className="text-2xl font-bold text-white">فاتورة جديدة</h1>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" /> الإجراءات المتاحة
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {procedures.map(proc => (
            <button key={proc.id} onClick={() => addLine(proc)}
              className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-right">
              <p className="text-white text-sm font-medium">{proc.procedure_name}</p>
              <p className="text-white/50 text-xs">{subunitsToDisplay(proc.base_price_subunits)}</p>
            </button>
          ))}
        </div>
      </div>

      {lines.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">تفاصيل الفاتورة</h2>
          <div className="space-y-2">
            {lines.map(line => (
              <div key={line.procedure_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white text-sm">{line.procedure_name}</p>
                  <p className="text-white/50 text-xs">× {line.quantity}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white font-medium">{subunitsToDisplay(line.line_total_subunits)}</span>
                  <button onClick={() => removeLine(line.procedure_id)}
                    className="text-red-400/50 hover:text-red-400 text-xs">حذف</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">المجموع الفرعي</span>
              <span className="text-white">{subunitsToDisplay(subtotal)}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-white/50">الخصم</span>
                <input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs text-center" />
                <span className="text-white/30 text-xs">%</span>
              </div>
              <span className="text-red-400">-{subunitsToDisplay(discount)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-white/50">الضريبة</span>
                <input type="number" value={taxPercent} onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs text-center" />
                <span className="text-white/30 text-xs">%</span>
              </div>
              <span className="text-white">{subunitsToDisplay(tax)}</span>
            </div>

            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
              <span className="text-white">الإجمالي</span>
              <span className="text-green-400">{subunitsToDisplay(total)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || lines.length === 0}
          className="flex-1 bg-green-500/20 hover:bg-green-500/30 disabled:bg-white/5 text-green-400 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
        </button>
      </div>
    </div>
  );
}
