import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, Loader2, Cloud, Paperclip } from 'lucide-react'
import { formatFileSize } from '@/lib/archiveUploadFormats'

export interface PendingUploadItem {
  fileName: string
  title: string
  content?: string
  file?: File
  uploadMode?: 'text' | 'file'
}

interface Props {
  open: boolean
  items: PendingUploadItem[]
  uploading?: boolean
  onConfirm: () => void
  onCancel: () => void
  /** 入库目标说明 */
  targetHint?: string
  /** 确认按钮文案 */
  confirmLabel?: string
}

export default function UploadConfirmDialog({
  open,
  items,
  uploading = false,
  onConfirm,
  onCancel,
  targetHint = '请确认下列文件无误后再提交；确认后将同时写入平台知识库与本系统数据库。',
  confirmLabel,
}: Props) {
  const defaultConfirmLabel =
    items.length > 0 && items.every((item) => item.uploadMode === 'file')
      ? `上传到平台知识库（${items.length}）`
      : `上传到平台知识库 + 数据库（${items.length}）`
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
                {item.uploadMode === 'file' ? (
                  <Paperclip size={14} className="text-blue-500 shrink-0" />
                ) : (
                  <FileText size={14} className="text-blue-500 shrink-0" />
                )}
                <span className="truncate">{item.title}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{item.fileName}</p>
              {item.uploadMode === 'file' && item.file ? (
                <p className="text-xs text-gray-500">
                  原文件上传 · {formatFileSize(item.file.size)}
                </p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 line-clamp-4 whitespace-pre-wrap">
                    {(item.content || '').slice(0, 280)}
                    {(item.content || '').length > 280 ? '…' : ''}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    约 {(item.content || '').length.toLocaleString()} 字
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={onCancel}
          >
            取消
          </Button>
          <Button
            type="button"
            className="w-full"
            disabled={uploading || items.length === 0}
            onClick={onConfirm}
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" /> 上传中…
              </>
            ) : (
              <>
                <Cloud size={16} /> {confirmLabel || defaultConfirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
