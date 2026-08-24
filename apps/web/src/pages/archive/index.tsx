import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, CloudUpload } from 'lucide-react'
import { useArchiveKnowledge } from '@/hooks/useArchiveKnowledge'
import { getApiErrorMessage } from '@/lib/apiError'
import { authBridge, loginWithAi101 } from '@/lib/authBridge'
import { runArchiveDebug, type ArchiveDebugPayload } from '@/lib/archiveDebug'
import { getArchiveCategoryId, getArchiveCategoryKey, getDefaultKnowledgeId } from '@/api/knowledge'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import { fetchTeacherGeneratedDocStats } from '@/api/teacherGeneratedDocs'
import PlanManageList from '@/pages/resources/PlanManageList'
import PlanDetailDialog from '@/pages/resources/PlanDetailDialog'
import UploadConfirmDialog from '@/pages/resources/UploadConfirmDialog'
import FileUploadCard from '@/pages/weekly-plan/components/FileUploadCard'
import {
  ARCHIVE_UPLOAD_ACCEPT,
  ARCHIVE_UPLOAD_EXTENSIONS,
  ARCHIVE_UPLOAD_FORMAT_LABEL,
} from '@/lib/archiveUploadFormats'
import {
  applyArchiveAchievementsToPlans,
  listArchiveAchievements,
  type ArchiveAchievement,
} from '@/api/archiveAchievements'
import type { TeachingPlan } from '@/types/weeklyPlan'
import type { AuthInfo } from '@zcat-open/auth-bridge'

