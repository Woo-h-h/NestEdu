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
import { exportToPdf } from '@/lib/export-pdf'
import { parseWeeklyPlanFromDocument } from '@/lib/weeklyPlanText'
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

  const handleConfirmUpload = async () => {
    try {
      const uploaded = await kb.confirmPendingUpload()
      toast.success(`已成功上传 ${uploaded.length} 份到周计划知识库`)
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
      const result = await kb.deletePlan(plan)
      if (result && 'platformDeleted' in result && result.platformDeleted === false) {
        toast.warning(
          'hint' in result && result.hint
            ? result.hint
            : '已从本系统移除；平台侧无权删除，请到知识库手动处理'
        )
      } else {
        toast.success('已删除')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleExport = async (plan: TeachingPlan) => {
    setExporting(true)
    try {
      const detail = (await fetchKnowledgePlanById(plan.id)) || plan
      const weekly = parseWeeklyPlanFromDocument(detail)
      await exportToPdf(weekly)
      toast.success(`已导出 ${weekly.className}第${weekly.weekNumber}周计划.pdf`)
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
            管理「周计划」知识库文档：上传、查看、导出、删除；确认后计入本人入库
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
          kbTotal={kb.kbTotal}
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
        onCancel={kb.cancelPendingUpload}
        onConfirm={() => void handleConfirmUpload()}
        targetHint="确认后将写入平台「周计划管理」分类，并计入本人入库。"
      />

      <PlanDetailDialog plan={viewPlan} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  )
}
