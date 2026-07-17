import { useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import { Check, Download, Eye, Loader2, Trash2 } from 'lucide-react'

interface Props {
  plans: TeachingPlan[]
  loading?: boolean
  sourceHint?: string
  emptyHint?: string
  /** 开启后可勾选（用于决定是否上传） */
  selectable?: boolean
  selected?: TeachingPlan[]
  onChange?: (plans: TeachingPlan[]) => void
  onDelete?: (plan: TeachingPlan) => void | Promise<void>
  onView?: (plan: TeachingPlan) => void
  onExport?: (plan: TeachingPlan) => void | Promise<void>
  deleting?: boolean
  exporting?: boolean
  title?: string
}

const sourceTag: Record<string, string> = {
  ai: '主题生成',
  platform: '平台',
  preset: '预设',
}

export default function PlanManageList({
  plans,
  loading = false,
  sourceHint,
  emptyHint = '暂无教案',
  selectable = false,
  selected = [],
  onChange,
  onDelete,
  onView,
  onExport,
  deleting = false,
  exporting = false,
  title = '教案列表',
}: Props) {
  const [domain, setDomain] = useState('全部')

  const domains = [
    '全部',
    ...Array.from(
      new Set(
        plans.flatMap((p) =>
          p.domain.split('、').map((d) => d.replace(/[（）()]/g, '').trim())
        )
      )
    ),
  ]

  const filtered = domain === '全部' ? plans : plans.filter((p) => p.domain.includes(domain))

  const toggle = (plan: TeachingPlan) => {
    if (!selectable || !onChange) return
    onChange(
      selected.some((p) => p.id === plan.id)
        ? selected.filter((p) => p.id !== plan.id)
        : [...selected, plan]
    )
  }

  const openView = (plan: TeachingPlan) => {
    onView?.(plan)
  }

  return (
    <div className="rounded-xl border border-gray-200 p-5 bg-gray-50/50">
      <div className="flex items-center gap-2 mb-4 font-semibold text-gray-700 flex-wrap">
        <span>{title}</span>
        {plans.length > 0 && (
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-100">
            共 {plans.length} 份
          </span>
        )}
        {selectable && selected.length > 0 && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
            已勾选 {selected.length} 份待上传
          </span>
        )}
        {sourceHint && (
          <span className="text-xs text-amber-500 bg-amber-50 px-2 py-0.5 rounded">{sourceHint}</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
          <Loader2 size={14} className="animate-spin" /> 正在加载...
        </div>
      )}

      {!loading && plans.length === 0 && (
        <p className="text-sm text-gray-400 mb-3">{emptyHint}</p>
      )}

      {plans.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {domains.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDomain(d)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${domain === d ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-100'}`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((plan) => {
          const isSel = selected.some((p) => p.id === plan.id)
          const canDelete = Boolean(onDelete) && plan.source !== 'preset'
          return (
            <div
              key={plan.id}
              role={onView || selectable ? 'button' : undefined}
              tabIndex={onView || selectable ? 0 : undefined}
              onClick={() => {
                if (selectable) toggle(plan)
                else if (onView) openView(plan)
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                if (selectable) toggle(plan)
                else if (onView) openView(plan)
              }}
              className={`border rounded-lg p-4 bg-white transition-all text-left ${
                selectable || onView ? 'cursor-pointer hover:border-blue-200 hover:shadow-sm' : ''
              } ${
                selectable && isSel ? 'border-blue-400 bg-blue-50' : 'border-gray-100'
              }`}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="font-semibold text-gray-800 text-sm">{plan.title}</h4>
                <div className="flex items-center gap-1 shrink-0">
                  {onView && (
                    <button
                      type="button"
                      title="查看完整内容"
                      onClick={(e) => {
                        e.stopPropagation()
                        openView(plan)
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500"
                    >
                      <Eye size={14} />
                    </button>
                  )}
                  {onExport && (
                    <button
                      type="button"
                      title="导出周计划 DOC"
                      disabled={exporting}
                      onClick={(e) => {
                        e.stopPropagation()
                        void onExport(plan)
                      }}
                      className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-50"
                    >
                      <Download size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      title="删除"
                      disabled={deleting}
                      onClick={(e) => {
                        e.stopPropagation()
                        void onDelete?.(plan)
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {selectable && isSel && <Check size={18} className="text-blue-500" />}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {plan.source && (
                  <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">
                    {sourceTag[plan.source] || plan.source}
                  </span>
                )}
                {plan.domain.split('、').map((d) => (
                  <span key={d} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    {d.trim()}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">{plan.objectives}</p>
              {onView && !selectable && (
                <p className="text-[11px] text-blue-500 mt-2">点击查看完整内容</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
