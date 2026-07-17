import type { ClassType, TeachingPlan } from '@/types/weeklyPlan'

export const TEACHING_CONTEXT_KEY = 'nest.edu.teachingContext'

export interface TeachingContext {
  themeName: string
  className: ClassType
  weekNumber: number
  notes?: string
  candidatePlans: TeachingPlan[]
  selectedPlanIds?: string[]
}

export function saveTeachingContext(ctx: TeachingContext): void {
  sessionStorage.setItem(TEACHING_CONTEXT_KEY, JSON.stringify(ctx))
}

export function loadTeachingContext(): TeachingContext | null {
  try {
    const raw = sessionStorage.getItem(TEACHING_CONTEXT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TeachingContext
    if (
      !parsed?.themeName?.trim() ||
      !parsed?.className ||
      !parsed?.weekNumber ||
      parsed.weekNumber <= 0
    ) {
      return null
    }
    if (!Array.isArray(parsed.candidatePlans)) {
      parsed.candidatePlans = []
    }
    return parsed
  } catch {
    return null
  }
}

export function clearTeachingContext(): void {
  sessionStorage.removeItem(TEACHING_CONTEXT_KEY)
}

export function isTeachingContextComplete(ctx: TeachingContext | null): ctx is TeachingContext {
  return Boolean(
    ctx &&
      ctx.themeName.trim() &&
      ctx.className &&
      ctx.weekNumber &&
      ctx.weekNumber > 0
  )
}
