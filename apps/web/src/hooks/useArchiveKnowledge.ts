import { useCallback, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import {
  archiveKnowledgeScope,
  deleteKnowledgeDocument,
  fetchArchivePlansForOwnerFolder,
  isArchiveKnowledgeConfigured,
  uploadKnowledgeDocument,
  type KnowledgeCategory,
} from '@/api/knowledge'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import { parseDocxFiles } from '@/lib/parse-docx'
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
        setListHint(
          '未配置教师成果库分类：请在知识库打开「教师成果库」文件夹，将 URL 中的 category_id / category_key 写入 .env'
        )
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
      throw new Error(
        `未找到与手机号「${currentPhone}」对应的文件夹，请先在教师成果库下创建同名文件夹`
      )
    }
    if (uploadFiles.length === 0) throw new Error('请先选择要上传的 docx 文件')

    const invalid = uploadFiles.find(
      (f) => !f.name.toLowerCase().endsWith('.docx') && !f.name.toLowerCase().endsWith('.doc')
    )
    if (invalid) throw new Error('仅支持 .docx / .doc 文件')

    setIsPreparingUpload(true)
    try {
      const parsed = await parseDocxFiles(uploadFiles)
      if (parsed.length === 0) {
        throw new Error('未能解析出有效文本，请确认文件为有效 docx')
      }
      setPendingUploads(
        parsed.map((file) => ({
          fileName: file.name,
          title: file.name.replace(/\.(docx|doc)$/i, ''),
          content: file.content,
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

  const confirmPendingUpload = useCallback(async () => {
    if (!configured) throw new Error('请先配置教师成果库分类 ID')
    if (!uploadTarget) throw new Error('未找到个人成果文件夹，无法上传')
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
            categoryId: uploadTarget.id,
            categoryKey: uploadTarget.key,
            forceKind: 'archive',
          })
        )
      }
      setConfirmOpen(false)
      setPendingUploads([])
      setUploadFiles([])
      await loadPlatformPlans()
      return uploaded
    } finally {
      setIsUploading(false)
    }
  }, [configured, pendingUploads, loadPlatformPlans, scope.knowledgeId, uploadTarget])

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
