import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCategoryConfig } from '@/lib/growthCategories'
import type { GrowthRecord } from '@/types/growth'
import { Calendar, Building2, Tag, FileText, Star } from 'lucide-react'

interface ArchiveDetailDrawerProps {
  record: GrowthRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (record: GrowthRecord) => void
}

export default function ArchiveDetailDrawer({
  record,
  open,
  onOpenChange,
  onEdit,
}: ArchiveDetailDrawerProps) {
  if (!record) return null

  const config = getCategoryConfig(record.category)
  const extraEntries = Object.entries(record.extra || {}).filter(([, value]) => value)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed top-0 right-0 left-auto h-full w-full max-w-lg translate-x-0 translate-y-0 rounded-none border-l data-open:slide-in-from-right-10 sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader className="border-b border-nest-leaf/10 pb-4">
          <div className="flex items-start gap-2 pr-8">
            {record.representative && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                <Star size={12} /> 代表成果
              </span>
            )}
            <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-pine">
              教师录入
            </span>
          </div>
          <DialogTitle className="font-display text-lg font-semibold text-nest-ink">
            {record.name}
          </DialogTitle>
          <p className="text-sm text-nest-muted">
            {record.category}
            {record.subtype ? ` · ${record.subtype}` : ''}
          </p>
        </DialogHeader>

        <div className="max-h-[calc(100vh-8rem)] space-y-5 overflow-y-auto py-2">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-nest-muted">年度</dt>
              <dd className="mt-0.5 font-medium text-nest-ink">{record.year}</dd>
            </div>
            <div>
              <dt className="text-xs text-nest-muted">日期</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-medium text-nest-ink">
                <Calendar size={13} className="text-nest-muted" />
                {record.date || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nest-muted">级别</dt>
              <dd className="mt-0.5 font-medium text-nest-ink">{record.level || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-nest-muted">角色</dt>
              <dd className="mt-0.5 font-medium text-nest-ink">{record.role || '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-nest-muted">单位/机构</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-medium text-nest-ink">
                <Building2 size={13} className="text-nest-muted" />
                {record.org || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-nest-muted">状态</dt>
              <dd className="mt-0.5 font-medium text-nest-ink">{record.status || '—'}</dd>
            </div>
          </dl>

          {record.intro && (
            <section>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-nest-muted">
                简介
              </h3>
              <p className="text-sm leading-relaxed text-nest-ink">{record.intro}</p>
            </section>
          )}

          {extraEntries.length > 0 && config && (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-nest-muted">
                类别信息
              </h3>
              <dl className="space-y-2 rounded-xl bg-nest-mist/50 p-3 text-sm">
                {extraEntries.map(([key, value]) => {
                  const field = config.extraFields.find((item) => item.key === key)
                  return (
                    <div key={key} className="flex justify-between gap-3">
                      <dt className="text-nest-muted">{field?.label || key}</dt>
                      <dd className="text-right font-medium text-nest-ink">{value}</dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          )}

          {record.keywords?.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-nest-muted">
                <Tag size={12} /> 关键词
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {record.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="rounded-lg bg-white px-2 py-0.5 text-xs text-nest-pine ring-1 ring-nest-leaf/15"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </section>
          )}

          {record.files?.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-nest-muted">
                <FileText size={12} /> 附件（元数据）
              </h3>
              <ul className="space-y-2">
                {record.files.map((file) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between rounded-xl border border-nest-leaf/10 bg-white px-3 py-2 text-sm"
                  >
                    <span className="truncate text-nest-ink">{file.name}</span>
                    <span className="shrink-0 text-xs text-nest-muted">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-nest-muted">MVP 仅保存附件元数据，未实际上传文件。</p>
            </section>
          )}
        </div>

        {onEdit && (
          <div className="border-t border-nest-leaf/10 pt-4">
            <button type="button" className="btn-primary w-full" onClick={() => onEdit(record)}>
              编辑成果
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
