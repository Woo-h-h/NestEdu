import { useCallback, useEffect, useState } from 'react'
import type { ClassType, TeachingPlan } from '@/types/weeklyPlan'
import { generateTeachingPlans } from '@/api/llm'
import {
  fetchKnowledgePlans,
  uploadKnowledgeDocument,
  deleteKnowledgeDocument,
} from '@/api/knowledge'
import { parseDocxFiles } from '@/lib/parse-docx'
import { authBridge } from '@/lib/authBridge'
import { isApiConfigured } from '@/api/weeklyPlan'

export type ResourcesSection = 'generate' | 'manage'

export function useTeachingResources() {
  const [section, setSection] = useState<ResourcesSection>('generate')
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [generatedPlans, setGeneratedPlans] = useState<TeachingPlan[]>([])
  const [uploadSelection, setUploadSelection] = useState<TeachingPlan[]>([])
  const [platformPlans, setPlatformPlans] = useState<TeachingPlan[]>([])
  const [listHint, setListHint] = useState('')
  const [themeName, setThemeName] = useState('')
  const [className, setClassName] = useState<ClassType | ''>('')
  const [notes, setNotes] = useState('')
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false)
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingGenerated, setIsUploadingGenerated] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadPlatformPlans = useCallback(async (keyword?: string) => {
    setIsLoadingPlatform(true)
    try {
      const { plans: next, source, error } = await fetchKnowledgePlans({
        keyword: keyword?.trim() || undefined,
        limit: 50,
      })
      setPlatformPlans(next)
      if (source === 'platform') {
        setListHint('平台知识库 · 10298')
      } else if (source === 'preset') {
        setListHint(error ? `本地预设（平台失败：${error}）` : '本地预设')
      } else {
        setListHint('暂无数据')
      }
      return next
    } finally {
      setIsLoadingPlatform(false)
    }
  }, [])

  useEffect(() => {
    if (section === 'manage') {
      void loadPlatformPlans()
    }
  }, [section, loadPlatformPlans])

  const generateTeachingPlansFromTheme = useCallback(async () => {
    if (!themeName.trim()) throw new Error('请先填写主题名称')
    setIsGeneratingPlans(true)
    try {
      const generated = await generateTeachingPlans({
        themeName: themeName.trim(),
        className: className || undefined,
        count: 5,
      })
      setGeneratedPlans(generated)
      setUploadSelection(generated)
      return generated
    } finally {
      setIsGeneratingPlans(false)
    }
  }, [themeName, className])

  const uploadGeneratedPlansToPlatform = useCallback(async (plans: TeachingPlan[]) => {
    const auth = authBridge.getAuthInfo()
    if (!auth?.token) throw new Error('请先登录平台后再上传')
    if (plans.length === 0) throw new Error('请先勾选要上传的教案')

    setIsUploadingGenerated(true)
    try {
      const uploaded: TeachingPlan[] = []
      for (const plan of plans) {
        const content = [plan.objectives, plan.content].filter(Boolean).join('\n\n')
        uploaded.push(
          await uploadKnowledgeDocument({
            title: plan.title,
            content: content || plan.title,
          })
        )
      }
      setUploadSelection([])
      return uploaded
    } finally {
      setIsUploadingGenerated(false)
    }
  }, [])

  const uploadFilesToPlatform = useCallback(async () => {
    const auth = authBridge.getAuthInfo()
    if (!auth?.token) throw new Error('请先登录平台后再上传')
    if (uploadFiles.length === 0) throw new Error('请先选择要上传的 docx 文件')

    const invalid = uploadFiles.find(
      (f) => !f.name.toLowerCase().endsWith('.docx') && !f.name.toLowerCase().endsWith('.doc')
    )
    if (invalid) throw new Error('仅支持 .docx / .doc 文件')

    setIsUploading(true)
    try {
      const parsed = await parseDocxFiles(uploadFiles)
      if (parsed.length === 0) {
        throw new Error('未能解析出有效文本，请确认文件为有效 docx')
      }

      const uploaded: TeachingPlan[] = []
      for (const file of parsed) {
        const title = file.name.replace(/\.(docx|doc)$/i, '')
        uploaded.push(
          await uploadKnowledgeDocument({
            title,
            content: file.content,
          })
        )
      }

      setUploadFiles([])
      await loadPlatformPlans()
      return uploaded
    } finally {
      setIsUploading(false)
    }
  }, [uploadFiles, loadPlatformPlans])

  const deletePlan = useCallback(async (plan: TeachingPlan) => {
    if (plan.source === 'preset') {
      throw new Error('本地预设教案不可删除')
    }
    setIsDeleting(true)
    try {
      if (plan.source === 'ai') {
        setGeneratedPlans((prev) => prev.filter((p) => p.id !== plan.id))
        setUploadSelection((prev) => prev.filter((p) => p.id !== plan.id))
        return
      }
      await deleteKnowledgeDocument(plan.id)
      setPlatformPlans((prev) => prev.filter((p) => p.id !== plan.id))
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    section,
    setSection,
    uploadFiles,
    setUploadFiles,
    generatedPlans,
    uploadSelection,
    setUploadSelection,
    platformPlans,
    listHint,
    themeName,
    setThemeName,
    className,
    setClassName,
    notes,
    setNotes,
    isGeneratingPlans,
    isLoadingPlatform,
    isUploading,
    isUploadingGenerated,
    isDeleting,
    apiConfigured: isApiConfigured(),
    generateTeachingPlansFromTheme,
    uploadGeneratedPlansToPlatform,
    loadPlatformPlans,
    uploadFilesToPlatform,
    deletePlan,
  }
}
