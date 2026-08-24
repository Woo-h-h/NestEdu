import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { teacherDocToPlan } from '@/api/teacherGeneratedDocs'
import ArchiveDetailDrawer from '@/components/archive/ArchiveDetailDrawer'
import GrowthTreeSvg, { GrowthTreeLabels } from '@/components/profile/GrowthTreeSvg'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import PlanDetailDialog from '@/pages/resources/PlanDetailDialog'
import {
  GROWTH_TREE_BRANCHES,
  GROWTH_TREE_BRANCH_KEYS,
  artifactFromKnowledgePlan,
  artifactsForStructureView,
  groupKindRows,
  type GrowthTreeArtifact,
  type GrowthTreeBranch,
} from '@/lib/growth-tree'
import {
  ARCHIVE_TREE_CATEGORY_LABELS,
  countArchivePlansByTreeCategory,
  type ArchiveTreeCategory,
} from '@/lib/archiveTreeCategory'
import type { GrowthRecord } from '@/types/growth'
import type { TeachingPlan } from '@/types/weeklyPlan'

interface GrowthTreeDashboardProps {
  displayName: string
  years: number[]
  tags: string[]
  artifacts: GrowthTreeArtifact[]
  archivePlans?: TeachingPlan[]
  loading: boolean
}

export default function GrowthTreeDashboard({
  displayName,
  years,
  tags,
  artifacts,
  archivePlans = [],
  loading,
}: GrowthTreeDashboardProps) {
  const currentCalendarYear = new Date().getFullYear()
  const [year, setYear] = useState(currentCalendarYear)
  const [branch, setBranch] = useState<GrowthTreeBranch>('daily')
  const [playing, setPlaying] = useState(false)
  const [playKey, setPlayKey] = useState(0)
  const [selected, setSelected] = useState<GrowthTreeArtifact | null>(null)
  const [plan, setPlan] = useState<TeachingPlan | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [growth, setGrowth] = useState<GrowthRecord | null>(null)
  const [growthOpen, setGrowthOpen] = useState(false)
  const [genericOpen, setGenericOpen] = useState(false)
  const playTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (years.includes(currentCalendarYear)) {
      setYear(currentCalendarYear)
      return
    }
    if (years.length > 0) setYear(years[years.length - 1])
  }, [years, currentCalendarYear])

  useEffect(
    () => () => {
      playTimers.current.forEach((id) => window.clearTimeout(id))
    },
    []
  )

  const archiveCounts = useMemo(
    () => countArchivePlansByTreeCategory(archivePlans),
    [archivePlans]
  )
  const archiveFruitArtifacts = useMemo(
    () => archivePlans.map(artifactFromKnowledgePlan),
    [archivePlans]
  )
  const yearItems = useMemo(() => {
    const mixed = artifactsForStructureView(artifacts, year)
    const daily = mixed.filter((item) => item.branch === 'daily')
    const fruits =
      archivePlans.length > 0
        ? archiveFruitArtifacts
        : mixed.filter((item) => item.branch !== 'daily')
    return [...daily, ...fruits]
  }, [artifacts, year, archivePlans.length, archiveFruitArtifacts])
  const branchItems = useMemo(
    () => yearItems.filter((item) => item.branch === branch),
    [yearItems, branch]
  )
  const kindRows = useMemo(() => groupKindRows(branchItems), [branchItems])
  const meta = GROWTH_TREE_BRANCHES[branch]
  const total = yearItems.length
  const initial = displayName.slice(0, 1) || '师'

  const openArtifact = (item: GrowthTreeArtifact) => {
    setSelected(item)
    if (item.origin.type === 'knowledge') {
      setPlan(item.origin.plan)
      setPlanOpen(true)
      return
    }
    if (item.origin.type === 'generated') {
      setPlan(teacherDocToPlan(item.origin.doc))
      setPlanOpen(true)
      return
    }
    if (item.origin.type === 'archive') {
      if (item.origin.plan) {
        setPlan(item.origin.plan)
        setPlanOpen(true)
        return
      }
      setGenericOpen(true)
      return
    }
    if (item.origin.type === 'growth') {
      setGrowth(item.origin.record)
      setGrowthOpen(true)
      return
    }
    setGenericOpen(true)
  }

  const playTrace = () => {
    if (playing) return
    if (years.length <= 1) {
      setPlayKey((k) => k + 1)
      return
    }
    playTimers.current.forEach((id) => window.clearTimeout(id))
    playTimers.current = []
    setPlaying(true)
    let i = 0
    const run = () => {
      setYear(years[i])
      setPlayKey((k) => k + 1)
      i += 1
      if (i < years.length) {
        playTimers.current.push(window.setTimeout(run, 1100))
      } else {
        playTimers.current.push(window.setTimeout(() => setPlaying(false), 600))
      }
    }
    run()
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] tracking-[0.22em] text-amber-800/70">TEACHER GROWTH PORTRAIT</p>
          <h1 className="font-display mt-1 text-2xl font-bold text-nest-ink md:text-[1.75rem]">
            {displayName}的专业成长树
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-nest-muted">
            每一片叶子、每一颗果实，都对应一份真实产出。页面只呈现数量与类型，不设置积分、等级或排名。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-nest-leaf/20 bg-white/80 p-1">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs ${year === y ? 'bg-nest-leaf text-white' : 'text-nest-muted'}`}
                onClick={() => setYear(y)}
              >
                {y}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`rounded-xl border border-nest-leaf/25 bg-nest-mist px-3 py-2 text-xs text-nest-pine ${playing ? 'animate-pulse' : ''}`}
            onClick={playTrace}
          >
            {playing ? '成长中…' : '▶ 播放成长轨迹'}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_250px]">
        <aside className="surface-panel p-5">
          <div className="flex items-center gap-3 border-b border-nest-leaf/10 pb-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-nest-moss to-nest-pine text-lg font-bold text-white">
              {initial}
            </span>
            <div>
              <h2 className="text-base font-semibold text-nest-ink">{displayName}</h2>
              <p className="text-xs text-nest-muted">华中科技大学附属幼儿园</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-nest-mist/80 p-3">
            <small className="text-[10px] text-nest-muted">所在园所</small>
            <b className="mt-1 block text-sm text-nest-ink">华科附幼</b>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Fact label="成长年度" value={String(year)} />
            <Fact label="本年度产出" value={loading ? '—' : `${total} 份`} />
            <Fact
              label="日常叶片"
              value={`${yearItems.filter((x) => x.branch === 'daily').length} 份`}
            />
            <Fact
              label="成果果实"
              value={`${yearItems.filter((x) => x.branch !== 'daily').length} 份`}
            />
          </div>
          <p className="mt-4 text-[10px] text-nest-muted">由真实成果提炼的观察标签</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-nest-mist px-2 py-1 text-[10px] text-nest-pine"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-4 rounded-r-xl border-l-4 border-nest-moss bg-nest-sand/60 p-3 text-[11px] leading-relaxed text-nest-muted">
            这是一棵个人成长可视化档案树。只呈现成果数量与类型，不设置积分、等级、排名或考核分数。
          </p>
          <Link to="/archive" className="btn-secondary mt-4 inline-flex w-full justify-center text-xs">
            前往成果库
          </Link>
        </aside>

        <section className="surface-panel flex min-h-[640px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
            <div>
              <b className="text-sm text-nest-ink">{year} 年度成长树</b>
              <small className="mt-1 block text-[11px] text-nest-muted">
                点击叶片或果实查看对应产出；果实与成果库分类对应
                {loading ? ' · 加载中…' : ''}
              </small>
            </div>
            <div className="hidden flex-wrap justify-end gap-2 sm:flex">
              {GROWTH_TREE_BRANCH_KEYS.map((key) => (
                <span key={key} className="flex items-center gap-1 text-[10px] text-nest-muted">
                  <i
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: GROWTH_TREE_BRANCHES[key].color }}
                  />
                  {GROWTH_TREE_BRANCHES[key].short}
                </span>
              ))}
            </div>
          </div>
          <div className="growth-tree-stage relative mx-3 mb-3 min-h-[560px] flex-1 overflow-hidden rounded-2xl">
            <span className="growth-tree-cloud left-[4%] top-[7%] h-10 w-32" />
            <span className="growth-tree-cloud right-[5%] top-[17%] h-8 w-24" />
            <GrowthTreeLabels active={branch} onSelect={setBranch} />
            <GrowthTreeSvg
              year={year}
              displayName={displayName}
              artifacts={yearItems}
              playKey={playKey}
              onSelect={openArtifact}
            />
            <div className="absolute bottom-2.5 left-4 right-4 z-[5] flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 backdrop-blur">
              <span className="hidden text-[11px] text-nest-muted sm:inline">
                树木形态随成果自然累积，不代表考核等级
              </span>
              <b className="text-xs text-nest-pine">共 {total} 份成长产出</b>
            </div>
          </div>
        </section>

        <aside className="surface-panel p-5">
          <div className="flex items-center gap-2.5 border-b border-nest-leaf/10 pb-4">
            <span
              className="grid h-11 w-11 place-items-center rounded-xl text-sm font-bold"
              style={{ background: meta.soft, color: meta.color }}
            >
              {meta.symbol}
            </span>
            <div className="flex-1">
              <small className="text-[10px]" style={{ color: meta.color }}>
                {meta.eyebrow}
              </small>
              <h2 className="text-[15px] font-semibold text-nest-ink">{meta.name}</h2>
            </div>
            <span
              className="rounded-full px-2 py-1 text-[10px]"
              style={{ background: meta.soft, color: meta.color }}
            >
              {branchItems.length} 份
            </span>
          </div>
          <p className="my-4 text-xs leading-relaxed text-nest-muted">{meta.summary}</p>
          <div className="border-t border-nest-leaf/10">
            {kindRows.length === 0 ? (
              <p className="py-6 text-center text-xs text-nest-muted">该枝条本年度正在自然积累</p>
            ) : (
              kindRows.map((row) => (
                <div
                  key={row.kind}
                  className="grid grid-cols-[22px_1fr_auto] items-center gap-2 border-b border-nest-leaf/8 py-3"
                >
                  <i
                    className="grid h-6 w-6 place-items-center rounded-lg text-[10px] not-italic"
                    style={{ background: meta.soft, color: meta.color }}
                  >
                    {meta.symbol}
                  </i>
                  <b className="text-xs text-nest-ink">{row.kind}</b>
                  <span className="text-[11px]" style={{ color: meta.color }}>
                    {row.count} {row.unit}
                  </span>
                </div>
              ))
            )}
          </div>
          <div
            className="mt-4 rounded-xl p-3 text-[11px] leading-relaxed text-nest-muted"
            style={{ background: meta.soft }}
          >
            <b style={{ color: meta.color }}>{meta.short}</b>
            <br />
            {meta.note}
          </div>
          <p className="mt-3 text-center text-[10px] text-nest-muted">
            点击树上的单个叶片或果实查看具体信息
          </p>
        </aside>
      </section>

      <section className="rounded-2xl border border-nest-leaf/15 bg-white/50 p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.18em] text-amber-800/70">GROWTH STRUCTURE</p>
            <h2 className="font-display text-lg text-nest-ink">成长结构</h2>
          </div>
          <p className="text-xs text-nest-muted">日常叶片按所选年份；成果库果实与成果库分类份数一致</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {GROWTH_TREE_BRANCH_KEYS.map((key) => {
            const m = GROWTH_TREE_BRANCHES[key]
            const items = yearItems.filter((x) => x.branch === key)
            const count =
              key === 'daily'
                ? items.length
                : archivePlans.length > 0
                  ? archiveCounts[key as ArchiveTreeCategory]
                  : items.length
            const detail =
              key === 'daily'
                ? groupKindRows(items)
                    .filter((r) => r.count > 0)
                    .map((r) => `${r.kind} ${r.count}`)
                    .join(' · ') || '正在自然积累'
                : count > 0
                  ? `${ARCHIVE_TREE_CATEGORY_LABELS[key as ArchiveTreeCategory]} ${count}`
                  : '正在自然积累'
            return (
              <button
                key={key}
                type="button"
                className={`grid grid-cols-[38px_1fr_auto] items-center gap-2 rounded-2xl border bg-white/90 p-3 text-left ${branch === key ? 'border-nest-leaf shadow-sm' : 'border-nest-leaf/15'}`}
                onClick={() => setBranch(key)}
              >
                <i
                  className="grid h-9 w-9 place-items-center rounded-xl text-sm font-bold not-italic"
                  style={{ background: m.soft, color: m.color }}
                >
                  {m.symbol}
                </i>
                <span className="min-w-0">
                  <small className="text-[10px] text-nest-muted">{m.eyebrow}</small>
                  <b className="block text-xs text-nest-ink">{m.short}</b>
                  <em className="block truncate text-[10px] not-italic text-nest-muted">{detail}</em>
                </span>
                <strong className="text-lg" style={{ color: m.color }}>
                  {count}
                  <small className="block text-[10px] font-normal text-nest-muted">份产出</small>
                </strong>
              </button>
            )
          })}
        </div>
      </section>

      <section id="growth-timeline" className="surface-panel scroll-mt-24 p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-nest-leaf/10 pb-4">
          <div>
            <p className="text-[10px] tracking-[0.18em] text-amber-800/70">GROWTH TIMELINE</p>
            <h2 className="font-display text-xl text-nest-ink">成长轨迹</h2>
            <p className="mt-1 text-xs text-nest-muted">
              按年度沉淀特色实践、教研科研与专业荣誉。日常叶片不列入轨迹表，以免淹没果实类成果。
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-nest-muted">
            {(['practice', 'research', 'honor'] as const).map((key) => (
              <label key={key} className="flex items-center gap-1">
                <i
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: GROWTH_TREE_BRANCHES[key].color }}
                />
                {GROWTH_TREE_BRANCHES[key].short}
              </label>
            ))}
          </div>
        </div>
        <div className="relative">
          {years.map((y) => {
            const fruitCount = artifacts.filter(
              (a) => a.year === y && a.branch !== 'daily'
            ).length
            return (
              <article
                key={y}
                className="grid grid-cols-[72px_1fr] gap-4 py-5 md:grid-cols-[95px_1fr]"
              >
                <div>
                  <b className="font-display block text-lg text-nest-pine">{y}</b>
                  <small className="text-[10px] text-nest-muted">{fruitCount} 项轨迹成果</small>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {(['practice', 'research', 'honor'] as const).map((key) => {
                    const m = GROWTH_TREE_BRANCHES[key]
                    const list = artifacts.filter((a) => a.year === y && a.branch === key)
                    return (
                      <section
                        key={key}
                        className="overflow-hidden rounded-xl border border-nest-leaf/15 bg-white"
                        style={{ borderTop: `3px solid ${m.color}` }}
                      >
                        <div
                          className="flex items-center justify-between px-3 py-2"
                          style={{ background: m.soft }}
                        >
                          <b className="text-xs" style={{ color: m.color }}>
                            {m.short}
                          </b>
                          <span className="text-[10px] text-nest-muted">{list.length} 项</span>
                        </div>
                        {list.length === 0 ? (
                          <p className="px-3 py-5 text-center text-[11px] text-nest-muted">
                            该年度正在自然积累
                          </p>
                        ) : (
                          <div className="px-2 pb-2">
                            {list.slice(0, 8).map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="grid w-full grid-cols-[1fr_auto] gap-2 border-b border-dashed border-nest-leaf/10 px-1 py-2 text-left last:border-0"
                                onClick={() => openArtifact(item)}
                              >
                                <b className="truncate text-[11px] text-nest-ink">{item.title}</b>
                                <small className="text-[10px] text-nest-muted">{item.shortDate}</small>
                              </button>
                            ))}
                          </div>
                        )}
                      </section>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <p className="text-center text-[11px] text-nest-muted">
        幼师专业成长树 · 个人成长可视化档案 · 无积分 / 无等级 / 无排名
      </p>

      <PlanDetailDialog plan={plan} open={planOpen} onOpenChange={setPlanOpen} />
      <ArchiveDetailDrawer record={growth} open={growthOpen} onOpenChange={setGrowthOpen} />
      <Dialog open={genericOpen} onOpenChange={setGenericOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title || '成果详情'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-nest-muted">{selected?.preview}</p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-nest-leaf/15 p-2.5">
      <small className="text-[10px] text-nest-muted">{label}</small>
      <b className="mt-0.5 block text-xs text-nest-ink">{value}</b>
    </div>
  )
}
