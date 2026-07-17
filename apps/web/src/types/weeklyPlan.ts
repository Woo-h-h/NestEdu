export interface TeachingPlan {
  id: string
  title: string
  domain: string
  gradeLevel: string
  objectives: string
  content: string
  source?: 'platform' | 'preset' | 'ai'
  knowledgeId?: string
}

export type PlanSourceMode = 'theme-ai' | 'platform' | 'upload-platform'

export type ClassType = '大班' | '中班' | '小班'

export interface DayPlan {
  day: '周一' | '周二' | '周三' | '周四' | '周五'
  collectiveLearning: string
  regionalGames: string
  dailyLife: string
  outdoorSports: string
}

export interface WeeklyPlan {
  id: string
  themeName: string
  className: ClassType
  weekNumber: number
  weeklyFocus: string
  dailyPlans: DayPlan[]
  suggestions: string
  createdAt: string
  status: 'draft' | 'saved'
}

export interface CreateWeeklyPlanRequest {
  fileNames: string[]
  fileContents?: { name: string; content: string }[]
  themeName: string
  className: ClassType
  weekNumber: number
  notes?: string
  selectedPlans?: TeachingPlan[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AiModifyRequest {
  currentPlan: WeeklyPlan
  instruction: string
  chatHistory: ChatMessage[]
}
