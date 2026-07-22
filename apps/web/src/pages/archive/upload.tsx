import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, FileUp, Trash2 } from 'lucide-react'
import { createGrowthId, getGrowthRecord, saveGrowthRecord } from '@/api/growth'
import {
  GROWTH_CATEGORIES,
  GROWTH_LEVELS,
  GROWTH_STATUSES,
  getCategoryConfig,
} from '@/lib/growthCategories'
import type { GrowthCategory, GrowthFileMeta, GrowthRecordInput } from '@/types/growth'

type Step = 1 | 2 | 3

const emptyForm = (): GrowthRecordInput => ({
  id: createGrowthId(),
  name: '',
  year: new Date().getFullYear(),
  category: '专业研究成果',
  subtype: '',
  date: '',
  level: '',
  role: '',
  org: '',
  intro: '',
  keywords: [],
  status: '已完成',
  representative: false,
  extra: {},
  files: [],
})

export default function ArchiveUploadPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<GrowthRecordInput>(emptyForm)
  const [keywordInput, setKeywordInput] = useState('')
  const [loading, setLoading] = useState(!!editId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const categoryConfig = useMemo(
    () => getCategoryConfig(form.category),
    [form.category]
  )

  useEffect(() => {
    if (!editId) return
    setLoading(true)
    void getGrowthRecord(editId).then((record) => {
      if (record) {
        setForm({
          id: record.id,
          name: record.name,
          year: record.year,
          category: record.category,
          subtype: record.subtype,
          date: record.date,
          level: record.level,
          role: record.role,
          org: record.org,
          intro: record.intro,
          keywords: record.keywords || [],
          status: record.status,
          representative: record.representative,
          extra: record.extra || {},
          files: record.files || [],
        })
        setStep(2)
      }
      setLoading(false)
    })
  }, [editId])

  const updateField = <K extends keyof GrowthRecordInput>(key: K, value: GrowthRecordInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const selectCategory = (category: GrowthCategory) => {
    setForm((prev) => ({
      ...prev,
      category,
      subtype: '',
      role: '',
      extra: {},
    }))
    setStep(2)
  }

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (!kw || form.keywords.includes(kw)) return
    updateField('keywords', [...form.keywords, kw])
    setKeywordInput('')
  }

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const next: GrowthFileMeta[] = [...form.files]
    for (const file of Array.from(fileList)) {
      next.push({ name: file.name, type: file.type, size: file.size })
    }
    updateField('files', next)
  }

  const removeFile = (index: number) => {
    updateField(
      'files',
      form.files.filter((_, i) => i !== index)
    )
  }

  const validateStep2 = () => {
    if (!form.name.trim()) {
      setError('请填写成果名称')
      return false
    }
    if (!form.category) {
      setError('请选择成果类别')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async () => {
    if (!validateStep2()) {
      setStep(2)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await saveGrowthRecord(form)
      navigate('/archive')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="page-enter mx-auto max-w-3xl">
        <div className="surface-panel p-10 text-center text-sm text-nest-muted">加载中…</div>
      </div>
    )
  }

  return (
    <div className="page-enter mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          to="/archive"
          className="mb-4 inline-flex items-center gap-1 text-sm text-nest-muted hover:text-nest-pine"
        >
          <ArrowLeft size={16} /> 返回成果库
        </Link>
        <h1 className="font-display text-2xl font-bold text-nest-ink">
          {editId ? '编辑成果' : '录入成果'}
        </h1>
        <p className="mt-2 text-sm text-nest-muted">
          三步完成录入：选择类别 → 填写信息（人工填写，无 OCR）→ 确认附件元数据
        </p>
      </div>

      <StepIndicator current={step} />

      {step === 1 && (
        <section className="surface-panel space-y-4 p-6">
          <h2 className="text-sm font-semibold text-nest-ink">选择成果类别</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {GROWTH_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => selectCategory(cat.label)}
                className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                  form.category === cat.label
                    ? 'border-nest-leaf bg-nest-mist ring-2 ring-nest-leaf/20'
                    : 'border-nest-leaf/15 bg-white hover:border-nest-leaf/30'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <p className="mt-2 font-medium text-nest-ink">{cat.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-nest-muted">{cat.description}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && categoryConfig && (
        <section className="surface-panel space-y-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-nest-ink">
              填写信息 · {categoryConfig.label}
            </h2>
            <button type="button" className="text-xs text-nest-muted hover:text-nest-pine" onClick={() => setStep(1)}>
              更换类别
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="成果名称 *">
              <input
                className="field-input"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="请输入成果名称"
              />
            </Field>
            <Field label="年度">
              <input
                type="number"
                className="field-input"
                value={form.year}
                onChange={(e) => updateField('year', Number(e.target.value))}
              />
            </Field>
            <Field label="子类型">
              <select
                className="field-input"
                value={form.subtype}
                onChange={(e) => updateField('subtype', e.target.value)}
              >
                <option value="">请选择</option>
                {categoryConfig.subtypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="日期">
              <input
                type="date"
                className="field-input"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </Field>
            <Field label="级别">
              <select
                className="field-input"
                value={form.level}
                onChange={(e) => updateField('level', e.target.value)}
              >
                <option value="">请选择</option>
                {GROWTH_LEVELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="角色">
              <select
                className="field-input"
                value={form.role}
                onChange={(e) => updateField('role', e.target.value)}
              >
                <option value="">请选择</option>
                {categoryConfig.roles.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="单位/机构" className="sm:col-span-2">
              <input
                className="field-input"
                value={form.org}
                onChange={(e) => updateField('org', e.target.value)}
                placeholder="如：华科附幼"
              />
            </Field>
            <Field label="状态">
              <select
                className="field-input"
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
              >
                {GROWTH_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="代表成果">
              <label className="flex items-center gap-2 text-sm text-nest-ink">
                <input
                  type="checkbox"
                  checked={form.representative}
                  onChange={(e) => updateField('representative', e.target.checked)}
                  className="rounded border-nest-leaf/30"
                />
                标记为代表成果
              </label>
            </Field>
          </div>

          {categoryConfig.extraFields.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {categoryConfig.extraFields.map((field) => (
                <Field key={field.key} label={field.label}>
                  <input
                    className="field-input"
                    value={form.extra[field.key] || ''}
                    onChange={(e) =>
                      updateField('extra', { ...form.extra, [field.key]: e.target.value })
                    }
                    placeholder={field.placeholder}
                  />
                </Field>
              ))}
            </div>
          )}

          <Field label="简介">
            <textarea
              className="field-input min-h-[88px] resize-none"
              value={form.intro}
              onChange={(e) => updateField('intro', e.target.value)}
              placeholder="简要描述成果背景与价值"
            />
          </Field>

          <Field label="关键词">
            <div className="flex gap-2">
              <input
                className="field-input flex-1"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="输入后回车添加"
              />
              <button type="button" className="btn-secondary" onClick={addKeyword}>
                添加
              </button>
            </div>
            {form.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 rounded-lg bg-nest-mist px-2 py-0.5 text-xs text-nest-pine"
                  >
                    {kw}
                    <button
                      type="button"
                      className="text-nest-muted hover:text-red-600"
                      onClick={() =>
                        updateField(
                          'keywords',
                          form.keywords.filter((item) => item !== kw)
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between pt-2">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              上一步
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (validateStep2()) setStep(3)
              }}
            >
              下一步 <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="surface-panel space-y-5 p-6">
          <h2 className="text-sm font-semibold text-nest-ink">附件与确认</h2>
          <p className="text-sm text-nest-muted">
            MVP 阶段仅保存附件元数据（文件名、类型、大小），不实际上传文件。请人工核对信息后提交。
          </p>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-nest-leaf/25 bg-nest-mist/30 px-6 py-8 transition hover:border-nest-leaf/40">
            <FileUp size={28} className="text-nest-leaf" />
            <span className="mt-2 text-sm font-medium text-nest-pine">选择文件（可选）</span>
            <span className="mt-1 text-xs text-nest-muted">支持多选，仅记录元数据</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          {form.files.length > 0 && (
            <ul className="space-y-2">
              {form.files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-nest-leaf/10 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-nest-ink">{file.name}</p>
                    <p className="text-xs text-nest-muted">
                      {file.type || '未知类型'} · {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-nest-muted hover:text-red-600"
                    onClick={() => removeFile(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="rounded-xl bg-nest-mist/50 p-4 text-sm">
            <p className="font-medium text-nest-ink">{form.name}</p>
            <p className="mt-1 text-nest-muted">
              {form.category}
              {form.subtype ? ` · ${form.subtype}` : ''}
              {form.level ? ` · ${form.level}` : ''}
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between pt-2">
            <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
              上一步
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? '保存中…' : '确认提交'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: '选择类别' },
    { n: 2, label: '填写信息' },
    { n: 3, label: '确认提交' },
  ] as const

  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((item, index) => (
        <li key={item.n} className="flex flex-1 items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              current >= item.n
                ? 'bg-nest-leaf text-white'
                : 'bg-white text-nest-muted ring-1 ring-nest-leaf/20'
            }`}
          >
            {current > item.n ? <Check size={14} /> : item.n}
          </span>
          <span className={`hidden text-xs sm:inline ${current >= item.n ? 'text-nest-ink' : 'text-nest-muted'}`}>
            {item.label}
          </span>
          {index < steps.length - 1 && (
            <span className="mx-1 hidden h-px flex-1 bg-nest-leaf/20 sm:block" aria-hidden />
          )}
        </li>
      ))}
    </ol>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className || ''}`}>
      <span className="mb-1.5 block text-xs font-medium text-nest-muted">{label}</span>
      {children}
    </label>
  )
}
