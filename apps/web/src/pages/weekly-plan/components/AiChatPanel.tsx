import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '@/types/weeklyPlan'
import { Send, Bot, User } from 'lucide-react'

interface Props {
  chatHistory: ChatMessage[]
  isAiModifying: boolean
  onSendInstruction: (instruction: string) => Promise<void>
}

const quickCommands = [
  '帮我把户外运动改成适合下雨天的室内运动',
  '加强安全教育内容',
  '优化区域游戏的多样性',
  '调整周五的活动内容',
]

export default function AiChatPanel({
  chatHistory,
  isAiModifying,
  onSendInstruction,
}: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const send = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || isAiModifying) return
    setInput('')
    await onSendInstruction(msg)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 border-b border-nest-leaf/10 pb-3">
        <p className="mb-2 text-xs text-nest-muted">快捷修改指令：</p>
        <div className="flex flex-wrap gap-1.5">
          {quickCommands.map((cmd) => (
            <span
              key={cmd}
              onClick={() => send(cmd)}
              className="cursor-pointer rounded-full bg-nest-mist px-2 py-1 text-xs text-nest-muted transition-colors hover:bg-nest-leaf hover:text-white"
            >
              {cmd}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto pr-1">
        {chatHistory.length === 0 && (
          <div className="py-10 text-center text-nest-muted/50">
            <Bot size={36} className="mx-auto mb-2 text-nest-moss/40" />
            <p className="text-sm">描述你想要的修改，AI 帮你自动调整</p>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm">
              {msg.role === 'user' ? (
                <User size={16} className="text-nest-leaf" />
              ) : (
                <Bot size={16} className="text-nest-muted" />
              )}
            </div>
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'rounded-tr-sm bg-nest-leaf text-white'
                  : 'rounded-tl-sm bg-nest-mist text-nest-ink'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isAiModifying && (
          <p className="animate-pulse text-xs text-nest-muted">AI 思考中...</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 border-t border-nest-leaf/10 pt-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            placeholder="输入修改指令..."
            className="field-input flex-1 resize-none"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={!input.trim() || isAiModifying}
            className="btn-primary shrink-0 !px-3"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
