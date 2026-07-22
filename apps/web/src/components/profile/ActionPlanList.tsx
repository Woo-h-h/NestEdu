import type { ProfileActionItem } from '@/lib/profile-actions'
import type { ActionStatus } from '@/lib/profile-actions'
import { Calendar, CheckSquare } from 'lucide-react'

interface ActionPlanListProps {
  actions: ProfileActionItem[]
  onToggle: (id: string, checked: boolean) => void
  onUpdate: (
    id: string,
    patch: Partial<{ date: string; progress: number; status: ActionStatus }>
  ) => void
}

export default function ActionPlanList({ actions, onToggle, onUpdate }: ActionPlanListProps) {
  if (actions.length === 0) {
    return (
      <p className="text-sm text-nest-muted">暂无行动建议，请先录入成果以生成个性化建议。</p>
    )
  }

  return (
    <ul className="space-y-3">
      {actions.map((action) => (
        <li
          key={action.id}
          className="rounded-xl border border-nest-leaf/10 bg-white/70 p-4 transition hover:border-nest-leaf/20"
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={action.checked}
              onChange={(e) => onToggle(action.id, e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-nest-leaf/30 text-nest-leaf focus:ring-nest-leaf/30"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`font-medium ${action.checked ? 'text-nest-muted line-through' : 'text-nest-ink'}`}
                >
                  {action.title}
                </span>
                {action.dimensionId && (
                  <span className="rounded-full bg-nest-mist px-2 py-0.5 text-[10px] text-nest-pine">
                    {action.dimensionId}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-nest-muted">{action.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-1.5 text-xs text-nest-muted">
                  <Calendar size={13} />
                  计划日期
                  <input
                    type="date"
                    value={action.date}
                    onChange={(e) =>
                      onUpdate(action.id, { date: e.target.value, status: 'planned' })
                    }
                    className="field-input !w-auto !py-1 text-xs"
                  />
                </label>
                <label className="inline-flex min-w-[140px] flex-1 items-center gap-2 text-xs text-nest-muted">
                  <CheckSquare size={13} />
                  进度 {action.progress}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={action.progress}
                    onChange={(e) => {
                      const progress = Number(e.target.value)
                      onUpdate(action.id, {
                        progress,
                        status: progress >= 100 ? 'completed' : 'planned',
                        ...(progress >= 100 ? {} : {}),
                      })
                      if (progress >= 100 && !action.checked) {
                        onToggle(action.id, true)
                      }
                    }}
                    className="h-1.5 flex-1 accent-nest-leaf"
                  />
                </label>
              </div>
            </div>
          </label>
        </li>
      ))}
    </ul>
  )
}
