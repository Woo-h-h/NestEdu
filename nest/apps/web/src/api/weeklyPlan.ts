import type {
  WeeklyPlan,
  CreateWeeklyPlanRequest,
  AiModifyRequest,
} from '@/types/weeklyPlan'
import { generateWeeklyPlan, modifyWeeklyPlan, isApiConfigured, isBackendApiEnabled } from '@/api/llm'
import { request } from '@/api/client'

const STORAGE_KEY = 'weekly_plans'

function readLocalPlans(): WeeklyPlan[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeLocalPlans(plans: WeeklyPlan[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
}

export async function createWeeklyPlan(req: CreateWeeklyPlanRequest): Promise<WeeklyPlan> {
  return generateWeeklyPlan({
    fileContents: req.fileContents || [],
    themeName: req.themeName,
    className: req.className,
    weekNumber: req.weekNumber,
    notes: req.notes,
    selectedPlans: req.selectedPlans,
  })
}

export async function aiModifyPlan(req: AiModifyRequest): Promise<{
  message: string
  updatedPlan: WeeklyPlan
}> {
  return modifyWeeklyPlan(req)
}

export { isApiConfigured, isBackendApiEnabled }

export async function saveWeeklyPlan(plan: WeeklyPlan): Promise<void> {
  const toSave = { ...plan, status: 'saved' as const, createdAt: new Date().toISOString() }

  if (isBackendApiEnabled()) {
    const existing = await getPlanById(plan.id).catch(() => undefined)
    if (existing) {
      await request.put(`/api/v1/weekly-plans/${encodeURIComponent(plan.id)}`, toSave)
    } else {
      await request.post('/api/v1/weekly-plans', toSave)
    }
    return
  }

  const plans = readLocalPlans()
  const idx = plans.findIndex((p) => p.id === plan.id)
  if (idx >= 0) {
    plans[idx] = toSave
  } else {
    plans.push(toSave)
  }
  writeLocalPlans(plans)
}

export async function getSavedPlans(): Promise<WeeklyPlan[]> {
  if (isBackendApiEnabled()) {
    const response = await request.get<{ success: boolean; result: WeeklyPlan[] }>(
      '/api/v1/weekly-plans'
    )
    return response.result || []
  }
  return readLocalPlans()
}

export async function getPlanById(id: string): Promise<WeeklyPlan | undefined> {
  if (isBackendApiEnabled()) {
    try {
      const response = await request.get<{ success: boolean; result: WeeklyPlan }>(
        `/api/v1/weekly-plans/${encodeURIComponent(id)}`
      )
      return response.result
    } catch {
      return undefined
    }
  }
  return readLocalPlans().find((p) => p.id === id)
}

export async function deletePlan(id: string): Promise<void> {
  if (isBackendApiEnabled()) {
    await request.delete(`/api/v1/weekly-plans/${encodeURIComponent(id)}`)
    return
  }
  const plans = readLocalPlans().filter((p) => p.id !== id)
  writeLocalPlans(plans)
}
