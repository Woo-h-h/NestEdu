import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useWeeklyPlanKnowledge } from '@/hooks/useWeeklyPlanKnowledge'
import FileUploadCard from '@/pages/weekly-plan/components/FileUploadCard'
import PlanManageList from '@/pages/resources/PlanManageList'
import PlanDetailDialog from '@/pages/resources/PlanDetailDialog'
import UploadConfirmDialog from '@/pages/resources/UploadConfirmDialog'
import { CloudUpload, RefreshCw } from 'lucide-react'
import { authBridge, loginWithAi101 } from '@/lib/authBridge'
import { fetchKnowledgePlanById } from '@/api/knowledge'
import { exportToDoc } from '@/lib/export-doc'
import { parseWeeklyPlanFromDocument, weeklyPlanFileName } from '@/lib/weeklyPlanText'
import type { AuthInfo } from '@zcat-open/auth-bridge'
import type { TeachingPlan } from '@/types/weeklyPlan'

/** 周计划知识库管理分区（嵌入「周计划管理」页 Tab） */
export default function WeeklyPlanManageSection() {
  const kb = useWeeklyPlanKnowledge()
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const isLoggedIn = Boolean(authInfo?.token)
  const [viewPlan, setViewPlan] = useState<TeachingPlan | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  useEffect(() => {
    if (isLoggedIn) {
      void kb.loadPlatformPlans()
    }
  }, [isLoggedIn, kb.loadPlatformPlans])

  const handleLogin = async () => {
    try {
      await loginWithAi101()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败')
    }
  }

  const handlePrepareFileUpload = async () => {
    try {
      await kb.prepareFileUpload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '解析文件失败')
    }
  }

  const handleConfirmUpload = async (mode: 'mysql' | 'platform') => {
    try {
      const uploaded = await kb.confirmPendingUpload(mode)
      toast.success(
        mode === 'mysql'
          ? `已保存 ${uploaded.length} 份到 MySQL（仅自己可见，请在「我的」查看）`
          : `已成功上传 ${uploaded.length} 份到周计划知识库，并写入 MySQL`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    }
  }

  const handleRefresh = async () => {
    try {
      const plans = await kb.loadPlatformPlans()
      toast.success(plans.length > 0 ? `已加载 ${plans.length} 份周计划` : '知识库暂无周计划')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刷新失败')
    }
  }

  const handleDelete = async (plan: TeachingPlan) => {
    if (!window.confirm(`确定删除「${plan.title}」？`)) return
    try {
      await kb.deletePlan(plan)
      toast.success('已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleExport = async (plan: TeachingPlan) => {
    setExporting(true)
    try {
      const detail = (await fetchKnowledgePlanById(plan.id)) || plan
      const weekly = parseWeeklyPlanFromDocument(detail)
      await exportToDoc(weekly)
      toast.success(`已导出 ${weeklyPlanFileName(weekly)}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <div className="surface-panel space-y-5 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-nest-ink">知识库管理</h2>
          <p className="mt-1 text-sm text-nest-muted">
            管理知识库 {kb.scope.knowledgeId} 下分类 {kb.scope.categoryId}{' '}
            的周计划：上传、查看、导出（「班级第N周计划.docx」）、删除
          </p>
        </div>

        {!isLoggedIn && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
            <span>当前未登录，无法上传或读取周计划知识库，请先登录。</span>
            <button
              type="button"
              onClick={() => void handleLogin()}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
            >
              登录平台
            </button>
          </div>
        )}

        <div className="space-y-3">
          <FileUploadCard
            files={kb.uploadFiles}
            onChange={kb.setUploadFiles}
            title="上传文件到周计划知识库"
            hint="将 docx 文件拖拽到此处，或点击选择文件；确认后才会真正入库"
          />
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={kb.isLoadingPlatform || !isLoggedIn}
              className="btn-secondary"
            >
              <RefreshCw size={16} className={kb.isLoadingPlatform ? 'animate-spin' : ''} />
              {kb.isLoadingPlatform ? '加载中...' : '刷新列表'}
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
              {kb.isPreparingUpload ? '解析中...' : '确认上传'}
            </button>
          </div>
        </div>

        <PlanManageList
          title="周计划文档"
          plans={kb.platformPlans}
          loading={kb.isLoadingPlatform}
          sourceHint={kb.listHint}
          taxonomy="weekly"
          emptyHint="暂无周计划，可上传 docx 或从「周计划生成」入库"
          onView={(plan) => {
            setViewPlan(plan)
            setDetailOpen(true)
          }}
          onExport={(plan) => void handleExport(plan)}
          onDelete={handleDelete}
          onRefresh={() => kb.loadPlatformPlans()}
          deleting={kb.isDeleting}
          exporting={exporting}
          searchPlaceholder="搜寻周计划（姓名、手机号、班级周次）"
          onSearch={async (keyword) => {
            try {
              const plans = await kb.loadPlatformPlans(keyword)
              toast.success(
                keyword
                  ? `检索「${keyword}」：${plans.length} 份`
                  : plans.length > 0
                    ? `已加载 ${plans.length} 份`
                    : '暂无周计划'
              )
            } catch (err) {
              toast.error(err instanceof Error ? err.message : '搜寻失败')
            }
          }}
        />
      </div>

      <UploadConfirmDialog
        open={kb.confirmOpen}
        items={kb.pendingUploads}
        uploading={kb.isUploading}
        showStorageChoice
        onCancel={kb.cancelPendingUpload}
        onConfirm={(mode) => void handleConfirmUpload(mode)}
        targetHint="请选择入库方式。上传平台时写入「周计划管理」；仅 MySQL 则只在本系统「我的」可见。"
      />

      <PlanDetailDialog plan={viewPlan} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  )
}
