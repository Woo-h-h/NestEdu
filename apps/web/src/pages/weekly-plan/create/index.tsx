import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan'
import PlanSelector from '../components/PlanSelector'
import PlanEditor from '../components/PlanEditor'
import WeekBoard from '../components/WeekBoard'
import ClassSelector from '../components/ClassSelector'
import { ArrowLeft, Sparkles, RefreshCw, Link2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getWeeklyPlanAgentId } from '@/api/agent'
import {
  uploadKnowledgeDocument,
  getWeeklyPlanCategoryId,
  weeklyPlanKnowledgeScope,
} from '@/api/knowledge'
import { serializeWeeklyPlanText, weeklyPlanUploadTitle } from '@/lib/weeklyPlanText'
import {
  buildKnowledgeDocTitle,
  resolveOwnerIdentityForDocTitle,
} from '@/lib/knowledgeDocTitle'
import { buildTaxonomyContentPrefix } from '@/lib/planTaxonomy'
import { authBridge } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'

/** 周计划生成分区（嵌入「周计划管理」页 Tab） */
export default function WeeklyPlanCreateSection() {
  const wp = useWeeklyPlan()
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const isLoggedIn = Boolean(authInfo?.token)
  const weeklyAgentId = getWeeklyPlanAgentId()
  const [isUploading, setIsUploading] = useState(false)
  const scope = weeklyPlanKnowledgeScope()

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (wp.isModified) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [wp.isModified])

  const handleGenerate = async () => {
    if (!wp.metaReady) {
      toast.error('请先选择班级、填写主题并设置周次')
      return
    }
    if (wp.selectedPlans.length === 0) {
      toast.error('请先勾选至少一个教案')
      return
    }
    try {
      await wp.generatePlan()
      toast.success(`周计划已由智能体 ${weeklyAgentId} 生成`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成失败')
    }
  }

  const handleRefresh = async () => {
    try {
      const plans = await wp.loadPlatformPlans()
      toast.success(plans.length > 0 ? `已刷新 ${plans.length} 份教案` : '暂无教案')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刷新失败')
    }
  }

  const handleUploadToKnowledge = async () => {
    if (!wp.currentPlan) return
    if (!isLoggedIn) {
      toast.error('请先登录平台后再上传')
      return
    }
    const ok = window.confirm(
      `是否将当前周计划上传到知识库 ${scope.knowledgeId}（分类 ${getWeeklyPlanCategoryId()}）？\n可随时取消，不影响本地编辑与导出。`
    )
    if (!ok) return

    setIsUploading(true)
    try {
      const owner = await resolveOwnerIdentityForDocTitle()
      const title = buildKnowledgeDocTitle({
        ...owner,
        kind: 'weekly',
        planName: weeklyPlanUploadTitle(wp.currentPlan),
      })
      const prefix = buildTaxonomyContentPrefix({ classLevel: wp.currentPlan.className })
      const plan = await uploadKnowledgeDocument({
        title,
        content: `${prefix}${serializeWeeklyPlanText(wp.currentPlan)}`,
        knowledgeId: scope.knowledgeId,
        categoryId: scope.categoryId,
        categoryKey: scope.categoryKey,
        forceKind: 'weekly',
      })
      const { recordTeacherGeneratedUpload } = await import('@/api/teacherGeneratedDocs')
      await recordTeacherGeneratedUpload({
        docType: 'weekly',
        plan,
        categoryId: scope.categoryId,
        phone: owner.phone,
      })
      wp.setIsModified(false)
      toast.success(`已上传到周计划知识库：${title}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setIsUploading(false)
    }
  }

  if (wp.currentPlan) {
    return (
      <div>
        <button
          type="button"
          onClick={() => wp.resetAll()}
          className="mb-4 flex items-center gap-1 text-sm text-nest-muted transition-colors hover:text-nest-leaf"
        >
          <ArrowLeft size={15} /> 返回重新勾选
        </button>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-nest-leaf/15 bg-nest-mist/30 px-4 py-3 text-sm text-nest-muted">
          <span className="inline-flex items-center gap-1.5">
            <Link2 size={15} className="text-nest-leaf" />
            周看板中点击「生成详细方案」可跳转
            <Link to="/activity" className="font-medium text-nest-pine hover:underline">
              活动方案
            </Link>
            页，主题与领域会自动带入
          </span>
        </div>

        <WeekBoard plan={wp.currentPlan} />

        <PlanEditor
          plan={wp.currentPlan}
          chatHistory={wp.chatHistory}
          isAiModifying={wp.isAiModifying}
          isUploading={isUploading}
          onPlanUpdate={(p) => {
            wp.setCurrentPlan(p)
            wp.setIsModified(true)
          }}
          onUploadToKnowledge={() => void handleUploadToKnowledge()}
          onSendInstruction={wp.sendAiInstruction}
        />
      </div>
    )
  }

  const canGenerate = wp.metaReady && wp.selectedPlans.length > 0

  return (
    <div className="space-y-4">
      {!isLoggedIn && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
          生成与上传需登录平台，以便调用智能体并写入知识库。
        </div>
      )}

      <div className="surface-panel space-y-5 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-nest-ink">生成周计划</h2>
          <p className="mt-1 text-sm text-nest-muted">
            填写主题与班级周次 → 勾选教案 → 智能体 {weeklyAgentId} 生成 → 编辑导出；可选上传到周计划知识库（分类{' '}
            {getWeeklyPlanCategoryId()}）
          </p>
        </div>

        <ClassSelector value={wp.className} onChange={wp.setClassName} />

        <div className="rounded-2xl border border-nest-leaf/10 bg-nest-mist/30 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-nest-muted">
                主题名称 <span className="text-red-400">*</span>
              </label>
              <input
                value={wp.themeName}
                onChange={(e) => wp.setThemeName(e.target.value)}
                placeholder="如：好宝宝爱图书 / 亲亲自然"
                className="field-input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-nest-muted">
                第几周 <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={40}
                value={wp.weekNumber ?? ''}
                onChange={(e) =>
                  wp.setWeekNumber(e.target.value ? Number(e.target.value) : null)
                }
                placeholder="如：7"
                className="field-input"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-sm text-nest-muted">补充说明（选填）</label>
            <textarea
              value={wp.notes}
              onChange={(e) => wp.setNotes(e.target.value)}
              rows={2}
              placeholder="可选：特殊活动安排等"
              className="field-input resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={wp.isLoadingPlatform}
            className="btn-secondary !px-3 !py-1.5 text-xs"
          >
            <RefreshCw size={14} className={wp.isLoadingPlatform ? 'animate-spin' : ''} />
            刷新教案列表
          </button>
        </div>

        <PlanSelector
          plans={wp.candidatePlans}
          selected={wp.selectedPlans}
          onChange={wp.setSelectedPlans}
          loading={wp.isLoadingPlatform}
          sourceHint={wp.poolSourceHint}
          emptyHint="暂无活动方案，可点击右上角刷新，或到活动方案页上传/生成"
          onSearch={async (keyword) => {
            try {
              const plans = await wp.loadPlatformPlans(keyword)
              toast.success(
                keyword
                  ? `检索「${keyword}」：${plans.length} 份`
                  : plans.length > 0
                    ? `已刷新 ${plans.length} 份教案`
                    : '暂无教案'
              )
            } catch (err) {
              toast.error(err instanceof Error ? err.message : '搜寻失败')
            }
          }}
          searchPlaceholder="搜寻活动方案（可用姓名、手机号、方案名）"
        />

        <div className="border-t border-nest-leaf/10 pt-5 text-center">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || wp.isGenerating}
            className="btn-primary mx-auto !px-8 !py-3 text-base"
          >
            <Sparkles size={20} />
            {wp.isGenerating ? 'AI 正在生成周计划...' : '生成周计划'}
          </button>
        </div>
      </div>
    </div>
  )
}
