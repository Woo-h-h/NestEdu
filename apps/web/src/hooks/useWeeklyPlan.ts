import { useCallback, useEffect, useState } from 'react'
import type { WeeklyPlan, ChatMessage, TeachingPlan, ClassType } from '@/types/weeklyPlan'
import {
  createWeeklyPlan,
  aiModifyPlan,
  isApiConfigured,
} from '@/api/weeklyPlan'
import { activityPlanKnowledgeScope, fetchKnowledgePlans } from '@/api/knowledge'
import {
  loadTeachingContext,
  saveTeachingContext,
  isTeachingContextComplete,
  type TeachingContext,
} from '@/lib/teachingContext'
import {
  clearWeeklyPlanDraft,
  loadWeeklyPlanDraft,
  saveWeeklyPlanDraft,
} from '@/lib/generationDraft'

function mergePlans(existing: TeachingPlan[], incoming: TeachingPlan[]): TeachingPlan[] {
  const map = new Map<string, TeachingPlan>()
  for (const plan of existing) map.set(plan.id, plan)
  for (const plan of incoming) map.set(plan.id, plan)
  return Array.from(map.values())
}

export function useWeeklyPlan() {
  const initialCtx = loadTeachingContext()
  const initialDraft = loadWeeklyPlanDraft()
  const [themeName, setThemeName] = useState(initialCtx?.themeName ?? '')
  const [className, setClassName] = useState<ClassType | ''>(initialCtx?.className ?? '')
  const [weekNumber, setWeekNumber] = useState<number | null>(initialCtx?.weekNumber ?? null)
  const [notes, setNotes] = useState(initialCtx?.notes ?? '')

  const [context, setContext] = useState<TeachingContext | null>(() => initialCtx)
  const [candidatePlans, setCandidatePlans] = useState<TeachingPlan[]>(
    () => initialCtx?.candidatePlans ?? []
  )
  const [selectedPlans, setSelectedPlans] = useState<TeachingPlan[]>(() => {
    if (!initialCtx?.selectedPlanIds?.length) return []
    return (initialCtx.candidatePlans || []).filter((p) =>
      initialCtx.selectedPlanIds!.includes(p.id)
    )
  })
  const [poolSourceHint, setPoolSourceHint] = useState('')
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(
    () => initialDraft?.currentPlan ?? null
  )
  const [isModified, setIsModified] = useState(() => initialDraft?.isModified ?? false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(
    () => initialDraft?.chatHistory ?? []
  )
  const [isAiModifying, setIsAiModifying] = useState(false)

  const persistMeta = useCallback(
    (
      next: Partial<{
        themeName: string
        className: ClassType | ''
        weekNumber: number | null
        notes: string
        selected: TeachingPlan[]
        candidates: TeachingPlan[]
      }> = {}
    ) => {
      const theme = (next.themeName ?? themeName).trim()
      const cls = next.className !== undefined ? next.className : className
      const week = next.weekNumber !== undefined ? next.weekNumber : weekNumber
      const note = next.notes !== undefined ? next.notes : notes
      const selected = next.selected ?? selectedPlans
      const candidates = next.candidates ?? candidatePlans

      // 班级+周次即可落盘（主题可空，便于「继续生成」保留班级周次）
      if (!cls || !week || week <= 0) return

      const ctx: TeachingContext = {
        themeName: theme,
        className: cls,
        weekNumber: week,
        notes: note || undefined,
        candidatePlans: candidates,
        selectedPlanIds: selected.map((p) => p.id),
      }
      saveTeachingContext(ctx)
      setContext(ctx)
    },
    [themeName, className, weekNumber, notes, selectedPlans, candidatePlans]
  )

  const updateThemeName = useCallback(
    (v: string) => {
      setThemeName(v)
      persistMeta({ themeName: v })
    },
    [persistMeta]
  )

  const updateClassName = useCallback(
    (v: ClassType) => {
      setClassName(v)
      persistMeta({ className: v })
    },
    [persistMeta]
  )

  const updateWeekNumber = useCallback(
    (v: number | null) => {
      setWeekNumber(v)
      persistMeta({ weekNumber: v })
    },
    [persistMeta]
  )

  const updateNotes = useCallback(
    (v: string) => {
      setNotes(v)
      persistMeta({ notes: v })
    },
    [persistMeta]
  )

  const updateSelectedPlans = useCallback(
    (plans: TeachingPlan[]) => {
      setSelectedPlans(plans)
      persistMeta({ selected: plans })
    },
    [persistMeta]
  )

  const refreshContext = useCallback(() => {
    const ctx = loadTeachingContext()
    setContext(ctx)
    if (ctx) {
      setThemeName(ctx.themeName || '')
      setClassName(ctx.className)
      setWeekNumber(ctx.weekNumber)
      setNotes(ctx.notes || '')
      setCandidatePlans((prev) => mergePlans(ctx.candidatePlans || [], prev))
      if (ctx.selectedPlanIds && ctx.selectedPlanIds.length > 0) {
        setSelectedPlans((prev) => {
          const fromCtx = (ctx.candidatePlans || []).filter((p) =>
            ctx.selectedPlanIds!.includes(p.id)
          )
          return mergePlans(fromCtx, prev.filter((p) => ctx.selectedPlanIds!.includes(p.id)))
        })
      } else if (ctx.selectedPlanIds && ctx.selectedPlanIds.length === 0) {
        setSelectedPlans([])
      }
    }
    return ctx
  }, [])

  const loadPlatformPlans = useCallback(async (keyword?: string) => {
    setIsLoadingPlatform(true)
    try {
      // 教案候选池来自「教案知识库管理」20806，不是教师成果库
      const { plans, source, error } = await fetchKnowledgePlans({
        keyword: keyword?.trim() || undefined,
        limit: 50,
        ...activityPlanKnowledgeScope(),
      })
      setCandidatePlans((prev) => {
        const keepAi = prev.filter((p) => p.source === 'ai')
        return mergePlans(keepAi, plans)
      })
      setPoolSourceHint(
        source === 'platform'
          ? keyword?.trim()
            ? `教案知识库 · 检索「${keyword.trim()}」`
            : '教案知识库 · 20806'
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

  // 会话内草稿：已生成的周计划与 AI 改稿记录，切页回来可恢复
  useEffect(() => {
    if (!currentPlan) {
      clearWeeklyPlanDraft()
      return
    }
    saveWeeklyPlanDraft({
      currentPlan,
      chatHistory,
      isModified,
    })
  }, [currentPlan, chatHistory, isModified])

  const metaReady = Boolean(themeName.trim() && className && weekNumber && weekNumber > 0)

  const generatePlan = useCallback(async () => {
    if (selectedPlans.length === 0) return
    if (!themeName.trim()) throw new Error('请先填写主题名称')
    if (!className) throw new Error('请先选择班级')
    if (!weekNumber || weekNumber <= 0) throw new Error('请先选择周次')

    persistMeta()
    setIsGenerating(true)
    try {
      const plan = await createWeeklyPlan({
        themeName: themeName.trim(),
        className,
        weekNumber,
        fileNames: [],
        fileContents: [],
        notes: notes || undefined,
        selectedPlans,
      })
      setCurrentPlan(plan)
      setIsModified(false)
      setChatHistory([])
    } finally {
      setIsGenerating(false)
    }
  }, [selectedPlans, themeName, className, weekNumber, notes, persistMeta])

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
    // 返回重新勾选：退出预览并清空勾选，保留主题/班级/周次
    setCurrentPlan(null)
    setIsModified(false)
    setChatHistory([])
    clearWeeklyPlanDraft()
    setSelectedPlans([])
    persistMeta({ selected: [] })
  }, [persistMeta])

  const startFreshWeek = useCallback(() => {
    // 继续生成新周计划：清空预览与勾选；保留班级/周次，清空主题
    setCurrentPlan(null)
    setIsModified(false)
    setChatHistory([])
    clearWeeklyPlanDraft()
    setSelectedPlans([])
    setThemeName('')
    setNotes('')
    persistMeta({ themeName: '', notes: '', selected: [] })
  }, [persistMeta])

  return {
    themeName,
    setThemeName: updateThemeName,
    className,
    setClassName: updateClassName,
    weekNumber,
    setWeekNumber: updateWeekNumber,
    notes,
    setNotes: updateNotes,
    metaReady,
    context,
    hasContext: isTeachingContextComplete(context),
    candidatePlans,
    selectedPlans,
    setSelectedPlans: updateSelectedPlans,
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
    startFreshWeek,
  }
}
