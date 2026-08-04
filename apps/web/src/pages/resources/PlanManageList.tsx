import { useEffect, useMemo, useState } from 'react'
import type { TeachingPlan } from '@/types/weeklyPlan'
import { Check, Download, Eye, Loader2, Search, Trash2, Wrench } from 'lucide-react'
import { filterPlansByKeyword } from '@/lib/knowledgeDocTitle'
import {
  ACTIVITY_DOMAINS,
  CLASS_LEVELS,
  enrichPlanTaxonomy,
  filterPlansByTaxonomy,
  type ActivityDomain,
  type ClassLevel,
} from '@/lib/planTaxonomy'
import { authBridge } from '@/lib/authBridge'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import { listTeacherGeneratedDocs, teacherDocToPlan } from '@/api/teacherGeneratedDocs'
import { fetchKnowledgePlanById } from '@/api/knowledge'
import { relocateMissingMineDocs } from '@/api/relocateTeacherDocs'
import { toast } from 'sonner'

export type PlanListTaxonomy = 'activity' | 'weekly' | 'none'
type OwnershipFilter = '全部' | '我的'

interface Props {
  plans: TeachingPlan[]
  loading?: boolean
  sourceHint?: string
  /** 知识库分类文档合计（平台 total）；用于「我的/总录入」分母 */
  kbTotal?: number | null
  emptyHint?: string
  /** 开启后可勾选（用于决定是否上传） */
  selectable?: boolean
  selected?: TeachingPlan[]
  onChange?: (plans: TeachingPlan[]) => void
  onDelete?: (plan: TeachingPlan) => void | Promise<void>
  onView?: (plan: TeachingPlan) => void
  onExport?: (plan: TeachingPlan) => void | Promise<void>
  /** 「我的」纠正入库后刷新父级列表 */
  onRefresh?: () => void | Promise<void>
  deleting?: boolean
  exporting?: boolean
  title?: string
  onSearch?: (keyword: string) => void | Promise<void>
  searchPlaceholder?: string
  /** 生成结果勾选列表等场景可关掉搜索框 */
  showSearch?: boolean
  /**
   * activity：一级大班/中班/小班 + 二级五领域 +「我的」
   * weekly：仅一级大班/中班/小班 +「我的」
   */
  taxonomy?: PlanListTaxonomy
}

const sourceTag: Record<string, string> = {
  ai: '主题生成',
  platform: '平台',
  preset: '预设',
  mysql: '仅本人',
}

