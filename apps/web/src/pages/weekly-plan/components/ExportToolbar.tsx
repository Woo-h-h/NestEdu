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
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 flex items-center gap-1.5"
      >
        <Download size={15} /> 导出
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 w-52">
          <button
            onClick={() => handle('doc')}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            {loading === 'doc' ? '导出中...' : '导出 DOC 格式'}
            <span className="text-xs text-gray-400 ml-auto">推荐</span>
          </button>
          <button
            onClick={() => handle('pdf')}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            {loading === 'pdf' ? '导出中...' : '导出 PDF 格式'}
            <span className="text-xs text-gray-400 ml-auto">存档</span>
          </button>
        </div>
      )}
    </div>
  )
}
