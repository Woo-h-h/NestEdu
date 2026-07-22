import { request } from '@/api/client'
import { isBackendApiEnabled } from '@/api/llm'
import type {
  GrowthRecord,
  GrowthRecordInput,
  GrowthListResponse,
  GrowthItemResponse,
  GrowthFilters,
} from '@/types/growth'

const STORAGE_KEY = 'nestedu_growth_records_v1'

interface ApiEnvelope<T> {
  success?: boolean
  result?: T
  errorMessage?: string
}

function unwrapResult<T>(data: ApiEnvelope<T> | T): T {
  if (data && typeof data === 'object' && 'result' in (data as ApiEnvelope<T>)) {
    const envelope = data as ApiEnvelope<T>
    if (envelope.success === false) {
      throw new Error(envelope.errorMessage || '请求失败')
    }
    return envelope.result as T
  }
  return data as T
}

function readLocalRecords(): GrowthRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GrowthRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocalRecords(records: GrowthRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function normalizeRecord(record: GrowthRecordInput, existing?: GrowthRecord): GrowthRecord {
  const now = new Date().toISOString()
  return {
    ...record,
    keywords: record.keywords || [],
    files: record.files || [],
    extra: record.extra || {},
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
}

function applyLocalFilters(records: GrowthRecord[], filters?: Partial<GrowthFilters>): GrowthRecord[] {
  if (!filters) return records
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
}

function buildQuery(filters?: Partial<GrowthFilters>) {
  const params: Record<string, string> = {}
  if (filters?.year) params.year = filters.year
  if (filters?.category) params.category = filters.category
  if (filters?.level) params.level = filters.level
  if (filters?.status) params.status = filters.status
  if (filters?.keyword) params.keyword = filters.keyword
  return params
}

export async function listGrowthRecords(filters?: Partial<GrowthFilters>): Promise<GrowthRecord[]> {
  if (isBackendApiEnabled()) {
    const data = await request.get<GrowthListResponse>('/api/v1/growth-records', {
      params: buildQuery(filters),
    })
    return unwrapResult(data) || []
  }
  return applyLocalFilters(readLocalRecords(), filters).sort((a, b) => {
    const dateA = a.date || a.createdAt
    const dateB = b.date || b.createdAt
    return dateB.localeCompare(dateA)
  })
}

export async function getGrowthRecord(id: string): Promise<GrowthRecord | null> {
  if (isBackendApiEnabled()) {
    try {
      const data = await request.get<GrowthItemResponse>(`/api/v1/growth-records/${id}`)
      return unwrapResult(data)
    } catch {
      return null
    }
  }
  return readLocalRecords().find((item) => item.id === id) || null
}

export async function saveGrowthRecord(input: GrowthRecordInput): Promise<GrowthRecord> {
  if (isBackendApiEnabled()) {
    const data = await request.post<GrowthItemResponse>('/api/v1/growth-records', input)
    return unwrapResult(data)
  }

  const records = readLocalRecords()
  const index = records.findIndex((item) => item.id === input.id)
  const saved = normalizeRecord(input, index >= 0 ? records[index] : undefined)
  if (index >= 0) {
    records[index] = saved
  } else {
    records.unshift(saved)
  }
  writeLocalRecords(records)
  return saved
}

export async function deleteGrowthRecord(id: string): Promise<void> {
  if (isBackendApiEnabled()) {
    await request.delete(`/api/v1/growth-records/${id}`)
    return
  }
  writeLocalRecords(readLocalRecords().filter((item) => item.id !== id))
}

export async function toggleRepresentative(id: string, representative: boolean): Promise<GrowthRecord> {
  const existing = await getGrowthRecord(id)
  if (!existing) {
    throw new Error('成果不存在')
  }
  return saveGrowthRecord({ ...existing, representative })
}

export function createGrowthId(): string {
  return `growth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