function filterPlansByMine(
  plans: TeachingPlan[],
  opts: { phone: string; docIds: Set<string>; titles: Set<string> }
): TeachingPlan[] {
  const phone = opts.phone.trim()
  return plans.filter((plan) => {
    const id = (plan.id || '').trim()
    if (id && opts.docIds.has(id)) return true
    const title = (plan.title || '').trim()
    if (title && opts.titles.has(title)) return true
    if (phone && title.includes(phone)) return true
    return false
  })
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T | '全部'
  onChange: (next: T | '全部') => void
}) {
  const chips: Array<T | '全部'> = ['全部', ...options]
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 text-xs font-medium text-nest-muted">{label}</div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              value === chip
                ? 'bg-nest-leaf text-white shadow-sm shadow-nest-leaf/20'
                : 'border border-nest-leaf/10 bg-white text-nest-muted hover:bg-nest-mist hover:text-nest-pine'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PlanManageList({
  plans,
  loading = false,
  sourceHint,
  kbTotal = null,
  emptyHint = '暂无教案',
  selectable = false,
  selected = [],
  onChange,
  onDelete,
  onView,
  onExport,
  onRefresh,
  deleting = false,
  exporting = false,
  title = '教案列表',
  onSearch,
  searchPlaceholder = '搜索方案名、手机号、内容关键词…',
  showSearch = true,
  taxonomy = 'none',
}: Props) {
  const [classLevel, setClassLevel] = useState<ClassLevel | '全部'>('全部')
  const [domain, setDomain] = useState<ActivityDomain | '全部'>('全部')
  const [ownership, setOwnership] = useState<OwnershipFilter>('全部')
  const [query, setQuery] = useState('')
  const [minePhone, setMinePhone] = useState('')
  const [mineDocIds, setMineDocIds] = useState<Set<string>>(() => new Set())
  const [mineTitles, setMineTitles] = useState<Set<string>>(() => new Set())
  const [mineMappedCount, setMineMappedCount] = useState<number | null>(null)
  const [mineMysqlCount, setMineMysqlCount] = useState(0)
  const [mineInCategoryCount, setMineInCategoryCount] = useState(0)
  const [mineMisroutedCount, setMineMisroutedCount] = useState(0)
  const [mineExtraPlans, setMineExtraPlans] = useState<TeachingPlan[]>([])
  const [mineLoading, setMineLoading] = useState(false)
  const [mineError, setMineError] = useState('')
  const [relocating, setRelocating] = useState(false)

  const showTaxonomy = taxonomy === 'activity' || taxonomy === 'weekly'
  const mineDocType = taxonomy === 'activity' ? 'activity' : taxonomy === 'weekly' ? 'weekly' : null

  // 有 taxonomy 时始终拉本人入库映射，供顶部「我的/总录入」；仅「我的」时再补拉误入库文档
  useEffect(() => {
    if (!showTaxonomy || !mineDocType) {
      setMineExtraPlans([])
      setMineMappedCount(null)
      setMineMysqlCount(0)
      setMineInCategoryCount(0)
      setMineMisroutedCount(0)
      return
    }
    let cancelled = false
    const loadMine = async () => {
      setMineLoading(true)
      setMineError('')
      try {
        if (!authBridge.getAuthInfo()?.token) {
          if (!cancelled) {
            setMinePhone('')
            setMineDocIds(new Set())
            setMineTitles(new Set())
            setMineMappedCount(null)
            setMineMysqlCount(0)
            setMineInCategoryCount(0)
            setMineMisroutedCount(0)
            setMineExtraPlans([])
            if (ownership === '我的') {
              setMineError('请先登录后再查看「我的」文档')
            }
          }
          return
        }
        const phone = (await getCurrentTeacherPhone()).trim()
        if (!phone) {
          if (!cancelled) {
            setMineError('未获取到手机号，无法映射本人入库记录')
            setMinePhone('')
            setMineDocIds(new Set())
            setMineTitles(new Set())
            setMineMappedCount(null)
            setMineMysqlCount(0)
            setMineInCategoryCount(0)
            setMineMisroutedCount(0)
            setMineExtraPlans([])
          }
          return
        }
        const rows = await listTeacherGeneratedDocs(phone, mineDocType)
        if (cancelled) return
        const docIds = new Set(rows.map((r) => r.knowledgeDocId).filter(Boolean))
        const titles = new Set(rows.map((r) => r.title.trim()).filter(Boolean))
        const presentIds = new Set(
          plans.map((p) => (p.id || '').trim()).filter(Boolean)
        )
        const presentTitles = new Set(
          plans.map((p) => (p.title || '').trim()).filter(Boolean)
        )

        let mysqlCount = 0
        let inCategoryCount = 0
        let misroutedCount = 0
        for (const row of rows) {
          if ((row.storage || 'platform') === 'mysql') {
            mysqlCount += 1
            continue
          }
          const id = (row.knowledgeDocId || '').trim()
          const title = (row.title || '').trim()
          const inList =
            (id && presentIds.has(id)) || (title && presentTitles.has(title))
          if (inList) inCategoryCount += 1
          else misroutedCount += 1
        }

        setMinePhone(phone)
        setMineDocIds(docIds)
        setMineTitles(titles)
        setMineMappedCount(rows.length)
        setMineMysqlCount(mysqlCount)
        setMineInCategoryCount(inCategoryCount)
        setMineMisroutedCount(misroutedCount)

        if (ownership !== '我的') {
          setMineExtraPlans([])
          return
        }

        // 1) MySQL-only 文档：直接用库内全文展示
        const mysqlPlans = rows
          .filter((r) => (r.storage || 'platform') === 'mysql')
          .map(teacherDocToPlan)

        // 2) 平台映射但当前分类列表没有的：按 ID 补拉（可能误入成果库）
        const missingPlatformIds = rows
          .filter((r) => (r.storage || 'platform') !== 'mysql')
          .map((r) => r.knowledgeDocId)
          .filter((id) => id && !presentIds.has(id))

        const fetched = await Promise.all(
          missingPlatformIds.map(async (id) => {
            const plan = await fetchKnowledgePlanById(id)
            if (plan) return plan
            const row = rows.find((r) => r.knowledgeDocId === id)
            return {
              id,
              title: row?.title || id,
              domain: '综合',
              gradeLevel: '通用',
              objectives: '（文档不在当前教案/周计划分类中，可能误入教师成果库）',
              content: '',
              source: 'platform' as const,
            } satisfies TeachingPlan
          })
        )
        if (!cancelled) {
          const byId = new Set<string>()
          const merged: TeachingPlan[] = []
          for (const p of [...mysqlPlans, ...fetched.filter(Boolean)]) {
            if (!p.id || byId.has(p.id)) continue
            byId.add(p.id)
            merged.push(p)
          }
          setMineExtraPlans(merged)
        }
      } catch (err) {
        if (!cancelled) {
          setMineError(err instanceof Error ? err.message : '加载「我的」记录失败')
        }
      } finally {
        if (!cancelled) setMineLoading(false)
      }
    }
    void loadMine()
    return () => {
      cancelled = true
    }
  }, [showTaxonomy, ownership, mineDocType, plans])

  const normalizedPlans = useMemo(() => plans.map(enrichPlanTaxonomy), [plans])
  const normalizedExtra = useMemo(
    () => mineExtraPlans.map(enrichPlanTaxonomy),
    [mineExtraPlans]
  )

  const filtered = useMemo(() => {
    let next = normalizedPlans
    if (ownership === '我的') {
      const fromCategory = filterPlansByMine(next, {
        phone: minePhone,
        docIds: mineDocIds,
        titles: mineTitles,
      })
      const byId = new Set(fromCategory.map((p) => p.id))
      next = [
        ...fromCategory,
        ...normalizedExtra.filter((p) => p.id && !byId.has(p.id)),
      ]
    }
    if (taxonomy === 'activity' || taxonomy === 'weekly') {
      next = filterPlansByTaxonomy(next, {
        classLevel,
        domain: taxonomy === 'activity' ? domain : '全部',
      })
    }
    return filterPlansByKeyword(next, query)
  }, [
    normalizedPlans,
    normalizedExtra,
    taxonomy,
    classLevel,
    domain,
    query,
    ownership,
    minePhone,
    mineDocIds,
    mineTitles,
  ])

  const misroutedCount = mineMisroutedCount

  const handleRelocate = async () => {
    if (!mineDocType || relocating) return
    setRelocating(true)
    try {
      const presentIds = new Set(plans.map((p) => (p.id || '').trim()).filter(Boolean))
      const { moved, cleaned, failed } = await relocateMissingMineDocs({
        kind: mineDocType,
        presentIds,
      })
      if (moved > 0) {
        toast.success(`已纠正 ${moved} 份到${mineDocType === 'activity' ? '教案库' : '周计划库'}`)
        setMineExtraPlans([])
        await onRefresh?.()
      }
      if (cleaned > 0) {
        toast.message(`已清理 ${cleaned} 条无法纠正的无效映射，请重新生成并入库`)
        setMineExtraPlans([])
        await onRefresh?.()
      }
      if (failed.length > 0 && moved === 0 && cleaned === 0) {
        toast.error(failed.slice(0, 2).join('；'))
      } else if (failed.length > 0 && (moved > 0 || cleaned > 0)) {
        toast.warning(failed.slice(0, 2).join('；'))
      }
      if (moved === 0 && cleaned === 0 && failed.length === 0) {
        toast.message('没有需要纠正的文档')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '纠正失败')
    } finally {
      setRelocating(false)
    }
  }

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

  const submitSearch = () => {
    void onSearch?.(query.trim())
  }

  const totalEntryCount =
    typeof kbTotal === 'number' && kbTotal >= 0 ? kbTotal : plans.length
  const mineEntryCount = mineMappedCount
  const showStats = showTaxonomy
  const sourceHintIsError = Boolean(
    sourceHint &&
      (/失败|错误|登录|暂无|预设|未配置|无法/.test(sourceHint) ||
        sourceHint.includes('平台失败'))
  )
  const mineLabel =
    mineEntryCount === null ? (mineLoading ? '…' : '—') : String(mineEntryCount)
  const inCategoryLabel =
    mineEntryCount === null ? (mineLoading ? '…' : '—') : String(mineInCategoryCount)

  return (
    <div className="rounded-2xl border border-nest-leaf/10 bg-nest-mist/25 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2 font-medium text-nest-ink">
        <span className="font-display">{title}</span>
        {showStats ? (
          <>
            <span
              className="rounded-full border border-nest-leaf/10 bg-white px-2 py-0.5 text-xs text-nest-muted"
              title="本人入库记录数 / 知识库分类文档合计"
            >
              {mineLabel} / {totalEntryCount}
              <span className="ml-1 text-[10px] text-nest-muted/80">我的/总录入</span>
            </span>
            <span
              className="rounded-full border border-nest-leaf/10 bg-white px-2 py-0.5 text-xs text-nest-muted"
              title="当前分类内本人文档 / 本人入库总数"
            >
              {inCategoryLabel} / {mineLabel}
              <span className="ml-1 text-[10px] text-nest-muted/80">分类内/我的</span>
            </span>
            <span
              className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-leaf"
              title="仅保存在 MySQL、未上传平台知识库的文档数"
            >
              本地可见 {mineMysqlCount}
            </span>
            <span
              className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-leaf"
              title="本人入库但未出现在当前教案/周计划分类中的文档数"
            >
              待纠正 {mineMisroutedCount}
            </span>
          </>
        ) : plans.length > 0 ? (
          <span className="rounded-full border border-nest-leaf/10 bg-white px-2 py-0.5 text-xs text-nest-muted">
            共 {filtered.length}
            {filtered.length !== plans.length ? ` / ${plans.length}` : ''} 份
          </span>
        ) : null}
        {selectable && selected.length > 0 && (
          <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-leaf">
            已勾选 {selected.length} 份待上传
          </span>
        )}
        {sourceHint && sourceHintIsError && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-600">
            {sourceHint}
          </span>
        )}
      </div>

      {showSearch && (
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-nest-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitSearch()
                }
              }}
              placeholder={searchPlaceholder}
              className="field-input w-full !py-2 pl-9 text-sm"
              aria-label="搜索知识库列表"
            />
          </div>
          {onSearch && (
            <button
              type="button"
              onClick={submitSearch}
              disabled={loading}
              className="btn-secondary !px-3 !py-2 text-xs"
            >
              搜寻
            </button>
          )}
        </div>
      )}

      {(taxonomy === 'activity' || taxonomy === 'weekly') && plans.length > 0 && (
        <div className="mb-4 rounded-xl border border-nest-leaf/10 bg-white/70 p-3">
          <ChipRow
            label="归属"
            options={['我的'] as const}
            value={ownership}
            onChange={(next) => setOwnership(next === '全部' ? '全部' : '我的')}
          />
          <ChipRow
            label="班级分类"
            options={CLASS_LEVELS}
            value={classLevel}
            onChange={setClassLevel}
          />
          {taxonomy === 'activity' && (
            <ChipRow
              label="领域分类"
              options={ACTIVITY_DOMAINS}
              value={domain}
              onChange={setDomain}
            />
          )}
          {ownership === '我的' && (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] leading-relaxed text-nest-muted">
                「我的」按 MySQL 本人入库记录匹配；若文档误入成果库，会按文档 ID 补拉并提示纠正。
                {minePhone ? ` 当前：${minePhone}` : ''}
                {mineLoading ? ' 加载中…' : ''}
                {mineError ? ` ${mineError}` : ''}
                {!mineLoading && !mineError
                  ? ` 已映射 ${mineDocIds.size || mineTitles.size} 条入库记录。`
                  : ''}
              </p>
              {misroutedCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span>
                    有 {misroutedCount} 份本人文档不在当前
                    {taxonomy === 'weekly' ? '周计划库' : '教案库'}
                    分类中（多半误入教师成果库）。
                  </span>
                  <button
                    type="button"
                    disabled={relocating}
                    onClick={() => void handleRelocate()}
                    className="inline-flex items-center gap-1 rounded-md bg-amber-700 px-2.5 py-1 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
                  >
                    {relocating ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Wrench size={12} />
                    )}
                    纠正到{taxonomy === 'weekly' ? '周计划库' : '教案库'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="mb-3 flex items-center gap-2 text-sm text-nest-muted">
          <Loader2 size={14} className="animate-spin text-nest-leaf" /> 正在加载...
        </div>
      )}

      {!loading && plans.length === 0 && ownership !== '我的' && (
        <p className="mb-3 text-sm text-nest-muted/80">{emptyHint}</p>
      )}

      {!loading && filtered.length === 0 && (
        <p className="mb-3 text-sm text-nest-muted/80">
          {ownership === '我的'
            ? mineDocIds.size > 0
              ? 'MySQL 有入库记录，但平台暂未返回可展示文档（可能仍在成果库且详情拉取失败）。可点上方「纠正到教案库」。'
              : '「我的」下暂无入库记录（需本人入库成功并写入 MySQL 后才会出现）'
            : plans.length === 0
              ? emptyHint
              : '当前分类下没有匹配文档'}
          {query.trim() ? `（关键词「${query.trim()}」）` : ''}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              className={`rounded-xl border bg-white p-4 text-left transition-all ${
                selectable || onView
                  ? 'cursor-pointer hover:border-nest-leaf/30 hover:shadow-sm hover:shadow-nest-leaf/10'
                  : ''
              } ${
                selectable && isSel
                  ? 'border-nest-leaf bg-nest-mist/60 shadow-sm shadow-nest-leaf/10'
                  : 'border-nest-leaf/10'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-nest-ink">{plan.title}</h4>
                <div className="flex shrink-0 items-center gap-1">
                  {onView && (
                    <button
                      type="button"
                      title="查看完整内容"
                      onClick={(e) => {
                        e.stopPropagation()
                        openView(plan)
                      }}
                      className="p-1 text-nest-muted hover:text-nest-leaf"
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
                      className="p-1 text-nest-muted hover:text-emerald-600 disabled:opacity-50"
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
                      className="p-1 text-nest-muted hover:text-red-500 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {selectable && isSel && <Check size={18} className="text-nest-leaf" />}
                </div>
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {plan.source && (
                  <span className="rounded bg-nest-sand/80 px-1.5 py-0.5 text-xs text-nest-pine">
                    {sourceTag[plan.source] || plan.source}
                  </span>
                )}
                {plan.gradeLevel && plan.gradeLevel !== '通用' && (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                    {plan.gradeLevel}
                  </span>
                )}
                {plan.domain
                  .split('、')
                  .map((d) => d.replace(/\uFFFD/g, '').trim())
                  .filter(Boolean)
                  .map((d) => (
                  <span
                    key={d}
                    className="rounded bg-nest-mist px-1.5 py-0.5 text-xs text-nest-muted"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <p className="line-clamp-2 text-xs text-nest-muted/80">
                {(plan.objectives || '').replace(/\uFFFD+/g, '').trim()}
              </p>
              {onView && !selectable && (
                <p className="mt-2 text-[11px] text-nest-leaf">点击查看完整内容</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
