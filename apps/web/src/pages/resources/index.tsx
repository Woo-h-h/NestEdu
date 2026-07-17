import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useTeachingResources } from '@/hooks/useTeachingResources'
import FileUploadCard from '@/pages/weekly-plan/components/FileUploadCard'
import ClassSelector from '@/pages/weekly-plan/components/ClassSelector'
import DomainSelector from '@/pages/resources/DomainSelector'
import PlanManageList from '@/pages/resources/PlanManageList'
import PlanDetailDialog from '@/pages/resources/PlanDetailDialog'
import UploadConfirmDialog from '@/pages/resources/UploadConfirmDialog'
import { Upload, BookOpen, Wand2, RefreshCw, CloudUpload } from 'lucide-react'
import { isBackendApiEnabled } from '@/api/llm'
import { getTeachingAgentId } from '@/api/agent'
import { authBridge, loginWithAi101 } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'
import type { TeachingPlan } from '@/types/weeklyPlan'

export default function ResourcesPage() {
  const res = useTeachingResources()
  const showBrowserKeyHint = !isBackendApiEnabled() && !res.apiConfigured
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const isLoggedIn = Boolean(authInfo?.token)
  const [viewPlan, setViewPlan] = useState<TeachingPlan | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  useEffect(() => {
    if (isLoggedIn && res.section === 'manage') {
      void res.loadPlatformPlans()
    }
  }, [isLoggedIn, res.section, res.loadPlatformPlans])

  const handleLogin = async () => {
    try {
      await loginWithAi101()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败')
    }
  }

  const handleGenerate = async () => {
    if (!res.className) {
      toast.error('请先选择班级')
      return
    }
    if (res.focusDomains.length === 0) {
      toast.error('请至少选择一个重点领域')
      return
    }
    if (!res.themeName.trim()) {
      toast.error('请先填写主题名称')
      return
    }
    try {
      const plans = await res.generateTeachingPlansFromTheme()
      toast.success(
        `已由智能体 ${getTeachingAgentId()} 生成 ${plans.length} 份教案，勾选后可确认上传到知识库`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成教案失败')
    }
  }

  const handlePrepareGeneratedUpload = () => {
    try {
      res.prepareGeneratedUpload(res.uploadSelection)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '无法准备上传')
    }
  }

  const handlePrepareFileUpload = async () => {
    try {
      await res.prepareFileUpload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '解析文件失败')
    }
  }

  const handleConfirmUpload = async () => {
    try {
      const uploaded = await res.confirmPendingUpload()
      toast.success(`已成功上传 ${uploaded.length} 份到平台知识库`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    }
  }

  const handleRefreshPlatform = async () => {
    try {
      const plans = await res.loadPlatformPlans()
      toast.success(plans.length > 0 ? `已加载 ${plans.length} 份文档` : '知识库暂无文档')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刷新失败')
    }
  }

  const handleDelete = async (plan: Parameters<typeof res.deletePlan>[0]) => {
    if (!window.confirm(`确定删除「${plan.title}」？`)) return
    try {
      await res.deletePlan(plan)
      toast.success('已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleView = (plan: TeachingPlan) => {
    setViewPlan(plan)
    setDetailOpen(true)
  }

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <div className="mb-7">
        <h1 className="font-display text-2xl font-bold tracking-wide text-nest-ink md:text-[1.75rem]">
          课程资源库
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nest-muted">
          教案生成与知识库管理相互独立：先生成再确认入库，或直接上传文件到平台知识库
        </p>
      </div>

      {showBrowserKeyHint && (
        <div className="mb-4 rounded-xl border border-sky-200/80 bg-sky-50/90 p-3 text-sm text-sky-800">
          未配置 API Key，主题生成教案将使用演示数据。在根目录{' '}
          <code className="rounded bg-sky-100/80 px-1">.env</code> 设置 VITE_DEEPSEEK_API_KEY
          即可接入大模型
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => res.setSection('generate')}
          className={`tab-pill ${
            res.section === 'generate' ? 'tab-pill-active' : 'tab-pill-idle'
          }`}
        >
          <Wand2 size={16} /> 教案生成
        </button>
        <button
          type="button"
          onClick={() => res.setSection('manage')}
          className={`tab-pill ${res.section === 'manage' ? 'tab-pill-active' : 'tab-pill-idle'}`}
        >
          <BookOpen size={16} /> 知识库管理
        </button>
      </div>

      {res.section === 'generate' && (
        <div className="surface-panel space-y-5 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-nest-ink">按主题生成教案</h2>
            <p className="mt-1 text-sm text-nest-muted">
              调用平台智能体（ID {getTeachingAgentId()}）生成教案；勾选后确认上传到知识库。需先登录平台。
            </p>
          </div>

          <ClassSelector value={res.className} onChange={res.setClassName} />
          <DomainSelector value={res.focusDomains} onChange={res.setFocusDomains} />

          <div className="rounded-2xl border border-nest-leaf/10 bg-nest-mist/30 p-5">
            <label className="mb-1.5 block text-sm text-nest-muted">
              主题名称 <span className="text-red-400">*</span>
            </label>
            <input
              value={res.themeName}
              onChange={(e) => res.setThemeName(e.target.value)}
              placeholder="如：好宝宝爱图书"
              className="field-input"
            />
            <label className="mb-1.5 mt-3 block text-sm text-nest-muted">补充说明</label>
            <textarea
              value={res.notes}
              onChange={(e) => res.setNotes(e.target.value)}
              rows={2}
              placeholder="可选"
              className="field-input resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                res.isGeneratingPlans ||
                !res.themeName.trim() ||
                !res.className ||
                res.focusDomains.length === 0
              }
              className="btn-primary"
            >
              <Wand2 size={16} />
              {res.isGeneratingPlans
                ? '正在生成...'
                : res.focusDomains.length > 0
                  ? `根据主题生成教案（${res.focusDomains.length}）`
                  : '根据主题生成教案'}
            </button>
            <button
              type="button"
              onClick={handlePrepareGeneratedUpload}
              disabled={
                res.isUploadingGenerated || res.uploadSelection.length === 0 || !isLoggedIn
              }
              className="btn-accent"
            >
              <CloudUpload size={16} />
              {`确认上传到知识库（${res.uploadSelection.length}）`}
            </button>
          </div>

          <PlanManageList
            title="生成结果"
            plans={res.generatedPlans}
            loading={res.isGeneratingPlans}
            emptyHint="尚未生成教案，填写主题后点击生成"
            selectable
            selected={res.uploadSelection}
            onChange={res.setUploadSelection}
            onView={handleView}
            onDelete={handleDelete}
            deleting={res.isDeleting}
          />
        </div>
      )}

      {res.section === 'manage' && (
        <div className="surface-panel space-y-5 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-nest-ink">知识库管理</h2>
            <p className="mt-1 text-sm text-nest-muted">
              上传 docx 到平台知识库 10298（分类 20806）；点击卡片可查看完整教案。
            </p>
          </div>

          {!isLoggedIn && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
              <span>当前未登录，无法上传或读取平台知识库，请先登录。</span>
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
              files={res.uploadFiles}
              onChange={res.setUploadFiles}
              title="上传文件到知识库"
              hint="将 docx 文件拖拽到此处，或点击选择文件；确认后才会真正入库"
            />
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleRefreshPlatform}
                disabled={res.isLoadingPlatform || !isLoggedIn}
                className="btn-secondary"
              >
                <RefreshCw size={16} className={res.isLoadingPlatform ? 'animate-spin' : ''} />
                {res.isLoadingPlatform ? '加载中...' : '刷新列表'}
              </button>
              <button
                type="button"
                onClick={() => void handlePrepareFileUpload()}
                disabled={
                  res.isPreparingUpload ||
                  res.isUploading ||
                  res.uploadFiles.length === 0 ||
                  !isLoggedIn
                }
                className="btn-primary"
              >
                <Upload size={16} />
                {res.isPreparingUpload
                  ? '解析中...'
                  : `解析并确认上传（${res.uploadFiles.length}）`}
              </button>
            </div>
          </div>

          <PlanManageList
            title="知识库文档"
            plans={res.platformPlans}
            loading={res.isLoadingPlatform}
            sourceHint={res.listHint}
            emptyHint={
              isLoggedIn
                ? '知识库暂无文档，可上传文件或到「教案生成」入库'
                : '请先登录平台以加载知识库 10298'
            }
            onView={handleView}
            onDelete={handleDelete}
            deleting={res.isDeleting}
          />
        </div>
      )}

      <UploadConfirmDialog
        open={res.confirmOpen}
        items={res.pendingUploads}
        uploading={res.isUploading || res.isUploadingGenerated}
        onConfirm={() => void handleConfirmUpload()}
        onCancel={res.cancelPendingUpload}
      />

      <PlanDetailDialog
        plan={viewPlan}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setViewPlan(null)
        }}
      />
    </div>
  )
}
