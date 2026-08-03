import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'

export interface PendingUploadItem {
  fileName: string
  title: string
  content: string
}

interface Props {
  open: boolean
  items: PendingUploadItem[]
  uploading?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** 入库目标说明，避免误传到教师成果库 */
  targetHint?: string
}

export default function UploadConfirmDialog({
  open,
  items,
  uploading = false,
  onConfirm,
  onCancel,
  targetHint = '将上传到「教案知识库管理」。标题不再含手机号（避免平台智能分类进成果库）；请确认下列文件无误后再提交。',
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !uploading) onCancel()
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>确认上传到平台知识库</DialogTitle>
          <DialogDescription>{targetHint}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {items.map((item) => (
            <div
              key={item.fileName}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm"
            >
              <div className="flex items-center gap-2 font-medium text-gray-800 mb-1">
                <FileText size={14} className="text-blue-500 shrink-0" />
                <span className="truncate">{item.title}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{item.fileName}</p>
              <p className="text-xs text-gray-500 line-clamp-4 whitespace-pre-wrap">
                {item.content.slice(0, 280)}
                {item.content.length > 280 ? '…' : ''}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                约 {item.content.length.toLocaleString()} 字
              </p>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" disabled={uploading} onClick={onCancel}>
            取消
          </Button>
          <Button type="button" disabled={uploading || items.length === 0} onClick={onConfirm}>
            {uploading ? (
              <>
                <Loader2 className="animate-spin" /> 上传中…
              </>
            ) : (
              `确认上传（${items.length}）`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