export default function ArchivePage() {
  const kb = useArchiveKnowledge()
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const isLoggedIn = Boolean(authInfo?.token)

  const [viewPlan, setViewPlan] = useState<TeachingPlan | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [debugPayload, setDebugPayload] = useState<ArchiveDebugPayload | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  const [activityCount, setActivityCount] = useState<number | null>(null)
  const [weeklyCount, setWeeklyCount] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [achievements, setAchievements] = useState<ArchiveAchievement[]>([])

  const classifiedPlans = useMemo(
    () => applyArchiveAchievementsToPlans(kb.platformPlans, achievements),
    [kb.platformPlans, achievements]
  )

  const reloadAchievements = useCallback(async () => {
    if (!isLoggedIn) {
      setAchievements([])
      return
    }
    const phone = (kb.phone || (await getCurrentTeacherPhone())).trim()
    if (!phone) {
      setAchievements([])
      return
    }
    setAchievements(await listArchiveAchievements(phone))
  }, [isLoggedIn, kb.phone])

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  useEffect(() => {
    if (isLoggedIn && kb.configured) {
      void kb.loadPlatformPlans()
    } else if (!kb.configured) {
      void kb.loadPlatformPlans()
    }
  }, [isLoggedIn, kb.configured, kb.loadPlatformPlans])

  useEffect(() => {
    let cancelled = false
    const loadStats = async () => {
      setStatsLoading(true)
      try {
        if (!isLoggedIn) {
          if (!cancelled) {
            setActivityCount(null)
            setWeeklyCount(null)
          }
          return
        }
        const phone = (await getCurrentTeacherPhone()).trim()
        if (!phone) {
          if (!cancelled) {
            setActivityCount(null)
            setWeeklyCount(null)
          }
          return
        }
        const stats = await fetchTeacherGeneratedDocStats(phone)
        if (cancelled) return
        if (!stats) {
          setActivityCount(0)
          setWeeklyCount(0)
          return
        }
        setActivityCount(stats.activity)
        setWeeklyCount(stats.weekly)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    void loadStats()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  useEffect(() => {
    void reloadAchievements()
  }, [reloadAchievements, kb.platformPlans.length])

  const handleLogin = async () => {
    try {
      await loginWithAi101()
    } catch (err) {
      toast.error(getApiErrorMessage(err, '登录失败'))
    }
  }

  const handleRefreshKb = async () => {
    try {
      const plans = await kb.loadPlatformPlans()
      await reloadAchievements()
      toast.success(
        plans.length > 0 ? `已加载 ${plans.length} 份教师成果` : '教师成果库暂无文档'
      )
    } catch (err) {
      toast.error(getApiErrorMessage(err, '刷新失败'))
    }
  }

  const handleArchiveDebug = async () => {
    setDebugLoading(true)
    try {
      const payload = await runArchiveDebug()
      setDebugPayload(payload)
      toast.success(
        payload.archive?.folders?.length
          ? `已匹配 ${payload.archive.folders.length} 个文件夹`
          : '诊断完成：未匹配到个人文件夹（见下方详情）'
      )
    } catch (err) {
      toast.error(getApiErrorMessage(err, '诊断失败'))
    } finally {
      setDebugLoading(false)
    }
  }

  const handlePrepareFileUpload = async () => {
    try {
      await kb.prepareFileUpload()
    } catch (err) {
      toast.error(getApiErrorMessage(err, '准备上传失败'))
    }
  }

  const handleConfirmUpload = async () => {
    try {
      const uploaded = await kb.confirmPendingUpload('platform')
      await reloadAchievements()
      const needsReview = uploaded.some((p) => (p.objectives || '').includes('解析未完成'))
      toast.success(
        needsReview
          ? `已上传 ${uploaded.length} 份；部分解析需人工核对，请打开详情查看`
          : `已成功上传并解析 ${uploaded.length} 份到教师成果库`
      )
    } catch (err) {
      toast.error(getApiErrorMessage(err, '上传失败'))
    }
  }

  const handleDeletePlan = async (plan: TeachingPlan) => {
    if (!window.confirm(`确定删除「${plan.title}」？`)) return
    try {
      await kb.deletePlan(plan)
      toast.success('已删除')
    } catch (err) {
      toast.error(getApiErrorMessage(err, '删除失败'))
    }
  }

  const formatCount = (n: number | null) => {
    if (statsLoading) return '—'
    if (n === null) return '—'
    return String(n)
  }

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-nest-ink md:text-[1.75rem]">
            成果库
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nest-muted">
            展示知识库「教师成果库」文件夹文档，并汇总活动方案、周计划与教师成果库三项统计。
          </p>
        </div>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        <SummaryStat
          label="活动方案"
          value={formatCount(activityCount)}
          hint={
            activityCount === null
              ? '需登录平台'
              : statsLoading
                ? '统计中…'
                : '本人入库'
          }
          muted={activityCount === null}
        />
        <SummaryStat
          label="周计划"
          value={formatCount(weeklyCount)}
          hint={
            weeklyCount === null
              ? '需登录平台'
              : statsLoading
                ? '统计中…'
                : '本人入库'
          }
          muted={weeklyCount === null}
        />
        <SummaryStat
          label="教师成果库"
          value={
            !kb.configured
              ? '—'
              : kb.isLoadingPlatform
                ? '—'
                : String(kb.platformPlans.length)
          }
          hint={
            !kb.configured
              ? '待配置分类 ID'
              : kb.listHint.includes('登录')
                ? '需登录平台'
                : '平台知识库文件夹'
          }
          muted={!kb.configured || kb.platformPlans.length === 0}
        />
      </section>

      <section className="surface-panel space-y-5 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-nest-ink">教师成果库</h2>
          <p className="mt-1 text-sm text-nest-muted">
            对接{' '}
            <a
              className="text-nest-pine underline-offset-2 hover:underline"
              href={`https://www.zcat.cn/teach/knowledge/detail/${getDefaultKnowledgeId()}?category_id=${getArchiveCategoryId()}&category_key=${getArchiveCategoryKey()}`}
              target="_blank"
              rel="noreferrer"
            >
              华科附幼教案知识库 · 教师成果库
            </a>
            。登录后<strong>仅显示与您手机号同名的文件夹</strong>
            {kb.phone ? `（当前：${kb.phone}）` : ''}，不会看到其他老师的文件夹。
          </p>
        </div>

        {!kb.configured && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
            教师成果库尚未配置完成，请联系管理员完成知识库分类设置后再使用。
          </div>
        )}

        {kb.configured && !isLoggedIn && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
            <span>当前未登录，无法读取教师成果库，请先登录。</span>
            <button
              type="button"
              onClick={() => void handleLogin()}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
            >
              登录平台
            </button>
          </div>
        )}

        {kb.configured && isLoggedIn && !kb.phone && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
            已登录但未读取到手机号。请确认平台账号已绑定手机号；教师成果库下需创建与手机号同名的文件夹（例如「17362955307」）。
          </div>
        )}

        {kb.configured && isLoggedIn && kb.phone && kb.teacherFolders.length === 0 && !kb.isLoadingPlatform && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
            {kb.listHint?.trim()
              ? kb.listHint
              : `未找到与手机号「${kb.phone}」对应的文件夹。请在知识库「教师成果库」下创建同名文件夹后再刷新。`}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleArchiveDebug()}
                disabled={debugLoading}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-60"
              >
                {debugLoading ? '诊断中...' : '一键诊断匹配问题'}
              </button>
              <span className="text-xs text-amber-800/80">
                若嵌入主站 iframe，控制台需切换到 NestEdu 子框架；优先用本按钮。
              </span>
            </div>
          </div>
        )}

        {debugPayload && (
          <div className="rounded-xl border border-nest-leaf/20 bg-nest-mist/40 p-3.5 text-xs text-nest-ink">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">成果库诊断结果（可复制发给开发）</p>
              <button
                type="button"
                className="rounded-lg border border-nest-leaf/30 bg-white px-2.5 py-1 text-nest-pine hover:bg-white/80"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(debugPayload, null, 2))
                    toast.success('已复制诊断结果')
                  } catch {
                    toast.error('复制失败，请手动选中下方文本')
                  }
                }}
              >
                复制 JSON
              </button>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white/80 p-3 font-mono leading-relaxed">
              {JSON.stringify(
                {
                  phone: debugPayload.phone,
                  cachedUidHash: debugPayload.cachedUidHash,
                  categoryCount: debugPayload.categoryCount,
                  categoryError: debugPayload.categoryError,
                  categoryDebug: debugPayload.categoryDebug,
                  resolvedArchiveId: debugPayload.resolvedArchiveId,
                  archiveChildNames: debugPayload.archiveChildNames,
                  matchedFolders: debugPayload.archive?.folders?.map((f) => ({
                    id: f.id,
                    name: f.name,
                    parentId: f.parentId,
                  })),
                  archiveError: debugPayload.archive?.error || null,
                  categoryNames: debugPayload.categoryNames,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}

        {kb.configured && (
          <div className="space-y-3">
            <FileUploadCard
              files={kb.uploadFiles}
              onChange={kb.setUploadFiles}
              title={
                kb.uploadTarget
                  ? `上传到「${kb.uploadTarget.name}」文件夹`
                  : '上传文件到个人成果文件夹'
              }
              hint="将文件拖到此处；仅写入与您手机号同名的文件夹。上传后会先经成果解析智能体归纳正文，再入库；解析失败会保留原文件并提示人工核对"
              accept={ARCHIVE_UPLOAD_ACCEPT}
              allowedExtensions={[...ARCHIVE_UPLOAD_EXTENSIONS]}
              formatLabel={ARCHIVE_UPLOAD_FORMAT_LABEL}
              formatHint="支持 Word、PDF、PPT、Excel、图片与文本；单文件建议不超过 50MB"
              invalidFormatMessage="不支持的文件格式，请选择 Word、PDF、PPT、Excel、图片或常见文本文件"
            />
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => void handleRefreshKb()}
                disabled={kb.isLoadingPlatform || !isLoggedIn}
                className="btn-secondary"
              >
                <RefreshCw size={16} className={kb.isLoadingPlatform ? 'animate-spin' : ''} />
                {kb.isLoadingPlatform ? '加载中...' : '刷新列表'}
              </button>
              <button
                type="button"
                onClick={() => void handleArchiveDebug()}
                disabled={debugLoading || !isLoggedIn}
                className="btn-secondary"
              >
                {debugLoading ? '诊断中...' : '诊断'}
              </button>
              <button
                type="button"
                onClick={() => void handlePrepareFileUpload()}
                disabled={
                  kb.isPreparingUpload ||
                  kb.isUploading ||
                  kb.uploadFiles.length === 0 ||
                  !isLoggedIn
                }
                className="btn-accent"
              >
                <CloudUpload size={16} />
                {kb.isPreparingUpload ? '准备中...' : '确认上传'}
              </button>
            </div>
          </div>
        )}

        <PlanManageList
          title="教师成果文档"
          taxonomy="archive"
          plans={classifiedPlans}
          loading={kb.isLoadingPlatform}
          showPlanTags={false}
          emptyObjectivesHint="等待打开查看解析正文；若仍无摘要说明解析未完成"
          sourceHint={kb.listHint}
          emptyHint={
            kb.configured
              ? kb.phone
                ? `手机号「${kb.phone}」下暂无文档，可上传各类文档或在平台同名文件夹中添加`
                : '获取手机号后将显示个人成果文件夹'
              : '配置分类后将显示教师成果库内容'
          }
          onView={(plan) => {
            setViewPlan(plan)
            setDetailOpen(true)
          }}
          onDelete={kb.configured ? handleDeletePlan : undefined}
          deleting={kb.isDeleting}
        />
      </section>

      <UploadConfirmDialog
        open={kb.confirmOpen}
        items={kb.pendingUploads}
        uploading={kb.isUploading}
        onCancel={kb.cancelPendingUpload}
        onConfirm={() => void handleConfirmUpload()}
        targetHint={
          kb.uploadTarget
            ? `将先上传原文件并调用成果解析智能体，再写入个人文件夹「${kb.uploadTarget.name}」。解析失败时仍保留原文件，并标注需人工核对。`
            : '将先上传原文件并调用成果解析智能体，再写入教师成果库个人文件夹。'
        }
        confirmLabel={
          kb.pendingUploads.length > 0
            ? `确认上传到教师成果库（${kb.pendingUploads.length}）`
            : undefined
        }
      />

      <PlanDetailDialog plan={viewPlan} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  )
}

function SummaryStat({
  label,
  value,
  hint,
  muted,
}: {
  label: string
  value: string
  hint: string
  muted?: boolean
}) {
  return (
    <div className={`surface-panel p-4 ${muted ? 'opacity-80' : ''}`}>
      <p className="text-xs text-nest-muted">{hint}</p>
      <p className="font-display mt-1 text-2xl font-bold text-nest-ink">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-nest-pine">{label}</p>
    </div>
  )
}
