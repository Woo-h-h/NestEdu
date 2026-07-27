import { useCallback, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import {
  archiveKnowledgeScope,
  deleteKnowledgeDocument,
  fetchArchivePlansForNickname,
  isArchiveKnowledgeConfigured,
  uploadKnowledgeDocument,
  type KnowledgeCategory,
} from '@/api/knowledge'
import { parseDocxFiles } from '@/lib/parse-docx'
import { authBridge } from '@/lib/authBridge'
import { resolveAuthNickname } from '@/lib/archiveTeacherScope'
import type { PendingUploadItem } from '@/pages/resources/UploadConfirmDialog'

/** 教师成果库：仅展示登录昵称对应文件夹（及其子文件夹）中的文档 */
export function useArchiveKnowledge() {
  const scope = archiveKnowledgeScope()
  const configured = isArchiveKnowledgeConfigured()
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [platformPlans, setPlatformPlans] = useState<TeachingPlan[]>([])
  const [teacherFolders, setTeacherFolders] = useState<KnowledgeCategory[]>([])
  const [nickname, setNickname] = useState('')
  const [listHint, setListHint] = useState('')
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPreparingUpload, setIsPreparingUpload] = useState(false)
  const [pendingUploads, setPendingUploads] = useState<PendingUploadItem[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const uploadTarget = teacherFolders.find((folder) => folder.name.trim() === nickname) ||
    teacherFolders[0]

  const loadPlatformPlans = useCallback(
    async (keyword?: string) => {
      if (!configured || !scope.categoryId) {
        setPlatformPlans([])
        setTeacherFolders([])
        setNickname('')
        setListHint(
          '未配置教师成果库分类：请在知识库打开「教师成果库」文件夹，将 URL 中的 category_id / category_key 写入 .env'
        )
        return [] as TeachingPlan[]
      }

      const nick = resolveAuthNickname(authBridge.getAuthInfo())
      setNickname(nick)
      if (!nick) {
        setPlatformPlans([])
        setTeacherFolders([])
        setListHint('请先在平台设置昵称；成果库仅显示与昵称同名的个人文件夹')
        return []
      }

      setIsLoadingPlatform(true)
      try {
        const { plans: next, source, error, folders } = await fetchArchivePlansForNickname(nick, {
          keyword: keyword?.trim() || undefined,
          limit: 50,
        })
        setPlatformPlans(next)
        setTeacherFolders(folders)
        if (source === 'platform') {
          setListHint(
            `仅显示昵称「${nick}」· ${folders.length} 个文件夹 · 知识库 ${scope.knowledgeId}`
          )
        } else {
          setListHint(error || `昵称「${nick}」下暂无成果文档`)
        }
        return next
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
    const nick = resolveAuthNickname(auth)
    if (!nick) throw new Error('请先在平台设置昵称后再上传')
    if (!uploadTarget) {
      throw new Error(`未找到与昵称「${nick}」对应的文件夹，请先在教师成果库下创建同名文件夹`)
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
  }, [configured, uploadFiles, uploadTarget])

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
    nickname,
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
