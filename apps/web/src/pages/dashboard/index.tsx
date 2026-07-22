import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FolderKanban,
  Radar,
  Sparkles,
  Star,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listGrowthRecords } from '@/api/growth'
import { fetchKnowledgePlans, weeklyPlanKnowledgeScope } from '@/api/knowledge'
import { authBridge } from '@/lib/authBridge'

const quickEntries = [
  {
    path: '/activity',
    title: '活动方案生成',
    desc: '设计一次具体的集体、游戏、户外或生活活动',
    icon: BookOpen,
    tone: 'bg-nest-mist text-nest-leaf ring-nest-leaf/15 group-hover:bg-nest-leaf group-hover:text-white',
  },
  {
    path: '/weekly-plan',
    title: '周计划生成',
    desc: '统筹周一至周五的一日生活与保教安排',
    icon: CalendarDays,
    tone: 'bg-amber-50 text-amber-700 ring-amber-200/80 group-hover:bg-amber-600 group-hover:text-white',
  },
  {
    path: '/profile',
    title: '查看教师画像',
    desc: '查看成长结构、优势短板、发展建议与年度报告',
    icon: Radar,
    tone: 'bg-teal-50 text-teal-700 ring-teal-200/80 group-hover:bg-teal-700 group-hover:text-white',
  },
] as const

const growthLoopSteps = [
  { path: '/activity', label: '设计活动', step: '1' },
  { path: '/archive', label: '沉淀成果', step: '2' },
  { path: '/profile', label: '查看画像', step: '3' },
  { path: '/archive/upload', label: '录入补充', step: '4' },
] as const

type CountState = number | null

interface DashboardStats {
  activityCount: CountState
  weeklyCount: CountState
  growthCount: CountState
  representativeCount: CountState
  kbNeedsLogin: boolean
  loading: boolean
}

function formatCount(value: CountState): string {
  if (value === null) return '—'
  return String(value)
}

function StatCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string
  value: CountState
  hint?: string
  loading?: boolean
}) {
  return (
    <div className="surface-panel flex flex-col gap-1 p-4">
      <span className="text-xs text-nest-muted">{label}</span>
      <span
        className={`font-display text-2xl font-bold text-nest-ink ${loading ? 'animate-pulse text-nest-muted' : ''}`}
      >
        {formatCount(value)}
      </span>
      {hint ? <span className="text-[11px] text-amber-700">{hint}</span> : null}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats>({
    activityCount: null,
    weeklyCount: null,
    growthCount: null,
    representativeCount: null,
    kbNeedsLogin: false,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    void Promise.allSettled([
      listGrowthRecords(),
      fetchKnowledgePlans({ limit: 50, fallbackPreset: false }),
      fetchKnowledgePlans({ limit: 50, fallbackPreset: false, ...weeklyPlanKnowledgeScope() }),
    ]).then(([growthResult, activityResult, weeklyResult]) => {
      if (cancelled) return

      let growthCount: CountState = 0
      let representativeCount: CountState = 0
      if (growthResult.status === 'fulfilled') {
        growthCount = growthResult.value.length
        representativeCount = growthResult.value.filter((r) => r.representative).length
      }

      const isLoggedIn = Boolean(authBridge.getAuthInfo()?.token)
      let kbNeedsLogin = false
      let activityCount: CountState = null
      let weeklyCount: CountState = null

      if (activityResult.status === 'fulfilled') {
        const { plans, error } = activityResult.value
        if (error && /登录|未授权|401|token/i.test(error)) {
          kbNeedsLogin = true
          activityCount = null
        } else {
          activityCount = plans.length
        }
      } else if (!isLoggedIn) {
        kbNeedsLogin = true
      }

      if (weeklyResult.status === 'fulfilled') {
        const { plans, error } = weeklyResult.value
        if (error && /登录|未授权|401|token/i.test(error)) {
          kbNeedsLogin = true
          weeklyCount = null
        } else {
          weeklyCount = plans.length
        }
      } else if (!isLoggedIn) {
        kbNeedsLogin = true
      }

      if (!isLoggedIn && activityCount === null && weeklyCount === null) {
        kbNeedsLogin = true
      }

      setStats({
        activityCount,
        weeklyCount,
        growthCount,
        representativeCount,
        kbNeedsLogin,
        loading: false,
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  const kbHint = stats.kbNeedsLogin ? '需登录平台' : undefined

  return (
    <div className="page-enter mx-auto max-w-5xl">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-nest-leaf/10 bg-gradient-to-br from-[#173f34] via-[#1e5142] to-[#39705e] px-7 py-9 text-white shadow-lg shadow-nest-pine/15 md:px-10 md:py-11">
        <div
          className="nest-orb pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-nest-sand/15 blur-3xl"
          aria-hidden
        />
        <p className="relative inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs text-emerald-50/90 ring-1 ring-white/15">
          <Sparkles size={12} /> 启芽智教持续陪伴您的保教工作与专业成长
        </p>
        <h1 className="font-display relative mt-4 text-3xl font-bold tracking-wide md:text-4xl">
          华科附幼 · 智能工作与成长
        </h1>
        <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/85 md:text-[15px]">
          从一周安排到单次活动实施，再到资源沉淀和教师画像，在这里形成完整闭环。
        </p>
        <button
          type="button"
          onClick={() => navigate('/activity')}
          className="relative z-10 mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#1e5142] shadow-md transition hover:-translate-y-0.5"
        >
          <Sparkles size={16} />
          生成活动方案
        </button>
      </section>

      <section className="mb-6" aria-label="成果统计">
        <h2 className="mb-3 text-sm font-semibold text-nest-muted">数据概览</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="活动方案（知识库）"
            value={stats.activityCount}
            hint={stats.activityCount === null ? kbHint : undefined}
            loading={stats.loading}
          />
          <StatCard
            label="周计划（知识库）"
            value={stats.weeklyCount}
            hint={stats.weeklyCount === null ? kbHint : undefined}
            loading={stats.loading}
          />
          <StatCard
            label="教师录入成果"
            value={stats.growthCount}
            loading={stats.loading}
          />
          <StatCard
            label="代表成果"
            value={stats.representativeCount}
            loading={stats.loading}
          />
        </div>
      </section>

      <section className="mb-6" aria-label="个人成长闭环">
        <h2 className="mb-3 text-sm font-semibold text-nest-muted">个人成长闭环</h2>
        <div className="surface-panel grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          {growthLoopSteps.map((step) => (
            <button
              key={step.path}
              type="button"
              onClick={() => navigate(step.path)}
              className="group flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition hover:bg-nest-mist/60"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-nest-leaf/10 text-xs font-bold text-nest-leaf ring-1 ring-nest-leaf/20 group-hover:bg-nest-leaf group-hover:text-white">
                {step.step}
              </span>
              <span className="text-xs font-medium text-nest-ink">{step.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-nest-muted">
          系统自动统计活动方案与周计划；教师录入成果需手动补充。画像仅用于个人发展，不进行排名。
        </p>
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {quickEntries.map((entry) => {
          const Icon = entry.icon
          return (
            <button
              type="button"
              key={entry.path}
              onClick={() => navigate(entry.path)}
              className="surface-panel group flex flex-col p-5 text-left transition-transform duration-300 hover:-translate-y-0.5"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ring-1 transition-colors ${entry.tone}`}
              >
                <Icon size={20} />
              </div>
              <h2 className="font-display text-base font-semibold text-nest-ink">{entry.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-nest-muted">{entry.desc}</p>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate('/archive')}
        className="surface-panel flex w-full items-center justify-between gap-4 p-5 text-left transition hover:-translate-y-0.5"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nest-mist text-nest-leaf ring-1 ring-nest-leaf/15">
            <FolderKanban size={20} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-nest-ink">成果库</h2>
            <p className="mt-1 text-sm text-nest-muted">
              {stats.loading
                ? '正在加载成果数据…'
                : stats.growthCount !== null && stats.growthCount > 0
                  ? `已录入 ${stats.growthCount} 条教师成长成果${stats.representativeCount ? `，其中 ${stats.representativeCount} 条代表成果` : ''}；活动方案与周计划由知识库自动统计。`
                  : '系统生成成果与教师录入成果在此汇集，可前往录入专业成长记录。'}
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="shrink-0 text-nest-muted" />
      </button>

      {!stats.loading && stats.representativeCount !== null && stats.representativeCount > 0 ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-2.5 text-xs text-amber-800">
          <Star size={14} className="shrink-0" />
          您已标记 {stats.representativeCount} 条代表成果，可在教师画像中查看成长结构。
        </div>
      ) : null}
    </div>
  )
}
