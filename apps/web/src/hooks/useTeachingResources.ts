import { useCallback, useEffect, useState } from 'react'
import type { ClassType, TeachingPlan } from '@/types/weeklyPlan'
import { generateTeachingPlans } from '@/api/llm'
import {
  fetchKnowledgePlans,
  uploadKnowledgeDocument,
  deleteKnowledgeDocument,
} from '@/api/knowledge'
import { parseDocxFiles } from '@/lib/parse-docx'
import {
  buildKnowledgeDocTitle,
  resolveOwnerIdentityForDocTitle,
} from '@/lib/knowledgeDocTitle'
import { buildTaxonomyContentPrefix, splitDomainTokens } from '@/lib/planTaxonomy'
import { authBridge } from '@/lib/authBridge'
import { isApiConfigured } from '@/api/weeklyPlan'
import type { PendingUploadItem } from '@/pages/resources/UploadConfirmDialog'
import type { FocusDomain } from '@/pages/resources/DomainSelector'

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
  const [focusDomains, setFocusDomains] = useState<FocusDomain[]>([])
  const [notes, setNotes] = useState('')
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false)
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingGenerated, setIsUploadingGenerated] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPreparingUpload, setIsPreparingUpload] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMode, setConfirmMode] = useState<'files' | 'generated'>('files')

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
        setListHint(error || '暂无数据')
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

  const generateTeachingPlansFromTheme = useCallback(
    async (options?: { durationMinutes?: number }) => {
      if (!themeName.trim()) throw new Error('请先填写主题名称')
      if (!className) throw new Error('请先选择班级')
      if (focusDomains.length === 0) throw new Error('请至少选择一个重点领域')

      const noteParts = [notes.trim()]
      if (options?.durationMinutes) {
        noteParts.push(`活动时长：${options.durationMinutes}分钟`)
      }
      const combinedNotes = noteParts.filter(Boolean).join('\n')

      setIsGeneratingPlans(true)
      try {
        const generated = await generateTeachingPlans({
          themeName: themeName.trim(),
          className: className || undefined,
          focusDomains,
          count: focusDomains.length,
          notes: combinedNotes || undefined,
        })
        setGeneratedPlans(generated)
        setUploadSelection(generated)
        return generated
      } finally {
        setIsGeneratingPlans(false)
      }
    },
    [themeName, className, focusDomains, notes]
  )

  const prepareGeneratedUpload = useCallback(async (plans: TeachingPlan[]) => {
    const auth = authBridge.getAuthInfo()
    if (!auth?.token) throw new Error('请先登录平台后再上传')
    if (plans.length === 0) throw new Error('请先勾选要上传的教案')

    const owner = await resolveOwnerIdentityForDocTitle()
    const items: PendingUploadItem[] = plans.map((plan) => {
      const title = buildKnowledgeDocTitle({
        ...owner,
        kind: 'activity',
        planName: plan.title,
      })
      const body = [plan.objectives, plan.content].filter(Boolean).join('\n\n') || plan.title
      const prefix = buildTaxonomyContentPrefix({
        classLevel: plan.gradeLevel || className || '',
        domains: splitDomainTokens(plan.domain),
      })
      return {
        fileName: title,
        title,
        content: `${prefix}${body}`,
      }
    })
    setPendingUploads(items)
    setConfirmMode('generated')
    setConfirmOpen(true)
  }, [className])

  const prepareFileUpload = useCallback(async () => {
    const auth = authBridge.getAuthInfo()
    if (!auth?.token) throw new Error('请先登录平台后再上传')
    if (uploadFiles.length === 0) throw new Error('请先选择要上传的 docx 文件')

    const invalid = uploadFiles.find(
      (f) => !f.name.toLowerCase().endsWith('.docx') && !f.name.toLowerCase().endsWith('.doc')
    )
    if (invalid) throw new Error('仅支持 .docx / .doc 文件')

    setIsPreparingUpload(true)
    try {
      const owner = await resolveOwnerIdentityForDocTitle()
      const parsed = await parseDocxFiles(uploadFiles)
      if (parsed.length === 0) {
        throw new Error('未能解析出有效文本，请确认文件为有效 docx')
      }
      setPendingUploads(
        parsed.map((file) => {
          const baseName = file.name.replace(/\.(docx|doc)$/i, '')
          const title = buildKnowledgeDocTitle({
            ...owner,
            kind: 'activity',
            planName: baseName,
          })
          return {
            fileName: file.name,
            title,
            content: file.content,
          }
        })
      )
      setConfirmMode('files')
      setConfirmOpen(true)
    } finally {
      setIsPreparingUpload(false)
    }
  }, [uploadFiles])

  const cancelPendingUpload = useCallback(() => {
    if (isUploading || isUploadingGenerated) return
    setConfirmOpen(false)
    setPendingUploads([])
  }, [isUploading, isUploadingGenerated])

  const confirmPendingUpload = useCallback(async () => {
    if (pendingUploads.length === 0) throw new Error('没有待上传内容')

    const uploadingGenerated = confirmMode === 'generated'
    if (uploadingGenerated) setIsUploadingGenerated(true)
    else setIsUploading(true)

    try {
      const uploaded: TeachingPlan[] = []
      for (const item of pendingUploads) {
        uploaded.push(
          await uploadKnowledgeDocument({
            title: item.title,
            content: item.content,
          })
        )
      }

      setConfirmOpen(false)
      setPendingUploads([])
      if (uploadingGenerated) {
        setUploadSelection([])
      } else {
        setUploadFiles([])
      }

      setSection('manage')
      await loadPlatformPlans()
      return uploaded
    } finally {
      if (uploadingGenerated) setIsUploadingGenerated(false)
      else setIsUploading(false)
    }
  }, [pendingUploads, confirmMode, loadPlatformPlans])

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
    focusDomains,
    setFocusDomains,
    notes,
    setNotes,
    isGeneratingPlans,
    isLoadingPlatform,
    isUploading,
    isUploadingGenerated,
    isDeleting,
    isPreparingUpload,
    pendingUploads,
    confirmOpen,
    apiConfigured: isApiConfigured(),
    generateTeachingPlansFromTheme,
    prepareGeneratedUpload,
    prepareFileUpload,
    confirmPendingUpload,
    cancelPendingUpload,
    loadPlatformPlans,
    deletePlan,
  }
}
