import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Loader2, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { authBridge } from '@/lib/authBridge'
import { getAuthIdentityKey } from '@/lib/authIdentity'
import type { AuthInfo } from '@zcat-open/auth-bridge'
import ProfileHeroCard, { resolveProfileDisplayName } from '@/components/profile/ProfileHeroCard'
import ProfileAgentMarkdown from '@/components/profile/ProfileAgentMarkdown'
import DimensionCards from '@/components/profile/DimensionCards'
import RadarChart from '@/components/profile/RadarChart'
import DonutChart from '@/components/profile/DonutChart'
import StrengthGapPanel from '@/components/profile/StrengthGapPanel'
import AnnualReportModal from '@/components/profile/AnnualReportModal'
import { useProfileMetrics } from '@/hooks/useProfileMetrics'
import { generateProfileAgentAnalysis } from '@/api/profileAgent'
import { getProfileSnapshotByPhone, saveProfileSnapshot } from '@/api/profileSnapshot'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import { getProfileAgentId } from '@/api/agent'

const REPORT_YEAR = new Date().getFullYear()

export default function ProfilePage() {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const [reportOpen, setReportOpen] = useState(false)
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState('')
  const [agentMarkdown, setAgentMarkdown] = useState('')
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotError, setSnapshotError] = useState('')
  const [snapshotSavedAt, setSnapshotSavedAt] = useState('')
  const [agentMeta, setAgentMeta] = useState<{
    archiveDocCount: number
    localRecordCount: number
    agentId: number
  } | null>(null)
  const snapshotLoadAnnouncedRef = useRef(false)

  const {
    loading,
    error,
    isEmpty,
    phone,
    displayName: platformDisplayName,
    teacherRecordCount,
    dimensions,
    categoryCounts,
    radar,
    analysis,
    representatives,
    load,
  } = useProfileMetrics()

  const isLoggedIn = Boolean(authInfo?.token)
  const profileAgentId = getProfileAgentId()

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  // 换账号时清空已加载的 MySQL 画像，避免短暂展示上一教师内容
  useEffect(() => {
    let lastIdentity = getAuthIdentityKey(authBridge.getAuthInfo())
    return authBridge.subscribe((info) => {
      const identity = getAuthIdentityKey(info)
      if (identity === lastIdentity) return
      lastIdentity = identity
      setAgentMarkdown('')
      setAgentMeta(null)
      setSnapshotError('')
      setSnapshotSavedAt('')
      snapshotLoadAnnouncedRef.current = false
    })
  }, [])

  // 登录后独立解析手机号并加载 MySQL 画像（不依赖成长指标是否加载成功）
  useEffect(() => {
    if (!isLoggedIn) {
      setAgentMarkdown('')
      setAgentMeta(null)
      setSnapshotError('')
      setSnapshotSavedAt('')
      snapshotLoadAnnouncedRef.current = false
      return
    }

    let cancelled = false
    setSnapshotLoading(true)
    setSnapshotError('')

    void (async () => {
      try {
        const resolvedPhone = (phone || (await getCurrentTeacherPhone({ force: true }))).trim()
        if (!resolvedPhone) {
          if (!cancelled) {
            setSnapshotLoading(false)
            setSnapshotError('未能获取手机号，无法加载已保存画像')
          }
          return
        }
        const snap = await getProfileSnapshotByPhone(resolvedPhone)
        if (cancelled) return
        if (!snap?.markdown?.trim()) {
          setSnapshotLoading(false)
          return
        }
        setAgentMarkdown(snap.markdown)
        setAgentMeta({
          archiveDocCount: snap.archiveDocCount,
          localRecordCount: snap.localRecordCount,
          agentId: snap.agentId || getProfileAgentId(),
        })
        setSnapshotSavedAt(snap.updatedAt || snap.generatedAt || '')
        if (!snapshotLoadAnnouncedRef.current) {
          snapshotLoadAnnouncedRef.current = true
          toast.message('已加载上次保存的智能画像', { duration: 2500 })
        }
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : '加载已保存画像失败'
        setSnapshotError(msg)
        console.warn('[profile] load snapshot failed', err)
      } finally {
        if (!cancelled) setSnapshotLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, phone])

  const displayName = useMemo(() => {
    if (platformDisplayName.trim()) return platformDisplayName.trim()
    return resolveProfileDisplayName(authInfo)
  }, [platformDisplayName, authInfo])

  const handleGenerateAgentProfile = async () => {
    setAgentError('')
    setAgentLoading(true)
    try {
      const result = await generateProfileAgentAnalysis()
      setAgentMarkdown(result.markdown)
      setAgentMeta({
        archiveDocCount: result.archiveDocCount,
        localRecordCount: result.localRecordCount,
        agentId: result.agentId,
      })
      try {
        const saved = await saveProfileSnapshot({
          phone: result.phone,
          displayName: result.displayName || displayName,
          agentId: result.agentId,
          markdown: result.markdown,
          archiveDocCount: result.archiveDocCount,
          localRecordCount: result.localRecordCount,
          folderIds: result.folderIds,
        })
        // 回读确认已落库，避免「生成成功但未持久化」假象
        const verified = await getProfileSnapshotByPhone(result.phone)
        if (!verified?.markdown?.trim()) {
          throw new Error('保存后未能读回画像，请确认后端与 MySQL 已启动')
        }
        setSnapshotSavedAt(saved.updatedAt || saved.generatedAt || verified.updatedAt || '')
        setSnapshotError('')
        toast.success('已生成并保存到 MySQL（同一手机号仅保留最新一份，下次登录可查看）')
      } catch (saveErr) {
        const saveMsg = saveErr instanceof Error ? saveErr.message : '保存失败'
        setSnapshotError(saveMsg)
        toast.warning(`画像已生成，但保存到数据库失败：${saveMsg}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败'
      setAgentError(msg)
      toast.error(msg)
    } finally {
      setAgentLoading(false)
    }
  }

  return (
    <div className="page-enter mx-auto max-w-6xl">
      <ProfileHeroCard
        displayName={displayName}
        teacherRecordCount={teacherRecordCount}
        categoryCounts={categoryCounts}
      />

      {phone ? (
        <p className="mt-3 text-xs text-nest-muted">
          画像三维度：活动方案 / 周计划（MySQL 本人入库）· 教师成果库（手机号「{phone}」同名文件夹）。
        </p>
      ) : null}

      <ComplianceBanner className="mt-5" />

      <section className="surface-panel mt-5 space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-nest-ink">智能画像解读</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-nest-muted">
              围绕三维度（活动方案、周计划、教师成果库）生成解读。前端先按手机号隔离个人文件夹文档，再把摘要与三维度计数注入智能体；
              <strong className="font-medium text-nest-pine">不把整库交给 Agent 检索</strong>
              ，避免看到其他教师材料。
            </p>
          </div>
          <button
            type="button"
            className="btn-accent shrink-0"
            disabled={agentLoading || !isLoggedIn || loading}
            onClick={() => void handleGenerateAgentProfile()}
          >
            {agentLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> 生成中…
              </>
            ) : (
              <>
                <Sparkles size={16} /> 生成智能画像
              </>
            )}
          </button>
        </div>

        {!isLoggedIn && (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-900">
            请先登录后再生成；系统需要手机号以定位您的个人成果文件夹。
          </p>
        )}

        {agentMeta && (
          <p className="text-xs text-nest-muted">
            本次注入：活动方案/周计划统计 + 成果库文档 {agentMeta.archiveDocCount} 份 · 本地录入{' '}
            {agentMeta.localRecordCount} 条 · 智能体{' '}
            <a
              href={`https://www.zcat.cn/teach/agent/config/${agentMeta.agentId}`}
              target="_blank"
              rel="noreferrer"
              className="text-nest-pine underline-offset-2 hover:underline"
            >
              #{agentMeta.agentId}
            </a>
            。画像文案按手机号保存在 MySQL，重新生成会覆盖旧版。
            {snapshotSavedAt ? ` 最近保存：${new Date(snapshotSavedAt).toLocaleString()}` : ''}
          </p>
        )}

        {snapshotError && (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-900">
            画像存取异常：{snapshotError}。请确认已启动后端（`pnpm dev:backend`）且 MySQL 可写。
          </p>
        )}

        {snapshotLoading && !agentMarkdown && (
          <p className="flex items-center gap-2 text-sm text-nest-muted">
            <Loader2 size={14} className="animate-spin" />
            正在加载已保存的智能画像…
          </p>
        )}

        {agentError && <p className="text-sm text-red-600">{agentError}</p>}

        {agentMarkdown ? (
          <div className="rounded-2xl border border-nest-leaf/10 bg-nest-mist/30 p-4 md:p-5">
            <ProfileAgentMarkdown text={agentMarkdown} />
          </div>
        ) : (
          !agentLoading &&
          !snapshotLoading && (
            <p className="text-sm text-nest-muted">
              点击「生成智能画像」后，将调用智能体 #{profileAgentId}
              ，仅基于您手机号文件夹与本地录入生成解读文案，并保存到数据库供下次登录查看。
            </p>
          )
        )}
      </section>

      {loading ? (
        <div className="surface-panel mt-6 flex items-center justify-center gap-2 p-12 text-nest-muted">
          <Loader2 size={18} className="animate-spin" />
          加载成长数据…
        </div>
      ) : error ? (
        <div className="surface-panel mt-6 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button type="button" onClick={() => void load()} className="btn-secondary mt-4">
            重试
          </button>
        </div>
      ) : isEmpty ? (
        <EmptyState className="mt-6" phone={phone} />
      ) : (
        <div className="mt-8 space-y-8">
          <section>
            <SectionHead
              title="成长结构维度"
              desc="与成果库首页前三栏对齐：活动方案、周计划、教师成果库；结构观察，非能力或绩效评分。"
            />
            <DimensionCards dimensions={dimensions} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartPanel title="结构雷达" desc="三维度结构丰富度（0–100，非能力分）">
              <RadarChart labels={radar.labels} values={radar.values} />
            </ChartPanel>
            <ChartPanel title="成果结构分布" desc="活动方案 / 周计划 / 教师成果库数量占比">
              <DonutChart items={categoryCounts} />
            </ChartPanel>
          </section>

          <section>
            <SectionHead
              title="优势与待发展"
              desc="基于三维度计数的可解释规则分析，仅供个人发展参考。"
            />
            <StrengthGapPanel strengths={analysis.strengths} gaps={analysis.gaps} />
          </section>

          {representatives.length > 0 && (
            <section className="surface-panel p-5">
              <SectionHead title="代表成果" desc="来自教师成果库文档或本地录入的展示条目" />
              <ul className="mt-3 divide-y divide-nest-leaf/10">
                {representatives.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <span className="font-medium text-nest-ink">{r.name}</span>
                      <span className="ml-2 text-nest-muted">
                        {r.id.startsWith('kb_') ? '教师成果库' : r.category} · {r.year}
                      </span>
                    </div>
                    {r.representative && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                        代表成果
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <Link to="/archive" className="btn-secondary mt-4 inline-flex text-xs">
                在成果库查看更多
              </Link>
            </section>
          )}
        </div>
      )}

      <div className="no-print mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-nest-leaf/10 pt-8">
        <p className="max-w-lg text-xs leading-relaxed text-nest-muted">
          画像与报告围绕三维度聚合：活动方案、周计划（本人入库）与教师成果库（平台个人文件夹）。
        </p>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          disabled={loading}
          className="btn-primary shrink-0"
        >
          <FileText size={16} />
          生成年度成长报告
        </button>
      </div>

      <AnnualReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        displayName={displayName}
        year={REPORT_YEAR}
        dimensions={dimensions}
        categoryCounts={categoryCounts}
        radar={radar}
        strengths={analysis.strengths}
        gaps={analysis.gaps}
        representatives={representatives}
        teacherRecordCount={teacherRecordCount}
      />
    </div>
  )
}

function ComplianceBanner({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-nest-leaf/15 bg-nest-mist/50 px-4 py-3 text-sm text-nest-pine ${className}`}
    >
      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-nest-leaf" />
      <p className="leading-relaxed">
        教师画像用于<strong className="font-medium">个人专业发展观察</strong>，不构成排名、绩效评分或与他人对比依据。
        雷达与匹配度均为<strong className="font-medium">成长结构</strong>描述。
      </p>
    </div>
  )
}

function EmptyState({ className, phone }: { className?: string; phone?: string }) {
  return (
    <div className={`surface-panel p-10 text-center ${className}`}>
      <p className="font-display text-lg font-semibold text-nest-ink">尚无足够数据生成画像</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-nest-muted">
        {phone
          ? `请先在「活动方案」或「周计划」入库，或在知识库「教师成果库」下手机号「${phone}」同名文件夹中沉淀文档。`
          : '请先登录平台；画像将根据活动方案、周计划与教师成果库三维度生成。'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/activity" className="btn-primary inline-flex">
          去活动方案
        </Link>
        <Link to="/weekly-plan" className="btn-secondary inline-flex">
          去周计划
        </Link>
        <Link to="/archive" className="btn-secondary inline-flex">
          <Plus size={16} />
          查看成果库
        </Link>
      </div>
    </div>
  )
}

function SectionHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-lg font-semibold text-nest-ink">{title}</h2>
      <p className="mt-1 text-sm text-nest-muted">{desc}</p>
    </div>
  )
}

function ChartPanel({
  title,
  desc,
  children,
}: {
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="surface-panel flex flex-col p-5">
      <SectionHead title={title} desc={desc} />
      <div className="flex flex-1 items-center justify-center">{children}</div>
    </div>
  )
}
