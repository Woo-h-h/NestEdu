import { useCallback, type ReactNode } from 'react'
import { Printer, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import RadarChart from '@/components/profile/RadarChart'
import type { ProfileActionItem } from '@/lib/profile-actions'
import type {
  AnalysisItem,
  CategoryCountItem,
  GrowthPath,
  ProfileDimension,
  WordCloudItem,
  YearTrendSeries,
} from '@/lib/profile-metrics'
import type { GrowthRecord } from '@/types/growth'

interface AnnualReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  displayName: string
  year: number
  dimensions: ProfileDimension[]
  categoryCounts: CategoryCountItem[]
  radar: { labels: string[]; values: number[] }
  trend: YearTrendSeries[]
  strengths: AnalysisItem[]
  gaps: AnalysisItem[]
  paths: GrowthPath[]
  wordCloud: WordCloudItem[]
  representatives: GrowthRecord[]
  actions: ProfileActionItem[]
  teacherRecordCount: number
}

export default function AnnualReportModal({
  open,
  onOpenChange,
  displayName,
  year,
  dimensions,
  categoryCounts,
  radar,
  strengths,
  gaps,
  paths,
  wordCloud,
  representatives,
  actions,
  teacherRecordCount,
}: AnnualReportModalProps) {
  const handlePrint = useCallback(() => {
    document.body.classList.add('printing')
    window.print()
    window.setTimeout(() => document.body.classList.remove('printing'), 500)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="profile-report-dialog no-print-chrome max-h-[90vh] w-[min(920px,calc(100%-2rem))] overflow-y-auto sm:max-w-[920px]"
      >
        <DialogHeader className="no-print sticky top-0 z-10 -mx-4 -mt-4 flex-row items-center justify-between border-b bg-popover px-4 py-3">
          <DialogTitle className="font-display text-lg">年度成长报告预览</DialogTitle>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handlePrint} className="btn-primary !py-2 text-xs">
              <Printer size={14} />
              打印 / 另存 PDF
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-secondary !py-2 text-xs"
            >
              <X size={14} />
              关闭
            </button>
          </div>
        </DialogHeader>

        <article id="annual-report-print" className="profile-report-body space-y-8 px-1 py-4">
          <header className="border-b border-nest-leaf/15 pb-6 text-center">
            <p className="text-xs text-nest-muted">华中科技大学幼儿园附属幼儿园 · 华科附幼</p>
            <h1 className="font-display mt-2 text-2xl font-bold text-nest-ink">
              {year} 年度教师成长报告
            </h1>
            <p className="mt-2 text-sm text-nest-muted">{displayName}</p>
            <p className="mt-4 rounded-xl bg-nest-mist/60 px-4 py-2 text-xs leading-relaxed text-nest-muted">
              本报告基于系统生成成果（待全面接入）与教师录入成果聚合生成，反映个人成长结构观察，
              <strong className="font-medium text-nest-pine"> 不包含排名、绩效评分或与他人对比</strong>。
            </p>
          </header>

          <ReportSection title="一、成长结构概览">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              {dimensions.map((d) => (
                <div key={d.id} className="rounded-lg bg-nest-mist/50 p-3">
                  <p className="text-xs text-nest-muted">{d.label}</p>
                  <p className="mt-1 text-xl font-bold text-nest-leaf">{d.count}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-nest-muted">
              教师录入 {teacherRecordCount} 条 · 系统生成{' '}
              {categoryCounts
                .filter((c) => c.source === 'system')
                .reduce((s, c) => s + c.count, 0) || '待接入'}
            </p>
          </ReportSection>

          <ReportSection title="二、结构雷达（非能力评分）">
            <div className="flex justify-center">
              <RadarChart labels={radar.labels} values={radar.values} size={260} />
            </div>
          </ReportSection>

          <ReportSection title="三、优势与待发展">
            <TwoColList title="优势" items={strengths} />
            <TwoColList title="待发展" items={gaps} className="mt-4" />
          </ReportSection>

          <ReportSection title="四、代表成果">
            {representatives.length === 0 ? (
              <p className="text-sm text-nest-muted">暂无代表成果，请在成果库标记。</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {representatives.map((r) => (
                  <li key={r.id} className="rounded-lg border border-nest-leaf/10 p-3">
                    <span className="font-medium text-nest-ink">{r.name}</span>
                    <span className="mx-2 text-nest-muted">·</span>
                    <span className="text-nest-muted">
                      {r.category} · {r.year} · {r.level}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ReportSection>

          <ReportSection title="五、成长路径参考">
            <ul className="space-y-2 text-sm">
              {paths.map((p) => (
                <li key={p.id} className="flex justify-between gap-4 rounded-lg bg-nest-mist/40 p-3">
                  <span>
                    <span className="font-medium text-nest-ink">{p.label}</span>
                    <span className="mt-1 block text-nest-muted">{p.description}</span>
                  </span>
                  <span className="shrink-0 text-nest-leaf">当前匹配度 {p.matchPercent}%</span>
                </li>
              ))}
            </ul>
          </ReportSection>

          {wordCloud.length > 0 && (
            <ReportSection title="六、关注主题">
              <p className="text-sm text-nest-muted">{wordCloud.slice(0, 12).map((w) => w.word).join(' · ')}</p>
            </ReportSection>
          )}

          <ReportSection title="七、行动计划进展">
            <ul className="space-y-2 text-sm">
              {actions.slice(0, 6).map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span className={a.checked ? 'text-nest-muted line-through' : 'text-nest-ink'}>
                    {a.title}
                  </span>
                  <span className="text-nest-muted">{a.progress}%</span>
                </li>
              ))}
            </ul>
          </ReportSection>

          <footer className="border-t border-nest-leaf/15 pt-4 text-xs leading-relaxed text-nest-muted">
            <p>数据说明：报告数据来源于 NestEdu 成果库与系统生成统计（部分待接入），生成时间为浏览器本地计算结果。</p>
            <p className="mt-2">
              合规声明：本报告仅用于教师个人专业发展参考，不得用于排名、考核打分或与他人比较。
            </p>
          </footer>
        </article>
      </DialogContent>
    </Dialog>
  )
}

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display mb-3 text-base font-semibold text-nest-pine">{title}</h2>
      {children}
    </section>
  )
}

function TwoColList({
  title,
  items,
  className,
}: {
  title: string
  items: AnalysisItem[]
  className?: string
}) {
  return (
    <div className={className}>
      <h3 className="mb-2 text-sm font-medium text-nest-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-nest-muted">暂无</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.title} className="text-nest-muted">
              <span className="font-medium text-nest-ink">{item.title}：</span>
              {item.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
