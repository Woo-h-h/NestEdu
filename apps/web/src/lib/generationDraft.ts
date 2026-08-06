import type { ChatMessage, TeachingPlan, WeeklyPlan } from '@/types/weeklyPlan'
import { authBridge } from '@/lib/authBridge'
import { getAuthIdentityKey } from '@/lib/authIdentity'

const ACTIVITY_DRAFT_PREFIX = 'nest.edu.activityDraft'
const WEEKLY_DRAFT_PREFIX = 'nest.edu.weeklyPlanDraft'

export type ActivityDraftSection = 'generate' | 'manage'

export interface ActivityPlanDraft {
  section: ActivityDraftSection
  themeName: string
  className: string
  focusDomains: string[]
  notes: string
  generatedPlans: TeachingPlan[]
  uploadSelection: TeachingPlan[]
  previewPlanId: string | null
  savedAt: string
}

export interface WeeklyPlanDraft {
  currentPlan: WeeklyPlan
  chatHistory: ChatMessage[]
  isModified: boolean
  savedAt: string
}

function scopedKey(prefix: string): string {
  const identity = getAuthIdentityKey(authBridge.getAuthInfo())
  return identity ? `${prefix}.${identity}` : prefix
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota / private mode — 忽略，不影响主流程
  }
}

export function loadActivityPlanDraft(): ActivityPlanDraft | null {
  const parsed = safeParse<ActivityPlanDraft>(
    sessionStorage.getItem(scopedKey(ACTIVITY_DRAFT_PREFIX))
  )
  if (!parsed) return null
  if (!Array.isArray(parsed.generatedPlans)) parsed.generatedPlans = []
  if (!Array.isArray(parsed.uploadSelection)) parsed.uploadSelection = []
  if (!Array.isArray(parsed.focusDomains)) parsed.focusDomains = []
  return parsed
}

export function saveActivityPlanDraft(draft: Omit<ActivityPlanDraft, 'savedAt'>): void {
  safeSet(scopedKey(ACTIVITY_DRAFT_PREFIX), {
    ...draft,
    savedAt: new Date().toISOString(),
  })
}

export function clearActivityPlanDraft(): void {
  try {
    sessionStorage.removeItem(scopedKey(ACTIVITY_DRAFT_PREFIX))
  } catch {
    // ignore
  }
}

export function loadWeeklyPlanDraft(): WeeklyPlanDraft | null {
  const parsed = safeParse<WeeklyPlanDraft>(
    sessionStorage.getItem(scopedKey(WEEKLY_DRAFT_PREFIX))
  )
  if (!parsed?.currentPlan?.id) return null
  if (!Array.isArray(parsed.chatHistory)) parsed.chatHistory = []
  return parsed
}

export function saveWeeklyPlanDraft(draft: Omit<WeeklyPlanDraft, 'savedAt'>): void {
  safeSet(scopedKey(WEEKLY_DRAFT_PREFIX), {
    ...draft,
    savedAt: new Date().toISOString(),
  })
}

export function clearWeeklyPlanDraft(): void {
  try {
    sessionStorage.removeItem(scopedKey(WEEKLY_DRAFT_PREFIX))
  } catch {
    // ignore
  }
}
