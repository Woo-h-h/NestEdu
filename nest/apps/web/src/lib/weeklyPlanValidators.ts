import type { WeeklyPlan, DayPlan, TeachingPlan } from '@/types/weeklyPlan'

const VALID_DAYS = ['周一', '周二', '周三', '周四', '周五'] as const

export function isValidDayPlan(obj: unknown): obj is DayPlan {
  if (!obj || typeof obj !== 'object') return false
  const dp = obj as Record<string, unknown>
  return (
    typeof dp.day === 'string' &&
    VALID_DAYS.includes(dp.day as (typeof VALID_DAYS)[number]) &&
    typeof dp.collectiveLearning === 'string' &&
    typeof dp.regionalGames === 'string' &&
    typeof dp.dailyLife === 'string' &&
    typeof dp.outdoorSports === 'string'
  )
}

export function isValidWeeklyPlan(obj: unknown): obj is Pick<WeeklyPlan, 'weeklyFocus' | 'dailyPlans' | 'suggestions'> {
  if (!obj || typeof obj !== 'object') return false
  const wp = obj as Record<string, unknown>
  return (
    typeof wp.weeklyFocus === 'string' &&
    Array.isArray(wp.dailyPlans) &&
    wp.dailyPlans.length === 5 &&
    wp.dailyPlans.every((dp: unknown) => isValidDayPlan(dp)) &&
    typeof wp.suggestions === 'string'
  )
}

export function isValidTeachingPlan(obj: unknown): obj is TeachingPlan {
  if (!obj || typeof obj !== 'object') return false
  const p = obj as Record<string, unknown>
  return (
    typeof p.title === 'string' &&
    p.title.trim() !== '' &&
    typeof p.domain === 'string' &&
    p.domain.trim() !== '' &&
    typeof p.gradeLevel === 'string' &&
    p.gradeLevel.trim() !== '' &&
    typeof p.objectives === 'string' &&
    p.objectives.trim() !== '' &&
    typeof p.content === 'string' &&
    p.content.trim() !== ''
  )
}

export function isValidTeachingPlans(obj: unknown): obj is TeachingPlan[] {
  return Array.isArray(obj) && obj.length > 0 && obj.every(isValidTeachingPlan)
}

export function extractJson(text: string): string {
  try {
    JSON.parse(text)
    return text
  } catch {
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) {
      return codeBlock[1].trim()
    }
    const brace = text.match(/\{[\s\S]*\}/)
    if (brace) {
      return brace[0]
    }
  }
  return text
}
