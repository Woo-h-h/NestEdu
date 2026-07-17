import { useCallback, useEffect, useState } from 'react'
import type { WeeklyPlan } from '@/types/weeklyPlan'
import { getSavedPlans } from '@/api/weeklyPlan'

export function useWeeklyPlanHistory() {
  const [plans, setPlans] = useState<WeeklyPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSavedPlans()
      setPlans(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadPlans()
    })
  }, [loadPlans])

  return { plans, loading, error, loadPlans }
}
