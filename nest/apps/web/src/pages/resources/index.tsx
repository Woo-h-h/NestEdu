import { toast } from 'sonner'
import { useTeachingResources } from '@/hooks/useTeachingResources'
import FileUploadCard from '@/pages/weekly-plan/components/FileUploadCard'
import ClassSelector from '@/pages/weekly-plan/components/ClassSelector'
import PlanManageList from '@/pages/resources/PlanManageList'
import { Upload, BookOpen, Wand2, RefreshCw, CloudUpload } from 'lucide-react'
import { isBackendApiEnabled } from '@/api/llm'
import { getTeachingAgentId } from '@/api/agent'

export default function ResourcesPage() {
  const res = useTeachingResources()
  const showBrowserKeyHint = !isBackendApiEnabled() && !res.apiConfigured

  const handleGenerate = async () => {
    if (!res.themeName.trim()) {
      toast.error('请先填写主题名称')
      return
    }
    try {
      const plans = await res.generateTeachingPlansFromTheme()
      toast.success(`已生成 ${plans.length} 份教案，可勾选后上传到知识库`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '生成教案失败')
    }
  }

  const handleUploadGenerated = async () => {
    try {
      const uploaded = await res.uploadGeneratedPlansToPlatform(res.uploadSelection)
      toast.success(`已上传 ${uploaded.length} 份教案到平台知识库`)
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

  const handleUploadFiles = async () => {
    try {
      const uploaded = await res.uploadFilesToPlatform()
      toast.success(`已上传 ${uploaded.length} 份到平台知识库`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">课程资源库</h1>
        <p className="mt-2 text-sm text-gray-500">
          教案生成与知识库管理相互独立：先生成再决定是否入库，或直接管理平台文档
        </p>
      </div>

      {showBrowserKeyHint && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-600">
          未配置 API Key，主题生成教案将使用演示数据。在根目录{' '}
          <code className="bg-blue-100 px-1 rounded">.env</code> 设置 VITE_DEEPSEEK_API_KEY
          即可接入大模型
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => res.setSection('generate')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            res.section === 'generate'
              ? 'bg-blue-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Wand2 size={16} /> 教案生成
        </button>
        <button
          type="button"
          onClick={() => res.setSection('manage')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            res.section === 'manage'
              ? 'bg-blue-500 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <BookOpen size={16} /> 知识库管理
        </button>
      </div>

      {res.section === 'generate' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">按主题生成教案</h2>
            <p className="mt-1 text-sm text-gray-500">
              调用平台智能体（ID {getTeachingAgentId()}）生成教案；勾选后可上传到知识库。需先登录平台。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ClassSelector value={res.className} onChange={res.setClassName} />
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <label className="block text-sm text-gray-600 mb-1">
                主题名称 <span className="text-red-400">*</span>
              </label>
              <input
                value={res.themeName}
                onChange={(e) => res.setThemeName(e.target.value)}
                placeholder="如：好宝宝爱图书"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
              <label className="block text-sm text-gray-600 mb-1 mt-3">补充说明</label>
              <textarea
                value={res.notes}
                onChange={(e) => res.setNotes(e.target.value)}
                rows={2}
                placeholder="可选"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={res.isGeneratingPlans || !res.themeName.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              <Wand2 size={16} />
              {res.isGeneratingPlans ? '正在生成...' : '根据主题生成教案'}
            </button>
            <button
              type="button"
              onClick={handleUploadGenerated}
              disabled={
                res.isUploadingGenerated || res.uploadSelection.length === 0
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
            >
              <CloudUpload size={16} />
              {res.isUploadingGenerated
                ? '上传中...'
                : `上传到知识库（${res.uploadSelection.length}）`}
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
            onDelete={handleDelete}
            deleting={res.isDeleting}
          />
        </div>
      )}

      {res.section === 'manage' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">知识库管理</h2>
            <p className="mt-1 text-sm text-gray-500">
              自主上传 docx 到平台知识库，或删除已有文档
            </p>
          </div>

          <div className="space-y-3">
            <FileUploadCard
              files={res.uploadFiles}
              onChange={res.setUploadFiles}
              title="上传文件到知识库"
              hint="将 docx 文件拖拽到此处，或点击选择文件"
            />
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                onClick={handleRefreshPlatform}
                disabled={res.isLoadingPlatform}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw size={16} className={res.isLoadingPlatform ? 'animate-spin' : ''} />
                {res.isLoadingPlatform ? '加载中...' : '刷新列表'}
              </button>
              <button
                type="button"
                onClick={handleUploadFiles}
                disabled={res.isUploading || res.uploadFiles.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                <Upload size={16} />
                {res.isUploading ? '上传中...' : '上传到平台知识库'}
              </button>
            </div>
          </div>

          <PlanManageList
            title="知识库文档"
            plans={res.platformPlans}
            loading={res.isLoadingPlatform}
            sourceHint={res.listHint}
            emptyHint="知识库暂无文档，可上传文件或到「教案生成」入库"
            onDelete={handleDelete}
            deleting={res.isDeleting}
          />
        </div>
      )}
    </div>
  )
}
