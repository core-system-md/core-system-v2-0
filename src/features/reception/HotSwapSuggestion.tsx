import { useCallback, useEffect, useState } from 'react'
import { ArrowLeftRight, DoorOpen, RefreshCw, UserRound } from 'lucide-react'
import { PermissionGuard } from '@/core/permissions/PermissionGuard'
import { PIN_SESSION_STORAGE_KEY } from '@/core/auth/PinAuthProvider'
import { useAuthStore } from '@/shared/store/authStore'
import { supabase } from '@/infrastructure/supabase/client'

interface Suggestion {
  session_id: string
  patient_id: string
  patient_name: string
  room_id: string
  room_name: string
  wait_rank: number
}
type ReceptionRpcClient = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }
const rpcClient = () => supabase as unknown as ReceptionRpcClient

export default function HotSwapSuggestion() {
  const tenantId = useAuthStore((s) => s.tenant_id)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    if (!tenantId) return
    const token = sessionStorage.getItem(PIN_SESSION_STORAGE_KEY)
    if (!token) return
    setLoading(true); setError(null)
    try {
      const { data, error: rpcError } = await rpcClient().rpc('get_reception_hot_swap_suggestions_for_pin_session', { p_tenant_id: tenantId, p_session_token: token })
      if (rpcError) throw new Error(rpcError.message)
      const rows = Array.isArray(data) ? (data as Suggestion[]) : []
      setSuggestion(rows[0] ?? null); setLastCheckedAt(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر فحص الغرف المتاحة'); setSuggestion(null)
    } finally { setLoading(false) }
  }, [tenantId])
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); return () => window.clearInterval(timer) }, [load])

  return <PermissionGuard required="view_queue" fallback={null}>
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm" dir="rtl" aria-live="polite">
      <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-xl bg-emerald-500 p-2.5 text-white animate-pulse"><ArrowLeftRight className="h-5 w-5" /></div><div><h3 className="font-bold text-emerald-900">اقتراح تبديل سريع</h3><p className="mt-1 text-xs text-emerald-700">عند وجود غرفة استشارة متاحة وموعد انتظار نشط، يظهر الاقتراح هنا.</p></div></div><button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-emerald-200 bg-white p-2 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50" aria-label="تحديث الاقتراح"><RefreshCw className="h-4 w-4" /></button></div>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : suggestion ? <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div className="space-y-2"><div className="flex items-center gap-2 font-semibold text-slate-800"><UserRound className="h-4 w-4 text-emerald-700" />{suggestion.patient_name}</div><div className="flex items-center gap-2 text-sm text-slate-600"><DoorOpen className="h-4 w-4 text-emerald-700" />{suggestion.room_name}</div></div><div className="rounded-lg bg-emerald-100 px-3 py-2 text-center text-xs font-semibold text-emerald-800">المريض #{suggestion.wait_rank}<br />يمكن توجيهه للغرفة الآن</div></div> : <div className="mt-4 rounded-xl border border-dashed border-emerald-200 bg-white/70 p-4 text-center text-sm text-emerald-700">لا يوجد اقتراح تبديل حاليًا.</div>}
      {lastCheckedAt && <p className="mt-2 text-[11px] text-emerald-600">آخر فحص: {lastCheckedAt.toLocaleTimeString('ar-JO')}</p>}
    </section>
  </PermissionGuard>
}
