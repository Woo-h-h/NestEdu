import { useCallback, useEffect, useMemo, useState } from 'react'
import { listGrowthRecords } from '@/api/growth'
import {
  fetchArchivePlansForOwnerFolder,
  fetchKnowledgePlans,
  weeklyPlanKnowledgeScope,
} from '@/api/knowledge'
import {
  getCurrentTeacherDisplayName,
  getCurrentTeacherPhone,
} from '@/api/platformUser'
import { authBridge } from '@/lib/authBridge'
import {
  mergeActionSeeds,
  saveActionState,
  type ActionStatus,
  type ProfileActionItem,
} from '@/lib/profile-actions'
import {
  buildProfileSummary,
  type SystemStats,
} from '@/lib/profile-metrics'
import type { GrowthRecord } from '@/types/growth'
import type { TeachingPlan } from '@/types/weeklyPlan'

const EMPTY_SYSTEM_STATS: SystemStats = {}

function parseYearFromText(...parts: string[]): number {
  const current = new Date().getFullYear()
  for (const part of parts) {
    const match = part.match(/(20\d{2}|19\d{2})/)
    if (match) {
      const year = Number(match[1])
      if (year >= 1990 && year <= current + 1) return year
    }
  }
  return current
}

function truncateIntro(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max)}…`
}

function planToGrowthRecord(plan: TeachingPlan): GrowthRecord {
  const now = new Date().toISOString()
  const intro = plan.objectives || truncateIntro(plan.content || '')
  return {
    id: `kb_${plan.id}`,
    name: plan.title || '未命名成果',
    year: parseYearFromText(plan.title, plan.content, plan.objectives),
    category: '获奖与荣誉',
    subtype: plan.domain || '平台成果',
    date: '',
    level: '',
    role: '',
    org: '',
    intro,
    keywords: [],
    status: '已完成',
    representative: false,
    extra: { source: 'knowledge' },
    files: [],
    createdAt: now,
    updatedAt: now,
  }
}

async function loadSystemStats(): Promise<SystemStats> {
  try {
    const weekly = weeklyPlanKnowledgeScope()
    const [activityRes, weeklyRes] = await Promise.allSettled([
      fetchKnowledgePlans({ limit: 50, fallbackPreset: false }),
      fetchKnowledgePlans({ limit: 50, fallbackPreset: false, ...weekly }),
    ])
    return {
      activityPlans:
        activityRes.status === 'fulfilled' && activityRes.value.source === 'platform'
          ? activityRes.value.plans.length
          : undefined,
      weeklyPlans:
        weeklyRes.status === 'fulfilled' && weeklyRes.value.source === 'platform'
          ? weeklyRes.value.plans.length
          : undefined,
    }
  } catch {
    return {}
  }
}

export function useProfileMetrics(externalSystemStats: SystemStats = EMPTY_SYSTEM_STATS) {
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loadedSystemStats, setLoadedSystemStats] = useState<SystemStats>({})
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actions, setActions] = useState<ProfileActionItem[]>([])

  const systemStats = useMemo(
    () => ({ ...loadedSystemStats, ...externalSystemStats }),
    [loadedSystemStats, externalSystemStats]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const auth = authBridge.getAuthInfo()
      const loggedIn = Boolean(auth?.token)

      const localPromise = listGrowthRecords().catch(() => [] as GrowthRecord[])
      const statsPromise = loadSystemStats()

      let kbRecords: GrowthRecord[] = []
      let nextPhone = ''
      let nextDisplayName = ''

      if (loggedIn) {
        try {
          const [phoneValue, nameValue] = await Promise.all([
            getCurrentTeacherPhone(),
            getCurrentTeacherDisplayName(),
          ])
          nextPhone = phoneValue
          nextDisplayName = nameValue
          setPhone(nextPhone)
          if (nextDisplayName) setDisplayName(nextDisplayName)

          if (nextPhone) {
            const archive = await fetchArchivePlansForOwnerFolder(nextPhone, { limit: 50 })
            kbRecords = archive.plans.map(planToGrowthRecord)
            if (archive.error && archive.plans.length === 0 && !archive.folders.length) {
              // 无个人文件夹时不阻断画像，仍可用本地录入 + 系统统计
              console.warn('[Profile]', archive.error)
            }
          }
        } catch (err) {
          console.warn('[Profile] 加载个人成果库失败:', err)
        }
      } else {
        setPhone('')
      }

      const [localRecords, nextStats] = await Promise.all([localPromise, statsPromise])
      const seen = new Set(kbRecords.map((item) => item.id))
      const merged = [
        ...kbRecords,
        ...localRecords.filter((item) => !seen.has(item.id) && !item.id.startsWith('kb_')),
      ]
      setRecords(merged)
      setLoadedSystemStats(nextStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(
    () => buildProfileSummary(records, systemStats),
    [records, systemStats]
  )

  useEffect(() => {
    setActions(mergeActionSeeds(summary.actionSeeds))
  }, [summary.actionSeeds])

  const updateAction = useCallback(
    (id: string, patch: Partial<{ checked: boolean; status: ActionStatus; date: string; progress: number }>) => {
      saveActionState(id, patch)
      setActions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      )
    },
    []
  )

  const toggleChecked = useCallback(
    (id: string, checked: boolean) => {
      updateAction(id, {
        checked,
        status: checked ? 'completed' : 'planned',
        progress: checked ? 100 : 0,
      })
    },
    [updateAction]
  )

  return {
    records,
    loading,
    error,
    phone,
    displayName,
    isEmpty: summary.isEmpty,
    teacherRecordCount: summary.teacherRecordCount,
    dimensions: summary.dimensions,
    categoryCounts: summary.categoryCounts,
    radar: summary.radar,
    trend: summary.trend,
    analysis: summary.analysis,
    wordCloud: summary.wordCloud,
    paths: summary.paths,
    representatives: summary.representatives,
    actions,
    load,
    updateAction,
    toggleChecked,
  }
}
