import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { authBridge } from '@/lib/authBridge'
import { getApiErrorMessage } from '@/lib/apiError'
import { getAuthIdentityKey } from '@/lib/authIdentity'
import type { AuthInfo } from '@zcat-open/auth-bridge'
import { resolveProfileDisplayName } from '@/components/profile/ProfileHeroCard'
import ProfileAgentMarkdown from '@/components/profile/ProfileAgentMarkdown'
import GrowthTreeDashboard from '@/components/profile/GrowthTreeDashboard'
import { useProfileMetrics } from '@/hooks/useProfileMetrics'
import { generateProfileAgentAnalysis } from '@/api/profileAgent'
import { getProfileSnapshotByPhone, saveProfileSnapshot } from '@/api/profileSnapshot'
import { getCurrentTeacherPhone } from '@/api/platformUser'
import { isMissingUidHashError } from '@/lib/uidHashCache'
import { getProfileAgentId } from '@/api/agent'
import {
  buildGrowthTreeArtifacts,
  collectYears,
} from '@/lib/growth-tree'

export default function ProfilePage() {
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(() => authBridge.getAuthInfo())
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState('')
  const [agentMarkdown, setAgentMarkdown] = useState('')
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotError, setSnapshotError] = useState('')
  const [snapshotSavedAt, setSnapshotSavedAt] = useState('')
  const [agentMeta, setAgentMeta] = useState<{
    archiveDocCount: number
    activityPlanCount: number
    weeklyPlanCount: number
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
    archivePlans,
    generatedDocs,
    records,
    archiveAchievements,
    load,
  } = useProfileMetrics()

  const isLoggedIn = Boolean(authInfo?.token)

  useEffect(() => authBridge.subscribe(setAuthInfo), [])

  // 换账号时清空已加载的画像，避免短暂展示上一教师内容
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

  // 登录后独立解析手机号并加载已保存的画像（不依赖成长指标是否加载成功）
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
          activityPlanCount: snap.activityPlanCount ?? 0,
          weeklyPlanCount: snap.weeklyPlanCount ?? 0,
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
        const msg = getApiErrorMessage(err, '加载已保存画像失败')
        if (isMissingUidHashError(msg) || isMissingUidHashError(err)) {
          console.warn('[profile] snapshot load skipped (uid hash not ready)', msg)
          return
        }
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

  const artifacts = useMemo(
    () =>
      buildGrowthTreeArtifacts({
        generatedDocs,
        archivePlans,
        archiveAchievements,
        localRecords: records,
      }),
    [generatedDocs, archivePlans, archiveAchievements, records]
  )
  const treeYears = useMemo(() => collectYears(artifacts), [artifacts])

  // 份数与成长树同源：入库文档 + 成果库个人夹（已剔除误入的方案/周计划）+ 本地录入
  const materialStats = useMemo(
    () => ({
      activityPlanCount: generatedDocs.filter((doc) => doc.docType === 'activity').length,
      weeklyPlanCount: generatedDocs.filter((doc) => doc.docType === 'weekly').length,
      archiveDocCount: archivePlans.length,
      localRecordCount: records.filter((item) => !item.id.startsWith('kb_')).length,
    }),
    [generatedDocs, archivePlans, records]
  )

  const handleGenerateAgentProfile = async () => {
    setAgentError('')
    setAgentLoading(true)
    try {
      const result = await generateProfileAgentAnalysis()
      setAgentMarkdown(result.markdown)
      setAgentMeta({
        archiveDocCount: result.archiveDocCount,
        activityPlanCount: result.activityPlanCount,
        weeklyPlanCount: result.weeklyPlanCount,
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
          activityPlanCount: result.activityPlanCount,
          weeklyPlanCount: result.weeklyPlanCount,
          localRecordCount: result.localRecordCount,
          folderIds: result.folderIds,
        })
        // 回读确认已落库，避免「生成成功但未持久化」假象
        const verified = await getProfileSnapshotByPhone(result.phone)
        if (!verified?.markdown?.trim()) {
          throw new Error('保存后未能读回画像，请稍后重试或联系管理员')
        }
        setSnapshotSavedAt(saved.updatedAt || saved.generatedAt || verified.updatedAt || '')
        setSnapshotError('')
        toast.success('已生成并保存（同一账号仅保留最新一份，下次登录可查看）')
      } catch (saveErr) {
        const saveMsg = saveErr instanceof Error ? saveErr.message : '保存失败'
        setSnapshotError(saveMsg)
        toast.warning(`画像已生成，但保存失败：${saveMsg}`)
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, '生成失败')
      setAgentError(msg)
      toast.error(msg)
    } finally {
      setAgentLoading(false)
    }
  }

  return (
    <div className="page-enter mx-auto max-w-[1500px]">
      <GrowthTreeDashboard
        displayName={displayName}
        years={treeYears}
        artifacts={artifacts}
        archivePlans={archivePlans}
        loading={loading}
      />

      {phone ? (
        <p className="mt-3 text-xs text-nest-muted">
          叶片来自本人入库的活动方案与周计划；果实来自教师成果库个人文件夹与本地录入。
        </p>
      ) : null}

      <ComplianceBanner className="mt-5" />

      {error ? (
        <div className="surface-panel mt-5 p-8 text-center">
          <p className="text-sm text-red-600">成长数据加载失败：{error}</p>
          <button type="button" onClick={() => void load()} className="btn-secondary mt-4">
            重试
          </button>
        </div>
      ) : null}

      {!loading && !error && isEmpty ? <EmptyState className="mt-5" phone={phone} /> : null}

      <section className="surface-panel mt-5 space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-nest-ink">智能画像解读</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-nest-muted">
              围绕三维度（活动方案、周计划、教师成果库）生成个人成长解读，仅使用您本人的成果材料，
              不会看到其他教师的内容。
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

        {(agentMeta || agentMarkdown) && (
          <p className="text-xs text-nest-muted">
            当前材料：活动方案 {materialStats.activityPlanCount} 份、周计划{' '}
            {materialStats.weeklyPlanCount} 份（本人入库）+ 成果库文档{' '}
            {materialStats.archiveDocCount} 份 · 本地录入 {materialStats.localRecordCount}{' '}
            条。解读正文来自最近一次生成，份数与上方成长数据一致；重新生成会按最新材料覆盖。
            {snapshotSavedAt ? ` 最近保存：${new Date(snapshotSavedAt).toLocaleString()}` : ''}
          </p>
        )}

        {snapshotError && (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-900">
            {snapshotError.includes('加载') ? '画像加载提示' : '画像保存提示'}：{snapshotError}
            。若已能看到正文，可忽略本提示；否则请稍后点「生成智能画像」或刷新页面。
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
              点击「生成智能画像」后，将根据您本人的活动方案、周计划与成果库材料生成解读，并保存供下次登录查看。
            </p>
          )
        )}
      </section>
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
        教师画像用于<strong className="font-medium">个人专业发展观察</strong>
        ，不构成排名、绩效评分或与他人对比依据。成长树只描述成果数量与类型。
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
