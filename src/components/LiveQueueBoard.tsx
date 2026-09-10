import { useState } from 'react'
import { GripVertical, Lock, Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { PermissionGuard } from '@/core/permissions/PermissionGuard'
import { PIN_SESSION_STORAGE_KEY } from '@/core/auth/PinAuthProvider'
import { useAuthStore } from '@/shared/store/authStore'
import { useQueue } from '../shared/hooks/useQueue'
import { useQueueStore } from '../shared/store/queueStore'
import { cn } from '../lib/utils'
import type { QueueItem } from '../shared/store/queueStore'
import { supabase } from '@/infrastructure/supabase/client'

interface LiveQueueBoardProps { onSelectSession?: (sessionId: string) => void }
type QueueRpcClient = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> }
const rpcClient = () => supabase as unknown as QueueRpcClient

type SlaStatus = QueueItem['slaStatus']
const SLA_COLORS: Record<SlaStatus, string> = { green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-red-500 animate-pulse' }

function SlaIndicator({ status, waitMinutes }: { status: SlaStatus; waitMinutes: number }) {
  return <div className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', SLA_COLORS[status])} /><span className="text-sm text-slate-500">{waitMinutes} د</span></div>
}
function LockIndicator({ holderName }: { holderName: string | null }) {
  if (!holderName) return <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Unlock className="h-3.5 w-3.5" />متاح</span>
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"><Lock className="h-3.5 w-3.5" />{holderName}</span>
}
function PriorityBadge({ priority }: { priority: QueueItem['priority'] }) {
  const config = {
    low_priority: { label: 'منخفض', className: 'bg-slate-100 text-slate-700' },
    medium_priority: { label: 'متوسط', className: 'bg-blue-50 text-blue-700' },
    high_priority: { label: 'مرتفع', className: 'bg-orange-50 text-orange-700' },
    qualified: { label: 'مؤهل', className: 'bg-emerald-50 text-emerald-700' },
    hot_lead: { label: 'ساخن', className: 'bg-red-50 text-red-700' },
  } satisfies Record<string, { label: string; className: string }>
  const value = config[priority as keyof typeof config] ?? config.medium_priority
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', value.className)}>{value.label}</span>
}

export function LiveQueueBoard({ onSelectSession }: LiveQueueBoardProps) {
  const { isLoading, error, refetch } = useQueue()
  const { tenant_id: tenantId } = useAuthStore()
  const { items, selectedSessionId, selectSession, setItems, getActiveCount, getRedCount } = useQueueStore()
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const callQueueRpc = async (fn: string, args: Record<string, unknown>) => { const token = sessionStorage.getItem(PIN_SESSION_STORAGE_KEY); if (!tenantId || !token) throw new Error('جلسة الاستقبال غير متاحة'); const { data, error: rpcError } = await rpcClient().rpc(fn, { p_tenant_id: tenantId, p_session_token: token, ...args }); if (rpcError) throw new Error(rpcError.message); return data as any }
  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) return
    const fromIndex = items.findIndex((item) => item.sessionId === draggedId); const toIndex = items.findIndex((item) => item.sessionId === targetId)
    if (fromIndex < 0 || toIndex < 0 || items[fromIndex]?.sessionStatus !== 'waiting' || items[toIndex]?.sessionStatus !== 'waiting') return
    const previous = items; const next = [...items]; const moved = next.splice(fromIndex, 1)[0]; if (!moved) return; next.splice(toIndex, 0, moved); setItems(next); setDraggedId(null)
    try { setBusyId(draggedId); await callQueueRpc('reorder_reception_queue_for_pin_session', { p_session_id: draggedId, p_to_index: toIndex + 1 }); await refetch() }
    catch (err) { setItems(previous); toast.error(err instanceof Error ? err.message : 'تعذر إعادة ترتيب الانتظار') }
    finally { setBusyId(null) }
  }
  const handleLock = async (item: QueueItem) => {
    try { setBusyId(item.sessionId); const fn = item.lockHolderId ? 'release_reception_session_lock_for_pin_session' : 'acquire_reception_session_lock_for_pin_session'; const result = await callQueueRpc(fn, { p_session_id: item.sessionId }); if (!result?.success) toast.error(result?.error === 'ALREADY_LOCKED' ? 'الجلسة مقفلة بواسطة موظف آخر' : 'تعذر تحديث القفل'); else { await refetch(); toast.success(item.lockHolderId ? 'تم تحرير القفل' : 'تم حجز الجلسة لك') } }
    catch (err) { toast.error(err instanceof Error ? err.message : 'تعذر تحديث القفل') } finally { setBusyId(null) }
  }
  const handleSelect = (sessionId: string) => { selectSession(sessionId); onSelectSession?.(sessionId) }
  if (error) return <div className="p-6 text-center" dir="rtl"><p className="text-red-600">تعذر تحميل قائمة الانتظار</p><p className="mt-1 text-sm text-slate-500">تحقق من الجلسة ثم حاول التحديث</p></div>
  return <div className="flex h-full flex-col" dir="rtl"><header className="flex items-center justify-between border-b bg-white px-4 py-3"><div><h2 className="text-lg font-semibold text-[#1B2A4A]">الانتظار المباشر</h2><p className="text-xs text-slate-500">السحب والإفلات لإعادة ترتيب المرضى</p></div><div className="flex items-center gap-3"><div className="flex items-center gap-1.5 text-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-slate-500">{getActiveCount()} بالانتظار</span></div>{getRedCount() > 0 && <div className="flex items-center gap-1.5 text-sm text-red-600"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{getRedCount()} تجاوز SLA</div>}</div></header><div className="flex-1 overflow-y-auto p-4">{isLoading ? <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />)}</div> : items.length === 0 ? <div className="flex h-full flex-col items-center justify-center py-12 text-center"><p className="text-slate-500">لا يوجد مرضى في الانتظار</p><p className="mt-1 text-sm text-slate-400">القائمة فارغة حاليًا</p></div> : <div className="space-y-3">{items.map((item,index) => { const isWaiting=item.sessionStatus==='waiting'; const lockedByOther=!!item.lockHolderId; return <div key={item.sessionId} className={cn('rounded-2xl border bg-white p-4 transition-all',selectedSessionId===item.sessionId?'border-[#1B2A4A] bg-blue-50/40':'border-slate-200',draggedId===item.sessionId&&'opacity-60',busyId===item.sessionId&&'pointer-events-none opacity-60')}><div className="flex items-start gap-3">{isWaiting ? <PermissionGuard required="edit_queue" fallback={<div className="pt-1 text-slate-300"><GripVertical className="h-5 w-5" /></div>}><button type="button" draggable={!lockedByOther} onDragStart={()=>setDraggedId(item.sessionId)} onDragEnd={()=>setDraggedId(null)} onDragOver={(event)=>event.preventDefault()} onDrop={()=>void handleDrop(item.sessionId)} className="cursor-grab pt-1 text-slate-400" aria-label="إعادة ترتيب"><GripVertical className="h-5 w-5" /></button></PermissionGuard> : <div className="pt-1 text-slate-200"><GripVertical className="h-5 w-5" /></div>}<button type="button" onClick={()=>handleSelect(item.sessionId)} className="min-w-0 flex-1 text-right"><div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-2"><span className="truncate font-semibold text-slate-800">{item.patientName}</span><PriorityBadge priority={item.priority}/></div><SlaIndicator status={item.slaStatus} waitMinutes={item.waitMinutes}/></div>{item.procedureName&&<p className="mt-1 truncate text-sm text-slate-500">{item.procedureName}</p>}</button><div className="flex flex-col items-end gap-2"><LockIndicator holderName={item.lockHolderName}/><PermissionGuard required="edit_queue"><button type="button" onClick={()=>void handleLock(item)} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">{item.lockHolderId?'تحرير':'قفل'}</button></PermissionGuard></div></div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-400"><span>الموقع {index+1}</span>{item.coreScoreDisplay!==null&&<span className="font-mono">Core Score {item.coreScoreDisplay}</span>}</div></div>})}</div>}</div></div>
}
