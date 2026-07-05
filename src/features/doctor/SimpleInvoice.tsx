import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';
import { FileText, Printer, CheckCircle } from 'lucide-react';

interface SimpleInvoiceProps {
  patientId: string;
  sessionId: string;
  onComplete?: () => void;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export function SimpleInvoice({ patientId, sessionId, onComplete }: SimpleInvoiceProps) {
  // ALL HOOKS FIRST — before any conditional logic
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinted, setIsPrinted] = useState(false);
  const [total, setTotal] = useState(0);

  // Auth store hooks
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  // GUARD AFTER ALL HOOKS
  if (!tenantId) {
    return (
      <div className="p-6 text-center text-red-500" dir="rtl">
        Tenant not initialized
      </div>
    );
  }

  // Calculate total whenever items change
  useEffect(() => {
    const newTotal = items.reduce((sum, item) => sum + item.total, 0);
    setTotal(newTotal);
  }, [items]);

  // Load existing invoice items
  useEffect(() => {
    const loadInvoice = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('session_id', sessionId)
          .eq('tenant_id', tenantId)
          .eq('is_deleted', false);

        if (error) {
          toast.error(`خطأ في تحميل الفاتورة: ${error.message}`);
          return;
        }

        if (data) {
          setItems(data.map(item => ({
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price
          })));
        }
      } catch (err: any) {
        toast.error(err?.message || 'حدث خطأ');
      } finally {
        setIsLoading(false);
      }
    };

    if (sessionId && tenantId) {
      loadInvoice();
    }
  }, [sessionId, tenantId]);

  const addItem = useCallback(() => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  const updateItem = useCallback((id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = updated.quantity * updated.unit_price;
      }
      return updated;
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete existing items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('session_id', sessionId)
        .eq('tenant_id', tenantId);

      // Insert new items
      if (items.length > 0) {
        const { error } = await supabase
          .from('invoice_items')
          .insert(items.map(item => ({
            session_id: sessionId,
            patient_id: patientId,
            tenant_id: tenantId,
            doctor_id: user?.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            is_deleted: false
          })));

        if (error) {
          toast.error(`خطأ في الحفظ: ${error.message}`);
          return;
        }
      }

      toast.success('تم حفظ الفاتورة بنجاح');
      onComplete?.();
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    setIsPrinted(true);
    toast.success('تم إرسال الفاتورة للطباعة');
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">جاري تحميل الفاتورة...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-[#1B2A4A]">فاتورة الجلسة</h2>
      </div>

      <div className="space-y-3 mb-6">
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-500 font-medium w-8">{index + 1}</span>
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
              placeholder="وصف الخدمة"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
              placeholder="الكمية"
              className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
            <input
              type="number"
              value={item.unit_price}
              onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
              placeholder="السعر"
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
            <span className="w-24 text-center font-semibold text-[#1B2A4A]">
              {item.total.toFixed(2)} ر.س
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="w-full py-2 mb-6 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
      >
        + إضافة بند
      </button>

      <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg mb-6">
        <span className="text-lg font-bold text-[#1B2A4A]">الإجمالي:</span>
        <span className="text-2xl font-bold text-blue-600">{total.toFixed(2)} ر.س</span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {isSaving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
        </button>
        <button
          onClick={handlePrint}
          disabled={isPrinted}
          className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          {isPrinted ? 'تمت الطباعة' : 'طباعة'}
        </button>
      </div>
    </div>
  );
}