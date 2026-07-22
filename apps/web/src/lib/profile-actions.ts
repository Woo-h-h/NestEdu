import type { DefaultActionSeed } from '@/lib/profile-metrics'

export type ActionStatus = 'planned' | 'completed' | 'dismissed'

export interface ProfileActionState {
  checked: boolean
  status: ActionStatus
  date: string
  progress: number
}

export interface ProfileActionItem extends DefaultActionSeed {
  checked: boolean
  status: ActionStatus
  date: string
  progress: number
}

const STORAGE_KEY = 'nestedu_profile_actions_v1'

function readStore(): Record<string, ProfileActionState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ProfileActionState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, ProfileActionState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function loadActionStates(): Record<string, ProfileActionState> {
  return readStore()
}

export function mergeActionSeeds(seeds: DefaultActionSeed[]): ProfileActionItem[] {
  const store = readStore()
  return seeds.map((seed) => {
    const saved = store[seed.id]
    return {
      ...seed,
      checked: saved?.checked ?? false,
      status: saved?.status ?? 'planned',
      date: saved?.date ?? '',
      progress: saved?.progress ?? 0,
    }
  })
}

export function saveActionState(id: string, patch: Partial<ProfileActionState>): ProfileActionState {
  const store = readStore()
  const prev = store[id] || { checked: false, status: 'planned' as ActionStatus, date: '', progress: 0 }
  const next = { ...prev, ...patch }
  store[id] = next
  writeStore(store)
  return next
}

export function clearActionState(id: string) {
  const store = readStore()
  delete store[id]
  writeStore(store)
}
