import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTeachingResources } from '@/hooks/useTeachingResources'
import FileUploadCard from '@/pages/weekly-plan/components/FileUploadCard'
import ClassSelector from '@/pages/weekly-plan/components/ClassSelector'
import { FOCUS_DOMAINS, type FocusDomain } from '@/pages/resources/DomainSelector'
import ActivityPlanPreview from '@/pages/resources/ActivityPlanPreview'
import PlanManageList from '@/pages/resources/PlanManageList'
import PlanDetailDialog from '@/pages/resources/PlanDetailDialog'
import UploadConfirmDialog from '@/pages/resources/UploadConfirmDialog'
import { Upload, BookOpen, Wand2, RefreshCw, CloudUpload } from 'lucide-react'
import { isBackendApiEnabled } from '@/api/llm'
import { getTeachingAgentId } from '@/api/agent'
import { authBridge, loginWithAi101 } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'
import type { TeachingPlan } from '@/types/weeklyPlan'
const DURATION_OPTIONS = [15, 20, 30, 45, 60] as const
const domainOptions: { label: string; value: FocusDomain; desc: string }[] = [
  { label: '艺术', value: '艺术', desc: '音乐 / 美术' },
  { label: '语言', value: '语言', desc: '阅读 / 表达' },
  { label: '科学', value: '科学', desc: '探究 / 自然' },
  { label: '健康', value: '健康', desc: '体能 / 习惯' },
  { label: '社会', value: '社会', desc: '交往 / 规则' },
]
export default function ResourcesPage() {
  const res = useTeachingResources()
  const [searchParams] = useSearchParams()
  const showBrowserKeyHint = !isBackendApiEnabled() && !res.apiConfigured
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const isLoggedIn = Boolean(authInfo?.token)
  const [viewPlan, setViewPlan] = useState<TeachingPlan | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState<number>(30)
  const [previewPlanId, setPreviewPlanId] = useState<string | null>(null)
  useEffect(() => authBridge.subscribe(setAuthInfo), [])
  useEffect(() => {
    const topic = searchParams.get('topic')
    const domain = searchParams.get('domain')
    if (topic) res.setThemeName(topic)
    if (domain && (FOCUS_DOMAINS as readonly string[]).includes(domain)) {
      res.setFocusDomains([domain as FocusDomain])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only prefill on mount from URL
  }, [])
  useEffect(() => {
    if (isLoggedIn && res.section === 'manage') {
      void res.loadPlatformPlans()
    }
  }, [isLoggedIn, res.section, res.loadPlatformPlans])
  useEffect(() => {
    if (res.generatedPlans.length > 0 && !previewPlanId) {
      setPreviewPlanId(res.generatedPlans[0].id)
    }
  }, [res.generatedPlans, previewPlanId])
  const toggleDomain = (domain: FocusDomain) => {
    if (res.focusDomains.includes(domain)) {
      res.setFocusDomains(res.focusDomains.filter((d) => d !== domain))
    } else {
      res.setFocusDomains([...res.focusDomains, domain])
    }
  }
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
      toast.error('请至少选择一个领域')
      return
    }
    if (!res.themeName.trim()) {
      toast.error('请先填写活动主题')
      return
    }
    try {
      const plans = await res.generateTeachingPlansFromTheme({ durationMinutes })
      setPreviewPlanId(plans[0]?.id ?? null)
      toast.success(
        `已由智能体 ${getTeachingAgentId()} 生成 ${plans.length} 份活动方案，勾选后可确认上传到知识库`
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成活动方案失败')
    }
  }
  const handlePrepareGeneratedUpload = () => {
    void (async () => {
      try {
        await res.prepareGeneratedUpload(res.uploadSelection)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : '无法准备上传')
      }
    })()
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
          活动方案
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nest-muted">
          单次活动方案生成与知识库管理：左侧填写条件生成预览，确认后可入库；也可直接上传文件到平台知识库
        </p>
      </div>
      {showBrowserKeyHint && (
        <div className="mb-4 rounded-xl border border-sky-200/80 bg-sky-50/90 p-3 text-sm text-sky-800">
          未配置 API Key，主题生成将使用演示数据。在根目录{' '}
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
          <Wand2 size={16} /> 活动方案生成
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
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Left: form workspace */}
            <div className="surface-panel space-y-4 p-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-nest-ink">单次活动条件</h2>
                <p className="mt-1 text-sm text-nest-muted">
                  调用平台智能体（ID {getTeachingAgentId()}）生成；从周计划跳转时会自动带入主题与领域
                </p>
              </div>
              <ClassSelector value={res.className} onChange={res.setClassName} />
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-medium text-nest-ink">
                  <span>活动领域</span>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-500">
                    可多选
                  </span>
                  {res.focusDomains.length > 0 && (
                    <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-leaf">
                      已选 {res.focusDomains.length} · 将生成 {res.focusDomains.length} 份
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {domainOptions.map((opt) => {
                    const selected = res.focusDomains.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.desc}
                        onClick={() => toggleDomain(opt.value)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                          selected
                            ? 'border-nest-leaf bg-nest-mist font-medium text-nest-pine shadow-sm shadow-nest-leaf/10'
                            : 'border-nest-leaf/15 bg-white text-nest-muted hover:border-nest-leaf/30 hover:bg-nest-mist/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-nest-muted">
                  活动主题 <span className="text-red-400">*</span>
                </label>
                <input
                  value={res.themeName}
                  onChange={(e) => res.setThemeName(e.target.value)}
                  placeholder="如：好宝宝爱图书、水的秘密"
                  className="field-input"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-nest-muted">活动时长</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="field-input"
                >
                  {DURATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} 分钟
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-nest-muted">重点关注 / 补充说明</label>
                <textarea
                  value={res.notes}
                  onChange={(e) => res.setNotes(e.target.value)}
                  rows={3}
                  placeholder="可选：特殊材料、幼儿发展水平、注意事项等"
                  className="field-input resize-none"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={
                  res.isGeneratingPlans ||
                  !res.themeName.trim() ||
                  !res.className ||
                  res.focusDomains.length === 0
                }
                className="btn-primary w-full justify-center !py-3"
              >
                <Wand2 size={16} />
                {res.isGeneratingPlans
                  ? '正在生成活动方案...'
                  : res.focusDomains.length > 0
                    ? `生成活动方案（${res.focusDomains.length} 份）`
                    : '生成活动方案'}
              </button>
              {res.generatedPlans.length > 0 && (
                <button
                  type="button"
                  onClick={handlePrepareGeneratedUpload}
                  disabled={
                    res.isUploadingGenerated || res.uploadSelection.length === 0 || !isLoggedIn
                  }
                  className="btn-accent w-full justify-center"
                >
                  <CloudUpload size={16} />
                  {`确认上传到知识库（${res.uploadSelection.length}）`}
                </button>
              )}
            </div>
            {/* Right: preview workspace */}
            <div className="surface-panel p-5">
              <h2 className="mb-4 font-display text-lg font-semibold text-nest-ink">方案预览</h2>
              <ActivityPlanPreview
                plans={res.generatedPlans}
                loading={res.isGeneratingPlans}
                activePlanId={previewPlanId}
                onActivePlanChange={(p) => setPreviewPlanId(p.id)}
              />
            </div>
          </div>
          {res.generatedPlans.length > 0 && (
            <PlanManageList
              title="生成结果 · 勾选上传"
              plans={res.generatedPlans}
              loading={res.isGeneratingPlans}
              emptyHint="尚未生成活动方案"
              selectable
              selected={res.uploadSelection}
              onChange={res.setUploadSelection}
              onView={handleView}
              onDelete={handleDelete}
              deleting={res.isDeleting}
              showSearch={false}
            />
          )}
        </div>
      )}
      {res.section === 'manage' && (
        <div className="surface-panel space-y-5 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-nest-ink">知识库管理</h2>
            <p className="mt-1 text-sm text-nest-muted">
              上传 docx 到平台知识库 10298（分类 20806）；点击卡片可查看完整活动方案
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
            taxonomy="activity"
            emptyHint={
              isLoggedIn
                ? '知识库暂无文档，可上传文件或到「活动方案生成」入库'
                : '请先登录平台以加载知识库 10298'
            }
            onView={handleView}
            onDelete={handleDelete}
            deleting={res.isDeleting}
            searchPlaceholder="搜寻活动方案（姓名、手机号、方案名）"
            onSearch={async (keyword) => {
              try {
                const plans = await res.loadPlatformPlans(keyword)
                toast.success(
                  keyword
                    ? `检索「${keyword}」：${plans.length} 份`
                    : plans.length > 0
                      ? `已加载 ${plans.length} 份文档`
                      : '知识库暂无文档'
                )
              } catch (err) {
                toast.error(err instanceof Error ? err.message : '搜寻失败')
              }
            }}
          />
        </div>
      )}
      <UploadConfirmDialog
        open={res.confirmOpen}
        items={res.pendingUploads}
        uploading={res.isUploading || res.isUploadingGenerated}
        onConfirm={() => void handleConfirmUpload()}
        onCancel={res.cancelPendingUpload}
        targetHint="将上传到「教案知识库管理」，不是教师成果库。标题不含手机号，避免平台智能分类误入成果库。"
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
