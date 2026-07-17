import { useCallback, useState } from 'react'
import { Upload, X, FileText } from 'lucide-react'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  title?: string
  hint?: string
}

export default function FileUploadCard({
  files,
  onChange,
  title = '上传教案文件',
  hint = '将 docx 文件拖拽到此处，或点击选择文件',
}: Props) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const dropped = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.endsWith('.docx') || f.name.endsWith('.doc')
      )
      if (dropped.length === 0) {
        alert('仅支持 .docx 和 .doc 格式')
        return
      }
      onChange([...files, ...dropped])
    },
    [files, onChange]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    onChange([...files, ...selected])
    e.target.value = ''
  }

  return (
    <div className="rounded-lg border border-dashed border-transparent">
      <div className="flex items-center gap-2 mb-4 font-semibold text-gray-700">
        <Upload size={18} className="text-blue-500" />
        <span>{title}</span>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">.docx / .doc</span>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
      >
        <input
          type="file"
          accept=".docx,.doc"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{hint}</p>
          <p className="text-xs text-gray-300 mt-1">仅支持 Word 文档，建议单文件文本不超过 2MB</p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-1">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded"
            >
              <FileText size={14} className="text-blue-400" />
              <span className="flex-1 truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-gray-400 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <p className="text-xs text-green-500 text-center pt-1">已选择 {files.length} 个文件</p>
        </div>
      )}
    </div>
  )
}
