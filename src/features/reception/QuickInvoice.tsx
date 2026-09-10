import { useState } from 'react'
import { CheckCircle2, CreditCard, ReceiptText, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGuard } from '@/core/permissions/PermissionGuard'
import { PIN_SESSION_STORAGE_KEY } from '@/core/auth/PinAuthProvider'
import { useAuthStore } from '@/shared/store/authStore'
import { supabase } from '@/infrastructure/supabase/client'
import { subunitsToDisplay } from '@/shared/utils/currency'

export interface QuickInvoiceItem {
  id: string
  patient_id: string
  patient_name?: string | null
  patient_name_ar?: string | null
  total_subunits: number
  amount_paid_subunits: number
  amount_due_subunits: number | null
  invoice_status: string | null
  payment_method: string | null
}

type ReceptionRpcClient = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }
const rpcClient = () => supabase as unknown as ReceptionRpcClient

const methods = [
  ['cash', 'نقدي'],
  ['card_visa', 'بطاقة Visa'],
  ['card_mastercard', 'بطاقة Mastercard'],
  ['bank_transfer', 'تحويل بنكي'],
  ['installment', 'تقسيط'],
  ['mixed', 'متعدد'],
] as const

interface QuickInvoiceProps {
  invoices: QuickInvoiceItem[]
  onCollected: () => void
}

export default function QuickInvoice({ invoices, onCollected }: QuickInvoiceProps) {
  const tenantId = useAuthStore((s) => s.tenant_id)
  const [selectedId, setSelectedId] = useState('')
  const [method, setMethod] = useState('cash')
  const [busy, setBusy] = useState(false)
  const selected = invoices.find((invoice) => invoice.id === selectedId) ?? null
  const due = selected ? (selected.amount_due_subunits ?? Math.max(0, selected.total_subunits - selected.amount_paid_subunits)) : 0

  const collect = async () => {
    if (!tenantId || !selected || due <= 0) return
    const token = sessionStorage.getItem(PIN_SESSION_STORAGE_KEY)
    if (!token) { toast.error('جلسة الاستقبال غير متاحة'); return }
    setBusy(true)
    try {
      const { data, error } = await rpcClient().rpc('mark_reception_invoice_paid_for_pin_session', {
        p_tenant_id: tenantId,
        p_session_token: token,
        p_invoice_id: selected.id,
        p_payment_method: method,
      })
      if (error) throw new Error(error.message)
      if (data !== true) throw new Error('الفاتورة غير متاحة للتحصيل')
      toast.success(`تم تحصيل ${subunitsToDisplay(due)} JOD`)
      setSelectedId('')
      onCollected()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر تحصيل الفاتورة')
    } finally {
      setBusy(false)
    }
  }

  const pending = invoices.filter((invoice) => (invoice.amount_due_subunits ?? Math.max(0, invoice.total_subunits - invoice.amount_paid_subunits)) > 0 && invoice.invoice_status !== 'cancelled')

  return <PermissionGuard required="edit_invoices" fallback={null}>
    <section className="rounded-3xl border border-[#1B2A4A]/10 bg-white p-5 shadow-sm" dir="rtl">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-[#1B2A4A] p-2.5 text-white"><ReceiptText className="h-5 w-5" /></div><div><h2 className="text-lg font-bold text-[#1B2A4A]">التحصيل السريع</h2><p className="mt-1 text-sm text-slate-500">تحصيل المتبقي من الفاتورة مباشرة من شاشة الاستقبال.</p></div></div>
      {pending.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">لا توجد فواتير مستحقة للتحصيل.</div> : <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_auto] md:items-end"><label className="text-sm font-semibold text-slate-700">الفاتورة<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#1B2A4A]"><option value="">اختر فاتورة</option>{pending.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.patient_name_ar || invoice.patient_name || invoice.patient_id.slice(0,8)} — {subunitsToDisplay(invoice.amount_due_subunits ?? Math.max(0, invoice.total_subunits - invoice.amount_paid_subunits))} JOD</option>)}</select></label><label className="text-sm font-semibold text-slate-700">طريقة الدفع<select value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#1B2A4A]">{methods.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" onClick={() => void collect()} disabled={!selected || due <= 0 || busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-5 py-2.5 font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />{busy ? 'جارٍ التحصيل…' : selected ? `تحصيل ${subunitsToDisplay(due)} JOD` : 'تحصيل'}</button></div>}
      {selected && due > 0 && <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600"><Wallet className="h-4 w-4" />المبلغ المتبقي: <strong className="text-[#1B2A4A]">{subunitsToDisplay(due)} JOD</strong><CreditCard className="mr-2 h-4 w-4" /></div>}
    </section>
  </PermissionGuard>
}
