/** 轻量渲染画像 Markdown（标题/列表/段落），避免引入额外依赖 */
export default function ProfileAgentMarkdown({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <div className="space-y-3 text-sm leading-relaxed text-nest-ink">
      {blocks.map((block, index) => {
        if (block.startsWith('### ')) {
          return (
            <h4 key={index} className="font-display text-sm font-semibold text-nest-pine">
              {block.replace(/^###\s+/, '')}
            </h4>
          )
        }
        if (block.startsWith('## ')) {
          return (
            <h3 key={index} className="font-display text-base font-semibold text-nest-ink">
              {block.replace(/^##\s+/, '')}
            </h3>
          )
        }
        if (block.startsWith('# ')) {
          return (
            <h2 key={index} className="font-display text-lg font-semibold text-nest-ink">
              {block.replace(/^#\s+/, '')}
            </h2>
          )
        }

        const lines = block.split('\n')
        const isList = lines.every((line) => /^[-*•]\s+|^\d+\.\s+/.test(line.trim()) || !line.trim())
        if (isList) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 text-nest-muted">
              {lines
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line, lineIndex) => (
                  <li key={lineIndex} className="text-nest-ink">
                    {line.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '')}
                  </li>
                ))}
            </ul>
          )
        }

        return (
          <p key={index} className="whitespace-pre-wrap text-nest-ink/90">
            {block}
          </p>
        )
      })}
    </div>
  )
}
