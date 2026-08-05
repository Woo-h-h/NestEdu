import { useCallback, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
import RadarChart from '@/components/profile/RadarChart'
import type {
  AnalysisItem,
  CategoryCountItem,
  ProfileDimension,
} from '@/lib/profile-metrics'
import type { GrowthRecord } from '@/types/growth'

export interface AnnualReportPanelProps {
  displayName: string
  year: number
  dimensions: ProfileDimension[]
  categoryCounts: CategoryCountItem[]
  radar: { labels: string[]; values: number[] }
  strengths: AnalysisItem[]
  gaps: AnalysisItem[]
  representatives: GrowthRecord[]
  teacherRecordCount: number
}

export default function AnnualReportPanel({
  displayName,
  year,
  dimensions,
  categoryCounts,
  radar,
  strengths,
  gaps,
  representatives,
  teacherRecordCount,
}: AnnualReportPanelProps) {
  const handlePrint = useCallback(() => {
    document.body.classList.add('printing')
    window.print()
    window.setTimeout(() => document.body.classList.remove('printing'), 500)
  }, [])

  return (
    <section className="surface-panel mt-8 space-y-4 p-5 md:p-6">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-nest-ink">年度成长报告</h2>
          <p className="mt-1 text-sm text-nest-muted">
            基于活动方案、周计划与教师成果库三维度自动生成，仅供个人发展参考。
          </p>
        </div>
        <button type="button" onClick={handlePrint} className="btn-primary shrink-0 !py-2 text-xs">
          <Printer size={14} />
          打印 / 另存 PDF
        </button>
      </div>

      <article id="annual-report-print" className="profile-report-body space-y-8 rounded-2xl border border-nest-leaf/10 bg-white/80 p-4 md:p-6">
        <header className="border-b border-nest-leaf/15 pb-6 text-center">
          <p className="text-xs text-nest-muted">华中科技大学幼儿园附属幼儿园 · 华科附幼</p>
          <h1 className="font-display mt-2 text-2xl font-bold text-nest-ink">
            {year} 年度教师成长报告
          </h1>
          <p className="mt-2 text-sm text-nest-muted">{displayName}</p>
          <p className="mt-4 rounded-xl bg-nest-mist/60 px-4 py-2 text-xs leading-relaxed text-nest-muted">
            本报告基于三维度成果聚合生成，反映个人成长结构观察，
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
            结构合计 {categoryCounts.reduce((s, c) => s + c.count, 0)} 条（活动方案 / 周计划 /
            教师成果库）· 教师录入 {teacherRecordCount} 条
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
              {representatives.map((item) => (
                <li key={item.id} className="rounded-lg border border-nest-leaf/10 p-3">
                  <span className="font-medium text-nest-ink">{item.name}</span>
                  <span className="mx-2 text-nest-muted">·</span>
                  <span className="text-nest-muted">
                    {item.category} · {item.year} · {item.level || '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ReportSection>

        <footer className="border-t border-nest-leaf/15 pt-4 text-xs leading-relaxed text-nest-muted">
          <p>
            数据说明：报告围绕三维度聚合——活动方案、周计划（本人入库）与教师成果库（平台个人文件夹）；生成时间为浏览器本地计算结果。
          </p>
          <p className="mt-2">
            合规声明：本报告仅用于教师个人专业发展参考，不得用于排名、考核打分或与他人比较。
          </p>
        </footer>
      </article>
    </section>
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
