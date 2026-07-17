import { ArrowRight, BookOpen, CalendarDays, FolderOpen, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">幼儿园信息平台智能体</h1>
        <p className="mt-2 text-sm text-gray-500">
          教案生成与知识库管理：按主题生成并可选择入库，或直接上传/删除平台文档。
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-green-700">
          <BookOpen size={14} /> 1. 课程资源库
        </span>
        <ArrowRight size={14} className="text-gray-300" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-blue-700">
          <CalendarDays size={14} /> 2. 周计划生成
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <BookOpen size={24} className="text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">课程资源库</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                按主题生成教案并可选择上传入库；或在知识库中自主上传、删除文档。
              </p>
            </div>
          </div>
          <div className="mt-auto">
            <button
              type="button"
              onClick={() => navigate('/resources')}
              className="px-4 py-2 text-sm rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors inline-flex items-center gap-2"
            >
              进入资源库
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CalendarDays size={24} className="text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">周计划生成</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                勾选教案后一键生成周计划，支持编辑、AI 改稿与导出；可选上传到周计划知识库。
              </p>
            </div>
          </div>
          <div className="mt-auto flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/weekly-plan/create')}
              className="px-4 py-2 text-sm rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors inline-flex items-center gap-1"
            >
              <Plus size={16} />
              新建周计划
            </button>
            <button
              type="button"
              onClick={() => navigate('/weekly-plan/manage')}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
            >
              <FolderOpen size={16} />
              周计划管理
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
