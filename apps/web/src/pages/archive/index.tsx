import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
  RefreshCw,
  CloudUpload,
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
import { useArchiveKnowledge } from '@/hooks/useArchiveKnowledge'
import {
  GROWTH_CATEGORIES,
  GROWTH_LEVELS,
  GROWTH_STATUSES,
  countByCategory,
} from '@/lib/growthCategories'
import { authBridge, loginWithAi101 } from '@/lib/authBridge'
import { runArchiveDebug, type ArchiveDebugPayload } from '@/lib/archiveDebug'
import {
  fetchKnowledgePlans,
  weeklyPlanKnowledgeScope,
} from '@/api/knowledge'
import PlanManageList from '@/pages/resources/PlanManageList'
import PlanDetailDialog from '@/pages/resources/PlanDetailDialog'
import UploadConfirmDialog from '@/pages/resources/UploadConfirmDialog'
import FileUploadCard from '@/pages/weekly-plan/components/FileUploadCard'
import type { GrowthRecord } from '@/types/growth'
import type { TeachingPlan } from '@/types/weeklyPlan'
import type { AuthInfo } from '@zcat-open/auth-bridge'

type ArchiveTab = 'platform' | 'manual'

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

  const kb = useArchiveKnowledge()
  const [tab, setTab] = useState<ArchiveTab>('platform')
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const isLoggedIn = Boolean(authInfo?.token)

  const [detailRecord, setDetailRecord] = useState<GrowthRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GrowthRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewPlan, setViewPlan] = useState<TeachingPlan | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [debugPayload, setDebugPayload] = useState<ArchiveDebugPayload | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  const [activityCount, setActivityCount] = useState<number | null>(null)
  const [weeklyCount, setWeeklyCount] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const categoryCounts = useMemo(() => countByCategory(records), [records])
  const years = useMemo(
    () => [...new Set(records.map((item) => item.year))].sort((a, b) => b - a),
    [records]
  )

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  useEffect(() => {
    if (isLoggedIn && kb.configured) {
      void kb.loadPlatformPlans()
    } else if (!kb.configured) {
      void kb.loadPlatformPlans()
    }
  }, [isLoggedIn, kb.configured, kb.loadPlatformPlans])

  useEffect(() => {
    let cancelled = false
    const loadStats = async () => {
      setStatsLoading(true)
      try {
        const weekly = weeklyPlanKnowledgeScope()
        const [activityRes, weeklyRes] = await Promise.allSettled([
          fetchKnowledgePlans({ limit: 50, fallbackPreset: false }),
          fetchKnowledgePlans({
            limit: 50,
            fallbackPreset: false,
            ...weekly,
          }),
        ])
        if (cancelled) return
        setActivityCount(
          activityRes.status === 'fulfilled' && activityRes.value.source === 'platform'
            ? activityRes.value.plans.length
            : null
        )
        setWeeklyCount(
          weeklyRes.status === 'fulfilled' && weeklyRes.value.source === 'platform'
            ? weeklyRes.value.plans.length
            : null
        )
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    void loadStats()
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

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

  const handleLogin = async () => {
    try {
      await loginWithAi101()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登录失败')
    }
  }

  const handleRefreshKb = async () => {
    try {
      const plans = await kb.loadPlatformPlans()
      toast.success(
        plans.length > 0 ? `已加载 ${plans.length} 份教师成果` : '教师成果库暂无文档'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刷新失败')
    }
  }

  const handleArchiveDebug = async () => {
    setDebugLoading(true)
    try {
      const payload = await runArchiveDebug()
      setDebugPayload(payload)
      toast.success(
        payload.archive?.folders?.length
          ? `已匹配 ${payload.archive.folders.length} 个文件夹`
          : '诊断完成：未匹配到个人文件夹（见下方详情）'
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '诊断失败')
    } finally {
      setDebugLoading(false)
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
      toast.success(`已成功上传 ${uploaded.length} 份到教师成果库`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    }
  }

  const handleDeletePlan = async (plan: TeachingPlan) => {
    if (!window.confirm(`确定删除「${plan.title}」？`)) return
    try {
      await kb.deletePlan(plan)
      toast.success('已删除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    }
  }

  const formatCount = (n: number | null) => {
    if (statsLoading) return '—'
    if (n === null) return '—'
    return String(n)
  }

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-wide text-nest-ink md:text-[1.75rem]">
            成果库
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nest-muted">
            平台侧展示知识库「教师成果库」文件夹文档；同时支持教师补充录入专业成长记录，作为画像与报告依据。
          </p>
        </div>
        {tab === 'manual' ? (
          <Link to="/archive/upload" className="btn-primary shrink-0">
            <Plus size={16} /> 录入成果
          </Link>
        ) : null}
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryStat
          label="活动方案"
          value={formatCount(activityCount)}
          hint={activityCount === null ? '需登录平台' : '知识库 · 教案分类'}
          muted={activityCount === null}
        />
        <SummaryStat
          label="周计划"
          value={formatCount(weeklyCount)}
          hint={weeklyCount === null ? '需登录平台' : '知识库 · 周计划分类'}
          muted={weeklyCount === null}
        />
        <SummaryStat
          label="教师成果库"
          value={
            !kb.configured
              ? '—'
              : kb.isLoadingPlatform
                ? '—'
                : String(kb.platformPlans.length)
          }
          hint={
            !kb.configured
              ? '待配置分类 ID'
              : kb.listHint.includes('登录')
                ? '需登录平台'
                : '平台知识库文件夹'
          }
          muted={!kb.configured || kb.platformPlans.length === 0}
        />
        {GROWTH_CATEGORIES.slice(0, 2).map((cat) => (
          <SummaryStat
            key={cat.label}
            label={cat.label}
            value={String(categoryCounts[cat.label])}
            hint="教师录入"
          />
        ))}
      </section>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="成果库分区">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'platform'}
          className={`tab-pill ${tab === 'platform' ? 'tab-pill-active' : 'tab-pill-idle'}`}
          onClick={() => setTab('platform')}
        >
          平台 · 教师成果库
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'manual'}
          className={`tab-pill ${tab === 'manual' ? 'tab-pill-active' : 'tab-pill-idle'}`}
          onClick={() => setTab('manual')}
        >
          教师录入
        </button>
      </div>

      {tab === 'platform' && (
        <section className="surface-panel space-y-5 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-nest-ink">教师成果库</h2>
            <p className="mt-1 text-sm text-nest-muted">
              对接{' '}
              <a
                className="text-nest-pine underline-offset-2 hover:underline"
                href="https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20895&category_key=custom_1785116184487"
                target="_blank"
                rel="noreferrer"
              >
                华科附幼教案知识库 · 教师成果库
              </a>
              。登录后<strong>仅显示与您手机号同名的文件夹</strong>
              {kb.phone ? `（当前：${kb.phone}）` : ''}，不会看到其他老师的文件夹。
            </p>
          </div>

          {!kb.configured && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
              请在平台打开「教师成果库」文件夹，复制地址栏中的{' '}
              <code className="rounded bg-white/80 px-1">category_id</code> 与{' '}
              <code className="rounded bg-white/80 px-1">category_key</code>
              ，写入根目录{' '}
              <code className="rounded bg-white/80 px-1">.env</code> 的{' '}
              <code className="rounded bg-white/80 px-1">VITE_ARCHIVE_KNOWLEDGE_CATEGORY_*</code>
              ，然后重启 <code className="rounded bg-white/80 px-1">pnpm dev</code>。
            </div>
          )}

          {kb.configured && !isLoggedIn && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
              <span>当前未登录，无法读取教师成果库，请先登录。</span>
              <button
                type="button"
                onClick={() => void handleLogin()}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
              >
                登录平台
              </button>
            </div>
          )}

          {kb.configured && isLoggedIn && !kb.phone && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
              已登录但未读取到手机号。请确认平台账号已绑定手机号；教师成果库下需创建与手机号同名的文件夹（例如「17362955307」）。
            </div>
          )}

          {kb.configured && isLoggedIn && kb.phone && kb.teacherFolders.length === 0 && !kb.isLoadingPlatform && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3.5 text-sm text-amber-900">
              {kb.listHint?.trim()
                ? kb.listHint
                : `未找到与手机号「${kb.phone}」对应的文件夹。请在知识库「教师成果库」下创建同名文件夹后再刷新。`}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleArchiveDebug()}
                  disabled={debugLoading}
                  className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm text-white hover:bg-amber-800 disabled:opacity-60"
                >
                  {debugLoading ? '诊断中...' : '一键诊断匹配问题'}
                </button>
                <span className="text-xs text-amber-800/80">
                  若嵌入主站 iframe，控制台需切换到 NestEdu 子框架；优先用本按钮。
                </span>
              </div>
            </div>
          )}

          {debugPayload && (
            <div className="rounded-xl border border-nest-leaf/20 bg-nest-mist/40 p-3.5 text-xs text-nest-ink">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">成果库诊断结果（可复制发给开发）</p>
                <button
                  type="button"
                  className="rounded-lg border border-nest-leaf/30 bg-white px-2.5 py-1 text-nest-pine hover:bg-white/80"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(JSON.stringify(debugPayload, null, 2))
                      toast.success('已复制诊断结果')
                    } catch {
                      toast.error('复制失败，请手动选中下方文本')
                    }
                  }}
                >
                  复制 JSON
                </button>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white/80 p-3 font-mono leading-relaxed">
                {JSON.stringify(
                  {
                    phone: debugPayload.phone,
                    cachedUidHash: debugPayload.cachedUidHash,
                    categoryCount: debugPayload.categoryCount,
                    categoryError: debugPayload.categoryError,
                    categoryDebug: debugPayload.categoryDebug,
                    resolvedArchiveId: debugPayload.resolvedArchiveId,
                    archiveChildNames: debugPayload.archiveChildNames,
                    matchedFolders: debugPayload.archive?.folders?.map((f) => ({
                      id: f.id,
                      name: f.name,
                      parentId: f.parentId,
                    })),
                    archiveError: debugPayload.archive?.error || null,
                    categoryNames: debugPayload.categoryNames,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {kb.configured && (
            <div className="space-y-3">
              <FileUploadCard
                files={kb.uploadFiles}
                onChange={kb.setUploadFiles}
                title={
                  kb.uploadTarget
                    ? `上传到「${kb.uploadTarget.name}」文件夹`
                    : '上传文件到个人成果文件夹'
                }
                hint="将 docx 拖到此处；仅写入与您手机号同名的文件夹，确认后才会入库"
              />
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => void handleRefreshKb()}
                  disabled={kb.isLoadingPlatform || !isLoggedIn}
                  className="btn-secondary"
                >
                  <RefreshCw size={16} className={kb.isLoadingPlatform ? 'animate-spin' : ''} />
                  {kb.isLoadingPlatform ? '加载中...' : '刷新列表'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleArchiveDebug()}
                  disabled={debugLoading || !isLoggedIn}
                  className="btn-secondary"
                >
                  {debugLoading ? '诊断中...' : '诊断'}
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
          )}

          <PlanManageList
            title="教师成果文档"
            plans={kb.platformPlans}
            loading={kb.isLoadingPlatform}
            sourceHint={kb.listHint}
            emptyHint={
              kb.configured
                ? kb.phone
                  ? `手机号「${kb.phone}」下暂无文档，可上传 docx 或在平台同名文件夹中添加`
                  : '获取手机号后将显示个人成果文件夹'
                : '配置分类后将显示教师成果库内容'
            }
            onView={(plan) => {
              setViewPlan(plan)
              setDetailOpen(true)
            }}
            onDelete={kb.configured ? handleDeletePlan : undefined}
            deleting={kb.isDeleting}
          />
        </section>
      )}

      {tab === 'manual' && (
        <>
          <section className="surface-panel mb-5 space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-nest-ink">筛选</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary !px-3 !py-1.5 text-xs"
                  onClick={resetFilters}
                >
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
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-nest-muted"
                />
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
                {records.length === 0
                  ? '还没有录入成果，点击下方开始记录您的专业成长。'
                  : '没有符合筛选条件的成果。'}
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
                    <h3 className="font-display text-base font-semibold text-nest-ink">
                      {record.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-nest-muted">
                      {record.intro || '暂无简介'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary !px-2 !py-1 text-xs"
                        onClick={() => setDetailRecord(record)}
                      >
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
        </>
      )}

      <UploadConfirmDialog
        open={kb.confirmOpen}
        items={kb.pendingUploads}
        uploading={kb.isUploading}
        onCancel={kb.cancelPendingUpload}
        onConfirm={() => void handleConfirmUpload()}
      />

      <PlanDetailDialog plan={viewPlan} open={detailOpen} onOpenChange={setDetailOpen} />
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
        danger ? 'text-red-600 hover:bg-red-50' : 'text-nest-pine hover:bg-nest-mist'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}
