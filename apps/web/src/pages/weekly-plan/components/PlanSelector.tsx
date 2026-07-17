import { useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import { Check, Loader2, Trash2 } from 'lucide-react'

interface Props {
  plans: TeachingPlan[]
  selected: TeachingPlan[]
  onChange: (plans: TeachingPlan[]) => void
  loading?: boolean
  sourceHint?: string
  emptyHint?: string
  onDelete?: (plan: TeachingPlan) => void | Promise<void>
  deleting?: boolean
}

const sourceTag: Record<string, string> = {
  ai: '主题生成',
  platform: '平台',
  preset: '预设',
}

export default function PlanSelector({
  plans,
  selected,
  onChange,
  loading = false,
  sourceHint,
  emptyHint = '暂无候选教案，请先从上方来源生成或加载',
  onDelete,
  deleting = false,
}: Props) {
  const [domain, setDomain] = useState('全部')

  const domains = [
    '全部',
    ...Array.from(
      new Set(
        plans.flatMap((p) =>
          p.domain.split('、').map((d) => d.replace(/[（）()]/g, '').trim())
        )
      )
    ),
  ]

  const filtered = domain === '全部' ? plans : plans.filter((p) => p.domain.includes(domain))

  const toggle = (plan: TeachingPlan) => {
    onChange(
      selected.some((p) => p.id === plan.id)
        ? selected.filter((p) => p.id !== plan.id)
        : [...selected, plan]
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 font-medium text-nest-ink">
        <span className="font-display">教案候选池</span>
        {selected.length > 0 && (
          <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-leaf">
            已选择 {selected.length} 个
          </span>
        )}
        {sourceHint && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
            {sourceHint}
          </span>
        )}
      </div>

      {loading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-nest-muted">
          <Loader2 size={14} className="animate-spin text-nest-leaf" /> 正在加载教案...
        </div>
      )}

      {!loading && plans.length === 0 && (
        <p className="mb-3 text-sm text-nest-muted/80">{emptyHint}</p>
      )}

      {plans.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                domain === d
                  ? 'bg-nest-leaf text-white shadow-sm shadow-nest-leaf/20'
                  : 'border border-nest-leaf/10 bg-white text-nest-muted hover:bg-nest-mist hover:text-nest-pine'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((plan) => {
          const isSel = selected.some((p) => p.id === plan.id)
          const canDelete = Boolean(onDelete) && plan.source !== 'preset'
          return (
            <div
              key={plan.id}
              onClick={() => toggle(plan)}
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                isSel
                  ? 'border-nest-leaf bg-nest-mist/60 shadow-sm shadow-nest-leaf/10'
                  : 'border-nest-leaf/10 bg-white hover:border-nest-leaf/25 hover:shadow-sm'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-nest-ink">{plan.title}</h4>
                <div className="flex shrink-0 items-center gap-1">
                  {canDelete && (
                    <button
                      type="button"
                      title="删除"
                      disabled={deleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        void onDelete?.(plan)
                      }}
                      className="p-1 text-nest-muted hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isSel && <Check size={18} className="text-nest-leaf" />}
                </div>
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {plan.source && (
                  <span className="rounded bg-nest-sand/80 px-1.5 py-0.5 text-xs text-nest-pine">
                    {sourceTag[plan.source] || plan.source}
                  </span>
                )}
                {plan.domain.split('、').map((d) => (
                  <span
                    key={d}
                    className="rounded bg-nest-mist px-1.5 py-0.5 text-xs text-nest-muted"
                  >
                    {d.trim()}
                  </span>
                ))}
              </div>
              <p className="line-clamp-2 text-xs text-nest-muted/80">{plan.objectives}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
