import { useCallback, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import {
  fetchKnowledgePlans,
  resolveLiveBusinessCategory,
  uploadKnowledgeDocument,
  deleteKnowledgeDocument,
  weeklyPlanKnowledgeScope,
} from '@/api/knowledge'
import {
  deleteTeacherGeneratedDocRecord,
  recordTeacherGeneratedUpload,
} from '@/api/teacherGeneratedDocs'
import { getApiErrorMessage } from '@/lib/apiError'
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
  const [kbTotal, setKbTotal] = useState<number | null>(null)
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPreparingUpload, setIsPreparingUpload] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadPlatformPlans = useCallback(async (keyword?: string) => {
    setIsLoadingPlatform(true)
    try {
      const { plans: next, source, error, total } = await fetchKnowledgePlans({
        keyword: keyword?.trim() || undefined,
        knowledgeId: scope.knowledgeId,
        categoryId: scope.categoryId,
        categoryKey: scope.categoryKey,
        limit: 50,
        fallbackPreset: false,
      })
      setPlatformPlans(next)
      const resolvedTotal =
        typeof total === 'number' && total >= 0 ? total : next.length
      setKbTotal(source === 'platform' || source === 'empty' ? resolvedTotal : next.length)
      if (source === 'platform') {
        setListHint('')
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
      const live = await resolveLiveBusinessCategory('weekly')
      for (const item of pendingUploads) {
        const plan = await uploadKnowledgeDocument({
          title: item.title,
          content: item.content,
          knowledgeId: live.knowledgeId,
          categoryId: live.categoryId,
          categoryKey: live.categoryKey,
          forceKind: 'weekly',
        })
        uploaded.push(plan)
        await recordTeacherGeneratedUpload({
          docType: 'weekly',
          plan,
          categoryId: live.categoryId,
          content: item.content,
        })
      }
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
      if (plan.source === 'mysql' || plan.id.startsWith('local_')) {
        await deleteTeacherGeneratedDocRecord(plan.id)
        setPlatformPlans((prev) => prev.filter((p) => p.id !== plan.id))
        return { platformDeleted: true as const }
      }
      try {
        await deleteKnowledgeDocument(plan.id)
      } catch (err) {
        const msg = getApiErrorMessage(err, '删除知识库文档失败')
        if (/403|没有权限|无权|forbidden/i.test(msg)) {
          await deleteTeacherGeneratedDocRecord(plan.id)
          setPlatformPlans((prev) => prev.filter((p) => p.id !== plan.id))
          return {
            platformDeleted: false as const,
            hint: '已从本系统「我的」移除。平台侧无权删除该文件，请到平台知识库手动删除或改目录。',
          }
        }
        throw err instanceof Error ? err : new Error(msg)
      }
      await deleteTeacherGeneratedDocRecord(plan.id)
      setPlatformPlans((prev) => prev.filter((p) => p.id !== plan.id))
      return { platformDeleted: true as const }
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
    kbTotal,
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
