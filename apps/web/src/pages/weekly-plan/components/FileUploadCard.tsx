import { useCallback, useId, useState } from 'react'
import { Upload, X, FileText } from 'lucide-react'
import {
  formatFileSize,
  KNOWLEDGE_UPLOAD_ACCEPT,
  KNOWLEDGE_UPLOAD_EXTENSIONS,
  KNOWLEDGE_UPLOAD_FORMAT_LABEL,
} from '@/lib/archiveUploadFormats'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  title?: string
  hint?: string
  /** input accept，默认与成果库相同的多格式清单 */
  accept?: string
  /** 允许的扩展名（小写，含点），用于拖拽校验 */
  allowedExtensions?: string[]
  formatLabel?: string
  formatHint?: string
  invalidFormatMessage?: string
}

function matchesExtension(fileName: string, extensions: string[]): boolean {
  const lower = fileName.toLowerCase()
  return extensions.some((ext) => lower.endsWith(ext.toLowerCase()))
}

export default function FileUploadCard({
  files,
  onChange,
  title = '上传文件',
  hint = '将文件拖到此处，或点击选择；确认后才会真正入库',
  accept = KNOWLEDGE_UPLOAD_ACCEPT,
  allowedExtensions = [...KNOWLEDGE_UPLOAD_EXTENSIONS],
  formatLabel = KNOWLEDGE_UPLOAD_FORMAT_LABEL,
  formatHint = '支持 Word、PDF、PPT、Excel、图片与文本；单文件建议不超过 50MB',
  invalidFormatMessage = '不支持的文件格式，请选择 Word、PDF、PPT、Excel、图片或常见文本文件',
}: Props) {
  const [dragOver, setDragOver] = useState(false)
  const inputId = useId()

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const dropped = Array.from(e.dataTransfer.files).filter((f) =>
        matchesExtension(f.name, allowedExtensions)
      )
      if (dropped.length === 0) {
        alert(invalidFormatMessage)
        return
      }
      onChange([...files, ...dropped])
    },
    [allowedExtensions, files, invalidFormatMessage, onChange]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []).filter((f) =>
      matchesExtension(f.name, allowedExtensions)
    )
    if (selected.length === 0 && (e.target.files?.length || 0) > 0) {
      alert(invalidFormatMessage)
    }
    if (selected.length > 0) {
      onChange([...files, ...selected])
    }
    e.target.value = ''
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 font-medium text-nest-ink">
        <Upload size={18} className="text-nest-leaf" />
        <span className="font-display">{title}</span>
        <span className="rounded-full bg-nest-mist px-2 py-0.5 text-xs text-nest-muted">
          {formatLabel}
        </span>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-nest-leaf bg-nest-mist'
            : 'border-nest-leaf/20 hover:border-nest-leaf/40 hover:bg-nest-mist/40'
        }`}
      >
        <input
          type="file"
          accept={accept}
          multiple
          onChange={handleFileInput}
          className="hidden"
          id={inputId}
        />
        <label htmlFor={inputId} className="cursor-pointer">
          <Upload size={40} className="mx-auto mb-3 text-nest-moss/40" />
          <p className="text-nest-muted">{hint}</p>
          <p className="mt-1 text-xs text-nest-muted/60">{formatHint}</p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-xl bg-nest-mist/50 px-3 py-2 text-sm text-nest-ink"
            >
              <FileText size={14} className="text-nest-leaf" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-nest-muted">{formatFileSize(f.size)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-nest-muted hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <p className="pt-1 text-center text-xs text-nest-leaf">已选择 {files.length} 个文件</p>
        </div>
      )}
    </div>
  )
}
