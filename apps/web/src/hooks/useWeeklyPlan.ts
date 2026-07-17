import { useCallback, useEffect, useState } from 'react'
import type { WeeklyPlan, ChatMessage, TeachingPlan, ClassType } from '@/types/weeklyPlan'
import {
  createWeeklyPlan,
  aiModifyPlan,
  isApiConfigured,
} from '@/api/weeklyPlan'
import { fetchKnowledgePlans } from '@/api/knowledge'
import {
  loadTeachingContext,
  isTeachingContextComplete,
  type TeachingContext,
} from '@/lib/teachingContext'

function mergePlans(existing: TeachingPlan[], incoming: TeachingPlan[]): TeachingPlan[] {
  const map = new Map<string, TeachingPlan>()
  for (const plan of existing) map.set(plan.id, plan)
  for (const plan of incoming) map.set(plan.id, plan)
  return Array.from(map.values())
}

function resolveGenerateMeta(
  ctx: TeachingContext | null,
  selectedPlans: TeachingPlan[]
): { themeName: string; className: ClassType; weekNumber: number; notes?: string } {
  if (isTeachingContextComplete(ctx)) {
    return {
      themeName: ctx.themeName.trim(),
      className: ctx.className,
      weekNumber: ctx.weekNumber,
      notes: ctx.notes,
    }
  }
  const firstTitle = selectedPlans[0]?.title?.trim()
  return {
    themeName: firstTitle || '周主题',
    className: '中班',
    weekNumber: 1,
  }
}

export function useWeeklyPlan() {
  const [context, setContext] = useState<TeachingContext | null>(() => loadTeachingContext())
  const [candidatePlans, setCandidatePlans] = useState<TeachingPlan[]>(
    () => loadTeachingContext()?.candidatePlans ?? []
  )
  const [selectedPlans, setSelectedPlans] = useState<TeachingPlan[]>(() => {
    const ctx = loadTeachingContext()
    if (!ctx?.selectedPlanIds?.length) return []
    return (ctx.candidatePlans || []).filter((p) => ctx.selectedPlanIds!.includes(p.id))
  })
  const [poolSourceHint, setPoolSourceHint] = useState('')
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null)
  const [isModified, setIsModified] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isAiModifying, setIsAiModifying] = useState(false)

  const refreshContext = useCallback(() => {
    const ctx = loadTeachingContext()
    setContext(ctx)
    if (ctx) {
      setCandidatePlans((prev) => mergePlans(ctx.candidatePlans || [], prev))
      if (ctx.selectedPlanIds?.length) {
        setSelectedPlans((prev) => {
          const fromCtx = (ctx.candidatePlans || []).filter((p) =>
            ctx.selectedPlanIds!.includes(p.id)
          )
          return mergePlans(fromCtx, prev.filter((p) => ctx.selectedPlanIds!.includes(p.id)))
        })
      }
    }
    return ctx
  }, [])

  const loadPlatformPlans = useCallback(async () => {
    setIsLoadingPlatform(true)
    try {
      const { plans, source, error } = await fetchKnowledgePlans({ limit: 50 })
      setCandidatePlans((prev) => {
        const keepAi = prev.filter((p) => p.source === 'ai')
        return mergePlans(keepAi, plans)
      })
      setPoolSourceHint(
        source === 'platform'
          ? '平台知识库 · 10298'
          : source === 'preset'
            ? error
              ? `本地预设（平台失败：${error}）`
              : '本地预设'
            : '暂无数据'
      )
      return plans
    } finally {
      setIsLoadingPlatform(false)
    }
  }, [])

  useEffect(() => {
    refreshContext()
    void loadPlatformPlans()
  }, [refreshContext, loadPlatformPlans])

  const generatePlan = useCallback(async () => {
    if (selectedPlans.length === 0) return

    const meta = resolveGenerateMeta(loadTeachingContext(), selectedPlans)
    setIsGenerating(true)
    try {
      const plan = await createWeeklyPlan({
        themeName: meta.themeName,
        className: meta.className,
        weekNumber: meta.weekNumber,
        fileNames: [],
        fileContents: [],
        notes: meta.notes,
        selectedPlans,
      })
      setCurrentPlan(plan)
      setIsModified(false)
      setChatHistory([])
    } finally {
      setIsGenerating(false)
    }
  }, [selectedPlans])

  const sendAiInstruction = useCallback(
    async (instruction: string) => {
      if (!currentPlan || !instruction.trim()) return

      const userMsg: ChatMessage = {
        role: 'user',
        content: instruction,
        timestamp: new Date().toISOString(),
      }
      const historyWithUser = [...chatHistory, userMsg]
      setChatHistory(historyWithUser)
      setIsAiModifying(true)

      try {
        const result = await aiModifyPlan({
          currentPlan,
          instruction,
          chatHistory: historyWithUser,
        })
        setCurrentPlan(result.updatedPlan)
        setIsModified(true)
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.message,
            timestamp: new Date().toISOString(),
          },
        ])
      } finally {
        setIsAiModifying(false)
      }
    },
    [currentPlan, chatHistory]
  )

  const resetAll = useCallback(() => {
    setCurrentPlan(null)
    setIsModified(false)
    setChatHistory([])
    refreshContext()
  }, [refreshContext])

  return {
    context,
    hasContext: isTeachingContextComplete(context),
    candidatePlans,
    selectedPlans,
    setSelectedPlans,
    poolSourceHint,
    isLoadingPlatform,
    loadPlatformPlans,
    isGenerating,
    currentPlan,
    setCurrentPlan,
    isModified,
    setIsModified,
    chatHistory,
    isAiModifying,
    apiConfigured: isApiConfigured(),
    generatePlan,
    sendAiInstruction,
    resetAll,
  }
}
