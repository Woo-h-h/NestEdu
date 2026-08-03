import { useCallback, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import {
  fetchKnowledgePlans,
  uploadKnowledgeDocument,
  deleteKnowledgeDocument,
  weeklyPlanKnowledgeScope,
} from '@/api/knowledge'
import {
  deleteTeacherGeneratedDocRecord,
  recordTeacherGeneratedUpload,
} from '@/api/teacherGeneratedDocs'
import { parseDocxFiles } from '@/lib/parse-docx'
import {
  buildKnowledgeDocTitle,
  buildOwnerContentPrefix,
  resolveOwnerIdentityForDocTitle,
} from '@/lib/knowledgeDocTitle'
import { authBridge } from '@/lib/authBridge'
import type { PendingUploadItem } from '@/pages/resources/UploadConfirmDialog'

/** 周计划知识库管理（分类 20807），镜像课程资源库「知识库管理」 */
export function useWeeklyPlanKnowledge() {
  const scope = weeklyPlanKnowledgeScope()
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [platformPlans, setPlatformPlans] = useState<TeachingPlan[]>([])
  const [listHint, setListHint] = useState('')
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPreparingUpload, setIsPreparingUpload] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadPlatformPlans = useCallback(async (keyword?: string) => {
    setIsLoadingPlatform(true)
    try {
      const { plans: next, source, error } = await fetchKnowledgePlans({
        keyword: keyword?.trim() || undefined,
        knowledgeId: scope.knowledgeId,
        categoryId: scope.categoryId,
        categoryKey: scope.categoryKey,
        limit: 50,
        fallbackPreset: false,
      })
      setPlatformPlans(next)
      if (source === 'platform') {
        setListHint(`平台知识库 · ${scope.knowledgeId} · 分类 ${scope.categoryId}`)
      } else {
        setListHint(error || '暂无周计划文档')
      }
      return next
    } finally {
      setIsLoadingPlatform(false)
    }
  }, [scope.knowledgeId, scope.categoryId, scope.categoryKey])

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
            kind: 'weekly',
            planName: baseName,
          })
          return {
            fileName: file.name,
            title,
            content: `${buildOwnerContentPrefix(owner)}${file.content}`,
          }
        })
      )
      setConfirmOpen(true)
    } finally {
      setIsPreparingUpload(false)
    }
  }, [uploadFiles])

  const cancelPendingUpload = useCallback(() => {
    if (isUploading) return
    setConfirmOpen(false)
    setPendingUploads([])
  }, [isUploading])

  const confirmPendingUpload = useCallback(async () => {
    if (pendingUploads.length === 0) throw new Error('没有待上传内容')
    setIsUploading(true)
    try {
      const uploaded: TeachingPlan[] = []
      for (const item of pendingUploads) {
        uploaded.push(
          await uploadKnowledgeDocument({
            title: item.title,
            content: item.content,
            knowledgeId: scope.knowledgeId,
            categoryId: scope.categoryId,
            categoryKey: scope.categoryKey,
            forceKind: 'weekly',
          })
        )
      }
      await Promise.all(
        uploaded.map((plan) =>
          recordTeacherGeneratedUpload({
            docType: 'weekly',
            plan,
            categoryId: scope.categoryId,
          })
        )
      )
      setConfirmOpen(false)
      setPendingUploads([])
      setUploadFiles([])
      await loadPlatformPlans()
      return uploaded
    } finally {
      setIsUploading(false)
    }
  }, [pendingUploads, loadPlatformPlans, scope])

  const deletePlan = useCallback(async (plan: TeachingPlan) => {
    if (plan.source === 'preset') {
      throw new Error('本地预设不可删除')
    }
    setIsDeleting(true)
    try {
      await deleteKnowledgeDocument(plan.id)
      await deleteTeacherGeneratedDocRecord(plan.id)
      setPlatformPlans((prev) => prev.filter((p) => p.id !== plan.id))
    } finally {
      setIsDeleting(false)
    }
  }, [])

  const uploadWeeklyPlanDocument = useCallback(
    async (title: string, content: string) => {
      const plan = await uploadKnowledgeDocument({
        title,
        content,
        knowledgeId: scope.knowledgeId,
        categoryId: scope.categoryId,
        categoryKey: scope.categoryKey,
        forceKind: 'weekly',
      })
      await recordTeacherGeneratedUpload({
        docType: 'weekly',
        plan,
        categoryId: scope.categoryId,
      })
      return plan
    },
    [scope]
  )

  return {
    scope,
    uploadFiles,
    setUploadFiles,
    platformPlans,
    listHint,
    isLoadingPlatform,
    isUploading,
    isDeleting,
    isPreparingUpload,
    pendingUploads,
    confirmOpen,
    loadPlatformPlans,
    prepareFileUpload,
    confirmPendingUpload,
    cancelPendingUpload,
    deletePlan,
    uploadWeeklyPlanDocument,
  }
}
