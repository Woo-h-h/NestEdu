import { useState } from 'react'
import type { WeeklyPlan } from '@/types/weeklyPlan'
import { exportToPdf } from '@/lib/export-pdf'
import { Download } from 'lucide-react'

interface Props {
  plan: WeeklyPlan
}

export default function ExportToolbar({ plan }: Props) {
  const [loading, setLoading] = useState(false)

  const handleExportPdf = async () => {
    setLoading(true)
    try {
      await exportToPdf(plan)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleExportPdf()}
      disabled={loading}
      className="btn-accent !px-3 !py-1.5 text-sm disabled:opacity-60"
    >
      <Download size={15} /> {loading ? '导出中...' : '导出 PDF'}
    </button>
  )
}
