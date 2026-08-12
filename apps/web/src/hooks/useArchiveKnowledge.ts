import { useCallback, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import {
  archiveKnowledgeScope,
  deleteKnowledgeDocument,
  ensureArchiveOwnerFolder,
  fetchArchivePlansForOwnerFolder,
  isArchiveKnowledgeConfigured,
  resolveLiveArchiveOwnerFolder,
  uploadKnowledgeFile,
  type KnowledgeCategory,
} from '@/api/knowledge'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import { prepareArchiveUploadFiles } from '@/lib/prepareArchiveUpload'
import { ownerFolderNameMatches } from '@/lib/archiveTeacherScope'
import { authBridge } from '@/lib/authBridge'
import type { PendingUploadItem } from '@/pages/resources/UploadConfirmDialog'

/** 教师成果库：仅展示登录手机号对应文件夹（及其子文件夹）中的文档 */
export function useArchiveKnowledge() {
  const scope = archiveKnowledgeScope()
  const configured = isArchiveKnowledgeConfigured()
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [platformPlans, setPlatformPlans] = useState<TeachingPlan[]>([])
  const [teacherFolders, setTeacherFolders] = useState<KnowledgeCategory[]>([])
  const [phone, setPhone] = useState('')
  const [listHint, setListHint] = useState('')
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPreparingUpload, setIsPreparingUpload] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const ownerFolderName = phone
  const uploadTarget =
    teacherFolders.find((folder) => ownerFolderNameMatches(folder.name, phone)) || undefined

  const loadPlatformPlans = useCallback(
    async (keyword?: string) => {
      if (!configured || !scope.categoryId) {
        setPlatformPlans([])
        setTeacherFolders([])
        setPhone('')
        setListHint('教师成果库尚未配置完成，请联系管理员后再使用')
        return [] as TeachingPlan[]
      }

      const auth = authBridge.getAuthInfo()
      if (!auth?.token) {
        setPlatformPlans([])
        setTeacherFolders([])
        setPhone('')
        setListHint('请先登录平台后加载教师成果库')
        return []
      }

      let currentPhone = ''
      try {
        currentPhone = await getCurrentTeacherPhone()
      } catch (err) {
        const msg = err instanceof Error ? err.message : '获取手机号失败'
        setPlatformPlans([])
        setTeacherFolders([])
        setPhone('')
        setListHint(msg)
        return []
      }

      setPhone(currentPhone)
      if (!currentPhone) {
        setPlatformPlans([])
        setTeacherFolders([])
        setListHint('未能获取手机号；成果库仅显示与手机号同名的个人文件夹')
        return []
      }

      setIsLoadingPlatform(true)
      try {
        const { plans: next, source, error, folders } = await fetchArchivePlansForOwnerFolder(
          currentPhone,
          {
            keyword: keyword?.trim() || undefined,
            limit: 50,
          }
        )
        // 成果库不展示误入的活动方案/周计划（那些应在教案库/周计划库）
        const archiveOnly = next.filter(
          (plan) => !/_活动方案_/.test(plan.title || '') && !/_周计划_/.test(plan.title || '')
        )
        setPlatformPlans(archiveOnly)
        setTeacherFolders(folders)
        if (source === 'platform') {
          const skipped = next.length - archiveOnly.length
          setListHint(
            `仅显示手机号「${currentPhone}」· ${folders.length} 个文件夹 · 知识库 ${scope.knowledgeId}` +
              (skipped > 0 ? `（已隐藏 ${skipped} 份误入的活动方案/周计划）` : '')
          )
        } else {
          setListHint(error || `手机号「${currentPhone}」下暂无成果文档`)
        }
        return archiveOnly
      } finally {
        setIsLoadingPlatform(false)
      }
    },
    [configured, scope.knowledgeId, scope.categoryId]
  )

  const prepareFileUpload = useCallback(async () => {
    if (!configured) throw new Error('请先配置教师成果库分类 ID')
    const auth = authBridge.getAuthInfo()
    if (!auth?.token) throw new Error('请先登录平台后再上传')

    let currentPhone = phone
    if (!currentPhone) {
      currentPhone = await getCurrentTeacherPhone()
      setPhone(currentPhone)
    }
    if (!currentPhone) throw new Error('未能获取手机号，无法上传到个人成果文件夹')
    if (!uploadTarget) {
      await ensureArchiveOwnerFolder(currentPhone)
    }
    if (uploadFiles.length === 0) throw new Error('请先选择要上传的文件')

    setIsPreparingUpload(true)
    try {
      const parsed = prepareArchiveUploadFiles(uploadFiles)
      setPendingUploads(
        parsed.map((file) => ({
          fileName: file.fileName,
          title: file.title,
          file: file.file,
          uploadMode: 'file' as const,
        }))
      )
      setConfirmOpen(true)
    } finally {
      setIsPreparingUpload(false)
    }
  }, [configured, phone, uploadFiles, uploadTarget])

  const cancelPendingUpload = useCallback(() => {
    if (isUploading) return
    setConfirmOpen(false)
    setPendingUploads([])
  }, [isUploading])

  const confirmPendingUpload = useCallback(async (_mode?: 'mysql' | 'platform') => {
    if (!configured) throw new Error('请先配置教师成果库分类 ID')
    if (pendingUploads.length === 0) throw new Error('没有待上传内容')
    setIsUploading(true)
    try {
      const currentPhone = phone || (await getCurrentTeacherPhone())
      const liveFolder = await resolveLiveArchiveOwnerFolder(currentPhone)
      const uploaded: TeachingPlan[] = []
      for (const item of pendingUploads) {
        if (item.uploadMode === 'file' && item.file) {
          uploaded.push(
            await uploadKnowledgeFile({
              file: item.file,
              title: item.title,
              knowledgeId: liveFolder.knowledgeId,
              categoryId: liveFolder.categoryId,
              categoryKey: liveFolder.categoryKey,
              forceKind: 'archive',
            })
          )
          continue
        }
        throw new Error(`「${item.fileName}」缺少文件内容，请重新选择后上传`)
      }
      setConfirmOpen(false)
      setPendingUploads([])
      setUploadFiles([])
      await loadPlatformPlans()
      return uploaded
    } finally {
      setIsUploading(false)
    }
  }, [configured, pendingUploads, loadPlatformPlans, phone])

  const deletePlan = useCallback(async (plan: TeachingPlan) => {
    if (plan.source === 'preset') {
      throw new Error('本地预设不可删除')
    }
    setIsDeleting(true)
    try {
      await deleteKnowledgeDocument(plan.id)
      setPlatformPlans((prev) => prev.filter((p) => p.id !== plan.id))
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    scope,
    configured,
    phone,
    ownerFolderName,
    teacherFolders,
    uploadTarget,
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
  }
}
