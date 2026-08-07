import { useCallback, useEffect, useMemo, useState } from 'react'
import { listGrowthRecords } from '@/api/growth'
import { fetchArchivePlansForOwnerFolder } from '@/api/knowledge'
import {
  clearTeacherPhoneCache,
  fetchPlatformUserSelf,
  getCurrentTeacherPhone,
  refreshTeacherAuthIdentity,
  resolvePhoneFromAuthInfo,
  resolvePhoneFromUserSelf,
} from '@/api/platformUser'
import { fetchTeacherGeneratedDocStats } from '@/api/teacherGeneratedDocs'
import { authBridge } from '@/lib/authBridge'
import { getAuthIdentityKey } from '@/lib/authIdentity'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  loadActionStatesAsync,
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

function resolvePlatformDisplayName(user: {
  nickname: string
  realName: string
} | null): string {
  if (!user) return ''
  if (user.realName.trim()) return user.realName.trim()
  if (user.nickname.trim()) return user.nickname.trim()
  return ''
}

export function useProfileMetrics(initialSystemStats: SystemStats = EMPTY_SYSTEM_STATS) {
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [systemStats, setSystemStats] = useState<SystemStats>(initialSystemStats)
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actions, setActions] = useState<ProfileActionItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // 换账号后强制对齐父页登录态，避免仍用上一用户的手机号文件夹
      await refreshTeacherAuthIdentity()
      clearTeacherPhoneCache()

      const auth = authBridge.getAuthInfo()
      const loggedIn = Boolean(auth?.token)

      const localPromise = listGrowthRecords().catch(() => [] as GrowthRecord[])
      const statsPromise = (async (): Promise<SystemStats> => {
        try {
          const auth = authBridge.getAuthInfo()
          if (!auth?.token) return {}
          const phone = (await getCurrentTeacherPhone({ force: true })).trim()
          if (!phone) return {}
          const stats = await fetchTeacherGeneratedDocStats(phone)
          if (!stats) return { activityPlans: 0, weeklyPlans: 0, archivePlans: 0 }
          return {
            activityPlans: stats.activity,
            weeklyPlans: stats.weekly,
            archivePlans: 0,
          }
        } catch {
          return {}
        }
      })()

      let kbRecords: GrowthRecord[] = []
      let nextPhone = ''
      let nextDisplayName = ''
      let archiveCount = 0

      if (loggedIn) {
        try {
          const user = await fetchPlatformUserSelf()
          const authPhone = resolvePhoneFromAuthInfo(auth)
          nextPhone =
            resolvePhoneFromUserSelf(user) ||
            authPhone ||
            (await getCurrentTeacherPhone({ force: true }))
          // 若 /user/self 与鉴权手机号不一致，以鉴权为准
          if (authPhone && nextPhone && authPhone !== nextPhone) {
            console.warn('[Profile] phone mismatch, prefer auth', {
              authPhone,
              selfPhone: nextPhone,
            })
            nextPhone = authPhone
          }
          nextDisplayName = resolvePlatformDisplayName(user)
          setPhone(nextPhone)
          if (nextDisplayName) setDisplayName(nextDisplayName)

          if (nextPhone) {
            const archive = await fetchArchivePlansForOwnerFolder(nextPhone, { limit: 50 })
            kbRecords = archive.plans.map(planToGrowthRecord)
            archiveCount = archive.plans.length
          }
        } catch (err) {
          if (!nextPhone) {
            console.warn('[Profile] 加载个人成果库失败:', err)
          } else {
            setError(getApiErrorMessage(err, '加载个人成果库失败'))
          }
        }
      } else {
        setPhone('')
        setDisplayName('')
      }

      const [localRecords, nextStats] = await Promise.all([localPromise, statsPromise])
      const seen = new Set(kbRecords.map((item) => item.id))
      const merged = [
        ...kbRecords,
        ...localRecords.filter((item) => !item.id.startsWith('kb_') && !seen.has(item.id)),
      ]
      setRecords(merged)
      setSystemStats({
        ...initialSystemStats,
        ...nextStats,
        archivePlans: archiveCount,
      })
    } catch (err) {
      setError(getApiErrorMessage(err, '加载失败'))
    } finally {
      setLoading(false)
    }
  }, [initialSystemStats])

  useEffect(() => {
    void load()
  }, [load])

  // 父页换账号时重新加载画像数据（token / sub / bid 任一变化）
  useEffect(() => {
    let lastIdentity = getAuthIdentityKey(authBridge.getAuthInfo())
    return authBridge.subscribe((info) => {
      const identity = getAuthIdentityKey(info)
      if (identity === lastIdentity) return
      lastIdentity = identity
      setPhone('')
      setDisplayName('')
      void load()
    })
  }, [load])

  const summary = useMemo(
    () => buildProfileSummary(records, systemStats),
    [records, systemStats]
  )

  // actionSeeds 每次 build 都是新数组；按 id 签名避免无意义 setState
  const actionSeedsKey = summary.actionSeeds.map((item) => item.id).join('|')
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const store = await loadActionStatesAsync()
      if (cancelled) return
      setActions(mergeActionSeeds(summary.actionSeeds, store))
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 依赖 actionSeedsKey
  }, [actionSeedsKey])

  const updateAction = useCallback(
    (id: string, patch: Partial<{ checked: boolean; status: ActionStatus; date: string; progress: number }>) => {
      setActions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
      )
      void saveActionState(id, patch)
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
