import { useEffect, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import { fetchKnowledgePlanById } from '@/api/knowledge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface Props {
  plan: TeachingPlan | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PlanDetailDialog({ plan, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<TeachingPlan | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !plan) {
      setDetail(null)
      return
    }

    setDetail(plan)
    const needsFetch =
      plan.source === 'platform' &&
      (!plan.content || plan.content.trim().length < 80 || plan.content === plan.objectives)

    if (!needsFetch) return

    let cancelled = false
    setLoading(true)
    void fetchKnowledgePlanById(plan.id)
      .then((full) => {
        if (!cancelled && full) setDetail(full)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, plan])

  const view = detail || plan

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{view?.title || '教案详情'}</DialogTitle>
          <DialogDescription>查看教案目标与完整正文</DialogDescription>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {view?.source && (
              <span className="rounded bg-nest-sand/80 px-1.5 py-0.5 text-xs text-nest-pine">
                {view.source === 'platform'
                  ? '平台'
                  : view.source === 'ai'
                    ? '主题生成'
                    : '预设'}
              </span>
            )}
            {view?.domain
              ?.split('、')
              .filter(Boolean)
              .map((d) => (
                <span
                  key={d}
                  className="rounded bg-nest-mist px-1.5 py-0.5 text-xs text-nest-muted"
                >
                  {d.trim()}
                </span>
              ))}
            {view?.gradeLevel && (
              <span className="rounded bg-sky-50 px-1.5 py-0.5 text-xs text-sky-700">
                {view.gradeLevel}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1 text-sm text-nest-ink">
          {loading && (
            <div className="flex items-center gap-2 text-nest-muted">
              <Loader2 size={14} className="animate-spin text-nest-leaf" /> 正在加载完整内容…
            </div>
          )}

          {view?.objectives && (
            <section>
              <h3 className="mb-1.5 text-xs font-semibold text-nest-muted">活动目标</h3>
              <p className="whitespace-pre-wrap rounded-xl border border-nest-leaf/10 bg-nest-mist/40 p-3 leading-relaxed">
                {view.objectives}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-1.5 text-xs font-semibold text-nest-muted">完整内容</h3>
            <div className="min-h-[120px] whitespace-pre-wrap rounded-xl border border-nest-leaf/10 bg-white p-3 leading-relaxed">
              {view?.content?.trim() || '暂无正文内容'}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
