import { useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';
import { Calculator, Plus, Trash2, FileText } from 'lucide-react';

interface InvoiceItem {
  procedure: string;
  priceSubunits: number;
}

interface SimpleInvoiceProps {
  patientId: string;
  sessionId: string;
  onComplete?: () => void;
}

const PRESET_PROCEDURES = [
  { name: 'استشارة عامة', priceSubunits: 15000 },
  { name: 'فحص أسنان', priceSubunits: 25000 },
  { name: 'تنظيف أسنان', priceSubunits: 35000 },
  { name: 'حشوة تجميلية', priceSubunits: 45000 },
  { name: 'خلع سن', priceSubunits: 20000 },
];

// Manual subunit conversion (no FLOAT per Constitution)
function subunitsToDisplay(subunits: number): string {
  const jod = Math.floor(subunits / 1000);
  const fils = subunits % 1000;
  return `${jod}.${fils.toString().padStart(3, '0')} JOD`;
}

export function SimpleInvoice({ patientId, sessionId, onComplete }: SimpleInvoiceProps) {
  // ═══ ALL HOOKS FIRST (React Rules of Hooks) ═══
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ═══ TENANT GUARD (AFTER all hooks) ═══
  const tenantId = useAuthStore((state) => state.tenant_id);

  if (!tenantId) {
    return (
      <div className="p-6 text-center text-red-500" dir="rtl">
        Tenant not initialized
      </div>
    );
  }

  const addPresetItem = (procedure: string, priceSubunits: number) => {
    setItems([...items, { procedure, priceSubunits }]);
  };

  const addCustomItem = () => {
    if (!customName.trim() || !customPrice.trim()) {
      toast.error('أدخل اسم الإجراء والسعر');
      return;
    }
    const priceJOD = parseFloat(customPrice);
    if (isNaN(priceJOD) || priceJOD <= 0) {
      toast.error('السعر غير صالح');
      return;
    }
    const priceSubunits = Math.round(priceJOD * 1000);
    setItems([...items, { procedure: customName.trim(), priceSubunits }]);
    setCustomName('');
    setCustomPrice('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalSubunits = items.reduce((sum, item) => sum + item.priceSubunits, 0);

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('أضف إجراء واحد على الأقل');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('clinic_invoices')
        .insert({
          tenant_id: tenantId,
          session_id: sessionId,
          patient_id: patientId,
          subtotal_subunits: totalSubunits,
          total_subunits: totalSubunits,
          amount_paid_subunits: 0,
          invoice_status: 'draft',
          invoice_date: new Date().toISOString().slice(0, 10),
        });

      if (error) {
        toast.error(`خطأ في الحفظ: ${error.message}`);
        return;
      }

      toast.success('تم إنشاء الفاتورة بنجاح');
      onComplete?.();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-xl shadow-lg" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-[#1B2A4A]" />
        <h3 className="text-xl font-bold text-[#1B2A4A]">فاتورة جديدة</h3>
      </div>

      {/* Preset Procedures */}
      <div className="mb-4">
        <span className="text-sm font-medium text-gray-600 block mb-2">الإجراءات السريعة</span>
        <div className="flex flex-wrap gap-2">
          {PRESET_PROCEDURES.map((proc) => (
            <button
              key={proc.name}
              onClick={() => addPresetItem(proc.name, proc.priceSubunits)}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-[#1B2A4A] hover:text-white rounded-lg transition-colors border border-gray-200"
            >
              {proc.name}
              <span className="block text-xs opacity-70">{subunitsToDisplay(proc.priceSubunits)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Item */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-600 block mb-2">إجراء مخصص</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="اسم الإجراء"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
          />
          <input
            type="number"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            placeholder="السعر (JOD)"
            step="0.001"
            className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
          />
          <button
            onClick={addCustomItem}
            className="px-3 py-2 bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2a3d6b] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <div className="mb-4 space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="text-sm font-medium">{item.procedure}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#1B2A4A]">{subunitsToDisplay(item.priceSubunits)}</span>
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {items.length > 0 && (
        <div className="flex justify-between items-center p-4 bg-[#1B2A4A] text-white rounded-xl mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            <span className="font-bold">الإجمالي</span>
          </div>
          <span className="text-2xl font-bold">{subunitsToDisplay(totalSubunits)}</span>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || items.length === 0}
        className="w-full py-3 bg-[#1B2A4A] text-white rounded-xl hover:bg-[#2a3d6b] transition-colors disabled:opacity-50 font-semibold text-lg"
      >
        {isSubmitting ? 'جاري الحفظ...' : 'إنشاء الفاتورة'}
      </button>
    </div>
  );
}A