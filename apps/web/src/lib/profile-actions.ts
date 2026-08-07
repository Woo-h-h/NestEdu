import type { DefaultActionSeed } from '@/lib/profile-metrics'
import {
  fetchProfileActionStates,
  patchProfileActionState,
  replaceProfileActionStates,
} from '@/api/profileActions'
import { isBackendApiEnabled } from '@/api/llm'

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

function readLocalStore(): Record<string, ProfileActionState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ProfileActionState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLocalStore(store: Record<string, ProfileActionState>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function loadActionStates(): Record<string, ProfileActionState> {
  return readLocalStore()
}

export function mergeActionSeeds(
  seeds: DefaultActionSeed[],
  store: Record<string, ProfileActionState> = readLocalStore()
): ProfileActionItem[] {
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

/** 优先读 BFF；失败或未开后端时用 localStorage。首次 BFF 空且本地有数据时自动迁上去。 */
export async function loadActionStatesAsync(): Promise<Record<string, ProfileActionState>> {
  const local = readLocalStore()
  if (!isBackendApiEnabled()) return local

  const remote = await fetchProfileActionStates()
  if (Object.keys(remote).length > 0) {
    writeLocalStore(remote)
    return remote
  }
  if (Object.keys(local).length > 0) {
    try {
      const saved = await replaceProfileActionStates(local)
      writeLocalStore(saved)
      return saved
    } catch {
      return local
    }
  }
  return {}
}

export async function saveActionState(
  id: string,
  patch: Partial<ProfileActionState>
): Promise<ProfileActionState> {
  const store = readLocalStore()
  const prev = store[id] || {
    checked: false,
    status: 'planned' as ActionStatus,
    date: '',
    progress: 0,
  }
  const next = { ...prev, ...patch }
  store[id] = next
  writeLocalStore(store)

  if (isBackendApiEnabled()) {
    try {
      const remote = await patchProfileActionState(id, next)
      if (remote) {
        store[id] = remote
        writeLocalStore(store)
        return remote
      }
    } catch {
      // 本地已写入，后端失败不阻断 UI
    }
  }
  return next
}

export function clearActionState(id: string) {
  const store = readLocalStore()
  delete store[id]
  writeLocalStore(store)
}
