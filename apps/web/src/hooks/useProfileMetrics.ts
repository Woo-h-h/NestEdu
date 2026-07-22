import { useCallback, useEffect, useMemo, useState } from 'react'
import { listGrowthRecords } from '@/api/growth'
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

export function useProfileMetrics(systemStats: SystemStats = {}) {
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actions, setActions] = useState<ProfileActionItem[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const next = await listGrowthRecords()
      setRecords(next)
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
