import { useQueue } from '../shared/hooks/useQueue'
import { useQueueStore } from '../shared/store/queueStore'
import { cn } from '../lib/utils'
import type { QueueItem } from '../shared/store/queueStore'

interface LiveQueueBoardProps {
  onSelectSession?: (sessionId: string) => void
}

function SlaIndicator({ status, waitMinutes }: { status: string; waitMinutes: number }) {
  const colorMap: Record<string, string> = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-red-500 animate-pulse',
  }
  return (
    <div className="flex items-center gap-2">
      <span className={cn('w-2.5 h-2.5 rounded-full', colorMap[status] || colorMap.green)} />
      <span className="text-sm text-muted-foreground">{waitMinutes}m</span>
    </div>
  )
}

function LockIndicator({ holderName }: { holderName: string | null }) {
  if (!holderName) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4M5 11h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" />
        </svg>
        Available
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      {holderName}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: QueueItem['priority'] }) {
  const defaultConfig = { label: 'Medium', className: 'bg-blue-50 text-blue-700' }
  const config: Record<string, { label: string; className: string }> = {
    low_priority: { label: 'Low', className: 'bg-slate-100 text-slate-700' },
    medium_priority: { label: 'Medium', className: 'bg-blue-50 text-blue-700' },
    high_priority: { label: 'High', className: 'bg-orange-50 text-orange-700' },
    qualified: { label: 'Qualified', className: 'bg-emerald-50 text-emerald-700' },
    hot_lead: { label: 'Hot', className: 'bg-red-50 text-red-700' },
  }
  const { label, className } = config[priority] ?? defaultConfig
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', className)}>
      {label}
    </span>
  )
}

function QueueCard({ item, isSelected, onClick }: { item: QueueItem; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg border transition-all duration-200',
        'hover:shadow-md hover:border-primary/30',
        isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-foreground truncate">{item.patientName}</span>
            <PriorityBadge priority={item.priority} />
          </div>
          {item.procedureName && (
            <p className="text-sm text-muted-foreground truncate mb-2">{item.procedureName}</p>
          )}
          <LockIndicator holderName={item.lockHolderName} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <SlaIndicator status={item.slaStatus} waitMinutes={item.waitMinutes} />
          {item.coreScoreDisplay !== null && (
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              Score: {item.coreScoreDisplay}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function LiveQueueBoard({ onSelectSession }: LiveQueueBoardProps) {
  const { isLoading, error } = useQueue()
  const { items, selectedSessionId, selectSession, getActiveCount, getRedCount } = useQueueStore()

  const handleSelect = (sessionId: string) => {
    selectSession(sessionId)
    onSelectSession?.(sessionId)
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load queue</p>
        <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <h2 className="text-lg font-semibold text-foreground">Live Queue</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{getActiveCount()} waiting</span>
          </div>
          {getRedCount() > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>{getRedCount()} over SLA</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <svg className="w-16 h-16 text-muted-foreground/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-muted-foreground">No patients in queue</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Queue is empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <QueueCard
                key={item.sessionId}
                item={item}
                isSelected={selectedSessionId === item.sessionId}
                onClick={() => handleSelect(item.sessionId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
