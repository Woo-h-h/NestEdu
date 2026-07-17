import type {
  WeeklyPlan,
  CreateWeeklyPlanRequest,
  AiModifyRequest,
} from '@/types/weeklyPlan'
import { generateWeeklyPlan, modifyWeeklyPlan, isApiConfigured, isBackendApiEnabled } from '@/api/llm'

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
