import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  listGrowthRecords,
  saveGrowthRecord,
  deleteGrowthRecord,
  toggleRepresentative,
} from '@/api/growth'
import type {
  GrowthRecord,
  GrowthRecordInput,
  GrowthFilters,
  GrowthViewMode,
} from '@/types/growth'

const defaultFilters: GrowthFilters = {
  year: '',
  category: '',
  level: '',
  status: '',
  keyword: '',
}

export function useGrowthRecords() {
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<GrowthFilters>(defaultFilters)
  const [viewMode, setViewMode] = useState<GrowthViewMode>('cards')

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

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (filters.year && String(record.year) !== filters.year) return false
      if (filters.category && record.category !== filters.category) return false
      if (filters.level && record.level !== filters.level) return false
      if (filters.status && record.status !== filters.status) return false
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase()
        const haystack = [record.name, record.intro, record.org, ...(record.keywords || [])]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      return true
    })
  }, [records, filters])

  const save = useCallback(async (input: GrowthRecordInput) => {
    const saved = await saveGrowthRecord(input)
    setRecords((prev) => {
      const index = prev.findIndex((item) => item.id === saved.id)
      if (index >= 0) {
        const next = [...prev]
        next[index] = saved
        return next
      }
      return [saved, ...prev]
    })
    return saved
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteGrowthRecord(id)
    setRecords((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toggleRep = useCallback(async (id: string, representative: boolean) => {
    const saved = await toggleRepresentative(id, representative)
    setRecords((prev) => prev.map((item) => (item.id === id ? saved : item)))
    return saved
  }, [])

  const updateFilter = useCallback(<K extends keyof GrowthFilters>(key: K, value: GrowthFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  return {
    records,
    loading,
    error,
    filters,
    viewMode,
    filteredRecords,
    load,
    save,
    remove,
    toggleRep,
    setViewMode,
    updateFilter,
    resetFilters,
  }
}
