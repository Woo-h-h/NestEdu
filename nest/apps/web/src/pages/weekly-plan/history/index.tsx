import { useEffect } from 'react'
import { toast } from 'sonner'
import type { WeeklyPlan } from '@/types/weeklyPlan'
import { deletePlan } from '@/api/weeklyPlan'
import { exportToDoc } from '@/lib/export-doc'
import { useWeeklyPlanHistory } from '@/hooks/useWeeklyPlanHistory'
import { Download, Trash2 } from 'lucide-react'

export default function HistoryPage() {
  const { plans, loading, error, loadPlans } = useWeeklyPlanHistory()

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除"${name}"吗？`)) return
    try {
      await deletePlan(id)
      await loadPlans()
      toast.success('已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const handleExport = (plan: WeeklyPlan) => {
    exportToDoc(plan).catch(() => toast.error('导出失败'))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">历史周计划</h1>
        <p className="mt-2 text-sm text-gray-500">查看、管理已生成和已保存的周计划</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            暂无历史记录，快去创建第一个周计划吧！
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">主题名称</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">班级</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">周次</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">日期</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{plan.themeName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">{plan.className}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-center">
                    第 {plan.weekNumber} 周
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(plan.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => handleExport(plan)}
                      className="text-blue-500 hover:text-blue-700 mr-3 inline-flex items-center gap-1"
                    >
                      <Download size={14} /> 导出
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id, plan.themeName)}
                      className="text-red-400 hover:text-red-600 inline-flex items-center gap-1"
                    >
                      <Trash2 size={14} /> 删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
