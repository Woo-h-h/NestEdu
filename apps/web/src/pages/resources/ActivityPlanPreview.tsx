import { useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import { FileText, Loader2 } from 'lucide-react'

interface Props {
  plans: TeachingPlan[]
  loading?: boolean
  activePlanId?: string | null
  onActivePlanChange?: (plan: TeachingPlan) => void
}

export default function ActivityPlanPreview({
  plans,
  loading = false,
  activePlanId,
  onActivePlanChange,
}: Props) {
  const [localIndex, setLocalIndex] = useState(0)

  const activeIndex =
    activePlanId != null
      ? Math.max(
          0,
          plans.findIndex((p) => p.id === activePlanId)
        )
      : localIndex

  const plan = plans[activeIndex]

  const selectPlan = (index: number) => {
    setLocalIndex(index)
    const next = plans[index]
    if (next) onActivePlanChange?.(next)
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-nest-muted">
        <Loader2 size={28} className="animate-spin text-nest-leaf" />
        <p className="text-sm">正在生成活动方案…</p>
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-nest-leaf/20 bg-nest-mist/20 px-6 text-center">
        <FileText size={36} className="text-nest-leaf/40" />
        <p className="font-display text-base font-medium text-nest-ink">方案预览区</p>
        <p className="max-w-xs text-sm leading-relaxed text-nest-muted">
          填写左侧条件并生成后，将在此以文档形式预览单次活动方案
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col">
      {plans.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2 border-b border-nest-leaf/10 pb-3">
          {plans.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPlan(i)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                i === activeIndex
                  ? 'bg-nest-leaf text-white shadow-sm shadow-nest-leaf/20'
                  : 'border border-nest-leaf/10 bg-white text-nest-muted hover:bg-nest-mist hover:text-nest-pine'
              }`}
            >
              {p.domain.split('、')[0]?.trim() || `方案 ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {plan && (
        <article className="flex-1 overflow-y-auto rounded-xl border border-nest-leaf/10 bg-white p-5 shadow-sm shadow-nest-leaf/5">
          <header className="border-b border-nest-leaf/10 pb-4">
            <h3 className="font-display text-lg font-semibold text-nest-ink">{plan.title}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {plan.domain.split('、').map((d) => (
                <span
                  key={d}
                  className="rounded-full bg-nest-mist px-2.5 py-0.5 text-xs font-medium text-nest-pine"
                >
                  {d.trim()}
                </span>
              ))}
              {plan.gradeLevel && (
                <span className="rounded-full bg-nest-sand/60 px-2.5 py-0.5 text-xs text-nest-muted">
                  {plan.gradeLevel}
                </span>
              )}
            </div>
          </header>

          {plan.objectives && (
            <section className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nest-pine">
                活动目标
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-nest-ink">
                {plan.objectives}
              </p>
            </section>
          )}

          {plan.content && (
            <section className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nest-pine">
                活动内容
              </h4>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-nest-ink/90">
                {plan.content}
              </div>
            </section>
          )}
        </article>
      )}
    </div>
  )
}
