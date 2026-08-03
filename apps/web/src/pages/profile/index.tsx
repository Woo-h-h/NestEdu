import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Loader2, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { authBridge } from '@/lib/authBridge'
import type { AuthInfo } from '@zcat-open/auth-bridge'
import ProfileHeroCard, { resolveProfileDisplayName } from '@/components/profile/ProfileHeroCard'
import ProfileAgentMarkdown from '@/components/profile/ProfileAgentMarkdown'
import DimensionCards from '@/components/profile/DimensionCards'
import RadarChart from '@/components/profile/RadarChart'
import DonutChart from '@/components/profile/DonutChart'
import AnnualReportModal from '@/components/profile/AnnualReportModal'
import { useProfileMetrics } from '@/hooks/useProfileMetrics'
import { generateProfileAgentAnalysis } from '@/api/profileAgent'
import { getProfileSnapshotByPhone, saveProfileSnapshot } from '@/api/profileSnapshot'
import { getProfileAgentId } from '@/api/agent'

const REPORT_YEAR = new Date().getFullYear()

export default function ProfilePage() {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const [reportOpen, setReportOpen] = useState(false)
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState('')
  const [agentMarkdown, setAgentMarkdown] = useState('')
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [agentMeta, setAgentMeta] = useState<{
    archiveDocCount: number
    localRecordCount: number
    agentId: number
  } | null>(null)

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
    trend,
    analysis,
    wordCloud,
    paths,
    representatives,
    actions,
    load,
  } = useProfileMetrics()

  const isLoggedIn = Boolean(authInfo?.token)
  const profileAgentId = getProfileAgentId()

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  // 登录后按手机号加载已保存的智能画像（MySQL）
  useEffect(() => {
    if (!isLoggedIn) {
      setAgentMarkdown('')
      setAgentMeta(null)
      return
    }
    // phone 尚未从平台解析出来时不要清空已有文案，避免刷新闪空
    if (!phone) return

    let cancelled = false
    setSnapshotLoading(true)
    void getProfileSnapshotByPhone(phone)
      .then((snap) => {
        if (cancelled || !snap) return
        setAgentMarkdown(snap.markdown)
        setAgentMeta({
          archiveDocCount: snap.archiveDocCount,
          localRecordCount: snap.localRecordCount,
          agentId: snap.agentId || getProfileAgentId(),
        })
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[profile] load snapshot failed', err)
      })
      .finally(() => {
        if (!cancelled) setSnapshotLoading(false)
      })
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
        await saveProfileSnapshot({
          phone: result.phone,
          displayName: result.displayName || displayName,
          agentId: result.agentId,
          markdown: result.markdown,
          archiveDocCount: result.archiveDocCount,
          localRecordCount: result.localRecordCount,
          folderIds: result.folderIds,
        })
        toast.success('已生成并保存到个人画像（同一手机号仅保留最新一份）')
      } catch (saveErr) {
        const saveMsg = saveErr instanceof Error ? saveErr.message : '保存失败'
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
          画像数据来自教师成果库中与手机号「{phone}」同名的个人文件夹（可叠加本地录入）。
        </p>
      ) : null}

      <ComplianceBanner className="mt-5" />

      <section className="surface-panel mt-5 space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-nest-ink">智能画像解读</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-nest-muted">
              已接入平台智能体{' '}
              <a
                href={`https://www.zcat.cn/teach/agent/config/${profileAgentId}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-nest-pine underline-offset-2 hover:underline"
              >
                #{profileAgentId}
              </a>
              ：由前端先按手机号隔离个人文件夹文档，再把摘要注入智能体；
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
            本次注入：成果库文档 {agentMeta.archiveDocCount} 份 · 本地录入 {agentMeta.localRecordCount}{' '}
            条 · 智能体{' '}
            <a
              href={`https://www.zcat.cn/teach/agent/config/${agentMeta.agentId}`}
              target="_blank"
              rel="noreferrer"
              className="text-nest-pine underline-offset-2 hover:underline"
            >
              #{agentMeta.agentId}
            </a>
            。画像文案按手机号保存在 MySQL，重新生成会覆盖旧版。
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
              desc="由系统生成与教师录入成果共同形成的结构观察，非能力或绩效评分。"
            />
            <DimensionCards dimensions={dimensions} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartPanel title="结构雷达" desc="各维度结构丰富度（0–100）">
              <RadarChart labels={radar.labels} values={radar.values} />
            </ChartPanel>
            <ChartPanel title="录入类别分布" desc="教师录入三类成果占比">
              <DonutChart items={categoryCounts} />
            </ChartPanel>
          </section>

          {representatives.length > 0 && (
            <section className="surface-panel p-5">
              <SectionHead title="代表成果" desc="来自成果库标记或自动选取的展示条目" />
              <ul className="mt-3 divide-y divide-nest-leaf/10">
                {representatives.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <span className="font-medium text-nest-ink">{r.name}</span>
                      <span className="ml-2 text-nest-muted">
                        {r.category} · {r.year}
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
                在成果库管理代表成果
              </Link>
            </section>
          )}
        </div>
      )}

      <div className="no-print mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-nest-leaf/10 pt-8">
        <p className="max-w-lg text-xs leading-relaxed text-nest-muted">
          画像与报告优先聚合您手机号文件夹中的教师成果库文档，并合并本地录入与活动方案/周计划系统统计。
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
        trend={trend}
        strengths={analysis.strengths}
        gaps={analysis.gaps}
        paths={paths}
        wordCloud={wordCloud}
        representatives={representatives}
        actions={actions}
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
          ? `请在知识库「教师成果库」下确认已有手机号「${phone}」同名文件夹，并上传奖状/成果文档；也可在成果库补充录入。`
          : '请先登录平台；画像将根据您手机号对应的教师成果库文件夹中的文件生成。'}
      </p>
      <Link to="/archive" className="btn-primary mt-6 inline-flex">
        查看成果库
      </Link>
      <Link to="/archive/upload" className="btn-secondary mt-3 ml-0 inline-flex md:ml-3">
        <Plus size={16} />
        补充录入
      </Link>
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
