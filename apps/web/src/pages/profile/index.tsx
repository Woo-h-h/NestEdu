import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Loader2, Plus, ShieldCheck } from 'lucide-react'
import { authBridge } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'
import ProfileHeroCard, { resolveProfileDisplayName } from '@/components/profile/ProfileHeroCard'
import DimensionCards from '@/components/profile/DimensionCards'
import RadarChart from '@/components/profile/RadarChart'
import TrendChart from '@/components/profile/TrendChart'
import DonutChart from '@/components/profile/DonutChart'
import StrengthGapPanel from '@/components/profile/StrengthGapPanel'
import ActionPlanList from '@/components/profile/ActionPlanList'
import PathCards from '@/components/profile/PathCards'
import AnnualReportModal from '@/components/profile/AnnualReportModal'
import { useProfileMetrics } from '@/hooks/useProfileMetrics'

const REPORT_YEAR = new Date().getFullYear()

export default function ProfilePage() {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const [reportOpen, setReportOpen] = useState(false)
  const {
    loading,
    error,
    isEmpty,
    teacherRecordCount,
    dimensions,
    categoryCounts,
    radar,
    trend,
    analysis,
    wordCloud,
    paths,
    representatives,
    actions,
    updateAction,
    toggleChecked,
    load,
  } = useProfileMetrics()

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  const displayName = useMemo(() => resolveProfileDisplayName(authInfo), [authInfo])

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <ProfileHeroCard
        displayName={displayName}
        teacherRecordCount={teacherRecordCount}
        categoryCounts={categoryCounts}
      />

      <ComplianceBanner className="mt-5" />

      {loading ? (
        <div className="surface-panel mt-6 flex items-center justify-center gap-2 p-12 text-nest-muted">
          <Loader2 size={18} className="animate-spin" />
          加载成长数据…
        </div>
      ) : error ? (
        <div className="surface-panel mt-6 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={() => void load()} className="btn-secondary mt-4">
            重试
          </button>
        </div>
      ) : isEmpty ? (
        <EmptyState className="mt-6" />
      ) : (
        <div className="mt-8 space-y-8">
          <section>
            <SectionHead
              title="成长结构维度"
              desc="由系统生成与教师录入成果共同形成的结构观察，非能力或绩效评分。"
            />
            <DimensionCards dimensions={dimensions} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartPanel title="结构雷达" desc="各维度结构丰富度（0–100）">
              <RadarChart labels={radar.labels} values={radar.values} />
            </ChartPanel>
            <ChartPanel title="录入类别分布" desc="教师录入三类成果占比">
              <DonutChart items={categoryCounts} />
            </ChartPanel>
          </section>

          <section className="surface-panel p-5">
            <SectionHead title="年度趋势" desc="各成长维度按年度的记录量变化" />
            <TrendChart series={trend} />
          </section>

          <section>
            <SectionHead title="优势与待发展" desc="基于可解释规则引擎分析，非 AI 生成排名" />
            <StrengthGapPanel strengths={analysis.strengths} gaps={analysis.gaps} />
          </section>

          <section className="surface-panel p-5">
            <SectionHead title="行动建议" desc="勾选、设定计划日期与进度，数据保存在本地浏览器" />
            <ActionPlanList actions={actions} onToggle={toggleChecked} onUpdate={updateAction} />
          </section>

          <section>
            <SectionHead title="路径与主题" desc="成长路径匹配度仅供个人参考" />
            <PathCards paths={paths} wordCloud={wordCloud} />
          </section>

          {representatives.length > 0 && (
            <section className="surface-panel p-5">
              <SectionHead title="代表成果" desc="来自成果库标记或自动选取的展示条目" />
              <ul className="mt-3 divide-y divide-nest-leaf/10">
                {representatives.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <span className="font-medium text-nest-ink">{r.name}</span>
                      <span className="ml-2 text-nest-muted">
                        {r.category} · {r.year}
                      </span>
                    </div>
                    {r.representative && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                        代表成果
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <Link to="/archive" className="btn-secondary mt-4 inline-flex text-xs">
                在成果库管理代表成果
              </Link>
            </section>
          )}
        </div>
      )}

      <div className="no-print mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-nest-leaf/10 pt-8">
        <p className="max-w-lg text-xs leading-relaxed text-nest-muted">
          画像与报告数据均来自您的成果记录本地聚合；系统生成统计全面接入后将自动纳入「保教活动」维度。
        </p>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          disabled={loading}
          className="btn-primary shrink-0"
        >
          <FileText size={16} />
          生成年度成长报告
        </button>
      </div>

      <AnnualReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        displayName={displayName}
        year={REPORT_YEAR}
        dimensions={dimensions}
        categoryCounts={categoryCounts}
        radar={radar}
        trend={trend}
        strengths={analysis.strengths}
        gaps={analysis.gaps}
        paths={paths}
        wordCloud={wordCloud}
        representatives={representatives}
        actions={actions}
        teacherRecordCount={teacherRecordCount}
      />
    </div>
  )
}

function ComplianceBanner({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-nest-leaf/15 bg-nest-mist/50 px-4 py-3 text-sm text-nest-pine ${className}`}
    >
      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-nest-leaf" />
      <p className="leading-relaxed">
        教师画像用于<strong className="font-medium">个人专业发展观察</strong>，不构成排名、绩效评分或与他人对比依据。
        雷达与匹配度均为<strong className="font-medium">成长结构</strong>描述。
      </p>
    </div>
  )
}

function EmptyState({ className }: { className?: string }) {
  return (
    <div className={`surface-panel p-10 text-center ${className}`}>
      <p className="font-display text-lg font-semibold text-nest-ink">尚无足够数据生成画像</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-nest-muted">
        请先在成果库录入专业研究成果、获奖与荣誉或学习与研修记录；保存活动方案与周计划后，系统统计也将纳入结构观察。
      </p>
      <Link to="/archive/upload" className="btn-primary mt-6 inline-flex">
        <Plus size={16} />
        录入第一条成果
      </Link>
      <Link to="/archive" className="btn-secondary mt-3 ml-0 inline-flex md:ml-3">
        查看成果库
      </Link>
    </div>
  )
}

function SectionHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold text-nest-ink">{title}</h2>
      <p className="mt-1 text-sm text-nest-muted">{desc}</p>
    </div>
  )
}

function ChartPanel({
  title,
  desc,
  children,
}: {
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="surface-panel flex flex-col p-5">
      <SectionHead title={title} desc={desc} />
      <div className="flex flex-1 items-center justify-center">{children}</div>
    </div>
  )
}
