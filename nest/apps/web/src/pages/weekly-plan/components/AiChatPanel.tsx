import { useState, useRef, useEffect } from 'react'
import type { WeeklyPlan, ChatMessage } from '@/types/weeklyPlan'
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
    <div className="flex flex-col h-full">
      <div className="mb-3 pb-3 border-b border-gray-100">
        <p className="text-xs text-gray-400 mb-2">快捷修改指令：</p>
        <div className="flex flex-wrap gap-1.5">
          {quickCommands.map((cmd) => (
            <span
              key={cmd}
              onClick={() => send(cmd)}
              className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full cursor-pointer hover:bg-blue-50 hover:text-blue-500 transition-colors"
            >
              {cmd}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto space-y-3 pr-1">
        {chatHistory.length === 0 && (
          <div className="text-center py-10 text-gray-300">
            <Bot size={36} className="mx-auto mb-2" />
            <p className="text-sm">描述你想要的修改，AI 帮你自动调整</p>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm">
              {msg.role === 'user' ? (
                <User size={16} className="text-blue-500" />
              ) : (
                <Bot size={16} className="text-gray-400" />
              )}
            </div>
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-700 rounded-tl-sm'}`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isAiModifying && <p className="text-xs text-gray-400 animate-pulse">AI 思考中...</p>}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
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
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || isAiModifying}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
