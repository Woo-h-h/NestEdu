import { useEffect, useMemo, useState } from 'react'
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

function looksLikeArchiveDoc(plan: TeachingPlan | null | undefined): boolean {
  if (!plan) return false
  const blob = `${plan.title}\n${plan.content || ''}\n${plan.objectives || ''}`
  return (
    /原始文件|成果摘要|成果正文|文件地址|解析状态/.test(blob) ||
    /\.(png|jpe?g|gif|webp|bmp|pdf|docx?)$/i.test(plan.title || '')
  )
}

/** 简单渲染：保留换行，并把 markdown 图片/链接变成可点击内容 */
function RichPlainContent({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = text.replace(/\r\n/g, '\n').split('\n')
    return lines.map((line, idx) => {
      const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)\s*$/)
      if (image) {
        const [, alt, src] = image
        return (
          <p key={`img-${idx}`} className="my-2">
            <img
              src={src}
              alt={alt || '附件图片'}
              className="max-h-80 max-w-full rounded-lg border border-nest-leaf/15 object-contain"
              loading="lazy"
            />
          </p>
        )
      }
      const linkOnly = line.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\s*$/)
      if (linkOnly) {
        const [, label, href] = linkOnly
        return (
          <p key={`a-${idx}`} className="my-1">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-nest-leaf underline underline-offset-2 hover:text-nest-pine"
            >
              {label}
            </a>
          </p>
        )
      }
      return (
        <span key={`t-${idx}`}>
          {line}
          {idx < lines.length - 1 ? '\n' : ''}
        </span>
      )
    })
  }, [text])

  return <div className="whitespace-pre-wrap leading-relaxed">{blocks}</div>
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
  const archiveMode = looksLikeArchiveDoc(view)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{view?.title || (archiveMode ? '成果详情' : '教案详情')}</DialogTitle>
          <DialogDescription>
            {archiveMode ? '查看成果摘要与完整解析正文' : '查看教案目标与完整正文'}
          </DialogDescription>
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
              <h3 className="mb-1.5 text-xs font-semibold text-nest-muted">
                {archiveMode ? '成果摘要' : '活动目标'}
              </h3>
              <p className="whitespace-pre-wrap rounded-xl border border-nest-leaf/10 bg-nest-mist/40 p-3 leading-relaxed">
                {view.objectives}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-1.5 text-xs font-semibold text-nest-muted">完整内容</h3>
            <div className="min-h-[120px] rounded-xl border border-nest-leaf/10 bg-white p-3">
              {view?.content?.trim() ? (
                <RichPlainContent text={view.content} />
              ) : (
                <span className="text-nest-muted">暂无正文内容</span>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
