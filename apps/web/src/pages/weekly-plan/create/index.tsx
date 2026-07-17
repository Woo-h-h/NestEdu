import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useWeeklyPlan } from '@/hooks/useWeeklyPlan'
import PlanSelector from '../components/PlanSelector'
import PlanEditor from '../components/PlanEditor'
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react'
import { isBackendApiEnabled } from '@/api/llm'
import { getWeeklyPlanAgentId } from '@/api/agent'
import { authBridge } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'

export default function CreatePage() {
  const wp = useWeeklyPlan()
  const showBrowserKeyHint = !isBackendApiEnabled() && !wp.apiConfigured
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const isLoggedIn = Boolean(authInfo?.token)
  const weeklyAgentId = getWeeklyPlanAgentId()

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
    if (wp.selectedPlans.length === 0) {
      toast.error('请先勾选至少一个教案')
      return
    }
    try {
      await wp.generatePlan()
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

  const handleSave = async () => {
    try {
      await wp.savePlan()
      toast.success('周计划已保存！')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    }
  }

  if (wp.currentPlan) {
    return (
      <div>
        <button
          onClick={() => wp.resetAll()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-500 mb-4 transition-colors"
        >
          <ArrowLeft size={15} /> 返回重新勾选
        </button>
        <PlanEditor
          plan={wp.currentPlan}
          chatHistory={wp.chatHistory}
          isAiModifying={wp.isAiModifying}
          onPlanUpdate={(p) => {
            wp.setCurrentPlan(p)
            wp.setIsModified(true)
          }}
          onSave={handleSave}
          onSendInstruction={wp.sendAiInstruction}
        />
      </div>
    )
  }

  const canGenerate = wp.selectedPlans.length > 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">新建周计划</h1>
        <p className="mt-2 text-sm text-gray-500">
          勾选教案 → 调用智能体（ID {weeklyAgentId}）结合知识库生成周计划 → 编辑导出
        </p>
      </div>

      {!isLoggedIn && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          生成周计划需登录平台，以便调用智能体并读取知识库 10298。
        </div>
      )}

      {showBrowserKeyHint && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600">
          智能体不可用时将尝试降级。可配置 DeepSeek：根目录{' '}
          <code className="bg-blue-100 px-1 rounded">.env</code> 中的 VITE_DEEPSEEK_API_KEY
        </div>
      )}

      {wp.hasContext && wp.context && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            班级：<strong className="text-gray-800">{wp.context.className}</strong>
          </span>
          <span>
            主题：<strong className="text-gray-800">{wp.context.themeName}</strong>
          </span>
          <span>
            周次：<strong className="text-gray-800">第 {wp.context.weekNumber} 周</strong>
          </span>
          <Link to="/resources" className="text-blue-500 hover:underline ml-auto">
            修改教学信息
          </Link>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={wp.isLoadingPlatform}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw size={14} className={wp.isLoadingPlatform ? 'animate-spin' : ''} />
            刷新教案列表
          </button>
        </div>

        <div className="mb-6">
          <PlanSelector
            plans={wp.candidatePlans}
            selected={wp.selectedPlans}
            onChange={wp.setSelectedPlans}
            loading={wp.isLoadingPlatform}
            sourceHint={wp.poolSourceHint}
            emptyHint="暂无教案，可点击右上角刷新，或到课程资源库上传/生成"
          />
        </div>

        <div className="pt-4 border-t border-gray-100 text-center">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || wp.isGenerating}
            className="px-8 py-3 bg-blue-500 text-white rounded-xl text-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
          >
            <Sparkles size={20} />
            {wp.isGenerating ? 'AI 正在生成周计划...' : '生成周计划'}
          </button>
        </div>
      </div>
    </div>
  )
}
