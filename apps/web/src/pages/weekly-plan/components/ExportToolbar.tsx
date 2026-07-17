import { useState } from 'react'
import type { WeeklyPlan } from '@/types/weeklyPlan'
import { exportToDoc } from '@/lib/export-doc'
import { exportToPdf } from '@/lib/export-pdf'
import { Download } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
}

export default function ExportToolbar({ plan }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<'doc' | 'pdf' | null>(null)

  const handle = async (type: 'doc' | 'pdf') => {
    setLoading(type)
    try {
      if (type === 'doc') await exportToDoc(plan)
      else await exportToPdf(plan)
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="btn-accent !px-3 !py-1.5 text-sm">
        <Download size={15} /> 导出
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-nest-leaf/15 bg-white py-1 shadow-lg shadow-nest-pine/10">
          <button
            type="button"
            onClick={() => handle('doc')}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-nest-ink hover:bg-nest-mist"
          >
            {loading === 'doc' ? '导出中...' : '导出 DOC 格式'}
            <span className="ml-auto text-xs text-nest-muted">推荐</span>
          </button>
          <button
            type="button"
            onClick={() => handle('pdf')}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-nest-ink hover:bg-nest-mist"
          >
            {loading === 'pdf' ? '导出中...' : '导出 PDF 格式'}
            <span className="ml-auto text-xs text-nest-muted">存档</span>
          </button>
        </div>
      )}
    </div>
  )
}
