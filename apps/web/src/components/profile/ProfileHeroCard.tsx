import { Link } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'
import type { CategoryCountItem } from '@/lib/profile-metrics'

type AuthUser = { displayNameHint?: unknown }

export function resolveProfileDisplayName(authInfo: AuthUser | null | undefined): string {
  const hint = authInfo?.displayNameHint
  if (typeof hint === 'string' && hint.trim()) return hint.trim()
  const uid =
    (authInfo as { uid_hash?: string; uid?: string } | null)?.uid_hash ||
    (authInfo as { uid?: string } | null)?.uid
  if (typeof uid === 'string' && uid.trim() && !uid.startsWith('growth_')) {
    return `${uid.slice(0, 8)}…`
  }
  return '老师'
}

interface ProfileHeroCardProps {
  displayName: string
  teacherRecordCount: number
  categoryCounts: CategoryCountItem[]
}

export default function ProfileHeroCard({
  displayName,
  teacherRecordCount,
  categoryCounts,
}: ProfileHeroCardProps) {
  const initial = displayName.charAt(0) || '师'
  const systemTotal = categoryCounts
    .filter((c) => c.source === 'system')
    .reduce((sum, c) => sum + c.count, 0)

  return (
    <section className="relative overflow-hidden rounded-3xl border border-nest-leaf/10 bg-gradient-to-br from-[#173f34] via-[#1e5142] to-[#39705e] px-6 py-8 text-white shadow-lg shadow-nest-pine/15 md:px-9 md:py-10">
      <div className="nest-orb pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex flex-wrap items-start gap-6">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold ring-1 ring-white/20"
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-emerald-50/80">个人成长画像 · 非排名、非绩效评分</p>
          <h1 className="font-display mt-1 text-2xl font-bold tracking-wide md:text-3xl">
            {displayName}
          </h1>
          <p className="mt-1 text-sm text-emerald-50/85">华中科技大学幼儿园附属幼儿园 · 华科附幼</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <StatPill label="教师录入" value={String(teacherRecordCount)} />
            <StatPill label="系统生成" value={systemTotal > 0 ? String(systemTotal) : '待接入'} muted />
          </div>
        </div>
        <Link
          to="/archive"
          className="relative z-10 inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/12 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20"
        >
          <FolderKanban size={16} />
          管理成果
        </Link>
      </div>
    </section>
  )
}

function StatPill({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ${
        muted ? 'bg-white/8 ring-white/10 text-emerald-50/75' : 'bg-white/12 ring-white/15'
      }`}
    >
      <span className="text-emerald-50/70">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  )
}
