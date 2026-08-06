import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  FolderKanban,
  Radar,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import { fetchTeacherGeneratedDocStats } from '@/api/teacherGeneratedDocs'
import { useArchiveKnowledge } from '@/hooks/useArchiveKnowledge'
import { authBridge } from '@/lib/authBridge'
import { isArchiveKnowledgeConfigured } from '@/api/knowledge'

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
    desc: '查看成长结构、优势短板与发展建议',
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
  statsLoading: boolean
  needsLogin: boolean
}

/** 与成果库 SummaryStat 同结构：来源提示 / 数值 / 维度名 */
function SummaryStat({
  label,
  value,
  hint,
  muted,
}: {
  label: string
  value: string
  hint: string
  muted?: boolean
}) {
  return (
    <div className={`surface-panel p-4 ${muted ? 'opacity-80' : ''}`}>
      <p className="text-xs text-nest-muted">{hint}</p>
      <p className="font-display mt-1 text-2xl font-bold text-nest-ink">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-nest-pine">{label}</p>
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [authTick, setAuthTick] = useState(0)
  const kb = useArchiveKnowledge()
  const archiveConfigured = isArchiveKnowledgeConfigured()
  const isLoggedIn = Boolean(authBridge.getAuthInfo()?.token)

  const [stats, setStats] = useState<DashboardStats>({
    activityCount: null,
    weeklyCount: null,
    statsLoading: true,
    needsLogin: !isLoggedIn,
  })

  useEffect(() => authBridge.subscribe(() => setAuthTick((n) => n + 1)), [])

  // 与成果库一致：登录后加载教师成果库个人文件夹文档
  useEffect(() => {
    void kb.loadPlatformPlans()
  }, [authTick, kb.loadPlatformPlans])

  // 与成果库一致：活动方案 / 周计划取 MySQL 本人入库计数
  useEffect(() => {
    let cancelled = false

    void (async () => {
      setStats((prev) => ({ ...prev, statsLoading: true }))
      const loggedIn = Boolean(authBridge.getAuthInfo()?.token)

      if (!loggedIn) {
        if (!cancelled) {
          setStats({
            activityCount: null,
            weeklyCount: null,
            statsLoading: false,
            needsLogin: true,
          })
        }
        return
      }

      try {
        const phone = (await getCurrentTeacherPhone()).trim()
        const mineStats = phone ? await fetchTeacherGeneratedDocStats(phone) : null
        if (cancelled) return
        setStats({
          activityCount: mineStats?.activity ?? 0,
          weeklyCount: mineStats?.weekly ?? 0,
          statsLoading: false,
          needsLogin: false,
        })
      } catch {
        if (cancelled) return
        setStats({
          activityCount: 0,
          weeklyCount: 0,
          statsLoading: false,
          needsLogin: false,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authTick])

  const formatCount = (n: CountState) => {
    if (stats.statsLoading) return '—'
    if (n === null) return '—'
    return String(n)
  }

  const archiveCountValue = !archiveConfigured
    ? '—'
    : kb.isLoadingPlatform
      ? '—'
      : String(kb.platformPlans.length)

  const archiveHint = !archiveConfigured
    ? '待配置分类 ID'
    : kb.listHint.includes('登录') || stats.needsLogin
      ? '需登录平台'
      : '平台知识库文件夹'

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
        <h1 className="relative mt-4 font-display text-3xl font-bold tracking-wide md:text-4xl">
          华科附幼 · 智能工作与成长
        </h1>
        <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/85 md:text-base">
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SummaryStat
            label="活动方案"
            value={formatCount(stats.activityCount)}
            hint={
              stats.activityCount === null
                ? '需登录平台'
                : stats.statsLoading
                  ? '统计中…'
                  : '本人入库'
            }
            muted={stats.activityCount === null}
          />
          <SummaryStat
            label="周计划"
            value={formatCount(stats.weeklyCount)}
            hint={
              stats.weeklyCount === null
                ? '需登录平台'
                : stats.statsLoading
                  ? '统计中…'
                  : '本人入库'
            }
            muted={stats.weeklyCount === null}
          />
          <SummaryStat
            label="教师成果库"
            value={archiveCountValue}
            hint={archiveHint}
            muted={!archiveConfigured || kb.platformPlans.length === 0}
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
          三项统计与成果库同步：活动方案 / 周计划（本人入库）· 教师成果库（个人文件夹）；画像仅用于个人发展，不进行排名。
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
              {stats.statsLoading || kb.isLoadingPlatform
                ? '正在加载成果数据…'
                : `活动方案 ${formatCount(stats.activityCount)} · 周计划 ${formatCount(stats.weeklyCount)} · 教师成果库 ${archiveCountValue}，与成果库页统计一致。`}
            </p>
          </div>
        </div>
        <ArrowRight size={18} className="shrink-0 text-nest-muted" />
      </button>
    </div>
  )
}
