import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  LayoutGrid,
  GitBranch,
  Star,
  Eye,
  Pencil,
  Trash2,
  Search,
  RotateCcw,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import ArchiveDetailDrawer from '@/components/archive/ArchiveDetailDrawer'
import { useGrowthRecords } from '@/hooks/useGrowthRecords'
import {
  GROWTH_CATEGORIES,
  GROWTH_LEVELS,
  GROWTH_STATUSES,
  countByCategory,
} from '@/lib/growthCategories'
import type { GrowthRecord } from '@/types/growth'

export default function ArchivePage() {
  const navigate = useNavigate()
  const {
    records,
    loading,
    error,
    filters,
    viewMode,
    filteredRecords,
    remove,
    toggleRep,
    setViewMode,
    updateFilter,
    resetFilters,
    load,
  } = useGrowthRecords()

  const [detailRecord, setDetailRecord] = useState<GrowthRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GrowthRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const categoryCounts = useMemo(() => countByCategory(records), [records])
  const years = useMemo(
    () => [...new Set(records.map((item) => item.year))].sort((a, b) => b - a),
    [records]
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await remove(deleteTarget.id)
      if (detailRecord?.id === deleteTarget.id) {
        setDetailRecord(null)
      }
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-nest-ink md:text-[1.75rem]">
            成果库
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nest-muted">
            汇集系统生成的保教成果与教师补充录入的专业成长记录，作为画像与报告的数据依据。
          </p>
        </div>
        <Link to="/archive/upload" className="btn-primary shrink-0">
          <Plus size={16} /> 录入成果
        </Link>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryStat
          label="活动方案"
          value="—"
          hint="系统自动统计 · 待接入"
          muted
        />
        <SummaryStat
          label="周计划"
          value="—"
          hint="系统自动统计 · 待接入"
          muted
        />
        {GROWTH_CATEGORIES.map((cat) => (
          <SummaryStat
            key={cat.label}
            label={cat.label}
            value={String(categoryCounts[cat.label])}
            hint="教师录入"
          />
        ))}
      </section>

      <section className="surface-panel mb-5 space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-nest-ink">筛选</h2>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary !px-3 !py-1.5 text-xs" onClick={resetFilters}>
              <RotateCcw size={14} /> 重置
            </button>
            <button
              type="button"
              className={`tab-pill !px-3 !py-1.5 text-xs ${viewMode === 'cards' ? 'tab-pill-active' : 'tab-pill-idle'}`}
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid size={14} /> 卡片
            </button>
            <button
              type="button"
              className={`tab-pill !px-3 !py-1.5 text-xs ${viewMode === 'timeline' ? 'tab-pill-active' : 'tab-pill-idle'}`}
              onClick={() => setViewMode('timeline')}
            >
              <GitBranch size={14} /> 时间轴
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            className="field-input"
            value={filters.year}
            onChange={(e) => updateFilter('year', e.target.value)}
          >
            <option value="">全部年度</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
          <select
            className="field-input"
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
          >
            <option value="">全部类别</option>
            {GROWTH_CATEGORIES.map((cat) => (
              <option key={cat.label} value={cat.label}>
                {cat.label}
              </option>
            ))}
          </select>
          <select
            className="field-input"
            value={filters.level}
            onChange={(e) => updateFilter('level', e.target.value)}
          >
            <option value="">全部级别</option>
            {GROWTH_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <select
            className="field-input"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">全部状态</option>
            {GROWTH_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-nest-muted" />
            <input
              className="field-input pl-9"
              placeholder="关键词搜索"
              value={filters.keyword}
              onChange={(e) => updateFilter('keyword', e.target.value)}
            />
          </div>
        </div>
      </section>

      {loading && (
        <div className="surface-panel p-10 text-center text-sm text-nest-muted">加载中…</div>
      )}

      {!loading && error && (
        <div className="surface-panel space-y-3 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" className="btn-secondary mx-auto" onClick={() => void load()}>
            重试
          </button>
        </div>
      )}

      {!loading && !error && filteredRecords.length === 0 && (
        <div className="surface-panel space-y-4 p-10 text-center">
          <p className="text-sm text-nest-muted">
            {records.length === 0 ? '还没有录入成果，点击下方开始记录您的专业成长。' : '没有符合筛选条件的成果。'}
          </p>
          {records.length === 0 && (
            <Link to="/archive/upload" className="btn-primary mx-auto inline-flex">
              <Plus size={16} /> 录入第一条成果
            </Link>
          )}
        </div>
      )}

      {!loading && !error && filteredRecords.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredRecords.map((record) => (
            <GrowthCard
              key={record.id}
              record={record}
              onView={() => setDetailRecord(record)}
              onEdit={() => navigate(`/archive/upload?id=${record.id}`)}
              onDelete={() => setDeleteTarget(record)}
              onToggleRep={() => void toggleRep(record.id, !record.representative)}
            />
          ))}
        </div>
      )}

      {!loading && !error && filteredRecords.length > 0 && viewMode === 'timeline' && (
        <div className="relative space-y-0 pl-6">
          <div className="absolute bottom-0 left-[7px] top-0 w-px bg-nest-leaf/20" aria-hidden />
          {filteredRecords.map((record, index) => (
            <div key={record.id} className="relative pb-6">
              <span
                className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-nest-leaf bg-white"
                aria-hidden
              />
              <div className="surface-panel p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-nest-muted">
                  <span>{record.date || record.createdAt.slice(0, 10)}</span>
                  <span>·</span>
                  <span>{record.category}</span>
                  {index === 0 && <span className="text-nest-leaf">最新</span>}
                </div>
                <h3 className="font-display text-base font-semibold text-nest-ink">{record.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-nest-muted">{record.intro || '暂无简介'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setDetailRecord(record)}>
                    查看
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !px-2 !py-1 text-xs"
                    onClick={() => navigate(`/archive/upload?id=${record.id}`)}
                  >
                    编辑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ArchiveDetailDrawer
        record={detailRecord}
        open={!!detailRecord}
        onOpenChange={(open) => !open && setDetailRecord(null)}
        onEdit={(record) => {
          setDetailRecord(null)
          navigate(`/archive/upload?id=${record.id}`)
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除「{deleteTarget?.name}」？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? '删除中…' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  hint,
  muted,
}: {
  label: string
  value: string
  hint: string
  muted?: boolean
}) {
  return (
    <div className={`surface-panel p-4 ${muted ? 'opacity-80' : ''}`}>
      <p className="text-xs text-nest-muted">{hint}</p>
      <p className="font-display mt-1 text-2xl font-bold text-nest-ink">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-nest-pine">{label}</p>
    </div>
  )
}

function GrowthCard({
  record,
  onView,
  onEdit,
  onDelete,
  onToggleRep,
}: {
  record: GrowthRecord
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleRep: () => void
}) {
  return (
    <article className="surface-panel flex flex-col p-5 transition hover:-translate-y-0.5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-pine">教师录入</span>
        {record.representative && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            <Star size={11} /> 代表成果
          </span>
        )}
      </div>
      <h3 className="font-display line-clamp-2 text-base font-semibold text-nest-ink">{record.name}</h3>
      <p className="mt-1 text-xs text-nest-muted">
        {record.category}
        {record.subtype ? ` · ${record.subtype}` : ''}
        {record.level ? ` · ${record.level}` : ''}
      </p>
      <p className="mt-2 line-clamp-2 flex-1 text-sm text-nest-muted">{record.intro || '暂无简介'}</p>
      <p className="mt-3 text-xs text-nest-muted">{record.date || record.year}</p>
      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-nest-leaf/10 pt-3">
        <ActionBtn icon={Eye} label="查看" onClick={onView} />
        <ActionBtn icon={Pencil} label="编辑" onClick={onEdit} />
        <ActionBtn
          icon={Star}
          label={record.representative ? '取消代表' : '设为代表'}
          onClick={onToggleRep}
        />
        <ActionBtn icon={Trash2} label="删除" onClick={onDelete} danger />
      </div>
    </article>
  )
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Eye
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-nest-pine hover:bg-nest-mist'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}
