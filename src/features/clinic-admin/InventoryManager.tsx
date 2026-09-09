import { useEffect, useState } from 'react';
import { Package, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

type InventoryRow = { id: string; material_name: string; quantity_consumed: number; consumption_type: string; notes: string | null; created_at: string; };

export default function InventoryManager() {
  const tenantId = useAuthStore((s) => s.tenant_id);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [materialName, setMaterialName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [consumptionType, setConsumptionType] = useState<'Standard_Clinical' | 'Operational_Waste'>('Standard_Clinical');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true); setError(null);
    const { data, error: queryError } = await supabase.from('inventory_ledger')
      .select('id, material_name, quantity_consumed, consumption_type, notes, created_at')
      .eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false });
    if (queryError) { setError(queryError.message); setRows([]); } else setRows((data ?? []) as InventoryRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [tenantId]);

  const addEntry = async () => {
    if (!tenantId || !userId || !materialName.trim()) { setError('اسم المادة والكمية مطلوبان.'); return; }
    const parsed = Number(quantity);
    if (!Number.isFinite(parsed) || parsed <= 0) { setError('الكمية يجب أن تكون رقمًا موجبًا.'); return; }
    setSaving(true); setError(null); setNotice(null);
    const { error: insertError } = await supabase.from('inventory_ledger').insert({
      tenant_id: tenantId, material_name: materialName.trim(), quantity_consumed: parsed,
      consumption_type: consumptionType, logged_by: userId, notes: notes.trim() || null,
    });
    if (insertError) setError(insertError.message);
    else { setMaterialName(''); setQuantity('1'); setNotes(''); setNotice('تم تسجيل الاستهلاك.'); await load(); }
    setSaving(false);
  };

  return <PermissionGuard required="edit_analytics"><section className="space-y-6" dir="rtl">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Package className="h-6 w-6 text-primary"/><div><h2 className="text-xl font-bold text-slate-900">المخزون والاستهلاك</h2><p className="text-sm text-slate-500">سجل استهلاك المواد والهدر التشغيلي.</p></div></div><button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><RefreshCw className="h-4 w-4"/>تحديث</button></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"><h3 className="font-semibold text-primary">إضافة سجل استهلاك</h3><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><input value={materialName} onChange={(e) => setMaterialName(e.target.value)} placeholder="اسم المادة" className="rounded-lg border border-slate-200 px-3 py-2"/><input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="0.001" step="any" placeholder="الكمية" className="rounded-lg border border-slate-200 px-3 py-2"/><select value={consumptionType} onChange={(e) => setConsumptionType(e.target.value as typeof consumptionType)} className="rounded-lg border border-slate-200 px-3 py-2"><option value="Standard_Clinical">استهلاك سريري</option><option value="Operational_Waste">هدر تشغيلي</option></select><input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات" className="rounded-lg border border-slate-200 px-3 py-2"/></div><button disabled={saving} onClick={() => void addEntry()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Plus className="h-4 w-4"/>تسجيل</button></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">{loading ? <div className="p-6 text-sm text-slate-500">جاري التحميل...</div> : <table className="min-w-full text-sm"><thead className="bg-muted"><tr><th className="px-4 py-3 text-right">المادة</th><th className="px-4 py-3 text-right">الكمية</th><th className="px-4 py-3 text-right">النوع</th><th className="px-4 py-3 text-right">الملاحظات</th><th className="px-4 py-3 text-right">التاريخ</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium">{row.material_name}</td><td className="px-4 py-3">{row.quantity_consumed}</td><td className="px-4 py-3">{row.consumption_type === 'Operational_Waste' ? 'هدر تشغيلي' : 'استهلاك سريري'}</td><td className="px-4 py-3 text-slate-600">{row.notes || '—'}</td><td className="px-4 py-3 text-slate-600">{new Date(row.created_at).toLocaleString('ar-JO')}</td></tr>)}</tbody></table>}</div>
  </section></PermissionGuard>;
}
