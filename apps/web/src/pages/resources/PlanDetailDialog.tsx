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
              <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">
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
                  className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                >
                  {d.trim()}
                </span>
              ))}
            {view?.gradeLevel && (
              <span className="text-xs bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded">
                {view.gradeLevel}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm text-gray-700">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 size={14} className="animate-spin" /> 正在加载完整内容…
            </div>
          )}

          {view?.objectives && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 mb-1.5">活动目标</h3>
              <p className="whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
                {view.objectives}
              </p>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-500 mb-1.5">完整内容</h3>
            <div className="whitespace-pre-wrap leading-relaxed bg-white rounded-lg p-3 border border-gray-100 min-h-[120px]">
              {view?.content?.trim() || '暂无正文内容'}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
