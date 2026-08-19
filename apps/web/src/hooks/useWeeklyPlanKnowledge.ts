import { useCallback, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import {
  fetchKnowledgePlans,
  resolveLiveBusinessCategory,
  uploadKnowledgeDocument,
  uploadKnowledgeFile,
  deleteKnowledgeDocument,
  weeklyPlanKnowledgeScope,
} from '@/api/knowledge'
import {
  deleteTeacherGeneratedDocRecord,
  recordTeacherGeneratedUpload,
} from '@/api/teacherGeneratedDocs'
import { getApiErrorMessage } from '@/lib/apiError'
import { prepareArchiveUploadFiles } from '@/lib/prepareArchiveUpload'
import {
  buildKnowledgeDocTitle,
  resolveOwnerIdentityForDocTitle,
} from '@/lib/knowledgeDocTitle'
import { authBridge } from '@/lib/authBridge'
import type { PendingUploadItem } from '@/pages/resources/UploadConfirmDialog'
import { assertCanDeleteTeacherPlan } from '@/lib/loadMineTeacherPlans'

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
        resolveKind: 'weekly',
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
  }, [])

  const prepareFileUpload = useCallback(async () => {
    const auth = authBridge.getAuthInfo()
    if (!auth?.token) throw new Error('请先登录平台后再上传')
    if (uploadFiles.length === 0) throw new Error('请先选择要上传的文件')

    setIsPreparingUpload(true)
    try {
      const owner = await resolveOwnerIdentityForDocTitle()
      const parsed = prepareArchiveUploadFiles(uploadFiles)
      setPendingUploads(
        parsed.map((item) => ({
          fileName: item.fileName,
          title: buildKnowledgeDocTitle({
            ...owner,
            kind: 'weekly',
            planName: item.fileName.replace(/\.[^.]+$/, '') || item.fileName,
          }),
          file: item.file,
          uploadMode: 'file' as const,
        }))
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
        let plan
        let recordedContent = item.content || ''
        if (item.file) {
          plan = await uploadKnowledgeFile({
            file: item.file,
            title: item.title,
            knowledgeId: live.knowledgeId,
            categoryId: live.categoryId,
            categoryKey: live.categoryKey,
            forceKind: 'weekly',
          })
          recordedContent = plan.content || recordedContent
        } else {
          if (!item.content?.trim()) {
            throw new Error(`「${item.fileName}」缺少正文，请重新选择文件后再上传`)
          }
          plan = await uploadKnowledgeDocument({
            title: item.title,
            content: item.content,
            knowledgeId: live.knowledgeId,
            categoryId: live.categoryId,
            categoryKey: live.categoryKey,
            forceKind: 'weekly',
          })
        }
        uploaded.push(plan)
        await recordTeacherGeneratedUpload({
          docType: 'weekly',
          plan,
          categoryId: live.categoryId,
          content: recordedContent,
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
      // 知识库文档：仅允许删除本人入库映射中的周计划
      await assertCanDeleteTeacherPlan(plan, 'weekly')
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
